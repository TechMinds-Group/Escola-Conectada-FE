import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SchoolDataService, Subject, ThematicAxis } from '../../../core/services/school-data';
import { NotificationService } from '../../../core/services/notification.service';
import { TranslationService } from '../../../core/services/translation.service';
import { ConfirmationService } from '../../../core/services/confirmation.service';
import { TextInputComponent } from '../../../core/components/text-input/text-input.component';
import { SelectComponent } from '../../../core/components/select/select.component';
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
    TextInputComponent,
    SelectComponent,
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
    axis: ['Outros' as ThematicAxis, Validators.required],
    color: ['#6366f1', Validators.required],
    category: ['Base Comum', Validators.required],
    status: ['Ativo', Validators.required],
  });

  areaOptions = computed(() => {
    return this.schoolData.thematicAxes().map((axis) => ({ value: axis, label: axis }));
  });

  categoryOptions = [
    { value: 'Base Comum', label: 'Obrigatória' },
    { value: 'Eletiva', label: 'Eletiva' },
    { value: 'Técnica', label: 'Técnica' },
  ];

  statusOptions = [
    { value: 'Ativo', label: 'Ativo' },
    { value: 'Inativo', label: 'Inativo' },
  ];

  presetColors = [
    '#6366f1',
    '#0ea5e9',
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
    '#ec4899',
    '#06b6d4',
    '#f97316',
    '#84cc16',
    '#64748b',
    '#475569',
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
        axis: subject.axis,
        color: subject.color,
        category: subject.category,
        status: 'Ativo', // Default to active if not in model
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
    const data = this.subjectForm.getRawValue();

    const payload: Omit<Subject, 'id'> = {
      name: data.name!,
      axis: data.axis as any,
      color: data.color!,
      category: data.category as any,
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
      this.notification.error('Erro ao salvar a matéria. Tente novamente.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  onCancel() {
    this.location.back();
  }
}
