// Localization layer for Descrollify.
//
// Unlike chrome.i18n (which is locked to the browser UI language), this loads
// the _locales/<lang>/messages.json files itself so the user can override the
// language from the Options page. The stored choice lives in options.language;
// "auto" (the default) follows the browser language.
//
// HTML usage (auto-applied on page load):
//   <span data-i18n="key"></span>               -> textContent
//   <input data-i18n-placeholder="key">         -> placeholder attribute
//   <el data-i18n-title="key">                  -> title attribute
//   <img data-i18n-alt="key">                   -> alt attribute
//
// JS usage:
//   await i18n.load();
//   i18n.getMessage("key", [sub1, sub2]);       // chrome.i18n-compatible

'use strict';

(function () {
  // Locales that ship real translations. Everything else falls back to English.
  const AVAILABLE = ['en', 'es', 'de', 'fr', 'pt_BR', 'ru', 'it'];
  const DEFAULT_LOCALE = 'en';

  let messages = {};      // English base overlaid with the active locale
  let loadPromise = null;

  // Map a browser tag like "pt-BR" / "es-419" onto one of AVAILABLE.
  function normalizeLocale(tag) {
    if (!tag) return DEFAULT_LOCALE;
    const t = tag.replace('-', '_');
    if (AVAILABLE.includes(t)) return t;            // exact, e.g. pt_BR
    const base = t.split('_')[0];
    if (base === 'pt') return 'pt_BR';              // any Portuguese -> pt_BR
    if (AVAILABLE.includes(base)) return base;      // en, es, de, fr, ru, it
    return DEFAULT_LOCALE;
  }

  async function resolveLocale() {
    let choice = 'auto';
    try {
      const { options } = await chrome.storage.local.get('options');
      if (options && options.language) choice = options.language;
    } catch (e) {
      // storage may not be ready extremely early; fall through to auto
    }
    if (choice && choice !== 'auto') return normalizeLocale(choice);
    const ui = (chrome.i18n && chrome.i18n.getUILanguage)
      ? chrome.i18n.getUILanguage()
      : navigator.language;
    return normalizeLocale(ui);
  }

  async function fetchMessages(locale) {
    const url = chrome.runtime.getURL(`_locales/${locale}/messages.json`);
    const res = await fetch(url);
    return res.json();
  }

  async function loadInternal() {
    const locale = await resolveLocale();
    const base = await fetchMessages(DEFAULT_LOCALE);
    let active = base;
    if (locale !== DEFAULT_LOCALE) {
      try { active = await fetchMessages(locale); } catch (e) { active = {}; }
    }
    messages = Object.assign({}, base, active);     // English fills any gaps
    return messages;
  }

  // Idempotent: repeated calls share one fetch until reload() is called.
  function load() {
    if (!loadPromise) loadPromise = loadInternal();
    return loadPromise;
  }

  // chrome.i18n.getMessage-compatible: resolves $placeholder$ then $1, $2, ...
  function getMessage(key, substitutions) {
    const entry = messages[key];
    if (!entry) return '';
    let msg = entry.message;
    const placeholders = entry.placeholders || {};
    msg = msg.replace(/\$(\w+)\$/g, (m, name) => {
      const ph = placeholders[name.toLowerCase()];
      return ph ? ph.content : m;
    });
    if (substitutions != null) {
      const arr = Array.isArray(substitutions) ? substitutions : [substitutions];
      msg = msg.replace(/\$(\d+)/g, (m, n) => (arr[n - 1] != null ? String(arr[n - 1]) : ''));
    }
    return msg;
  }

  function applyToDom(root) {
    root = root || document;
    const fill = (attr, setter) => root.querySelectorAll(`[${attr}]`).forEach((el) => {
      const msg = getMessage(el.getAttribute(attr));
      if (msg) setter(el, msg);
    });
    fill('data-i18n', (el, m) => (el.textContent = m));
    fill('data-i18n-placeholder', (el, m) => el.setAttribute('placeholder', m));
    fill('data-i18n-title', (el, m) => el.setAttribute('title', m));
    fill('data-i18n-alt', (el, m) => el.setAttribute('alt', m));
  }

  const i18n = {
    AVAILABLE,
    load,
    getMessage,
    applyToDom,
    // Re-resolve and re-render after the user changes the language setting.
    async reload(root) {
      loadPromise = loadInternal();
      await loadPromise;
      applyToDom(root);
    },
  };

  // Expose to both extension pages (window) and content scripts (self).
  (typeof window !== 'undefined' ? window : self).i18n = i18n;

  // Auto-localize standalone HTML pages. Skipped on pages with no markers
  // (e.g. the YouTube tab a content script runs in) to avoid needless fetches.
  if (typeof document !== 'undefined') {
    const run = () => {
      if (!document.querySelector('[data-i18n],[data-i18n-placeholder],[data-i18n-title],[data-i18n-alt]')) return;
      load().then(() => applyToDom());
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', run);
    } else {
      run();
    }
  }
})();
