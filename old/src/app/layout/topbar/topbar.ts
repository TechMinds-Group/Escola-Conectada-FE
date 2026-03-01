import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ThemeService } from '../../core/services/theme.service';
import { TranslationService } from '../../core/services/translation.service';
import { SearchService, SearchResult } from '../../core/services/search.service';
import { FormsModule } from '@angular/forms';

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
  private router = inject(Router);

  isLanguageSheetOpen = false;
  searchQuery = signal('');

  searchResults = computed(() => {
    return this.searchService.search(this.searchQuery());
  });

  showSearchResults = false;

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

  selectLanguageMobile(lang: 'pt' | 'es') {
    this.translation.setLang(lang);
    this.closeLanguageSheet();
  }
}
