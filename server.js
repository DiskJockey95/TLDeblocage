const express = require('express');
const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;
const allowedOrigins = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

function buildMapsLink(address, postalCode) {
    const encodedParts = [address, postalCode]
        .filter(Boolean)
        .map((part) => encodeURIComponent(part));

    if (!encodedParts.length) {
        return '';
    }

    return `https://www.google.com/maps/place/${encodedParts.join(',')}`;
}

function buildEmailMessage(formData) {
    const mapsLink = buildMapsLink(formData.address, formData.postalCode);

    return [
        `Name: ${formData.fullName || 'Not provided'}`,
        `Phone: ${formData.phoneNumber || 'Not provided'}`,
        `Email: ${formData.email || 'Not provided'}`,
        `Address: ${formData.address || 'Not provided'}`,
        `Suite: ${formData.suite || 'Not provided'}`,
        `Postal Code: ${formData.postalCode || 'Not provided'}`,
        `Blocked Area: ${formData.issueLocationLabel || formData.issueLocation || 'Not provided'}`,
        `Type of Problem: ${formData.issueTypeLabel || formData.issueType || 'Not provided'}`,
        `Google Maps: ${mapsLink || 'Not provided'}`,
        '',
        'Problem Description:',
        formData.problemDescription || 'Not provided',
    ].join('\n');
}

function createTransporter() {
    const portNumber = Number(process.env.SMTP_PORT || 587);

    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: portNumber,
        secure: String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true' || portNumber === 465,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
}

app.use(express.json());
app.use((request, response, next) => {
    const requestOrigin = request.headers.origin;

    if (!allowedOrigins.length) {
        response.setHeader('Access-Control-Allow-Origin', '*');
    } else if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
        response.setHeader('Access-Control-Allow-Origin', requestOrigin);
        response.setHeader('Vary', 'Origin');
    }

    response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (request.method === 'OPTIONS') {
        response.sendStatus(204);
        return;
    }

    next();
});
app.use(express.static(path.join(__dirname)));

app.post('/api/send-quote', async (request, response) => {
    const formData = request.body || {};
    const requiredFields = ['fullName', 'phoneNumber', 'email', 'address', 'postalCode', 'issueLocation', 'issueType'];
    const missingField = requiredFields.find((field) => !String(formData[field] || '').trim());

    if (missingField) {
        response.status(400).json({ error: `Missing required field: ${missingField}` });
        return;
    }

    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        response.status(500).json({ error: 'SMTP environment variables are not configured.' });
        return;
    }

    const transporter = createTransporter();
    const subject = `${formData.issueTypeLabel || formData.issueType} - ${formData.issueLocationLabel || formData.issueLocation}`;
    const messageText = buildEmailMessage(formData);
    const senderAddress = process.env.MAIL_FROM || process.env.SMTP_USER;
    const senderName = process.env.MAIL_FROM_NAME || 'TL Déblocage No-Reply';

    try {
        await transporter.sendMail({
            from: {
                name: senderName,
                address: senderAddress,
            },
            to: 'tldeblocage@gmail.com',
            replyTo: formData.email,
            subject,
            text: messageText,
            html: messageText
                .split('\n')
                .map((line) => (line ? `<p>${line.replace(/[&<>"']/g, (character) => ({
                    '&': '&amp;',
                    '<': '&lt;',
                    '>': '&gt;',
                    '"': '&quot;',
                    "'": '&#39;',
                }[character]))}</p>` : '<br>'))
                .join(''),
        });

        response.json({ ok: true });
    } catch (error) {
        response.status(500).json({ error: 'Unable to send email.', details: error.message });
    }
});

app.listen(port, () => {
    console.log(`TL Déblocage server running on http://localhost:${port}`);
});