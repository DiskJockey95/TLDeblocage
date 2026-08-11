const languageButtons = document.querySelectorAll('.lang-option');
const translatableText = document.querySelectorAll('[data-en][data-fr]');
const translatablePlaceholders = document.querySelectorAll('[data-placeholder-en][data-placeholder-fr]');
const translatableOptions = document.querySelectorAll('option[data-en][data-fr]');
const issueLocationSelect = document.querySelector('#issue-location');
const issueTypeSelect = document.querySelector('#issue-type');
const problemDescriptionField = document.querySelector('#problem-description');
const problemDescriptionLabel = document.querySelector('label[for="problem-description"]');
const quoteForm = document.querySelector('.quote-form');
const fullNameField = document.querySelector('#full-name');
const phoneNumberField = document.querySelector('#phone-number');
const addressField = document.querySelector('#address');
const suiteField = document.querySelector('#suite');
const postalCodeField = document.querySelector('#postal-code');
const emailField = document.querySelector('#email');
const apiBaseUrlMeta = document.querySelector('meta[name="send-quote-url"]');
const serviceItems = document.querySelectorAll('.services-list li');
const serviceImage = document.querySelector('#service-list-image');
const reviewGrid = document.querySelector('#review-grid');
const serviceRotationDelayMs = 5000;
const resultCards = document.querySelectorAll('.results-grid .comparison-card');
const resultRotationDelayMs = 5000;
const sectionMenuToggle = document.querySelector('.menu-toggle');
const sectionMenu = document.querySelector('.section-menu');
const sectionMenuLinks = document.querySelectorAll('.section-menu a');
const quoteCooldownMs = 10 * 60 * 1000;
const quoteCooldownStorageKey = 'tldeblocage-last-quote-submission-at';

let currentLanguage = 'fr';
let activeServiceItem = null;
let serviceRotationTimeoutId = null;
let activeResultIndex = 0;
let resultRotationTimeoutId = null;
let reviewItems = [];

const resultComparisons = [
    {
        labelEn: 'Blocked sink',
        labelFr: 'Évier bouché',
        fitMode: 'cover',
        before: {
            titleEn: 'Before',
            titleFr: 'Avant',
            imageSrc: 'files/backed_up_sink_before.png',
        },
        after: {
            titleEn: 'After',
            titleFr: 'Après',
            imageSrc: 'files/backed_up_sink_after.png',
        },
    },
    {
        labelEn: 'Basement drain backup',
        labelFr: 'Refoulement de drain au sous-sol',
        fitMode: 'contain',
        before: {
            titleEn: 'Before',
            titleFr: 'Avant',
            imageSrc: 'files/backed_up_drain_before.png',
        },
        after: {
            titleEn: 'After',
            titleFr: 'Après',
            imageSrc: 'files/backed_up_drain_after.png',
        },
    },
    {
        labelEn: 'Main line obstruction',
        labelFr: 'Obstruction de la conduite principale',
        fitMode: 'cover',
        before: {
            titleEn: 'Before',
            titleFr: 'Avant',
            imageSrc: 'files/backed_up_mainline_before.png',
        },
        after: {
            titleEn: 'After',
            titleFr: 'Après',
            imageSrc: 'files/backed_up_mainline_after.png',
        },
    },
    {
        labelEn: 'Backed up bathtub',
        labelFr: 'Baignoire bouchée',
        fitMode: 'cover',
        before: {
            titleEn: 'Before',
            titleFr: 'Avant',
            imageSrc: 'files/backed_up_bathtub_before.png',
        },
        after: {
            titleEn: 'After',
            titleFr: 'Après',
            imageSrc: 'files/backed_up_bathtub_after.png',
        },
    },
];

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function getReviewsUrl() {
    if (window.location.protocol === 'http:' || window.location.protocol === 'https:' || window.location.protocol === 'file:') {
        return new URL('files/reviews.json', window.location.href).href;
    }

    return 'files/reviews.json';
}

