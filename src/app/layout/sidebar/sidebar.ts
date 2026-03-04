import {
  Component,
  inject,
  ChangeDetectorRef,
  OnInit,
  OnDestroy,
  Input,
  Renderer2,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { ThemeService } from '../../core/services/theme.service';
import { LanguageService } from '../../core/services/language.service';
import { TranslationService } from '../../core/services/translation.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar implements OnInit, OnDestroy {
  @Input() tourAnchorEnabled = false;

  // 100% Manual State
  isCollapsed = false;
  isCadastrosOpen = false;
  isAdminOpen = false;
  sidebarWidth = 280; // Fixed default expanded width

  public theme = inject(ThemeService);
  public lang = inject(LanguageService);
  public translation = inject(TranslationService);
  t = this.translation.dictionary;
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private renderer = inject(Renderer2);
  private document = inject(DOCUMENT);
  private sub = new Subscription();

  ngOnInit() {
    this.checkActiveRoute(false); // No detectChanges on init

    this.sub.add(
      this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
        this.checkActiveRoute(true);
      }),
    );
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  toggleCollapse() {
    this.isCollapsed = !this.isCollapsed;

    // Update Body Class for Modal Centering
    if (this.isCollapsed) {
      this.renderer.addClass(this.document.body, 'sidebar-collapsed');
    } else {
      this.renderer.removeClass(this.document.body, 'sidebar-collapsed');
    }

    // When collapsing, we usually want to close submenus to keep it clean
    if (this.isCollapsed) {
      this.isCadastrosOpen = false;
    }
    this.cdr.detectChanges();
  }

  toggleCadastros() {
    this.isCadastrosOpen = !this.isCadastrosOpen;
    if (this.isCadastrosOpen) {
      this.isAdminOpen = false;
    }
    this.cdr.detectChanges();
  }

  toggleAdmin() {
    this.isAdminOpen = !this.isAdminOpen;
    if (this.isAdminOpen) {
      this.isCadastrosOpen = false;
    }
    this.cdr.detectChanges();
  }
  private checkActiveRoute(runDetection: boolean) {
    const cadastrosRoutes = [
      '/professores',
      '/classes',
      '/ambientes',
      '/subjects',
      '/school-matrices',
      '/calendar',
      '/avisos',
    ];
    const adminRoutes = ['/time-grids', '/structure', '/tv-settings', '/consulta-configuracao'];
    const currentUrl = this.router.url;

    if (cadastrosRoutes.some((route) => currentUrl.includes(route))) {
      this.isCadastrosOpen = true;
    }
    if (adminRoutes.some((route) => currentUrl.includes(route))) {
      this.isAdminOpen = true;
    }

    if (runDetection) {
      this.cdr.detectChanges();
    }
  }
}
