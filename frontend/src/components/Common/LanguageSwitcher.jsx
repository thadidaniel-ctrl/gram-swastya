import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

const languages = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी', flag: '🇮🇳' },
];

export function LanguageSwitcher() {
  const { i18n } = useTranslation('settings');
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  const currentLang = i18n.language || 'en';
  const current = languages.find(l => l.code === currentLang) || languages[0];

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const changeLanguage = (code) => {
    i18n.changeLanguage(code);
    setOpen(false);
  };

  return (
    <div className="relative" data-testid="language-switcher" ref={rootRef}>
      <button
        type="button"
        className="btn btn-ghost btn-sm flex items-center gap-2 px-3 py-1.5"
        aria-label={`Select language (current: ${current.nativeName})`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(prev => !prev)}
      >
        <span className="text-lg" aria-hidden="true">{current.flag}</span>
        <span className="hidden sm:inline">{current.name}</span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <ul
          className="absolute right-0 mt-1 min-w-[140px] bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 py-1 z-50"
          role="listbox"
          aria-label="Select language"
        >
          {languages.map(lang => (
            <li key={lang.code} role="option" aria-selected={lang.code === currentLang}>
              <button
                type="button"
                onClick={() => changeLanguage(lang.code)}
                className={`w-full px-3 py-2 flex items-center gap-2 text-left transition-colors ${
                  lang.code === currentLang
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary font-medium'
                    : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700'
                }`}
              >
                <span className="text-lg" aria-hidden="true">{lang.flag}</span>
                <span>{lang.nativeName}</span>
                {lang.code === currentLang && (
                  <svg className="w-4 h-4 ml-auto text-primary" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default LanguageSwitcher;