function renderReviewGrid() {
    if (!reviewGrid) {
        return;
    }

    if (!reviewItems.length) {
        reviewGrid.innerHTML = '<p class="review-empty">No reviews are available right now.</p>';
        return;
    }

    reviewGrid.innerHTML = reviewItems.map((review) => {
        const rating = Number(review.rating) || 0;
        const safeRating = Math.max(0, Math.min(5, rating));
        const stars = '★★★★★'.slice(0, safeRating);
        const reviewText = currentLanguage === 'fr' ? review['message-fr'] : review['message-en'];
        const reviewerName = review.user || '';

        return `
            <div class="testimonial-card">
                <div class="rating-row">
                    <div class="stars" aria-label="${safeRating} out of 5 stars">${escapeHtml(stars)}</div>
                    <span class="rating-score">${safeRating}/5</span>
                </div>
                <blockquote>${escapeHtml(reviewText)}</blockquote>
                <span>— ${escapeHtml(reviewerName)}</span>
            </div>
        `;
    }).join('');
}

async function loadReviews() {
    if (!reviewGrid) {
        return;
    }

    const reviewUrls = [getReviewsUrl()];
    const apiBaseUrl = getApiBaseUrl();

    if (apiBaseUrl) {
        reviewUrls.push(`${apiBaseUrl}/files/reviews.json`);
    }

    try {
        let response = null;

        for (const reviewUrl of reviewUrls) {
            try {
                response = await fetch(reviewUrl, { cache: 'no-store' });

                if (response.ok) {
                    break;
                }
            } catch (error) {
                response = null;
            }
        }

        if (!response || !response.ok) {
            throw new Error('Unable to load reviews from any configured source');
        }

        const data = await response.json();
        reviewItems = Array.isArray(data) ? data : [];
    } catch (error) {
        console.error('Failed to load reviews', error);
        reviewItems = [];
    }

    renderReviewGrid();
}

function updateServiceImage(item) {
    if (!serviceImage || !item) {
        return;
    }

    const label = currentLanguage === 'fr' ? item.dataset.fr : item.dataset.en;
    const imageSource = item.dataset.imageSrc;

    serviceImage.src = imageSource;
    serviceImage.alt = label;
}

function getNextServiceItem() {
    if (!serviceItems.length) {
        return null;
    }

    const currentIndex = Math.max(0, Array.from(serviceItems).indexOf(activeServiceItem));
    return serviceItems[(currentIndex + 1) % serviceItems.length];
}

function scheduleServiceRotation() {
    if (!serviceItems.length || !serviceImage) {
        return;
    }

    window.clearTimeout(serviceRotationTimeoutId);
    serviceRotationTimeoutId = window.setTimeout(() => {
        const nextItem = getNextServiceItem();

        if (!nextItem) {
            return;
        }

        setActiveServiceItem(nextItem);
        scheduleServiceRotation();
    }, serviceRotationDelayMs);
}

function updateResultCard(card, comparison, side) {
    if (!card || !comparison) {
        return;
    }

    const visual = card.querySelector('.result-visual');
    const image = card.querySelector('.result-image');
    const title = card.querySelector('.result-copy h3');
    const entry = comparison[side];

    if (!visual || !image || !title || !entry) {
        return;
    }

    const comparisonLabel = currentLanguage === 'fr' ? comparison.labelFr : comparison.labelEn;
    const titleText = currentLanguage === 'fr' ? entry.titleFr : entry.titleEn;
    const imageSource = entry.imageSrc;
    const fitMode = comparison.fitMode || 'cover';

    visual.classList.toggle('before', side === 'before');
    visual.classList.toggle('after', side === 'after');
    visual.classList.toggle('fit-cover', fitMode === 'cover');
    visual.classList.toggle('fit-contain', fitMode === 'contain');

    image.src = imageSource;
    image.alt = `${titleText} - ${comparisonLabel}`;

    title.dataset.en = entry.titleEn;
    title.dataset.fr = entry.titleFr;

    title.textContent = titleText;
}

function setActiveResultComparison(index) {
    if (!resultCards.length || !resultComparisons.length) {
        return;
    }

    activeResultIndex = index % resultComparisons.length;
    const comparison = resultComparisons[activeResultIndex];

    updateResultCard(resultCards[0], comparison, 'before');
    updateResultCard(resultCards[1], comparison, 'after');
}

function getNextResultComparisonIndex() {
    if (!resultComparisons.length) {
        return 0;
    }

    return (activeResultIndex + 1) % resultComparisons.length;
}

function scheduleResultRotation() {
    if (!resultCards.length || resultComparisons.length < 2) {
        return;
    }

    window.clearTimeout(resultRotationTimeoutId);
    resultRotationTimeoutId = window.setTimeout(() => {
        setActiveResultComparison(getNextResultComparisonIndex());
        scheduleResultRotation();
    }, resultRotationDelayMs);
}

