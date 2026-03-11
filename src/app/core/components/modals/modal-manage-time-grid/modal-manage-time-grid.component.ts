import { Component, Input, Output, EventEmitter, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  FormsModule,
} from '@angular/forms';
import { SchoolDataService, SchoolTimeGrid, TimeSlot } from '../../../../core/services/school-data';
import { TranslationService } from '../../../../core/services/translation.service';
import { MatIconModule } from '@angular/material/icon';
import { ConfirmationService } from '../../../../core/services/confirmation.service';

@Component({
  selector: 'app-modal-manage-time-grid',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, MatIconModule],
  templateUrl: './modal-manage-time-grid.component.html',
  styleUrls: ['./modal-manage-time-grid.component.scss'],
})
export class ModalManageTimeGridComponent implements OnInit {
  @Input() isOpen: boolean = false;
  @Output() close = new EventEmitter<void>();
  @Output() onSaved = new EventEmitter<string>(); // Emits ID of saved grid

  private fb = inject(FormBuilder);
  public schoolData = inject(SchoolDataService);
  private confirmation = inject(ConfirmationService);
  public translation = inject(TranslationService);
  t = this.translation.dictionary;

  viewMode = signal<'list' | 'edit'>('list');
  gridForm: FormGroup;
  editingGridId = signal<string | null>(null);
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

  ngOnInit() {}

  get slots(): FormArray {
    return this.gridForm.get('slots') as FormArray;
  }

  closeModal() {
    this.close.emit();
    this.reset();
  }

  reset() {
    this.viewMode.set('list');
    this.editingGridId.set(null);
    this.gridForm.reset({ shift: 'Manhã' });
    this.slots.clear();
    this.saveAttempted.set(false);
  }

  startNew() {
    this.reset();
    this.viewMode.set('edit');
    this.addSlot('Aula');
  }

  async startEdit(grid: SchoolTimeGrid) {
    this.editingGridId.set(grid.id);
    this.gridForm.patchValue({
      name: grid.name,
      shift: grid.shift,
    });
    this.slots.clear();
    grid.slots.forEach((slot) => {
      this.slots.push(this.createSlotGroup(slot));
    });
    this.viewMode.set('edit');
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
    if (this.slots.length > 0) {
      const lastSlot = this.slots.at(this.slots.length - 1).value;
      if (lastSlot.end) startTime = lastSlot.end;
    }

    let endTime = '';
    if (!startTime && this.slots.length === 0) startTime = '07:30';

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
    this.slots.push(this.createSlotGroup({ type, start: startTime, end: endTime, index }));
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

  async saveGrid() {
    this.saveAttempted.set(true);
    if (this.gridForm.invalid) {
      this.gridForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const formValue = this.gridForm.getRawValue();

    try {
      let savedGrid: any;
      if (this.editingGridId()) {
        savedGrid = await this.schoolData.updateTimeGrid(this.editingGridId()!, formValue);
      } else {
        savedGrid = await this.schoolData.addTimeGrid(formValue);
      }

      // If the backend returns the new object with ID
      const newId = savedGrid?.id || savedGrid?.data?.id || this.editingGridId();
      this.onSaved.emit(newId);
      this.viewMode.set('list');
    } catch (error) {
      // Error handling
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async deleteGrid(id: string) {
    const confirmed = await this.confirmation.confirm({
      message: 'Tem certeza que deseja excluir esta grade de horários?',
      confirmClass: 'btn-danger',
      confirmLabel: 'Excluir',
    });

    if (confirmed) {
      try {
        await this.schoolData.deleteTimeGrid(id);
      } catch (error) {
        // Error handling
      }
    }
  }

  onTimeInput(event: any, index: number, field: 'start' | 'end') {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, '');
    if (value.length > 4) value = value.slice(0, 4);
    if (value.length >= 3) value = value.slice(0, 2) + ':' + value.slice(2);
    const slot = this.slots.at(index);
    slot.patchValue({ [field]: value }, { emitEvent: false });
    input.value = value;
  }
}
