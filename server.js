const express = require('express');
const https = require('https');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;
const allowedOrigins = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

function isLocalOrigin(origin) {
    return origin === 'null'
        || origin === 'http://localhost:3000'
        || origin === 'http://127.0.0.1:3000'
        || origin === 'http://localhost'
        || origin === 'http://127.0.0.1';
}

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

function sendEmailViaResend(payload) {
    return new Promise((resolve, reject) => {
        const requestBody = JSON.stringify(payload);

        const request = https.request(
            {
                hostname: 'api.resend.com',
                path: '/emails',
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(requestBody),
                    Accept: 'application/json',
                },
                timeout: 15000,
            },
            (response) => {
                let responseBody = '';

                response.setEncoding('utf8');
                response.on('data', (chunk) => {
                    responseBody += chunk;
                });

                response.on('end', () => {
                    if (response.statusCode >= 200 && response.statusCode < 300) {
                        resolve({ statusCode: response.statusCode, body: responseBody });
                        return;
                    }

                    reject(new Error(`Resend request failed with status ${response.statusCode}: ${responseBody}`));
                });
            }
        );

        request.on('timeout', () => {
            request.destroy(new Error('Resend request timed out'));
        });

        request.on('error', reject);
        request.write(requestBody);
        request.end();
    });
}

app.use(express.json());
app.use((request, response, next) => {
    const requestOrigin = request.headers.origin;
    const originAllowed = Boolean(requestOrigin)
        && (allowedOrigins.includes(requestOrigin) || isLocalOrigin(requestOrigin));

    if (!requestOrigin) {
        response.setHeader('Access-Control-Allow-Origin', '*');
    } else if (originAllowed) {
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

    console.log('Received quote request', {
        requestId: request.headers['x-railway-request-id'] || null,
        email: formData.email || null,
        issueType: formData.issueType || null,
        issueLocation: formData.issueLocation || null,
    });

    if (missingField) {
        response.status(400).json({ error: `Missing required field: ${missingField}` });
        return;
    }

    if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM) {
        response.status(500).json({ error: 'Resend environment variables are not configured.' });
        return;
    }

    const subject = `${formData.issueTypeLabel || formData.issueType} - ${formData.issueLocationLabel || formData.issueLocation}`;
    const messageText = buildEmailMessage(formData);

    try {
        console.log('Sending mail via Resend');
        await sendEmailViaResend({
            from: process.env.RESEND_FROM,
            to: 'tldeblocage@gmail.com',
            reply_to: formData.email,
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

        console.log('Mail sent successfully');
        response.json({ ok: true });
    } catch (error) {
        console.error('Resend send failed', error);
        response.status(500).json({ error: 'Unable to send email.', details: error.message });
    }
});

app.listen(port, () => {
    console.log(`TL Déblocage server running on http://localhost:${port}`);
});