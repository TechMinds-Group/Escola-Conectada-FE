import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SchoolDataService } from '../../../../core/services/school-data';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslationService } from '../../../../core/services/translation.service';

import { ButtonSaveComponent } from '../../../../core/components/buttons/button-save';
import { ButtonCancelComponent } from '../../../../core/components/buttons/button-cancel';
import { ButtonDeleteComponent } from '../../../../core/components/buttons/button-delete';
import { TurmaService } from '../../../../core/services/turma.service';
import { ConfirmationService } from '../../../../core/services/confirmation.service';
import { firstValueFrom } from 'rxjs';

import { ButtonEditComponent } from '../../../../core/components/buttons/button-edit';
import { TextInputComponent } from '../../../../core/components/text-input/text-input.component';
import { SelectComponent } from '../../../../core/components/select/select.component';
import { TimeInputComponent } from '../../../../core/components/time-input/time-input.component';

@Component({
  selector: 'app-cadastro-grade',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatIconModule,
    MatTooltipModule,
    ButtonSaveComponent,
    ButtonCancelComponent,
    ButtonDeleteComponent,
    ButtonEditComponent,
    TextInputComponent,
    SelectComponent,
    TimeInputComponent,
  ],
  templateUrl: './cadastro-grade.html',
  styleUrl: './cadastro-grade.scss',
})
export class CadastroGrade implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  public router = inject(Router);
  private schoolData = inject(SchoolDataService);
  private turmaService = inject(TurmaService);
  private confirmation = inject(ConfirmationService);
  public translation = inject(TranslationService);
  t = this.translation.dictionary;

  gridForm: FormGroup;
  isEditMode = signal(false);
  isViewMode = signal(false);
  gridId: string | null = null;
  originalShift: string | null = null;
  saveAttempted = signal(false);
  isSubmitting = signal(false);

  shifts = ['Manhã', 'Tarde', 'Noite', 'Integral'];

  constructor() {
    this.gridForm = this.fb.group({
      name: ['', Validators.required],
      shift: ['Manhã', Validators.required],
      slots: this.fb.array([]),
    });
  }

  get slots(): FormArray {
    return this.gridForm.get('slots') as FormArray;
  }

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.isViewMode.set(true);
      this.gridId = id;
      await this.loadGridData(id);
      this.gridForm.disable();
    } else {
      // Init with 1 slot
      this.addSlot('Aula');
    }
  }

  enableEdit() {
    this.isViewMode.set(false);
    this.gridForm.enable();
  }

  async cancelEdit() {
    if (!this.isEditMode()) {
      this.router.navigate(['/time-grids']);
      return;
    }

    this.isViewMode.set(true);
    if (this.gridId) {
      await this.loadGridData(this.gridId);
    }
    this.gridForm.disable();
    this.saveAttempted.set(false);
  }

  async loadGridData(id: string) {
    if (this.schoolData.schoolTimeGrids().length === 0) {
      await this.schoolData.loadTimeGrids();
    }
    const grid = this.schoolData.schoolTimeGrids().find((g) => g.id === id);
    if (grid) {
      this.gridForm.patchValue({
        name: grid.name,
        shift: grid.shift,
      });
      this.originalShift = grid.shift;
      this.slots.clear();
      grid.slots.forEach((slot) => {
        this.slots.push(this.createSlotGroup(slot));
      });
    }
  }

  getShiftName(shift: string): string {
    const shifts = this.t().admin.timegrid.shifts as Record<string, string>;
    return shifts[shift] || shift;
  }

  createSlotGroup(data?: any): FormGroup {
    const timePattern = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return this.fb.group({
      id: [data?.id || null],
      type: [data?.type || 'Aula'],
      start: [data?.start || '', [Validators.required, Validators.pattern(timePattern)]],
      end: [data?.end || '', [Validators.required, Validators.pattern(timePattern)]],
      index: [data?.index || null],
    });
  }

  addSlot(type: 'Aula' | 'Intervalo') {
    let startTime = '';

    // Auto-calc start time based on last slot end time
    if (this.slots.length > 0) {
      const lastSlot = this.slots.at(this.slots.length - 1).value;
      if (lastSlot.end) {
        startTime = lastSlot.end;
      }
    }

    // Estimate End Time (50min for class, 20min for break)
    let endTime = '';

    if (!startTime && this.slots.length === 0) {
      startTime = '07:30';
    }

    if (startTime) {
      const [hours, mins] = startTime.split(':').map(Number);
      const duration = type === 'Aula' ? 50 : 20;
      const date = new Date();
      date.setHours(hours, mins + duration);
      const hh = date.getHours().toString().padStart(2, '0');
      const mm = date.getMinutes().toString().padStart(2, '0');
      endTime = `${hh}:${mm}`;
    }

    const index = type === 'Aula' ? this.calculateNextLessonIndex() : null;

    const timePattern = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    this.slots.push(
      this.fb.group({
        id: [null],
        type: [type],
        start: [startTime, [Validators.required, Validators.pattern(timePattern)]],
        end: [endTime, [Validators.required, Validators.pattern(timePattern)]],
        index: [index],
      }),
    );
  }

  calculateNextLessonIndex(): number {
    let count = 0;
    this.slots.controls.forEach((control) => {
      if (control.get('type')?.value === 'Aula') count++;
    });
    return count + 1;
  }

  removeSlot(index: number) {
    this.slots.removeAt(index);
    this.recalculateIndexes();
  }

  recalculateIndexes() {
    let count = 0;
    this.slots.controls.forEach((control) => {
      if (control.get('type')?.value === 'Aula') {
        count++;
        control.patchValue({ index: count }, { emitEvent: false });
      } else {
        control.patchValue({ index: null }, { emitEvent: false });
      }
    });
  }

  async onSubmit() {
    this.saveAttempted.set(true);

    if (this.gridForm.invalid) {
      this.gridForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const formValue = this.gridForm.getRawValue();

    try {
      if (this.isEditMode() && this.gridId) {
        // Lógica de Validação de Mudança de Turno
        if (formValue.shift !== this.originalShift) {
          const turmas = await firstValueFrom(this.turmaService.list());
          const turmasVinculadas = turmas.filter((t) => t.gradeHorariaId === this.gridId);

          if (turmasVinculadas.length > 0) {
            const confirmed = await this.confirmation.confirm({
              title: 'Aviso de Vínculo',
              message: `Esta grade está vinculada a ${turmasVinculadas.length} turma(s). Alterar o turno irá atualizar todas elas. Deseja continuar?`,
              confirmLabel: 'Confirmar e Atualizar',
              confirmClass: 'btn-warning',
            });

            if (!confirmed) {
              this.isSubmitting.set(false);
              return;
            }
          }
        }

        await this.schoolData.updateTimeGrid(this.gridId, formValue);
      } else {
        await this.schoolData.addTimeGrid(formValue);
      }

      this.router.navigate(['/time-grids']);
    } catch (error) {
      // Error handling
    } finally {
      this.isSubmitting.set(false);
    }
  }

  /**
   * Converte a string do formulário para o valor numérico do Enum do C#
   */
  private mapShiftToEnum(shift: string): number {
    const mapping: Record<string, number> = {
      Manhã: 1,
      Tarde: 2,
      Noite: 3,
      Integral: 4,
    };
    return mapping[shift] || 1;
  }

  cancel() {
    this.router.navigate(['/time-grids']);
  }

  async deleteGrid() {
    if (this.gridId && confirm(this.t().admin.timegrid.form.deleteConfirm)) {
      try {
        await this.schoolData.deleteTimeGrid(this.gridId);
        this.router.navigate(['/time-grids']);
      } catch (error) {
        // Error handling
      }
    }
  }
}
