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
import { AvisoService, Aviso } from '../../../../core/services/aviso.service';
import { TranslationService } from '../../../../core/services/translation.service';
import { ConfirmationService } from '../../../../core/services/confirmation.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ButtonDeleteComponent } from '../../../../core/components/buttons/button-delete';
import { ButtonEditComponent } from '../../../../core/components/buttons/button-edit';
import { ButtonSaveComponent } from '../../../../core/components/buttons/button-save';
import { ButtonCancelComponent } from '../../../../core/components/buttons/button-cancel';

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

  constructor() {
    this.avisoForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
      content: ['', [Validators.required, Validators.maxLength(150)]],
      type: ['Informativo', Validators.required],
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
        });
      },
      error: (err) => {
        console.error('Erro ao carregar aviso:', err);
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
    this.router.navigate(['/avisos']);
  }

  onSubmit() {
    this.saveAttempted.set(true);
    if (this.avisoForm.valid) {
      const formValue = this.avisoForm.value;
      const id = this.avisoId();

      if (this.isEditMode() && id) {
        this.avisoService.update(id, formValue).subscribe({
          next: () => {
            this.notificationService.success('Aviso atualizado com sucesso!');
            this.router.navigate(['/avisos']);
          },
          error: (err) => {
            console.error('Erro ao atualizar aviso:', err);
            this.notificationService.error('Erro ao atualizar aviso.');
          },
        });
      } else {
        this.avisoService.save(formValue).subscribe({
          next: () => {
            this.notificationService.success('Aviso criado com sucesso!');
            this.router.navigate(['/avisos']);
          },
          error: (err) => {
            console.error('Erro ao cadastrar aviso:', err);
            this.notificationService.error('Erro ao cadastrar aviso.');
          },
        });
      }
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
          error: (err) => {
            console.error('Erro ao excluir aviso:', err);
            this.notificationService.error('Erro ao excluir aviso.');
          },
        });
      }
    }
  }
}
