import { Component, computed, inject, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  FormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { TurmaService, TurmaDto, AlocacaoDto } from '../../../core/services/turma.service';
import { AmbienteService } from '../../../core/services/ambiente.service';
import {
  SchoolDataService,
  SchoolRoom,
  SchoolTimeGrid,
  TimeSlot,
  SchoolMatrix,
} from '../../../core/services/school-data';
import { TranslationService } from '../../../core/services/translation.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ButtonSaveComponent } from '../../../core/components/buttons/button-save';
import { ButtonCancelComponent } from '../../../core/components/buttons/button-cancel';
import { ButtonDeleteComponent } from '../../../core/components/buttons/button-delete';
import { ButtonEditComponent } from '../../../core/components/buttons/button-edit';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ProfessorService, Professor } from '../../../core/services/professor.service';
import { ConfirmationService } from '../../../core/services/confirmation.service';
import { ModalManageTimeGridComponent } from '../../../core/components/modals/modal-manage-time-grid/modal-manage-time-grid.component';
import { ModalManageRoomComponent } from '../../../core/components/modals/modal-manage-room/modal-manage-room.component';

@Component({
  selector: 'app-cadastro-turma',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatSelectModule,
    MatProgressBarModule,
    ButtonSaveComponent,
    ButtonCancelComponent,
    ButtonDeleteComponent,
    ButtonEditComponent,
    ModalManageTimeGridComponent,
    ModalManageRoomComponent,
  ],
  templateUrl: './cadastro-turma.html',
  styleUrl: './cadastro-turma.scss',
})
export class CadastroTurma implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private turmaService = inject(TurmaService);
  private ambienteService = inject(AmbienteService);
  public schoolData = inject(SchoolDataService);
  private notification = inject(NotificationService);
  private professorService = inject(ProfessorService);
  private confirmation = inject(ConfirmationService);
  public translation = inject(TranslationService);
  private location = inject(Location);
  t = this.translation.dictionary;

  classForm: FormGroup;
  isEditMode = signal(false);
  isViewMode = signal(false);
  editingId = signal<string | null>(null);
  saveAttempted = signal(false);
  isSaving = signal(false);
  turmaId: string | null = null;
  activeTab = signal('info');

  // Track Alocações: AlocacaoDto[]
  allocations = signal<AlocacaoDto[]>([]);

  // Dropdown data
  matrices = this.schoolData.schoolMatrices;
  rooms = signal<SchoolRoom[]>([]);
  teachers = signal<Professor[]>([]);

  // Grade Modal State
  @ViewChild('gradeModal') gradeModal!: ModalManageTimeGridComponent;
  showGradeManager = signal(false);

  // Room Modal State
  @ViewChild('roomModal') roomModal!: ModalManageRoomComponent;
  showRoomManager = signal(false);

  // Timetable Config
  days = [
    { value: 1, label: 'Segunda' },
    { value: 2, label: 'Terça' },
    { value: 3, label: 'Quarta' },
    { value: 4, label: 'Quinta' },
    { value: 5, label: 'Sexta' },
    { value: 6, label: 'Sábado' },
  ];

  timeGrids = this.schoolData.schoolTimeGrids;
  selectedGradeId = signal<string | null>(null);

  slots = computed(() => {
    const gradeId = this.selectedGradeId();
    if (!gradeId) return [];

    const grid = this.timeGrids().find((g) => g.id === gradeId);
    if (!grid) return [];

    return grid.slots
      .map((s) => ({
        order: s.index || 0,
        start: s.start,
        end: s.end,
        type: s.type,
      }))
      .sort((a, b) => a.start.localeCompare(b.start));
  });

  // For matrix summary preview
  selectedMatrixId = signal<string | null>(null);
  subjects = this.schoolData.subjects;

  gradeSummary = computed(() => {
    const matrixId = this.selectedMatrixId();
    if (!matrixId) return [];
    const matrix = this.matrices().find((m) => m.id === matrixId);
    if (!matrix) return [];

    let summaryItems: {
      id: string; // Fake ID ou subjectId para o Angular vincular os controles
      subjectId: string;
      name: string;
      color: string;
      weeklyLessons: number;
      lessonDuration: number;
      weeklyHours: number;
    }[] = [];

    let index = 0;
    matrix.levels.forEach((level) => {
      level.subjects.forEach((ms) => {
        const subjectDef = this.subjects().find(
          (s) => s.id.toLowerCase() === ms.subjectId.toLowerCase(),
        );
        summaryItems.push({
          id:
            ms.id && ms.id !== '00000000-0000-0000-0000-000000000000'
              ? ms.id
              : `temp-${ms.subjectId}-${index++}`,
          subjectId: ms.subjectId,
          name: subjectDef?.name || 'Desconhecida',
          color: subjectDef?.color || '#ccc',
          weeklyLessons: ms.weeklyLessons,
          lessonDuration: level.lessonDuration,
          weeklyHours: (ms.weeklyLessons * level.lessonDuration) / 60,
        });
      });
    });

    return summaryItems;
  });

  getMatrixLabel(matrix: SchoolMatrix): string {
    if (!matrix) return '';
    const levels = matrix.levels?.map((l: any) => l.level).join(', ');
    return `${matrix.name} - ${levels} - ${matrix.year}`;
  }

  selectedMatrixTooltip = computed(() => {
    const id = this.selectedMatrixId();
    if (!id) return 'Selecione uma matriz curricular';
    const matrix = this.matrices().find((m) => m.id === id);
    return matrix ? this.getMatrixLabel(matrix) : 'Matriz selecionada não encontrada';
  });

  constructor() {
    this.classForm = this.fb.group({
      nome: ['', [Validators.required, Validators.maxLength(25)]],

      ano: [new Date().getFullYear(), Validators.required],
      turno: ['Manhã', Validators.required],
      matrizId: [null, Validators.required],
      salaId: [null],
      gradeHorariaId: [null, Validators.required],
    });

    this.classForm.get('matrizId')?.valueChanges.subscribe((val) => {
      if (val && val !== this.selectedMatrixId()) {
        this.selectedMatrixId.set(val);
        this.allocations.set([]); // Limpar alocações ao trocar matriz REALMENTE

        // Sincronizar Ano Letivo com a Matriz
        const matrix = this.matrices().find((m) => m.id === val);
        if (matrix) {
          this.classForm.patchValue({ ano: matrix.year });
        }
      }
    });

    this.classForm.get('gradeHorariaId')?.valueChanges.subscribe((val) => {
      this.selectedGradeId.set(val);
      this.syncTurnoFromGrade(val);
    });
  }

  syncTurnoFromGrade(gradeId: string | null) {
    if (!gradeId) return;
    const grid = this.timeGrids().find((g) => g.id === gradeId);
    if (grid) {
      this.classForm.patchValue({ turno: grid.shift }, { emitEvent: false });
    }
  }

  setActiveTab(tab: string) {
    this.activeTab.set(tab);
  }

  // Métodos da Alocação
  onTeacherSelected(
    matrizDisciplinaId: string,
    dia: number,
    ordemAula: number,
    teacherId: string | null,
  ) {
    console.log('[ALLOCATION-DEBUG] onTeacherSelected (legacy):', {
      matrizDisciplinaId,
      dia,
      ordemAula,
      teacherId,
    });
    if (!teacherId) {
      // Remove alocação
      this.allocations.update((current) =>
        current.filter(
          (a) =>
            !(
              a.matrizDisciplinaId === matrizDisciplinaId &&
              a.diaDaSemana === dia &&
              a.ordemAula === ordemAula
            ),
        ),
      );
    } else {
      const existing = this.allocations().find(
        (a) =>
          a.matrizDisciplinaId === matrizDisciplinaId &&
          a.diaDaSemana === dia &&
          a.ordemAula === ordemAula,
      );
      if (existing) {
        existing.professorId = teacherId;
        this.allocations.update((current) => [...current]);
      } else {
        this.allocations.update((current) => [
          ...current,
          {
            matrizDisciplinaId,
            professorId: teacherId,
            diaDaSemana: dia,
            ordemAula,
          },
        ]);
      }
    }
    console.log('[ALLOCATION-DEBUG] Current allocations array:', this.allocations());
  }

  // New, more robust methods for the grid
  getSelectedDiscipline(dia: number, ordemAula: number): string {
    const aloc = this.allocations().find((a) => a.diaDaSemana === dia && a.ordemAula === ordemAula);
    return aloc ? aloc.matrizDisciplinaId : '';
  }

  getSelectedTeacher(dia: number, ordemAula: number): string | null {
    const aloc = this.allocations().find((a) => a.diaDaSemana === dia && a.ordemAula === ordemAula);
    return aloc ? aloc.professorId : null;
  }

  onDisciplineChange(dia: number, ordemAula: number, event: any) {
    const disciplineId = event.target.value;
    console.log('[ALLOCATION-DEBUG] onDisciplineChange:', { dia, ordemAula, disciplineId });

    if (!disciplineId) {
      // Remover alocação completa se desmarcar a disciplina
      this.allocations.update((current) =>
        current.filter((a) => !(a.diaDaSemana === dia && a.ordemAula === ordemAula)),
      );
    } else {
      this.allocations.update((current) => {
        const existing = current.find((a) => a.diaDaSemana === dia && a.ordemAula === ordemAula);

        // Auto-select first qualified teacher
        const qualifiedTeachers = this.getQualifiedTeachers(disciplineId);
        const professorId = qualifiedTeachers.length > 0 ? qualifiedTeachers[0].id : '';

        if (existing) {
          existing.matrizDisciplinaId = disciplineId;
          existing.professorId = professorId;
          return [...current];
        } else {
          return [
            ...current,
            {
              matrizDisciplinaId: disciplineId,
              professorId: professorId,
              diaDaSemana: dia,
              ordemAula: ordemAula,
            },
          ];
        }
      });
    }
  }

  getQualifiedTeachers(matrizDisciplinaId: string): Professor[] {
    const item = this.gradeSummary().find(
      (i) => i.id.toLowerCase() === matrizDisciplinaId.toLowerCase(),
    );
    if (!item) return [];

    return this.teachers().filter(
      (t) =>
        t.mainSubjectId?.toLowerCase() === item.subjectId.toLowerCase() ||
        (t.secondarySubjectIds &&
          t.secondarySubjectIds.some((sid) => sid.toLowerCase() === item.subjectId.toLowerCase())),
    );
  }

  onTeacherChange(dia: number, ordemAula: number, teacherId: string | null) {
    console.log('[ALLOCATION-DEBUG] onTeacherChange:', { dia, ordemAula, teacherId });
    this.allocations.update((current) => {
      const existing = current.find((a) => a.diaDaSemana === dia && a.ordemAula === ordemAula);
      if (existing) {
        existing.professorId = teacherId || '';
        return [...current];
      }
      return current;
    });
  }

  getAllocation(matrizDisciplinaId: string, dia: number, ordemAula: number): string | null {
    const aloc = this.allocations().find(
      (a) =>
        a.matrizDisciplinaId === matrizDisciplinaId &&
        a.diaDaSemana === dia &&
        a.ordemAula === ordemAula,
    );
    return aloc ? aloc.professorId : null;
  }

  getAllocatedCount(matrizDisciplinaId: string): number {
    return this.allocations().filter((a) => a.matrizDisciplinaId === matrizDisciplinaId).length;
  }

  hasAllocation(dia: number, ordemAula: number): boolean {
    return this.allocations().some((a) => a.diaDaSemana === dia && a.ordemAula === ordemAula);
  }

  getTeacherWorkloadConsumption(teacherId: string | null): {
    consumed: number;
    contract: number;
    percentage: number;
  } {
    if (!teacherId) return { consumed: 0, contract: 0, percentage: 0 };

    const teacher = this.teachers().find((t) => t.id === teacherId);
    if (!teacher) return { consumed: 0, contract: 0, percentage: 0 };

    let consumedInThisClass = 0;

    // Somar quantas horas ESSE professor tá gastando NESSA aba
    this.gradeSummary().forEach((item) => {
      const count = this.allocations().filter(
        (a) => a.matrizDisciplinaId === item.id && a.professorId === teacherId,
      ).length;
      if (count > 0) {
        // Cada alocação na grade conta como 1 tempo (lessonDuration)
        consumedInThisClass += (count * item.lessonDuration) / 60;
      }
    });

    // A carga em outras turmas. Simulando que ele já gaste X. A tela pedirá pro Backend no futuro, usaremos as allocations dele atuais + dessa turma
    let externalConsumption = 0;
    if (teacher.allocations) {
      teacher.allocations.forEach((a: any) => {
        externalConsumption += a.workload;
      });
    }

    const totalConsumed = externalConsumption + consumedInThisClass;
    const contract = teacher.contractualWorkload || 40; // Default 40 se não tiver

    return {
      consumed: totalConsumed,
      contract: contract,
      percentage: Math.min((totalConsumed / contract) * 100, 100),
    };
  }

  async ngOnInit() {
    // Load all lookup data concurrently and wait
    const initRequired = [
      firstValueFrom(this.ambienteService.list()).then((data) => this.rooms.set(data)),
      firstValueFrom(this.professorService.getAll()).then((data: any) => this.teachers.set(data)),
      this.schoolData.loadTimeGrids(),
      this.schoolData.loadSubjects(),
      this.schoolData.loadMatrices(),
    ];

    await Promise.all(initRequired);

    const id = this.route.snapshot.paramMap.get('id');

    if (id) {
      if (this.route.snapshot.url.some((segment) => segment.path === 'edit')) {
        this.isEditMode.set(true);
        this.isViewMode.set(true);
        this.editingId.set(id);
      }
      this.turmaId = id;
      this.classForm.disable({ emitEvent: false });

      this.turmaService.getById(id).subscribe({
        next: (turma) => {
          this.classForm.patchValue({
            nome: turma.nome,
            ano: turma.ano,
            turno: turma.turno,
            matrizId: turma.matrizId,
            salaId: turma.salaId || null,
            gradeHorariaId: turma.gradeHorariaId || null,
          });

          this.selectedMatrixId.set(turma.matrizId);
          this.selectedGradeId.set(turma.gradeHorariaId || null);

          if (turma.alocacoes) {
            console.log('[ALLOCATION-DEBUG] Loading allocations from API:', turma.alocacoes);
            this.allocations.set([...turma.alocacoes]);
          }
        },
      });
    }
  }

  onEditClick() {
    this.isViewMode.set(false);
    this.classForm.enable({ emitEvent: false });
    if (this.editingId()) {
      // Bloquear apenas os campos que realmente não podem mudar (Vigência é auto-calculada)
      this.classForm.get('ano')?.disable();
    }
  }

  onSubmit() {
    this.saveAttempted.set(true);

    this.isSaving.set(true);

    // Validar e limpar alocações sem professor antes de enviar
    const validAllocations = this.allocations().filter(
      (a) => a.professorId && a.matrizDisciplinaId && !a.matrizDisciplinaId.startsWith('sub-'),
    );

    if (validAllocations.length !== this.allocations().length) {
      console.warn(
        '[ALLOCATION-DEBUG] Filtering out invalid/temporary allocations:',
        this.allocations().filter(
          (a) => !a.professorId || !a.matrizDisciplinaId || a.matrizDisciplinaId.startsWith('sub-'),
        ),
      );
    }

    const payload: Partial<TurmaDto> = {
      ...this.classForm.getRawValue(),
      capacidadeMaxima: 30,
      alocacoes: validAllocations,
    };

    console.log('[ALLOCATION-DEBUG] FINAL PAYLOAD TO SEND:', JSON.stringify(payload, null, 2));

    if (this.isEditMode() && this.turmaId) {
      payload.id = this.turmaId;
    }

    const request$ =
      this.isEditMode() && this.turmaId
        ? this.turmaService.update(this.turmaId, payload)
        : this.turmaService.save(payload);

    request$.subscribe({
      next: (res) => {
        console.log('Resposta de sucesso:', res);
        this.isSaving.set(false);
        this.notification.success(
          this.isEditMode() ? 'Turma configurada com sucesso!' : 'Turma criada com sucesso!',
        );
        this.router.navigate(['/classes']);
      },
      error: (err) => {
        console.error('--- ERRO AO SALVAR TURMA ---');
        console.error('Status Code:', err.status);
        console.error('Mensagem:', err.message);
        console.error('Error Object:', err.error);

        let errorMessage = 'Falha ao salvar a turma.';

        if (err.error) {
          if (typeof err.error === 'string') {
            errorMessage = err.error;
          } else if (err.error.message) {
            errorMessage = err.error.message;
          } else if (err.error.errors) {
            if (Array.isArray(err.error.errors) && err.error.errors.length > 0) {
              errorMessage = err.error.errors[0];
            } else if (typeof err.error.errors === 'object') {
              const firstKey = Object.keys(err.error.errors)[0];
              if (firstKey && err.error.errors[firstKey].length > 0) {
                errorMessage = err.error.errors[firstKey][0];
              }
            }
          } else if (err.error.title) {
            errorMessage = err.error.title;
          }
        }

        this.notification.error(errorMessage);
        this.isSaving.set(false);
      },
    });
  }

  // Debug Helper
  private findInvalidControls() {
    const invalid = [];
    const controls = this.classForm.controls;
    for (const name in controls) {
      if (controls[name].invalid) {
        invalid.push(name);
      }
    }
    return invalid;
  }

  onCancel() {
    if (this.isEditMode() && !this.isViewMode()) {
      // Se estava editando, apenas fecha o form e volta a visualizar
      this.isViewMode.set(true);
      this.classForm.disable({ emitEvent: false });

      // Recarrega os dados originais para limpar edições não salvas
      if (this.turmaId) {
        this.turmaService.getById(this.turmaId).subscribe({
          next: (turma) => {
            this.classForm.patchValue({
              nome: turma.nome,
              ano: turma.ano,
              turno: turma.turno,
              matrizId: turma.matrizId,
              salaId: turma.salaId || null,
              gradeHorariaId: turma.gradeHorariaId || null,
            });
            this.selectedMatrixId.set(turma.matrizId);
            this.selectedGradeId.set(turma.gradeHorariaId || null);
          },
        });
      }
    } else {
      // Se estava vendo ou criando, sai da tela
      this.location.back();
    }
  }

  deleteTurma() {
    if (this.turmaId && confirm('Tem certeza que deseja excluir esta turma?')) {
      this.turmaService.delete(this.turmaId).subscribe({
        next: () => this.router.navigate(['/classes']),
      });
    }
  }

  get f() {
    return this.classForm.controls;
  }

  // Grade Modal Logic
  openGradeManager() {
    this.showGradeManager.set(true);
  }

  closeGradeManager() {
    this.showGradeManager.set(false);
    this.gradeModal?.reset();
  }

  onGridSaved(newGridId: string) {
    this.classForm.patchValue({ gradeHorariaId: newGridId });
    this.closeGradeManager();
  }

  // Room Modal Logic
  openRoomManager() {
    this.showRoomManager.set(true);
  }

  closeRoomManager() {
    this.showRoomManager.set(false);
    this.roomModal?.reset();
  }

  onRoomSaved(newRoomId: string) {
    // Refresh rooms list
    this.ambienteService.list().subscribe({
      next: (data) => {
        this.rooms.set(data);
        this.classForm.patchValue({ salaId: newRoomId });
        this.closeRoomManager();
      },
    });
  }
}
