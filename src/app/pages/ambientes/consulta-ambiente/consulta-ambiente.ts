import {
  Component,
  computed,
  inject,
  signal,
  OnInit,
  AfterViewInit,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SchoolDataService, SchoolRoom } from '../../../core/services/school-data';
import { AmbienteService } from '../../../core/services/ambiente.service';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { LanguageService } from '../../../core/services/language.service';
import { TranslationService } from '../../../core/services/translation.service';
import { ConfirmationService } from '../../../core/services/confirmation.service';

@Component({
  selector: 'app-consulta-ambiente',
  standalone: true,
  imports: [CommonModule, FormsModule, MatMenuModule, MatButtonModule, MatIconModule],
  templateUrl: './consulta-ambiente.html',
  styleUrl: './consulta-ambiente.scss',
})
export class ConsultaAmbiente implements OnInit, AfterViewInit {
  public lang = inject(LanguageService);
  public schoolData = inject(SchoolDataService);
  private ambienteService = inject(AmbienteService);
  private router = inject(Router);
  public translation = inject(TranslationService);
  private cdr = inject(ChangeDetectorRef);
  private confirmationService = inject(ConfirmationService);
  t = this.translation.dictionary;

  // Filters
  filterType = signal<string>('Todos');

  // Data
  roomsList = signal<SchoolRoom[]>([]);
  rooms = computed(() => {
    let list = this.roomsList();
    const type = this.filterType();

    if (type !== 'Todos') {
      list = list.filter((r) => r.type === type);
    }
    return list;
  });

  ngOnInit() {
    this.loadRooms();
  }

  ngAfterViewInit() {
    this.cdr.detectChanges();
  }

  loadRooms() {
    this.ambienteService.list().subscribe({
      next: (res: any) => {
        const rooms = res && res.data ? res.data : res;
        this.roomsList.set(rooms);
        // Sync with mock schoolData for consistency in other parts of app if needed
        this.schoolData.schoolRooms.set(rooms);
      },
      error: (err) => console.error('Erro ao carregar ambientes:', err),
    });
  }

  getResourceLabel(res: string): string {
    const resources = this.t().admin.rooms.form.resources as Record<string, string>;
    return resources[res] || res;
  }

  navigateToNew() {
    this.router.navigate(['/ambientes/new']);
  }

  navigateToEdit(id: string) {
    this.router.navigate(['/ambientes/edit', id]);
  }

  async deleteRoom(id: string) {
    const confirmed = await this.confirmationService.confirm({
      message: this.t().admin.rooms.deleteConfirm,
      confirmClass: 'btn-danger',
      confirmLabel: 'Excluir',
    });

    if (confirmed) {
      this.ambienteService.delete(id).subscribe({
        next: () => this.loadRooms(),
        error: (err) => console.error('Erro ao excluir ambiente:', err),
      });
    }
  }

  completeTutorial() {
    this.ambienteService.completeTutorial();
  }
}