function setActiveServiceItem(item) {
    activeServiceItem = item;

    serviceItems.forEach((serviceItem) => {
        const isActive = serviceItem === item;
        serviceItem.classList.toggle('active', isActive);
        serviceItem.setAttribute('aria-pressed', String(isActive));
    });

    updateServiceImage(item);
}

function openSectionMenu() {
    if (!sectionMenuToggle || !sectionMenu) {
        return;
    }

    sectionMenu.classList.add('is-open');
    sectionMenuToggle.setAttribute('aria-expanded', 'true');
}

function closeSectionMenu() {
    if (!sectionMenuToggle || !sectionMenu) {
        return;
    }

    sectionMenu.classList.remove('is-open');
    sectionMenuToggle.setAttribute('aria-expanded', 'false');
}

function toggleSectionMenu() {
    if (!sectionMenuToggle || !sectionMenu) {
        return;
    }

    if (sectionMenu.classList.contains('is-open')) {
        closeSectionMenu();
        return;
    }

    openSectionMenu();
}

function getSectionScrollTarget(sectionElement) {
    if (!sectionElement) {
        return null;
    }

    return sectionElement.querySelector('h1, h2, h3') || sectionElement;
}

function getStickyHeaderOffset() {
    const siteHeader = document.querySelector('.site-header');

    if (!siteHeader) {
        return 0;
    }

    return siteHeader.getBoundingClientRect().height + 12;
}

function applyLanguage(lang) {
    currentLanguage = lang;
    document.documentElement.lang = lang;

    languageButtons.forEach((button) => {
        const isActive = button.textContent === (lang === 'fr' ? 'FR' : 'EN');
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-pressed', String(isActive));
    });

    translatableText.forEach((element) => {
        element.textContent = lang === 'fr' ? element.dataset.fr : element.dataset.en;
    });

    translatablePlaceholders.forEach((element) => {
        element.placeholder = lang === 'fr' ? element.dataset.placeholderFr : element.dataset.placeholderEn;
    });

    translatableOptions.forEach((option) => {
        option.textContent = lang === 'fr' ? option.dataset.fr : option.dataset.en;
    });

    if (activeServiceItem) {
        updateServiceImage(activeServiceItem);
    }

    setActiveResultComparison(activeResultIndex);
    renderReviewGrid();
}

function updateProblemDescriptionRequirement() {
    const needsDescription = issueLocationSelect.value === 'other-location' || issueTypeSelect.value === 'other-issue';

    problemDescriptionField.required = needsDescription;
    problemDescriptionField.setAttribute('aria-required', String(needsDescription));
    problemDescriptionLabel.classList.toggle('required', needsDescription);
}

function getSelectedOptionText(selectElement) {
    if (!selectElement) {
        return '';
    }

    const selectedOption = selectElement.selectedOptions && selectElement.selectedOptions[0];
    return selectedOption ? selectedOption.textContent.trim() : '';
}

function getApiBaseUrl() {
    const isLocalEnvironment = window.location.protocol === 'file:'
        || window.location.hostname === 'localhost'
        || window.location.hostname === '127.0.0.1';

    if (isLocalEnvironment) {
        return 'http://localhost:3000';
    }

    const configuredBaseUrl = (apiBaseUrlMeta?.content || '').trim();

    if (configuredBaseUrl) {
        return configuredBaseUrl.replace(/\/$/, '');
    }

    return '';
}

function getSendQuoteUrl() {
    const apiBaseUrl = getApiBaseUrl();

    if (!apiBaseUrl) {
        return '';
    }

    return apiBaseUrl.endsWith('/api/send-quote') ? apiBaseUrl : `${apiBaseUrl}/api/send-quote`;
}

function getLastQuoteSubmissionAt() {
    try {
        const storedValue = window.localStorage.getItem(quoteCooldownStorageKey);
        const parsedValue = Number(storedValue);

        return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 0;
    } catch (error) {
        return 0;
    }
}

function setLastQuoteSubmissionAt(timestamp) {
    try {
        window.localStorage.setItem(quoteCooldownStorageKey, String(timestamp));
    } catch (error) {
        // Ignore storage failures and fall back to server-side enforcement.
    }
}

function getQuoteCooldownRemainingMs() {
    const lastSubmissionAt = getLastQuoteSubmissionAt();

    if (!lastSubmissionAt) {
        return 0;
    }

    const remainingMs = quoteCooldownMs - (Date.now() - lastSubmissionAt);
    return remainingMs > 0 ? remainingMs : 0;
}

