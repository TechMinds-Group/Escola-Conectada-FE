import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LogService, AuditLogDto } from '../../../core/services/log.service';
import { TranslationService } from '../../../core/services/translation.service';
import { ConfirmationService } from '../../../core/services/confirmation.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-consulta-log',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './consulta-log.html',
})
export class ConsultaLogComponent implements OnInit {
  private logService = inject(LogService);
  protected translation = inject(TranslationService);
  private confirm = inject(ConfirmationService);

  logs = signal<AuditLogDto[]>([]);
  isLoading = signal(false);
  displayedColumns = [
    'timestamp',
    'actionType',
    'entityName',
    'userName',
    'description',
    'actions',
  ];

  t = this.translation.dictionary;

  ngOnInit(): void {
    this.loadLogs();
  }

  loadLogs(): void {
    this.isLoading.set(true);
    this.logService
      .getAll()
      .pipe(
        finalize(() => {
          this.isLoading.set(false);
        }),
      )
      .subscribe({
        next: (data: AuditLogDto[]) => {
          this.logs.set(data);
        },
        error: (err: any) => console.error('Erro ao carregar logs', err),
      });
  }

  restore(log: AuditLogDto): void {
    const labels: any = this.t();
    this.confirm
      .confirm({
        message: labels.admin.logs.restoreConfirm,
        title: labels.admin.logs.buttons.restore,
        confirmLabel: labels.admin.logs.buttons.restore,
        cancelLabel: labels.admin.sidebar.logout.split(' ')[0], // Fallback for cancel
      })
      .then((confirmed: boolean) => {
        if (confirmed) {
          this.isLoading.set(true);
          this.logService
            .restore(log.id)
            .pipe(finalize(() => this.isLoading.set(false)))
            .subscribe({
              next: () => {
                this.loadLogs();
              },
              error: (err: any) => console.error('Erro ao restaurar', err),
            });
        }
      });
  }
}
