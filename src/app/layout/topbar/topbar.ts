import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TRANSLATIONS } from '../../core/data/translations';
import { AuthService } from '../../core/services/auth.service';
import { SearchResult, SearchService } from '../../core/services/search.service';
import { ReservaService } from '../../core/services/reserva.service';
import { ThemeService } from '../../core/services/theme.service';
import { TranslationService } from '../../core/services/translation.service';
import { NotificacaoService, Notificacao } from '../../core/services/notificacao.service';
import { NotificationService } from '../../core/services/notification.service';
import { OnInit } from '@angular/core';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './topbar.html',
  styleUrl: './topbar.scss',
})
export class Topbar implements OnInit {
  public theme = inject(ThemeService);
  public translation = inject(TranslationService);
  public notificationService = inject(NotificacaoService);
  private searchService = inject(SearchService);
  private authService = inject(AuthService);
  private reservaService = inject(ReservaService);
  private notification = inject(NotificationService);
  private router = inject(Router);

  ngOnInit(): void {
    this.notificationService.loadNotifications();
  }

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
  public isNotificationOpen = signal(false);
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

  markAsRead(notif: Notificacao) {
    if (!notif.lida) {
      this.notificationService.markAsRead(notif.id).subscribe();
    }
  }

  markAllAsRead(event: Event) {
    event.stopPropagation();
    this.notificationService.markAllAsRead().subscribe();
  }

  handleNotificationClick(notif: Notificacao) {
    this.markAsRead(notif);
    this.closeNotifications();

    const reservaId = this.extractReservaId(notif.mensagem);
    if (reservaId) {
      // Navigate to reservations with the specific ID to open modal
      this.router.navigate(['/reservas-salas'], { queryParams: { reservaId } });
      return;
    }

    if (notif.titulo.includes('Solicitação') || notif.titulo.includes('conflito')) {
      this.router.navigate(['/reservas-salas']);
    }
  }

  toggleNotifications(event: Event) {
    event.stopPropagation();
    this.isNotificationOpen.update((v) => !v);
  }

  closeNotifications() {
    this.isNotificationOpen.set(false);
  }

  extractReservaId(message: string): string | null {
    const match = message.match(/\[RESERVA_ID:([a-fA-F0-9-]+)\]/);
    return match ? match[1] : null;
  }

  getCleanMessage(message: string): string {
    return message.replace(/\[RESERVA_ID:[a-fA-F0-9-]+\]/, '').trim();
  }

  hasReservaLink(message: string): boolean {
    return /\[RESERVA_ID:[a-fA-F0-9-]+\]/.test(message);
  }

  acceptRequest(notif: Notificacao, event: Event) {
    event.stopPropagation();

    this.reservaService.aceitarSolicitacao(notif.id).subscribe({
      next: (res: any) => {
        this.notification.success(res.message || 'Solicitação aceita!');
        this.notificationService.loadNotifications();
      },
      error: (err: any) => {
        console.error('Erro ao aceitar solicitação', err);
        this.notification.error(err?.error?.message || 'Erro ao aceitar solicitação');
      },
    });
  }
}
