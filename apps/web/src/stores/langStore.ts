import { create } from 'zustand';
import { translate, type Lang, type TranslationKey } from '../i18n/dictionaries.js';

export type { Lang };

const LANGS: Lang[] = ['en', 'th'];

const isLang = (value: unknown): value is Lang => LANGS.includes(value as Lang);

/**
 * A stored choice always wins. Without one, follow the browser — the audience is
 * Thai, so an unset visitor should not have to find the toggle first.
 */
const getInitialLang = (): Lang => {
  if (typeof window === 'undefined') return 'en';

  const saved = localStorage.getItem('party_lang');
  if (isLang(saved)) return saved;

  return navigator.language?.toLowerCase().startsWith('th') ? 'th' : 'en';
};

const applyLang = (lang: Lang) => {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lang;
    // The site name is a proper noun, but "Party Games" is a sentence a screen
    // reader and the browser tab should hear in the visitor's language.
    document.title = translate(lang, 'app.title');
  }
};

const initialLang = getInitialLang();
if (typeof window !== 'undefined') applyLang(initialLang);

interface LangStore {
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
}

export const useLangStore = create<LangStore>((set, get) => ({
  lang: initialLang,
  setLang: (lang: Lang) => {
    localStorage.setItem('party_lang', lang);
    applyLang(lang);
    set({ lang });
  },
  toggleLang: () => get().setLang(get().lang === 'en' ? 'th' : 'en'),
}));

/**
 * Translation for components. Re-renders the caller when the language changes.
 */
export const useT = () => {
  const lang = useLangStore((s) => s.lang);
  return (key: TranslationKey, vars?: Record<string, string | number>) =>
    translate(lang, key, vars);
};

/**
 * Translation for callbacks and error paths outside the render tree, where there
 * is nothing to re-render — a socket toast, a confirm dialog, an alert.
 */
export const t = (key: TranslationKey, vars?: Record<string, string | number>) =>
  translate(useLangStore.getState().lang, key, vars);
