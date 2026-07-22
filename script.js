const languageButtons = document.querySelectorAll('.lang-option');
const translatableText = document.querySelectorAll('[data-en][data-fr]');
const translatablePlaceholders = document.querySelectorAll('[data-placeholder-en][data-placeholder-fr]');
const translatableOptions = document.querySelectorAll('option[data-en][data-fr]');

function applyLanguage(lang) {
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
}

languageButtons.forEach((button) => {
    button.addEventListener('click', () => {
        const lang = button.textContent === 'FR' ? 'fr' : 'en';
        applyLanguage(lang);
    });
});

applyLanguage('fr');
