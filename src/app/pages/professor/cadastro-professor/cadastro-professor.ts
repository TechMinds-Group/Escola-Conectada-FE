import {
  Component,
  computed,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  OnInit,
  Output,
  signal,
  SimpleChanges,
  ViewChild,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
// Re-save to ensure consistency
import { CommonModule, Location } from '@angular/common';
import { MatMenuModule } from '@angular/material/menu';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MaskDirective } from '../../../core/directives/mask.directive';
import { TranslationService } from '../../../core/services/translation.service';
import { ConfirmationService } from '../../../core/services/confirmation.service';
import { SchoolDataService, Subject, ThematicAxis } from '../../../core/services/school-data';
import { ProfessorService, Professor } from '../../../core/services/professor.service';
import { ActivatedRoute, Router } from '@angular/router';
import { effect } from '@angular/core';
import { ModalManageListComponent } from '../../../core/components/modals/modal-manage-list/modal-manage-list.component';

import { ButtonSaveComponent } from '../../../core/components/buttons/button-save';
import { ButtonCancelComponent } from '../../../core/components/buttons/button-cancel';
import { ButtonDeleteComponent } from '../../../core/components/buttons/button-delete';
import { ButtonEditComponent } from '../../../core/components/buttons/button-edit';

@Component({
  selector: 'app-cadastro-professor',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MaskDirective,
    MatMenuModule,
    ButtonSaveComponent,
    ButtonCancelComponent,
    ButtonDeleteComponent,
    ButtonEditComponent,
    ModalManageListComponent,
  ],
  templateUrl: './cadastro-professor.html',
  styleUrl: './cadastro-professor.scss',
})
export class CadastroProfessor implements OnInit {
  // Services
  public translation = inject(TranslationService);
  t = this.translation.dictionary;
  private fb = inject(FormBuilder);
  public schoolData = inject(SchoolDataService);
  private professorService = inject(ProfessorService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private location = inject(Location);
  private confirmationService = inject(ConfirmationService);

  // Modal State Control
  subjectModal = viewChild<ModalManageListComponent>('subjectModal');
  showSubjectManager = signal(false);

  // State
  isSubmitting = signal(false);
  availableSubjects = this.schoolData.subjects;
  teacherId: string | null = null;
  isViewMode = signal(false);

  // Typed keys for template iteration
  shiftKeys: ('morning' | 'afternoon' | 'night')[] = ['morning', 'afternoon', 'night'];

  // Tab State
  activeTab = signal<'info' | 'subjects' | 'availability'>('info');

  // Availability Grid State (5 days x 3 shifts)
  // Shift 0: Morning, 1: Afternoon, 2: Night
  availabilityGrid = signal<boolean[][]>(this.generateDefaultAvailability());
  availabilityTouched = signal(false);
  saveAttempted = signal(false);

  teacherForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
    email: [
      '',
      [
        Validators.pattern('^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'),
        Validators.maxLength(200),
      ],
    ], // Added Email
    celular: ['', [Validators.required, Validators.minLength(14), Validators.maxLength(20)]],
    contractualWorkload: [0, [Validators.required, Validators.min(0), Validators.max(999)]],
    mainSubjectId: [null, [Validators.required]],
    secondarySubjectIds: [[]], // Array of IDs
  });

  // Reactive Contractual Workload
  contractualWorkloadSignal = toSignal(
    this.teacherForm.controls['contractualWorkload'].valueChanges,
    { initialValue: 20 },
  );

  // Activity Hours Calculation (1/3 of contractual)
  activityHours = computed(() => {
    const total = this.contractualWorkloadSignal() || 0;
    return Math.round(total / 3);
  });

  // Current Allocations (Read-only for "Matérias e Turmas" tab)
  currentAllocations = signal<any[]>([]);

  constructor() {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.teacherId = id;
      this.isViewMode.set(true);
      this.teacherForm.disable();
      this.loadTeacher(this.teacherId);
    } else {
      this.resetForm();
    }
  }

  enableEdit() {
    this.isViewMode.set(false);
    this.teacherForm.enable();
  }

  setActiveTab(tab: 'info' | 'subjects' | 'availability') {
    this.activeTab.set(tab);
  }

  toggleAvailability(day: number, shift: number) {
    if (this.isViewMode()) return;
    this.availabilityGrid.update((grid) => {
      const newGrid = grid.map((d) => [...d]);
      newGrid[day][shift] = !newGrid[day][shift];
      return newGrid;
    });
  }

  isSubjectSelected(subjectId: string): boolean {
    const current = this.teacherForm.get('secondarySubjectIds')?.value || [];
    return current.includes(subjectId);
  }

  toggleSecondarySubject(subjectId: string) {
    if (this.isViewMode()) return;
    const current = this.teacherForm.get('secondarySubjectIds')?.value || [];
    const index = current.indexOf(subjectId);
    let updated;
    if (index > -1) {
      updated = current.filter((id: string) => id !== subjectId);
    } else {
      updated = [...current, subjectId];
    }
    this.teacherForm.patchValue({ secondarySubjectIds: updated });
    this.teacherForm.markAsDirty();
  }

  loadTeacher(id: string) {
    this.professorService.getById(id).subscribe({
      next: (res: any) => {
        console.log('[CADASTRO-PROFESSOR] Raw API Response:', res);
        const teacher = res; // Since ProfessorService.getById already maps and returns Professor
        console.log('[CADASTRO-PROFESSOR] Mapped Teacher object:', teacher);
        if (teacher) {
          this.teacherForm.patchValue({
            name: teacher.name,
            email: teacher.email || '',
            celular: teacher.celular || '',
            contractualWorkload: teacher.contractualWorkload || 20,
            mainSubjectId: teacher.mainSubjectId,
            secondarySubjectIds: teacher.secondarySubjectIds || [],
          });

          if (
            teacher.availability &&
            teacher.availability.length === 5 &&
            teacher.availability[0].length === 3
          ) {
            this.availabilityGrid.set(teacher.availability);
          } else {
            this.availabilityGrid.set(this.generateDefaultAvailability());
          }

          // Map allocations to displayable format
          console.log('[CADASTRO-PROFESSOR] Teacher Allocations from API:', teacher.allocations);
          this.currentAllocations.set(teacher.allocations || []);
        }
      },
      error: () => {
        this.router.navigate(['/professores']);
      },
    });
  }

  resetForm() {
    this.teacherForm.reset({
      contractualWorkload: 0,
      secondarySubjectIds: [],
    });
    this.saveAttempted.set(false);
    this.availabilityGrid.set(this.generateDefaultAvailability());
    this.availabilityTouched.set(false);
    this.currentAllocations.set([]);
    this.activeTab.set('info');
  }

  get isAvailabilityValid(): boolean {
    const grid = this.availabilityGrid();
    return grid.some((day) => day.some((shift) => shift === true));
  }

  get isInfoInvalid(): boolean {
    if (!this.saveAttempted()) return false;
    const controls = this.teacherForm.controls;
    return (
      controls['name'].invalid ||
      controls['celular'].invalid ||
      controls['contractualWorkload'].invalid ||
      controls['mainSubjectId'].invalid
    );
  }

  get isAvailabilityInvalid(): boolean {
    if (!this.saveAttempted()) return false;
    return !this.isAvailabilityValid;
  }

  async onSubmit() {
    this.saveAttempted.set(true);
    this.teacherForm.markAllAsTouched();
    this.availabilityTouched.set(true);

    if (this.teacherForm.invalid || !this.isAvailabilityValid) {
      // Find invalid tab and switch to it if needed?
      // For now, indicators on tabs are enough.
      return;
    }

    this.isSubmitting.set(true);

    // Simulate API delay
    await new Promise((r) => setTimeout(r, 500));

    const formValue = this.teacherForm.value;

    // Construct simplified teacher object
    const teacherData: Omit<Professor, 'id'> = {
      name: formValue.name,
      email: formValue.email,
      celular: formValue.celular,
      contractualWorkload: formValue.contractualWorkload,
      allocatedWorkload: (this.currentAllocations() || []).reduce(
        (sum, a) => sum + (a.cargaHoraria || 0),
        0,
      ),
      mainSubjectId: formValue.mainSubjectId || null,
      secondarySubjectIds: formValue.secondarySubjectIds,
      availability: this.availabilityGrid(),
      avatar: '',
      allocations: [],
    };

    if (this.teacherId) {
      this.professorService.update(this.teacherId, teacherData).subscribe(() => {
        this.isSubmitting.set(false);
        this.onCancel();
      });
    } else {
      this.professorService.create(teacherData).subscribe(() => {
        this.isSubmitting.set(false);
        this.onCancel();
      });
    }
  }

  onCancel() {
    if (this.teacherId && !this.isViewMode()) {
      this.isViewMode.set(true);
      this.teacherForm.disable();
      // Optionally reload data to revert changes
      this.loadTeacher(this.teacherId);
    } else {
      this.location.back();
    }
  }

  async deleteTeacher() {
    if (this.teacherId) {
      const confirmed = await this.confirmationService.confirm({
        message: 'Tem certeza que deseja excluir este professor?',
        confirmClass: 'btn-danger',
        confirmLabel: 'Excluir',
      });

      if (confirmed) {
        this.professorService.delete(this.teacherId).subscribe({
          next: () => {
            this.router.navigate(['/professores']);
          },
          error: (err) => console.error('Erro ao excluir professor:', err),
        });
      }
    }
  }

  private generateDefaultAvailability(): boolean[][] {
    // 5 days, 3 shifts (Morning, Afternoon, Night)
    // Default: All Available? Or All Unavailable? Prompt says "Click to mark available".
    // Usually easier to start with all False (unavailable) or all True.
    // Let's assume standard school hours: Available by default makes setup faster?
    // Or user wants to "mark where available". Let's start with TRUE (Available) is usually better UX so they uncheck conflicts?
    // Actually prompt says "Marque os horários em que o professor pode ser alocado". Implies starting Unchecked?
    // Let's start **Unchecked (False)** so it's explicit opted-in.
    return Array(5)
      .fill(0)
      .map(() => Array(3).fill(false));
  }

  // Helpers for Template
  getShiftLabel(index: number): string {
    return ['Manhã', 'Tarde', 'Noite'][index];
  }

  getDayName(dayIndex: number): string {
    return ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][dayIndex] || '';
  }

  // Subject Modal Methods
  openSubjectManager() {
    this.showSubjectManager.set(true);
  }

  closeSubjectManager() {
    this.showSubjectManager.set(false);
    this.subjectModal()?.reset();
  }

  async saveSubject(event: { id?: any; name: string }) {
    const name = event.name;
    const isEditing = !!event.id;

    // Duplication Check
    const exists = this.schoolData
      .subjects()
      .some((s) => s.name.trim().toLowerCase() === name.toLowerCase() && s.id !== event.id);
    if (exists) {
      alert('Já existe uma disciplina com este nome.');
      return;
    }

    try {
      if (isEditing) {
        const existing = this.schoolData.subjects().find((s) => s.id === event.id);
        const updated: Subject = {
          ...existing!,
          name: name,
        };
        await this.schoolData.updateSubject(event.id, updated);
      } else {
        const newSubject: Omit<Subject, 'id'> = {
          name: name,
          color: '#3b82f6', // Default blue
          category: 'Base Comum',
          axis: ThematicAxis.Outros,
          workload: 0,
        };
        await this.schoolData.addSubject(newSubject);
      }
      this.subjectModal()?.reset();
    } catch (err) {
      console.error('Erro ao salvar disciplina:', err);
      alert('Ocorreu um erro ao salvar a disciplina.');
    }
  }

  async deleteSubject(id: any) {
    const confirmed = await this.confirmationService.confirm({
      message: 'Tem certeza que deseja excluir esta disciplina?',
      confirmClass: 'btn-danger',
      confirmLabel: 'Excluir',
    });

    if (confirmed) {
      try {
        await this.schoolData.deleteSubject(String(id));
      } catch (err) {
        console.error('Erro ao excluir disciplina:', err);
        alert('Erro ao excluir disciplina.');
      }
    }
  }
}
