import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ThemeService } from '../../../core/services/theme.service';
import { TranslationService } from '../../../core/services/translation.service';
import { TRANSLATIONS } from '../../../core/data/translations';

@Component({
  selector: 'app-public-menu',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  templateUrl: './public-menu.html',
  styleUrl: './public-menu.scss',
})
export class PublicMenu {
  public theme = inject(ThemeService);
  public translation = inject(TranslationService);

  availableLanguages = Object.keys(TRANSLATIONS).map((code) => ({
    code: code as 'pt' | 'es' | 'en',
    flag: this.getFlagForLanguage(code as 'pt' | 'es' | 'en'),
    name: code,
  }));

  getFlagForLanguage(lang: 'pt' | 'es' | 'en'): string {
    const flagMap = { pt: 'br', es: 'es', en: 'us' };
    return 'assets/flags/' + flagMap[lang] + '.svg';
  }

  isLanguageSheetOpen = false;

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
