import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SchoolDataService, SchoolEvent } from '../../../core/services/school-data';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslationService } from '../../../core/services/translation.service';

@Component({
  selector: 'app-cadastro-calendario',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MatIconModule, MatTooltipModule],
  templateUrl: './cadastro-calendario.html',
  styleUrl: './cadastro-calendario.scss',
})
export class CadastroCalendario implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private schoolData = inject(SchoolDataService);
  public translation = inject(TranslationService);
  t = this.translation.dictionary;

  eventForm: FormGroup;
  isEditMode = signal(false);
  eventId: number | null = null;
  saveAttempted = signal(false);

  eventTypes = [
    'Feriado Nacional',
    'Feriado Local',
    'Recesso Escolar',
    'Planejamento Pedagógico',
    'Evento Festivo',
  ];

  constructor() {
    this.eventForm = this.fb.group({
      name: ['', Validators.required],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      type: ['Feriado Nacional', Validators.required],
      isSchoolDay: [false],
      suspendClasses: [true],
      scope: ['Todos', Validators.required],
    });
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.eventId = Number(id);
      this.loadEventData(this.eventId);
    }
  }

  loadEventData(id: number) {
    const event = this.schoolData.schoolEvents().find((e) => e.id === id);
    if (event) {
      this.eventForm.patchValue(event);
    }
  }

  getEventTypeLabel(type: string): string {
    const types = this.t().admin.calendar.types as Record<string, string>;
    return types[type] || type;
  }

  onSubmit() {
    this.saveAttempted.set(true);
    if (this.eventForm.valid) {
      const formValue = this.eventForm.value;

      if (this.isEditMode() && this.eventId) {
        this.schoolData.updateEvent(this.eventId, formValue);
      } else {
        this.schoolData.addEvent(formValue);
      }

      this.router.navigate(['/consulta-calendario']);
    } else {
      this.eventForm.markAllAsTouched();
    }
  }

  deleteEvent() {
    if (this.eventId && confirm(this.t().admin.calendar.form.deleteConfirm)) {
      this.schoolData.deleteEvent(this.eventId);
      this.router.navigate(['/consulta-calendario']);
    }
  }
}
