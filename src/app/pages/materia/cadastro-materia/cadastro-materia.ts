import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LanguageService } from '../../../core/services/language.service';
import { SchoolDataService, Subject } from '../../../core/services/school-data';
import { NotificationService } from '../../../core/services/notification.service';
import { TranslationService } from '../../../core/services/translation.service';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ConfirmationService } from '../../../core/services/confirmation.service';
import { ButtonSaveComponent } from '../../../core/components/buttons/button-save';
import { ButtonCancelComponent } from '../../../core/components/buttons/button-cancel';
import { ButtonDeleteComponent } from '../../../core/components/buttons/button-delete';
import { ButtonEditComponent } from '../../../core/components/buttons/button-edit';

@Component({
  selector: 'app-cadastro-materia',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatMenuModule,
    MatButtonModule,
    MatIconModule,
    ButtonSaveComponent,
    ButtonCancelComponent,
    ButtonDeleteComponent,
    ButtonEditComponent,
  ],
  templateUrl: './cadastro-materia.html',
  styleUrl: './cadastro-materia.scss',
})
export class CadastroMateria implements OnInit {
  public schoolData = inject(SchoolDataService);
  public lang = inject(LanguageService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private location = inject(Location);
  private notification = inject(NotificationService);
  private confirmationService = inject(ConfirmationService);
  public translation = inject(TranslationService);
  t = this.translation.dictionary;

  subjectId = signal<string | null>(null);
  saveAttempted = signal(false);
  isSubmitting = signal(false);
  isEditMode = signal(false);
  isViewMode = signal(false);

  subjectForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    category: ['Base Comum', Validators.required],
    axis: ['', Validators.required],
    color: ['#6366f1', Validators.required], // Modern Indigo as default
  });

  presetColors = [
    '#6366f1', // Indigo
    '#0ea5e9', // Sky
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#06b6d4', // Cyan
    '#f97316', // Orange
    '#84cc16', // Lime
    '#64748b', // Slate
    '#475569', // Slate darker
  ];

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    this.schoolData.loadSubjects();

    if (id) {
      this.isEditMode.set(true);
      this.isViewMode.set(true);
      this.subjectId.set(id);
      this.loadSubject(id);
      this.subjectForm.disable();
    }
  }

  loadSubject(id: string) {
    const subject = this.schoolData.subjects().find((s) => s.id === id);
    if (subject) {
      this.subjectForm.patchValue({
        name: subject.name,
        category: subject.category,
        axis: subject.axis,
        color: subject.color,
      });
    } else {
      this.notification.error('Matéria não encontrada.');
      this.router.navigate(['/subjects']);
    }
  }

  cancelEdit() {
    if (this.isEditMode() && this.subjectId()) {
      this.loadSubject(this.subjectId()!);
      this.isViewMode.set(true);
      this.subjectForm.disable();
    } else {
      this.router.navigate(['/subjects']);
    }
    this.saveAttempted.set(false);
  }

  enableEdit() {
    this.isViewMode.set(false);
    this.subjectForm.enable();
  }

  selectPresetColor(color: string) {
    if (this.subjectForm.disabled) return;
    this.subjectForm.patchValue({ color });
  }

  async deleteSubject() {
    if (!this.subjectId()) return;

    const confirmed = await this.confirmationService.confirm({
      message: this.t().admin.subjects.deleteConfirm,
      confirmClass: 'btn-danger',
      confirmLabel: 'Excluir',
    });

    if (confirmed) {
      try {
        await this.schoolData.deleteSubject(this.subjectId()!);
        this.notification.success('Matéria removida com sucesso!');
        this.router.navigate(['/subjects']);
      } catch (error) {
        this.notification.error('Erro ao remover a matéria.');
      }
    }
  }

  getContrastColor(hex: string) {
    return this.schoolData.getContrastText(hex);
  }

  async onSubmit() {
    this.saveAttempted.set(true);
    if (this.subjectForm.invalid) {
      this.notification.error('Preencha os campos obrigatórios.');
      return;
    }

    this.isSubmitting.set(true);
    const data = this.subjectForm.getRawValue(); // getRawValue because it might be disabled

    const payload: Omit<Subject, 'id'> = {
      name: data.name!,
      category: data.category as any,
      axis: data.axis as any,
      color: data.color!,
    };

    try {
      if (this.isEditMode() && this.subjectId()) {
        await this.schoolData.updateSubject(this.subjectId()!, {
          ...payload,
          id: this.subjectId()!,
        } as Subject);
        this.notification.success('Matéria atualizada com sucesso!');
      } else {
        await this.schoolData.addSubject(payload);
        this.notification.success('Matéria criada com sucesso!');
      }
      this.router.navigate(['/subjects']);
    } catch (error) {
      console.error('Error saving subject:', error);
      this.notification.error('Erro ao salvar a matéria. Tente novamente.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  onCancel() {
    this.location.back();
  }
}
