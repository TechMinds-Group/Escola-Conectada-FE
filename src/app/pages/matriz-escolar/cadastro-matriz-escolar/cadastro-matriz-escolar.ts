import { Component, inject, signal, computed, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import {
  ReactiveFormsModule,
  FormsModule,
  FormBuilder,
  Validators,
  FormArray,
  FormGroup,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatMenuModule } from '@angular/material/menu';
import {
  SchoolDataService,
  SchoolMatrix as SchoolMatrixModel,
  MatrixSubject,
  EducationLevel,
  LevelConfiguration,
} from '../../../core/services/school-data';

import { TranslationService } from '../../../core/services/translation.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AmbienteService } from '../../../core/services/ambiente.service';

import { ConfirmationService } from '../../../core/services/confirmation.service';

import { ButtonSaveComponent } from '../../../core/components/buttons/button-save';
import { ButtonCancelComponent } from '../../../core/components/buttons/button-cancel';
import { ButtonDeleteComponent } from '../../../core/components/buttons/button-delete';
import { ButtonEditComponent } from '../../../core/components/buttons/button-edit';
import { ButtonOrangeComponent } from '../../../core/components/buttons/button-orange';
import { ModalManageListComponent } from '../../../core/components/modals/modal-manage-list/modal-manage-list.component';
import { TextInputComponent } from '../../../core/components/text-input/text-input.component';
import { SelectComponent } from '../../../core/components/select/select.component';
import { TableComponent } from '../../../core/components/table/table.component';

@Component({
  selector: 'app-cadastro-matriz-escolar',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterLink,
    MatMenuModule,
    ButtonSaveComponent,
    ButtonCancelComponent,
    ButtonDeleteComponent,
    ButtonEditComponent,
    ButtonOrangeComponent,
    ModalManageListComponent,
    TextInputComponent,
    SelectComponent,
    TableComponent,
  ],
  templateUrl: './cadastro-matriz-escolar.html',
  styleUrl: './cadastro-matriz-escolar.scss',
})
export class CadastroMatrizEscolarPage implements OnInit {
  @ViewChild('levelSelector') levelSelector!: ElementRef<HTMLSelectElement>;

  public schoolData = inject(SchoolDataService); // Changed to public for template access
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  public translation = inject(TranslationService);
  private notification = inject(NotificationService);
  private ambienteService = inject(AmbienteService);
  private confirmationService = inject(ConfirmationService);
  private location = inject(Location);
  t = this.translation.dictionary;

  // Environment Management Logic (from cadastro-ambiente)
  @ViewChild('typeModal') typeModal!: ModalManageListComponent;
  showTypeManager = signal(false);

  editingId = signal<string | null>(null);
  isViewMode = signal(false);
  isClosedMatrix = signal(false);
  originalMatrixSnapshot = signal<SchoolMatrixModel | null>(null);
  isSubmitting = signal(false);
  saveAttempted = signal(false);
  activeTab = signal<'info' | 'subjects'>('info');

  setActiveTab(tab: 'info' | 'subjects') {
    this.activeTab.set(tab);
  }

  // Modules Collapse State
  collapsedModules = signal<Record<string, boolean>>({});

  toggleModuleCollapse(levelIndex: number, moduleIndex: number) {
    const key = `${levelIndex}-${moduleIndex}`;
    const currentState = this.isModuleCollapsed(levelIndex, moduleIndex);
    this.collapsedModules.update((states) => ({
      ...states,
      [key]: !currentState,
    }));
  }

  isModuleCollapsed(levelIndex: number, moduleIndex: number) {
    return this.collapsedModules()[`${levelIndex}-${moduleIndex}`] ?? true;
  }

  // Expose schoolData for template (subjects list)
  public subjectsList = this.schoolData.subjects;
  public roomTypesList = this.schoolData.roomTypes;
  public academicParameters = this.schoolData.academicParameters;

  // Form
  matrixForm = this.fb.group({
    name: ['', Validators.required],
    year: [new Date().getFullYear(), [Validators.required, Validators.min(2024)]],
    mecAnnualHours: [1200, [Validators.required, Validators.min(1)]],
    levels: this.fb.array([]),
  });

  educationLevels = Object.values(EducationLevel);
  selectedLevelToAdd = signal<EducationLevel | ''>('');

