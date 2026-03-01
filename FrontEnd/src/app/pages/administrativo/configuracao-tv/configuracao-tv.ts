import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SchoolDataService, SchoolTVSettings } from '../../../core/services/school-data';
import { TranslationService } from '../../../core/services/translation.service';

@Component({
  selector: 'app-configuracao-tv',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './configuracao-tv.html',
  styleUrl: './configuracao-tv.scss',
})
export class ConfiguracaoTV {
  private fb = inject(FormBuilder);
  private schoolData = inject(SchoolDataService);
  public translation = inject(TranslationService);
  t = this.translation.dictionary;

  form: FormGroup;
  showSuccess = signal(false);
  saveAttempted = signal(false);

  constructor() {
    const currentSettings = this.schoolData.tvSettings();

    this.form = this.fb.group({
      sceneDurations: this.fb.group({
        timetable: [
          currentSettings.sceneDurations.timetable,
          [Validators.required, Validators.min(1)],
        ],
        events: [currentSettings.sceneDurations.events, [Validators.required, Validators.min(1)]],
        notices: [currentSettings.sceneDurations.notices, [Validators.required, Validators.min(1)]],
      }),
      shiftTriggers: this.fb.group({
        morning: [currentSettings.shiftTriggers.morning, Validators.required],
        afternoon: [currentSettings.shiftTriggers.afternoon, Validators.required],
        night: [currentSettings.shiftTriggers.night, Validators.required],
      }),
    });
  }

  onSubmit() {
    this.saveAttempted.set(true);
    if (this.form.valid) {
      const settings: SchoolTVSettings = this.form.value;
      this.schoolData.updateTVSettings(settings);

      this.showSuccess.set(true);
      setTimeout(() => this.showSuccess.set(false), 3000);
    } else {
      this.form.markAllAsTouched();
    }
  }

  openPreview() {
    const url = window.location.origin + '/view';
    window.open(url, '_blank');
  }
}
