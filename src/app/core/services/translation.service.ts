import { Injectable, signal, computed } from '@angular/core';
import { TRANSLATIONS } from '../data/translations';

type Lang = 'pt' | 'es' | 'en';

@Injectable({
  providedIn: 'root',
})
export class TranslationService {
  // State
  private currentLang = signal<Lang>('pt');

  // Selectors
  lang = this.currentLang.asReadonly();

  // Dictionary Access
  // Flattened for consumption in templates: t('public.headers.studentPortal')
  // For simplicity in this iteration, we do a direct object lookup.

  constructor() {
    // Try to detect browser lang or load from storage
    const saved = localStorage.getItem('app_lang') as Lang;
    if (saved && ['pt', 'es', 'en'].includes(saved)) {
      this.currentLang.set(saved);
    }
  }

  setLang(lang: Lang) {
    this.currentLang.set(lang);
    localStorage.setItem('app_lang', lang);
  }

  // The main translation method.
  // Note: For signals in templates, it's efficient to return a signal or use a pipe.
  // Since we want reactivity without pipes, we can expose a computed dictionary OR simple method helper.
  // Ideally, use a computed signal that returns the WHOLE dictionary for the current lang.

  dictionary = computed(() => {
    return TRANSLATIONS[this.currentLang()];
  });

  // Helper to safely access nested properties strings like 'public.headers.studentPortal'
  // But strictly typed access via dictionary() is better for type safety if we defined interfaces.
  // For now, let's expose the raw dictionary object so the template can do: translation.dictionary().public.headers.studentPortal

  formatDate(
    date: Date | string,
    format: 'time' | 'shortDate' | 'month' | 'day' | 'timeSeconds' = 'shortDate',
  ): string {
    const d = new Date(date);
    const lang = this.lang(); // 'pt', 'es'
    const localeMap: Record<string, string> = { pt: 'pt-BR', es: 'es-ES' };
    const locale = localeMap[lang] || 'pt-BR';

    if (format === 'time') {
      return new Intl.DateTimeFormat(locale, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(d);
    }
    if (format === 'timeSeconds') {
      return d.toLocaleTimeString(locale);
    }
    if (format === 'month') {
      return new Intl.DateTimeFormat(locale, { month: 'short' })
        .format(d)
        .toUpperCase()
        .replace('.', '');
    }
    if (format === 'day') {
      return new Intl.DateTimeFormat(locale, { day: '2-digit' }).format(d);
    }

    return new Intl.DateTimeFormat(locale).format(d);
  }
}
