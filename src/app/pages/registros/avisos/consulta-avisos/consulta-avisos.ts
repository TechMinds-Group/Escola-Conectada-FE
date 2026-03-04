import {
  Component,
  computed,
  inject,
  signal,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AvisoService, Aviso } from '../../../../core/services/aviso.service';
import { TranslationService } from '../../../../core/services/translation.service';
import { ConfirmationService } from '../../../../core/services/confirmation.service';

@Component({
  selector: 'app-consulta-avisos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './consulta-avisos.html',
  styleUrl: './consulta-avisos.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConsultaAvisos implements OnInit {
  private avisoService = inject(AvisoService);
  private router = inject(Router);
  public translation = inject(TranslationService);
  private confirmationService = inject(ConfirmationService);

  t = this.translation.dictionary;

  // Filters
  filterText = signal<string>('');
  filterType = signal<string>('Todos');

  // Data
  avisosList = signal<Aviso[]>([]);
  isLoading = signal<boolean>(false);

  avisos = computed(() => {
    let list = this.avisosList();
    const text = this.filterText().toLowerCase();
    const type = this.filterType();

    if (text) {
      list = list.filter((a) => a.title.toLowerCase().includes(text));
    }

    if (type !== 'Todos') {
      list = list.filter((a) => a.type === type);
    }

    return list;
  });

  ngOnInit() {
    this.loadAvisos();
  }

  loadAvisos() {
    this.isLoading.set(true);
    this.avisoService.list().subscribe({
      next: (res) => {
        this.avisosList.set(res);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Erro ao carregar avisos:', err);
        this.isLoading.set(false);
      },
    });
  }

  getTipoBadge(type: string): string {
    switch (type) {
      case 'Urgente':
        return 'bg-danger-subtle text-danger border-danger';
      case 'Sucesso':
        return 'bg-success-subtle text-success border-success';
      default:
        return 'bg-primary-subtle text-primary border-primary';
    }
  }

  alternarAtivo(aviso: Aviso) {
    const updated = { ...aviso, active: !aviso.active };
    this.avisoService.update(aviso.id!, updated).subscribe({
      next: () => this.loadAvisos(),
      error: (err) => console.error('Erro ao alternar status:', err),
    });
  }

  navigateToNew() {
    this.router.navigate(['/avisos/new']);
  }

  navigateToEdit(id: string) {
    this.router.navigate(['/avisos/edit', id]);
  }

  async deleteAviso(event: Event, id: string) {
    event.stopPropagation();
    const confirmed = await this.confirmationService.confirm({
      message: this.t().admin.notices.form.deleteConfirm,
      confirmClass: 'btn-danger',
      confirmLabel: this.t().admin.notices.buttons.delete,
    });

    if (confirmed) {
      this.avisoService.delete(id).subscribe({
        next: () => this.loadAvisos(),
        error: (err) => console.error('Erro ao excluir aviso:', err),
      });
    }
  }
}
