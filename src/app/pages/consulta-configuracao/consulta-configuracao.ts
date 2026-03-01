import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SchoolDataService } from '../../core/services/school-data';
import { TranslationService } from '../../core/services/translation.service';

import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-consulta-configuracao',
  standalone: true,
  imports: [CommonModule, FormsModule, MatMenuModule, MatButtonModule, MatIconModule],
  templateUrl: './consulta-configuracao.html',
  styleUrl: './consulta-configuracao.scss',
})
export class ConsultaConfiguracao {
  schoolData = inject(SchoolDataService);
  public translation = inject(TranslationService);
  t = this.translation.dictionary;

  // Local Draft State
  draftParameters = signal(this.schoolData.academicParameters());

  // Check for changes
  hasChanges = computed(() => {
    const current = this.schoolData.academicParameters();
    const draft = this.draftParameters();
    return (
      current.lessonDuration !== draft.lessonDuration || current.schoolWeeks !== draft.schoolWeeks
    );
  });

  constructor() {
    // Sync draft if external source changes (optional, but good practice)
    effect(
      () => {
        const current = this.schoolData.academicParameters();
        // Only update draft if we don't have unsaved changes to avoid overwriting user input
        if (!this.hasChanges()) {
          this.draftParameters.set(current);
        }
      },
      { allowSignalWrites: true },
    );
  }

  updateDuration(value: any) {
    this.draftParameters.update((p) => ({ ...p, lessonDuration: Number(value) }));
  }

  updateWeeks(value: any) {
    this.draftParameters.update((p) => ({ ...p, schoolWeeks: Number(value) }));
  }

  save() {
    this.schoolData.updateAcademicParameters(this.draftParameters());
    // Draft will auto-sync via effect or we can force set it:
    this.draftParameters.set(this.schoolData.academicParameters());
  }

  cancel() {
    this.draftParameters.set(this.schoolData.academicParameters());
  }
}
