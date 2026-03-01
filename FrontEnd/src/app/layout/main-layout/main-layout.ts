import { Component, inject, computed, signal } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { Sidebar } from '../sidebar/sidebar';
import { Topbar } from '../topbar/topbar';
import { MobileNavbar } from '../mobile-navbar/mobile-navbar';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, Sidebar, Topbar, MobileNavbar],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss',
})
export class MainLayout {
  router = inject(Router);

  isMobile = signal(window.innerWidth < 992);

  // Detect if we are in the public view
  isPublicView = computed(() => this.router.url.includes('/view'));

  // Should hide sidebars/topbars on web for public view
  hideNavigation = computed(() => this.isPublicView() && !this.isMobile());

  constructor() {
    window.addEventListener('resize', () => {
      this.isMobile.set(window.innerWidth < 992);
    });
  }
}
