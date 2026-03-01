import { Injectable, signal, effect } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class ThemeService {
    private readonly THEME_KEY = 'user-theme';
    isDarkMode = signal<boolean>(this.loadTheme());

    constructor() {
        effect(() => {
            const dark = this.isDarkMode();
            localStorage.setItem(this.THEME_KEY, dark ? 'dark' : 'light');
            this.applyTheme(dark);
        });
    }

    toggleTheme() {
        this.isDarkMode.update(v => !v);
    }

    private loadTheme(): boolean {
        const saved = localStorage.getItem(this.THEME_KEY);
        if (saved) return saved === 'dark';
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    private applyTheme(dark: boolean) {
        const theme = dark ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', theme);
    }
}
