const languageButtons = document.querySelectorAll('.lang-option');
const translatableText = document.querySelectorAll('[data-en][data-fr]');
const translatablePlaceholders = document.querySelectorAll('[data-placeholder-en][data-placeholder-fr]');
const translatableOptions = document.querySelectorAll('option[data-en][data-fr]');
const issueLocationSelect = document.querySelector('#issue-location');
const issueTypeSelect = document.querySelector('#issue-type');
const problemDescriptionField = document.querySelector('#problem-description');
const problemDescriptionLabel = document.querySelector('label[for="problem-description"]');
const serviceItems = document.querySelectorAll('.services-list li');
const serviceImage = document.querySelector('#service-list-image');
const serviceRotationDelayMs = 5000;
const resultCards = document.querySelectorAll('.results-grid .comparison-card');
const resultRotationDelayMs = 5000;

let currentLanguage = 'fr';
let activeServiceItem = null;
let serviceRotationTimeoutId = null;
let activeResultIndex = 0;
let resultRotationTimeoutId = null;

const resultComparisons = [
    {
        labelEn: 'Blocked sink',
        labelFr: 'Évier bouché',
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
    // {
    //     labelEn: 'Basement drain backup',
    //     labelFr: 'Refoulement de drain au sous-sol',
    //     before: {
    //         titleEn: 'Before',
    //         titleFr: 'Avant',
    //         imageSrc: 'files/backed_up_sink_before.png',
    //     },
    //     after: {
    //         titleEn: 'After',
    //         titleFr: 'Après',
    //         imageSrc: 'files/backed_up_sink_after.png',
    //     },
    // },
    {
        labelEn: 'Main line obstruction',
        labelFr: 'Obstruction de la conduite principale',
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
];

function escapeHtml(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
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

    visual.classList.toggle('before', side === 'before');
    visual.classList.toggle('after', side === 'after');

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
}

function updateProblemDescriptionRequirement() {
    const needsDescription = issueLocationSelect.value === 'other-location' || issueTypeSelect.value === 'other-issue';

    problemDescriptionField.required = needsDescription;
    problemDescriptionField.setAttribute('aria-required', String(needsDescription));
    problemDescriptionLabel.classList.toggle('required', needsDescription);
}

languageButtons.forEach((button) => {
    button.addEventListener('click', () => {
        const lang = button.textContent === 'FR' ? 'fr' : 'en';
        applyLanguage(lang);
    });
});

issueLocationSelect.addEventListener('change', updateProblemDescriptionRequirement);
issueTypeSelect.addEventListener('change', updateProblemDescriptionRequirement);

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

applyLanguage('fr');
updateProblemDescriptionRequirement();
