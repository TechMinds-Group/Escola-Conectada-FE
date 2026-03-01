import { Component, OnInit, inject, Input } from '@angular/core';
import { RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { TranslationService } from '../../core/services/translation.service';
import { ProfessorService } from '../../core/services/professor.service';
import { AmbienteService } from '../../core/services/ambiente.service';

@Component({
  selector: 'app-mobile-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './mobile-navbar.html',
  styleUrl: './mobile-navbar.scss',
})
export class MobileNavbar implements OnInit {
  @Input() tourAnchorEnabled = false;
  public t = inject(TranslationService).dictionary;
  private professorService = inject(ProfessorService);
  private ambienteService = inject(AmbienteService);
  isCadastrosOpen = false;
  isConfigOpen = false;
  isProfileOpen = false;

  constructor(public router: Router) {}

  ngOnInit() {
    // Fecha o menu de cadastros automaticamente ao navegar para qualquer rota
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      this.isCadastrosOpen = false;
      this.isConfigOpen = false;
      this.isProfileOpen = false;
    });
  }

  toggleCadastros(event: Event) {
    event.stopPropagation();
    this.isCadastrosOpen = !this.isCadastrosOpen;
    this.isConfigOpen = false; // Close others
    this.isProfileOpen = false;
  }

  toggleConfig(event: Event) {
    event.stopPropagation();
    this.isConfigOpen = !this.isConfigOpen;
    this.isCadastrosOpen = false; // Close others
    this.isProfileOpen = false;
  }

  toggleProfile(event: Event) {
    event.stopPropagation();
    this.isProfileOpen = !this.isProfileOpen;
    this.isCadastrosOpen = false;
    this.isConfigOpen = false;
  }

  closeMenu() {
    this.isCadastrosOpen = false;
    this.isConfigOpen = false;
    this.isProfileOpen = false;
  }
}