function formatCooldownMessage(remainingMs) {
    const remainingMinutes = Math.max(1, Math.ceil(remainingMs / 60000));
    return `Please wait ${remainingMinutes} minute${remainingMinutes === 1 ? '' : 's'} before sending another quote request.`;
}

async function submitQuoteForm(event) {
    event.preventDefault();

    const fullName = fullNameField?.value.trim() || '';
    const phoneNumber = phoneNumberField?.value.trim() || '';
    const address = addressField?.value.trim() || '';
    const suite = suiteField?.value.trim() || '';
    const postalCode = postalCodeField?.value.trim() || '';
    const contactEmail = emailField?.value.trim() || '';
    const issueLocation = getSelectedOptionText(issueLocationSelect);
    const issueType = getSelectedOptionText(issueTypeSelect);
    const problemDescription = problemDescriptionField?.value.trim() || '';
    const apiUrl = getSendQuoteUrl();
    const cooldownRemainingMs = getQuoteCooldownRemainingMs();

    if (!apiUrl) {
        window.alert('Missing API URL. Please contact the site administrator.');
        return;
    }

    if (cooldownRemainingMs > 0) {
        window.alert(formatCooldownMessage(cooldownRemainingMs));
        return;
    }

    const submitButton = quoteForm?.querySelector('button[type="submit"]');
    const originalButtonText = submitButton ? submitButton.textContent : '';

    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Sending...';
    }

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                fullName,
                phoneNumber,
                email: contactEmail,
                address,
                suite,
                postalCode,
                issueLocation,
                issueType,
                issueLocationLabel: issueLocation,
                issueTypeLabel: issueType,
                problemDescription,
            }),
        });

        if (!response.ok) {
            const errorPayload = await response.json().catch(() => ({}));
            throw new Error(errorPayload.error || 'Unable to send email');
        }

        setLastQuoteSubmissionAt(Date.now());
        window.alert('Your quote request has been sent.');
        quoteForm.reset();
        updateProblemDescriptionRequirement();
    } catch (error) {
        window.alert(`Could not send the email request: ${error.message}`);
    } finally {
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        }
    }
}

languageButtons.forEach((button) => {
    button.addEventListener('click', () => {
        const lang = button.textContent === 'FR' ? 'fr' : 'en';
        applyLanguage(lang);
    });
});

issueLocationSelect.addEventListener('change', updateProblemDescriptionRequirement);
issueTypeSelect.addEventListener('change', updateProblemDescriptionRequirement);

if (quoteForm) {
    quoteForm.addEventListener('submit', submitQuoteForm);
}

if (sectionMenuToggle) {
    sectionMenuToggle.addEventListener('click', toggleSectionMenu);
}

sectionMenuLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
        const targetId = link.getAttribute('href');
        const targetElement = targetId ? document.querySelector(targetId) : null;
        const scrollTarget = getSectionScrollTarget(targetElement);

        if (!scrollTarget) {
            return;
        }

        event.preventDefault();
        const targetTop = scrollTarget.getBoundingClientRect().top + window.scrollY;
        const offsetTop = getStickyHeaderOffset();

        window.scrollTo({
            top: Math.max(0, targetTop - offsetTop),
            behavior: 'smooth',
        });
        closeSectionMenu();
    });
});

document.addEventListener('click', (event) => {
    if (!sectionMenu || !sectionMenuToggle || !sectionMenu.classList.contains('is-open')) {
        return;
    }

    if (sectionMenu.contains(event.target) || sectionMenuToggle.contains(event.target)) {
        return;
    }

    closeSectionMenu();
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        closeSectionMenu();
    }
});

serviceItems.forEach((item) => {
    item.setAttribute('role', 'button');
    item.tabIndex = 0;
    item.setAttribute('aria-pressed', 'false');

    item.addEventListener('click', () => {
        setActiveServiceItem(item);
        scheduleServiceRotation();
    });

    item.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setActiveServiceItem(item);
            scheduleServiceRotation();
        }
    });
});

setActiveServiceItem(document.querySelector('.services-list li[data-default-image="true"]') || serviceItems[0]);
scheduleServiceRotation();

setActiveResultComparison(0);
scheduleResultRotation();
loadReviews();

applyLanguage('fr');
updateProblemDescriptionRequirement();
