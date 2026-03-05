import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TRANSLATIONS } from '../../core/data/translations';
import { AuthService } from '../../core/services/auth.service';
import { SearchResult, SearchService } from '../../core/services/search.service';
import { ThemeService } from '../../core/services/theme.service';
import { TranslationService } from '../../core/services/translation.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './topbar.html',
  styleUrl: './topbar.scss',
})
export class Topbar {
  public theme = inject(ThemeService);
  public translation = inject(TranslationService);
  private searchService = inject(SearchService);
  private authService = inject(AuthService);
  private router = inject(Router);

  logout() {
    this.authService.logout();
  }

  // Dynamic language configuration based on available translations
  availableLanguages = Object.keys(TRANSLATIONS).map((code) => ({
    code: code as 'pt' | 'es' | 'en',
    flag: this.getFlagForLanguage(code as 'pt' | 'es' | 'en'),
    name: code, // Will be translated dynamically
  }));

  getFlagForLanguage(lang: 'pt' | 'es' | 'en'): string {
    const flagMap = { pt: 'br', es: 'es', en: 'us' };
    return 'assets/flags/' + flagMap[lang] + '.svg';
  }

  public isLanguageSheetOpen = false;
  public searchQuery = signal('');

  public searchResults = computed(() => {
    return this.searchService.search(this.searchQuery());
  });

  public showSearchResults = false;

  onSearchFocus() {
    this.showSearchResults = true;
  }

  onSearchBlur() {
    // Delay to allow clicking on results
    setTimeout(() => {
      this.showSearchResults = false;
    }, 200);
  }

  navigateToResult(result: SearchResult) {
    this.router.navigate([result.route]);
    this.searchQuery.set('');
    this.showSearchResults = false;
  }

  openLanguageSheet() {
    this.isLanguageSheetOpen = true;
  }

  closeLanguageSheet() {
    this.isLanguageSheetOpen = false;
  }

  selectLanguageMobile(lang: 'pt' | 'es' | 'en') {
    this.translation.setLang(lang);
    this.closeLanguageSheet();
  }
}
