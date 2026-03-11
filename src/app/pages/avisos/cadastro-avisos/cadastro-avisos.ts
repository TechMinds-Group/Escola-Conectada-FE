import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonDeleteComponent } from '../../../core/components/buttons/button-delete';
import { ButtonEditComponent } from '../../../core/components/buttons/button-edit';
import { ButtonSaveComponent } from '../../../core/components/buttons/button-save';
import { ButtonCancelComponent } from '../../../core/components/buttons/button-cancel';
import { TextInputComponent } from '../../../core/components/text-input/text-input.component';
import { SelectComponent } from '../../../core/components/select/select.component';
import { TmDateComponent } from '../../../core/components/tm-date/tm-date.component';
import { Aviso, AvisoService } from '../../../core/services/aviso.service';
import { TranslationService } from '../../../core/services/translation.service';
import { ConfirmationService } from '../../../core/services/confirmation.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-cadastro-avisos',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    ButtonDeleteComponent,
    ButtonEditComponent,
    ButtonSaveComponent,
    ButtonCancelComponent,
    TextInputComponent,
    SelectComponent,
    TmDateComponent,
  ],
  templateUrl: './cadastro-avisos.html',
  styleUrl: './cadastro-avisos.scss',
})
export class CadastroAvisos implements OnInit {
  private fb = inject(FormBuilder);
  private avisoService = inject(AvisoService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  public translation = inject(TranslationService);
  private confirmationService = inject(ConfirmationService);
  private notificationService = inject(NotificationService);
  t = this.translation.dictionary;

  avisoForm: FormGroup;
  isEditMode = signal(false);
  isViewMode = signal(false);
  avisoId = signal<string | null>(null);
  saveAttempted = signal(false);
  isSaving = signal(false);

  constructor() {
    this.avisoForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
      content: ['', [Validators.required, Validators.maxLength(150)]],
      type: ['Informativo', Validators.required],
      startDate: [new Date().toISOString().split(':').slice(0, 2).join(':'), Validators.required],
      expirationDate: [null],
    });
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');

    if (id) {
      this.isEditMode.set(true);
      this.isViewMode.set(true);
      this.avisoId.set(id);
      this.loadAviso(id);
      this.avisoForm.disable();
    }
  }

  loadAviso(id: string) {
    this.avisoService.getById(id).subscribe({
      next: (aviso: Aviso) => {
        this.avisoForm.patchValue({
          title: aviso.title,
          content: aviso.content,
          type: aviso.type,
          startDate: aviso.startDate,
          expirationDate: aviso.expirationDate || null,
        });
      },
      error: () => {
        this.notificationService.error('Erro ao carregar os dados do aviso.');
      },
    });
  }

  enableEdit() {
    this.isViewMode.set(false);
    this.avisoForm.enable();
  }

  cancelEdit() {
    this.isViewMode.set(true);
    this.avisoForm.disable();
    const id = this.avisoId();
    if (id) this.loadAviso(id);
    this.saveAttempted.set(false);
  }

  onCancel() {
    if (this.isEditMode() && !this.isViewMode()) {
      this.cancelEdit();
    } else {
      this.router.navigate(['/avisos']);
    }
  }

  onSubmit() {
    this.saveAttempted.set(true);
    if (this.avisoForm.valid) {
      this.isSaving.set(true);
      const formValue = this.avisoForm.getRawValue();
      const id = this.avisoId();

      const payload: Aviso = {
        ...formValue,
        id: id || undefined,
        active: true, // Default for new and current updates
      };

      const request$ =
        this.isEditMode() && id
          ? this.avisoService.update(id, payload)
          : this.avisoService.save(payload);

      request$.subscribe({
        next: () => {
          this.isSaving.set(false);
          this.notificationService.success(
            this.isEditMode() ? 'Aviso atualizado com sucesso!' : 'Aviso criado com sucesso!',
          );
          this.router.navigate(['/avisos']);
        },
        error: () => {
          this.isSaving.set(false);
          this.notificationService.error('Erro ao salvar aviso.');
        },
      });
    } else {
      this.avisoForm.markAllAsTouched();
    }
  }

  async deleteAviso() {
    const id = this.avisoId();
    if (id) {
      const confirmed = await this.confirmationService.confirm({
        message: this.t().admin.notices.form.deleteConfirm,
        confirmClass: 'btn-danger',
        confirmLabel: this.t().admin.notices.buttons.delete,
      });

      if (confirmed) {
        this.avisoService.delete(id).subscribe({
          next: () => {
            this.notificationService.success('Aviso excluído com sucesso!');
            this.router.navigate(['/avisos']);
          },
          error: () => {
            this.notificationService.error('Erro ao excluir aviso.');
          },
        });
      }
    }
  }

  typeOptions = computed(() => [
    { value: 'Informativo', label: this.t().admin.notices.form.types.Informativo },
    { value: 'Urgente', label: this.t().admin.notices.form.types.Urgente },
    { value: 'Sucesso', label: this.t().admin.notices.form.types.Sucesso },
  ]);
}