  get levelsArray() {
    return this.matrixForm.get('levels') as FormArray;
  }

  // Calculate Compliance
  complianceStatus = computed(() => {
    // Triggers when these signals change
    // Since we are using a Form, we need to manually trigger updates or listen to valueChanges
    // But computed() relies on signals.
    // Let's use a signal that updates on form change.
    return this._complianceStatus();
  });

  availableActions = computed(() => {
    const actions: { value: string; label: string }[] = [];

    if (this.editingId()) {
      if (!this.isClosedMatrix()) {
        actions.push({ value: 'delete', label: 'Excluir Matriz' });
      }
    }

    if (this.isViewMode()) {
      if (this.isClosedMatrix()) {
        actions.push({ value: 'reopen', label: 'Reabrir Matriz' });
      } else {
        actions.push({ value: 'edit', label: 'Editar' });
        actions.push({ value: 'close', label: 'Encerrar' });
      }
    } else {
      actions.push({ value: 'cancel', label: 'Cancelar' });
      actions.push({ value: 'save', label: 'Salvar' });
    }

    return actions;
  });

  matricesOptions = computed(() => {
    const currentId = this.editingId();
    return this.schoolData
      .schoolMatrices()
      .filter((m) => m.id !== currentId)
      .map((m) => ({
        value: m.id,
        label: `${m.name} (${m.year})`,
      }));
  });

  selectedAction = signal<string>('');
  selectedCopyMatrixId = signal<string>('');

  executeAction(action: string) {
    if (!action) return;

    // Execute de forma imediata ou com confirmação
    if (action === 'edit') this.enableEdit();
    else if (action === 'delete') this.deleteMatrix();
    else if (action === 'close') this.closeMatrix();
    else if (action === 'reopen') this.reopenMatrix();
    else if (action === 'cancel') this.cancelEdit();
    else if (action === 'save') this.onSubmit();

    // Reseta o select após execução para ficar limpo
    setTimeout(() => this.selectedAction.set(''), 100);
  }

  async copyFromMatrix(sourceId: string) {
    if (!sourceId) return;

    const hasModules = this.levelsArray.controls.some((level: any) => {
      const modules = level.get('modules') as FormArray;
      return modules && modules.length > 0;
    });

    if (hasModules) {
      const confirmed = await this.confirmationService.confirm({
        title: 'Atenção',
        message: 'Atenção: Esta ação irá substituir todos os dados atuais da matriz pelos dados da matriz selecionada. Deseja continuar?',
        confirmClass: 'btn-danger',
        confirmLabel: 'Copiar Estrutura',
      });

      if (!confirmed) {
        setTimeout(() => this.selectedCopyMatrixId.set(''), 100);
        return;
      }
    }

    try {
      const sourceMatrix = this.schoolData.schoolMatrices().find((m) => m.id === sourceId);
      if (!sourceMatrix) {
        this.notification.error('Matriz de origem não encontrada.');
        return;
      }

      // Deep Clone
      const clonedMatrix: SchoolMatrixModel = JSON.parse(JSON.stringify(sourceMatrix));

      const levelsArray = this.matrixForm.get('levels') as FormArray;
      levelsArray.clear();

      clonedMatrix.levels?.forEach((level) => {
        delete level.id;
        level.subjects?.forEach((s) => {
          delete s.id;
        });
        this.addLevelRow(level);
      });

      this.notification.success('Estrutura importada com sucesso!');
    } catch (error) {
      this.notification.error('Erro ao importar a matriz.');
    } finally {
      setTimeout(() => this.selectedCopyMatrixId.set(''), 100);
    }
  }

  private _complianceStatus = signal<{ totalHours: number; isValid: boolean; percent: number }>({
    totalHours: 0,
    isValid: false,
    percent: 0,
  });

  constructor() {
    this.matrixForm.valueChanges.subscribe(() => {
      this.updateCompliance();
    });
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editingId.set(id);
      this.isViewMode.set(true);

      this.schoolData
        .getMatrixById(id)
        .then((matrix) => {
          this.originalMatrixSnapshot.set(matrix);
          this.loadMatrix(matrix);
          this.matrixForm.disable();
        })
        .catch(() => {
          this.router.navigate(['/school-matrices']);
        });
    } else {
      this.createMatrix();
    }

