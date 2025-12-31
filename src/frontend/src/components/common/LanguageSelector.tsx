/**
 * LanguageSelector Component
 * Dropdown menu for selecting language (Japanese, English)
 */
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { useTranslation } from 'react-i18next';

type Language = 'ja' | 'en';

interface LanguageOption {
  value: Language;
  label: string;
  nativeName: string;
}

const languageOptions: LanguageOption[] = [
  {
    value: 'ja',
    label: '日本語',
    nativeName: '日本語',
  },
  {
    value: 'en',
    label: 'English',
    nativeName: 'English',
  },
];

export const LanguageSelector: React.FC = () => {
  const { language, setLanguage } = useUIStore();
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLanguage = languageOptions.find((option) => option.value === language);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleLanguageSelect = async (selectedLanguage: Language) => {
    setLanguage(selectedLanguage);
    await i18n.changeLanguage(selectedLanguage);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-bg-tertiary rounded-md transition-colors text-text-primary flex items-center gap-2 border border-transparent hover:border-border-subtle"
        aria-label="Select language"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
          />
        </svg>
        <span className="text-sm hidden sm:inline">{currentLanguage?.nativeName}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-40 bg-bg-secondary border border-border-subtle rounded-lg shadow-lg overflow-hidden z-50"
          role="menu"
          aria-orientation="vertical"
        >
          {languageOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleLanguageSelect(option.value)}
              className={`w-full px-4 py-2 text-left flex items-center gap-3 hover:bg-bg-tertiary transition-colors ${
                language === option.value ? 'bg-bg-tertiary text-accent-primary font-medium' : 'text-text-primary'
              }`}
              role="menuitem"
            >
              <span>{option.nativeName}</span>
              {language === option.value && (
                <svg className="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
