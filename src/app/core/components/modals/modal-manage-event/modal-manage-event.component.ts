import { Component, Input, Output, EventEmitter, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  FormsModule,
} from '@angular/forms';
import { EventoService, Evento } from '../../../services/evento.service';
import { TranslationService } from '../../../services/translation.service';
import { MatIconModule } from '@angular/material/icon';
import { NotificationService } from '../../../services/notification.service';
import { format, setHours, setMinutes, parseISO } from 'date-fns';
import { TextInputComponent } from '../../text-input/text-input.component';
import { SelectComponent } from '../../select/select.component';

@Component({
  selector: 'app-modal-manage-event',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatIconModule,
    TextInputComponent,
    SelectComponent,
  ],
  templateUrl: './modal-manage-event.component.html',
  styleUrls: ['./modal-manage-event.component.scss'],
})
export class ModalManageEventComponent {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  @Output() onSaved = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private eventoService = inject(EventoService);
  private notification = inject(NotificationService);
  public translation = inject(TranslationService);
  t = this.translation.dictionary;

  eventForm: FormGroup;
  editingEventId = signal<string | null>(null);
  currentEvent = signal<Evento | null>(null);
  isSubmitting = signal(false);

  categories = this.eventoService.eventCategories;
  categoryOptions = computed(() => {
    return this.categories().map((c) => ({ value: c, label: c }));
  });

  @Output() onCategoryManage = new EventEmitter<void>();

  constructor() {
    this.eventForm = this.fb.group({
      titulo: ['', Validators.required],
      dataInicio: ['', Validators.required],
      dataFim: ['', Validators.required],
      categoria: ['Prova', Validators.required],
      descricao: [''],
    });
  }

  closeModal() {
    this.close.emit();
    this.reset();
  }

  reset() {
    this.editingEventId.set(null);
    this.eventForm.reset({
      categoria: 'Prova',
      dataInicio: '',
      dataFim: '',
    });
    this.isSubmitting.set(false);
  }

  startNew(date?: Date) {
    this.reset();
    if (date) {
      // Definir 08:00 às 09:00 por padrão
      const start = setMinutes(setHours(date, 8), 0);
      const end = setMinutes(setHours(date, 9), 0);

      this.eventForm.patchValue({
        dataInicio: format(start, "yyyy-MM-dd'T'HH:mm"),
        dataFim: format(end, "yyyy-MM-dd'T'HH:mm"),
      });
    }
  }

  startEdit(event: Evento) {
    this.editingEventId.set(event.id || null);
    this.currentEvent.set(event);
    this.eventForm.patchValue({
      titulo: event.titulo,
      dataInicio: event.dataInicio ? format(parseISO(event.dataInicio), "yyyy-MM-dd'T'HH:mm") : '',
      dataFim: event.dataFim ? format(parseISO(event.dataFim), "yyyy-MM-dd'T'HH:mm") : '',
      categoria: event.categoria,
      descricao: event.descricao || '',
    });
  }

  saveEvent() {
    if (this.eventForm.invalid) {
      this.notification.error('Preencha todos os campos obrigatórios.');
      return;
    }

    this.isSubmitting.set(true);
    const formValue = this.eventForm.value;
    const id = this.editingEventId();

    // Merge form values with existing event to preserve hidden fields/IDs
    const payload: Partial<Evento> = {
      ...(id ? this.currentEvent() : {}),
      ...formValue,
      id: id || undefined,
      dataInicio: parseISO(formValue.dataInicio).toISOString(),
      dataFim: parseISO(formValue.dataFim).toISOString(),
    };

    console.log('[DEBUG] Tentando salvar evento:', { id, payload });

    const request = id
      ? this.eventoService.update(id, payload)
      : this.eventoService.create(payload);

    request.subscribe({
      next: (res) => {
        console.log('[DEBUG] Sucesso ao salvar:', res);
        this.notification.success(id ? 'Evento atualizado!' : 'Evento criado!');
        this.eventoService.notifyUpdate(); // Disparar recarregamento
        this.onSaved.emit();
        this.closeModal();
      },
      error: (err) => {
        console.error('[DEBUG] Erro ao salvar evento:', {
          status: err.status,
          message: err.message,
          error: err.error, // Detalhes de validação do servidor (ex: ProblemDetails)
        });
        this.notification.error('Erro ao salvar evento.');
        this.isSubmitting.set(false);
      },
    });
  }

  deleteEvent() {
    const id = this.editingEventId();
    if (!id) return;

    if (confirm('Deseja realmente excluir este evento?')) {
      this.eventoService.delete(id).subscribe({
        next: () => {
          this.notification.success('Evento excluído!');
          this.eventoService.notifyUpdate(); // Disparar recarregamento
          this.onSaved.emit();
          this.closeModal();
        },
        error: (err) => {
          console.error('Erro ao excluir evento:', err);
          this.notification.error('Erro ao excluir evento.');
        },
      });
    }
  }
}