    this.loadTypes();
  }

  loadTypes() {
    this.ambienteService.listTypes().subscribe({
      next: (res: any) => {
        // Map PascalCase to camelCase for proper binding
        const types = res && res.data ? res.data : res;
        const mappedTypes = types.map((t: any) => ({
          id: String(t.Id ?? t.id ?? ''),
          name: t.Name ?? t.name ?? '',
        }));
        this.schoolData.roomTypes.set(mappedTypes);
      },
      error: () => {},
    });
  }

  updateCompliance() {
    let totalHours = 0;
    const mecGoal = this.matrixForm.get('mecAnnualHours')?.value || 0;

    // Aggregate from all levels
    this.levelsArray.controls.forEach((_, index) => {
      const compliance = this.getLevelCompliance(index);
      totalHours += compliance.totalHours;
    });

    this._complianceStatus.set({
      totalHours,
      isValid: totalHours >= mecGoal,
      percent: mecGoal > 0 ? Math.min((totalHours / mecGoal) * 100, 100) : 0,
    });
  }

  getLevelCompliance(levelIndex: number) {
    const levelGroup = (this.levelsArray as any as FormArray).at(levelIndex);
    if (!levelGroup) return { totalHours: 0, isValid: false, percent: 0 };

    const lessonDuration = Number(levelGroup.get('lessonDuration')?.value) || 0;
    const schoolWeeks = Number(levelGroup.get('schoolWeeks')?.value) || 0;
    const modules = (levelGroup.get('modules') as any as FormArray).controls;

    let totalWeeklyLessons = 0;
    modules.forEach((module: any) => {
      if (module.get('isInternship').value) {
        // For internship, we convert annual hours back to weekly for the internal aggregator
        // or just add to totalHours separately.
        // Let's just track annual hours directly for internship.
        return;
      }
      const subjects = (module.get('subjects') as FormArray).getRawValue();
      totalWeeklyLessons += subjects.reduce(
        (acc: number, curr: any) => acc + (Number(curr.weeklyLessons) || 0),
        0,
      );
    });

    let totalHours = Math.round((totalWeeklyLessons * lessonDuration * schoolWeeks) / 60);

    modules.forEach((module: any) => {
      const isInternship = module.get('isInternship')?.value;
      if (isInternship) {
        totalHours += Number(module.get('internshipHours')?.value) || 0;
      }
    });

    const mecGoal = this.matrixForm.get('mecAnnualHours')?.value || 0;

    return {
      totalHours,
      isValid: totalHours >= mecGoal,
      percent: mecGoal > 0 ? Math.min((totalHours / mecGoal) * 100, 100) : 0,
    };
  }

  getModuleHours(levelIndex: number, moduleIndex: number): number {
    const levelGroup = (this.levelsArray as any as FormArray).at(levelIndex);
    if (!levelGroup) return 0;

    const lessonDuration = Number(levelGroup.get('lessonDuration')?.value) || 0;
    const schoolWeeks = Number(levelGroup.get('schoolWeeks')?.value) || 0;

    const modules = this.getModulesArray(levelIndex);
    const module = modules.at(moduleIndex);
    if (!module) return 0;

    if (module.get('isInternship')?.value) {
      return Number(module.get('internshipHours')?.value) || 0;
    }

    const subjects = (module.get('subjects') as FormArray).getRawValue();
    const totalWeeklyLessons = subjects.reduce(
      (acc: number, curr: any) => acc + (Number(curr.weeklyLessons) || 0),
      0,
    );

    return Math.round((totalWeeklyLessons * lessonDuration * schoolWeeks) / 60);
  }

  createMatrix() {
    this.matrixForm.reset({
      name: '',
      year: new Date().getFullYear(),
      mecAnnualHours: 1200,
    });
    this.saveAttempted.set(false);
    this.levelsArray.clear();
  }

  loadMatrix(matrix: SchoolMatrixModel) {
    if (!matrix) return;

    // 1. Clear existing arrays
    this.levelsArray.clear();

    // 2. Patch Main Values (Directly, avoiding full reset)
    this.matrixForm.patchValue(
      {
        name: matrix.name ?? '',
        year: matrix.year ?? new Date().getFullYear(),
        mecAnnualHours: matrix.mecAnnualHours ?? 1200,
      },
      { emitEvent: false },
    );

    this.isClosedMatrix.set(matrix.isClosed ?? false);

    if (this.editingId()) {
      this.matrixForm.get('year')?.disable();
    }

    // 3. Rebuild Levels Array
    if (matrix.levels && matrix.levels.length > 0) {
      matrix.levels.forEach((l) => {
        this.addLevelRow(l);
      });
    }

    // 4. Force UI update for compliance
    if (this.isViewMode()) {
      this.matrixForm.disable({ emitEvent: false });
    } else {
      this.matrixForm.enable({ emitEvent: false });
      if (this.editingId()) {
        this.matrixForm.get('year')?.disable({ emitEvent: false });
      }
    }

    this.matrixForm.updateValueAndValidity();
    this.updateCompliance();
  }

  addLevelRow(data?: LevelConfiguration) {
    if (!data && this.levelsArray.length >= 1) {
      this.notification.error('Apenas um nível de ensino é permitido por matriz.');
      return;
    }

    const levelName = data?.level || this.selectedLevelToAdd();
    if (!levelName) return;

    // Use nullish coalescing for numeric fields to preserve 0 if valid (though usually they are 40/50)
    const levelGroup = this.fb.group({
      id: [data?.id || null],
      level: [levelName, Validators.required],
      lessonDuration: [data?.lessonDuration ?? 50, [Validators.required, Validators.min(1)]],
      schoolWeeks: [data?.schoolWeeks ?? 40, [Validators.required, Validators.min(1)]],
      modules: this.fb.array([]),
    });

    const modulesArray = levelGroup.get('modules') as FormArray;
    if (data?.subjects && data.subjects.length > 0) {
      // Group subjects by modulo
      const modulesMap = new Map<string, MatrixSubject[]>();
      data.subjects.forEach((s) => {
        const modName = s.modulo || 'Geral';
        if (!modulesMap.has(modName)) modulesMap.set(modName, []);
        modulesMap.get(modName)!.push(s);
      });

      const sortedModules = Array.from(modulesMap.entries())
        .map(([name, subjects]) => ({
          name,
          subjects,
          type: (subjects.some((s) => s.isInternship) ? 'internship' : 'common') as
            | 'common'
            | 'internship',
        }))
        .sort((a, b) => {
          // 1. Common modules first
          if (a.type !== b.type) {
            return a.type === 'common' ? -1 : 1;
          }
          // 2. Alphabetical by name
          return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
        });

      sortedModules.forEach((mod) => {
        modulesArray.push(this.createModuleGroup(mod.name, mod.type, mod.subjects));
      });
    }

    this.levelsArray.push(levelGroup);

    // If we are in view mode, ensure the new group is also disabled
    if (this.isViewMode()) {
      levelGroup.disable();
    }

    this.selectedLevelToAdd.set('');
  }

  removeLevel(index: number) {
    this.levelsArray.removeAt(index);
  }

  getModulesArray(levelIndex: number) {
    return (this.levelsArray as any as FormArray).at(levelIndex).get('modules') as any as FormArray;
  }

  getSubjectsArray(levelIndex: number, moduleIndex: number) {
    return this.getModulesArray(levelIndex).at(moduleIndex).get('subjects') as any as FormArray;
  }

  isSubjectSelectedInLevel(
    levelIndex: number,
    subjectId: string,
    currentModuleIndex: number,
    currentSubjectIndex: number,
  ): boolean {
    if (!subjectId) return false;

    const modulesArray = this.getModulesArray(levelIndex);
    let found = false;

    modulesArray.controls.forEach((moduleControl: any, modIdx: number) => {
      const subjectsArray = moduleControl.get('subjects') as FormArray;
      const subjects = subjectsArray.getRawValue();

      subjects.forEach((s: any, subIdx: number) => {
        if (
          (modIdx !== currentModuleIndex || subIdx !== currentSubjectIndex) &&
          s.subjectId === subjectId
        ) {
          found = true;
        }
      });
    });

    return found;
  }

  createModuleGroup(
    name: string,
    type: 'common' | 'internship' = 'common',
    subjects?: MatrixSubject[],
  ) {
    const isInternshipValue =
      type === 'internship' || (subjects && subjects.some((s) => s.isInternship));
    const internshipHoursValue =
      subjects && subjects.length > 0 && isInternshipValue ? subjects[0].internshipHours : 0;

    const moduleGroup = this.fb.group({
      name: [name, Validators.required],
      isInternship: [isInternshipValue],
      internshipHours: [internshipHoursValue || 0, [Validators.min(0)]],
      subjects: this.fb.array([]),
    });

    const subjectsArray = moduleGroup.get('subjects') as FormArray;
    if (!isInternshipValue) {
      if (subjects && subjects.length > 0) {
        subjects.forEach((s) => subjectsArray.push(this.createSubjectGroup(s)));
      } else {
        subjectsArray.push(this.createSubjectGroup());
      }
    }

    return moduleGroup;
  }

  createSubjectGroup(data?: MatrixSubject) {
    return this.fb.group({
      id: [data?.id || null],
      subjectId: [data?.subjectId || '', Validators.required],
      weeklyLessons: [data?.weeklyLessons || 2, [Validators.required, Validators.min(1)]],
      isBaseComum: [data?.isBaseComum ?? true],
      allowConsecutive: [data?.allowConsecutive ?? true],
      resourceId: [data?.resourceId || null],
      maxDailyLessons: [data?.maxDailyLessons || 2],
      showAdvanced: [false],
    });
  }

  addModuleRow(levelIndex: number, type: 'common' | 'internship' = 'common') {
    const modules = this.getModulesArray(levelIndex);
    const newModuleIndex = modules.length;
    modules.push(this.createModuleGroup(`Módulo ${newModuleIndex + 1}`, type));

    // When adding a new module, we want it to be expanded
    this.collapsedModules.update((states) => ({
      ...states,
      [`${levelIndex}-${newModuleIndex}`]: false,
    }));
  }

  removeModuleRow(levelIndex: number, moduleIndex: number) {
    this.getModulesArray(levelIndex).removeAt(moduleIndex);
  }

  addSubjectRow(levelIndex: number, moduleIndex: number) {
    this.getSubjectsArray(levelIndex, moduleIndex).push(this.createSubjectGroup());
  }

  removeSubjectRow(levelIndex: number, moduleIndex: number, subjectIndex: number) {
    this.getSubjectsArray(levelIndex, moduleIndex).removeAt(subjectIndex);
  }

  toggleAdvanced(levelIndex: number, moduleIndex: number, subjectIndex: number) {
    const control = this.getSubjectsArray(levelIndex, moduleIndex)
      .at(subjectIndex)
      .get('showAdvanced');
    control?.setValue(!control.value);
  }

  getTotalAnnualHours(weekly: number, lessonDuration: number, schoolWeeks: number) {
    return Math.round((weekly * lessonDuration * schoolWeeks) / 60);
  }

  // Room Type Manager Methods
  openRoomTypeManager() {
    this.showTypeManager.set(true);
  }

  closeRoomTypeManager() {
    this.showTypeManager.set(false);
    this.typeModal?.reset();
  }

  saveType(event: { id?: any; name: string }) {
    const name = event.name;
    const isEditing = !!event.id;

    if (isEditing) {
      this.ambienteService.updateType(event.id, { id: event.id, name: name }).subscribe({
        next: () => {
          this.loadTypes();
          this.typeModal?.reset();
        },
        error: () => {
          this.notification.error('Erro ao atualizar tipo de ambiente.');
        },
      });
    } else {
      this.ambienteService.saveType({ name: name }).subscribe({
        next: () => {
          this.loadTypes();
          this.typeModal?.reset();
        },
        error: () => {
          this.notification.error('Erro ao salvar tipo de ambiente.');
        },
      });
    }
  }

  async deleteType(id: any) {
    const confirmed = await this.confirmationService.confirm({
      message: 'Deseja realmente excluir este tipo de ambiente?',
      confirmClass: 'btn-danger',
      confirmLabel: 'Excluir',
    });

    if (confirmed) {
      this.ambienteService.deleteType(String(id)).subscribe({
        next: () => this.loadTypes(),
        error: (err) => {
          this.notification.error(
            this.extractErrorMessage(err, 'Erro ao excluir tipo de ambiente.'),
          );
        },
      });
    }
  }

  async onSubmit() {
    this.saveAttempted.set(true);

    if (this.matrixForm.invalid) {
      this.matrixForm.markAllAsTouched();
      this.notification.error('Verifique os campos obrigatórios (destacados em vermelho).');
      return;
    }

    // 2. Validação de existência de níveis
    if (this.levelsArray.length === 0) {
      this.notification.info('É necessário adicionar pelo menos um nível de ensino.');
      return;
    }

    if (this.levelsArray.length > 1) {
      this.notification.error('Apenas um nível de ensino é permitido por matriz.');
      return;
    }

    // 3. Validação de integridade das disciplinas
    let hasDuplicateSubjects = false;
    let duplicateLevelName = '';

    const allSubjectsValid = this.levelsArray.controls.every(
      (levelControl: any, lvlIdx: number) => {
        const modulesArray = levelControl.get('modules') as FormArray;

        let levelSubjectIds: string[] = [];
        let allModulesValid = true;

        modulesArray.controls.forEach((moduleControl: any, modIdx: number) => {
          const subjectsArray = moduleControl.get('subjects') as FormArray;
          const isInternship = moduleControl.get('isInternship')?.value;
          const moduleName = moduleControl.get('name')?.value;

          const subjects = subjectsArray.getRawValue();
          const subjectIds = subjects.map((s: any) => s.subjectId).filter((id: string) => id);
          levelSubjectIds.push(...subjectIds);

          if (isInternship) {
            // Internship modules don't need subjects
          } else {
            if (subjectsArray.length === 0 || !subjectsArray.valid) {
              allModulesValid = false;
            }
          }
        });

        const uniqueSubjectIds = new Set(levelSubjectIds);
        if (levelSubjectIds.length !== uniqueSubjectIds.size) {
          hasDuplicateSubjects = true;
          duplicateLevelName = levelControl.get('level')?.value;
        }

        return modulesArray.length > 0 && allModulesValid;
      },
    );

    if (!allSubjectsValid) {
      this.notification.error('Todos os níveis devem ter disciplinas válidas.');
      return;
    }

    if (hasDuplicateSubjects) {
      this.notification.error(
        `O nível "${duplicateLevelName}" possui disciplinas repetidas. Cada disciplina deve ser única por nível.`,
      );
      return;
    }

    this.isSubmitting.set(true);

    // Delay artificial para melhor UX (feedback visual de processamento)
    await new Promise((resolve) => setTimeout(resolve, 800));

    let matrixData: SchoolMatrixModel | null = null;

    try {
      const val = this.matrixForm.getRawValue();

      // 4. Mapeamento de dados com tratamento de IDs para o Backend
      const levelsData: LevelConfiguration[] = (val.levels as any[]).map((l) => ({
        id: l.id && l.id.length > 10 ? l.id : null,
        level: l.level,
        lessonDuration: Number(l.lessonDuration),
        schoolWeeks: Number(l.schoolWeeks),
        subjects: ((l as any).modules as any[]).flatMap((mod) => {
          if (mod.isInternship) {
            return [
              {
                id: null,
                materiaId: null,
                subjectId: '',
                weeklyLessons: 0,
                isBaseComum: false,
                allowConsecutive: false,
                resourceId: null,
                modulo: mod.name,
                isInternship: true as boolean,
                internshipHours: Number(mod.internshipHours),
                maxDailyLessons: 0,
              },
            ];
          } else {
            return (mod.subjects as any[]).map((s) => ({
              id: s.id && s.id.length > 10 ? s.id : null,
              materiaId: s.subjectId || null,
              subjectId: s.subjectId || '',
              weeklyLessons: Number(s.weeklyLessons),
              isBaseComum: s.isBaseComum ?? true,
              allowConsecutive: s.allowConsecutive ?? true,
              resourceId: s.resourceId && s.resourceId !== 'null' ? s.resourceId : null,
              maxDailyLessons: s.maxDailyLessons || 0,
              modulo: mod.name,
              isInternship: false as boolean,
              internshipHours: 0,
            }));
          }
        }),
      }));

      const levelNames = levelsData.map((l) => l.level).join(', ');

      matrixData = {
        id: this.editingId() || '',
        name: val.name!,
        year: val.year!,
        mecAnnualHours: val.mecAnnualHours!,
        levels: levelsData,
        status: 'Ativa',
      };

      // 5. Chamada para o Service (Adicionar ou Atualizar)
      if (this.editingId()) {
        await this.schoolData.updateMatrix(this.editingId()!, matrixData);
        this.notification.success('Matriz atualizada com sucesso!');
      } else {
        await this.schoolData.addMatrix(matrixData);
        this.notification.success('Matriz criada com sucesso!');
      }

      this.originalMatrixSnapshot.set(matrixData);
      this.router.navigate(['/school-matrices']);
    } catch (error: any) {
      const errorMessage = this.extractErrorMessage(error, 'Erro ao salvar matriz escolar.');
      this.notification.error(errorMessage);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  enableEdit() {
    if (this.isClosedMatrix()) return;

    this.isViewMode.set(false);
    this.matrixForm.enable();

    if (this.editingId()) {
      this.matrixForm.get('year')?.disable();
    }
  }

  cancelEdit() {
    const id = this.editingId();
    if (id) {
      // 1. Set view mode FIRST
      this.isViewMode.set(true);

      // 2. Revert to snapshot (instant!)
      const snapshot = this.originalMatrixSnapshot();
      if (snapshot) {
        this.loadMatrix(snapshot);
      } else {
        // Fallback to API if snapshot is missing
        this.schoolData
          .getMatrixById(id)
          .then((matrix) => {
            this.originalMatrixSnapshot.set(matrix);
            this.loadMatrix(matrix);
          })
          .catch(() => this.router.navigate(['/school-matrices']));
      }

      // 3. Ensure disable
      this.matrixForm.disable({ emitEvent: false });
    } else {
      this.router.navigate(['/school-matrices']);
    }
  }

  async deleteMatrix() {
    if (this.editingId()) {
      const confirmed = await this.confirmationService.confirm({
        message: 'Tem certeza que deseja excluir esta matriz escolar?',
        confirmClass: 'btn-danger',
        confirmLabel: 'Excluir',
      });

      if (confirmed) {
        try {
          // Assuming deleteMatrix is async or returns a promise/observable
          await this.schoolData.deleteMatrix(this.editingId()!);
          this.notification.success('Matriz escolar excluída com sucesso!');
          this.router.navigate(['/school-matrices']);
        } catch (error) {
          this.notification.error('Erro ao excluir matriz escolar.');
        }
      }
    }
  }

  async closeMatrix() {
    const id = this.editingId();
    if (!id) return;

    const confirmed = await this.confirmationService.confirm({
      title: 'Atenção',
      message: 'Tem certeza que deseja ENCERRAR esta matriz escolar? Ela entrará em modo de apenas consulta.',
      confirmClass: 'btn-orange',
      confirmLabel: 'Encerrar',
    });

    if (confirmed) {
      try {
        await this.schoolData.closeMatrix(id);
        this.notification.success('Matriz escolar fechada com sucesso!');
        this.isClosedMatrix.set(true);
        this.isViewMode.set(true);
        this.matrixForm.disable();
      } catch (error) {
        this.notification.error('Erro ao fechar matriz escolar.');
      }
    }
  }

  async reopenMatrix() {
    const id = this.editingId();
    if (!id) return;

    const confirmed = await this.confirmationService.confirm({
      message: 'Deseja realmente REABRIR esta matriz escolar? Edições serão permitidas novamente.',
      confirmClass: 'btn-primary',
      confirmLabel: 'Reabrir',
    });

    if (confirmed) {
      try {
        await this.schoolData.reopenMatrix(id);
        this.notification.success('Matriz escolar reaberta com sucesso!');
        this.isClosedMatrix.set(false);
      } catch (error) {
        this.notification.error('Erro ao reabrir matriz escolar.');
      }
    }
  }

  focusLevelSelector() {
    if (this.levelSelector) {
      this.levelSelector.nativeElement.focus();
    }
  }

  private extractErrorMessage(err: any, fallback: string): string {
    if (!err) return fallback;

    // Se err.error for a string direta (ex: BadRequest("mensagem"))
    if (typeof err.error === 'string') return err.error;

    // Se vier envelopado no CustomResponse do BaseController (ASP.NET)
    if (err.error?.errors && Array.isArray(err.error.errors) && err.error.errors.length > 0) {
      return err.error.errors[0];
    }

    // Se vier do padrão ASP.NET ProblemDetails
    if (err.error?.title) return err.error.title;

    // Outros formatos em objetos
    if (err.error?.message) return err.error.message;
    if (err.error?.error) return err.error.error;

    // Se for o exception raiz de Error do JS
    if (err.message) return err.message;

    return fallback;
  }
}
