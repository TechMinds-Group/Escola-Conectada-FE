import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  SchoolDataService,
  SchoolMatrix as SchoolMatrixModel,
} from '../../../core/services/school-data';
import { TranslationService } from '../../../core/services/translation.service';

@Component({
  selector: 'app-consulta-matriz-escolar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './consulta-matriz-escolar.html',
  styleUrl: './consulta-matriz-escolar.scss',
})
export class ConsultaMatrizEscolarPage {
  public schoolData = inject(SchoolDataService);
  public translation = inject(TranslationService);
  t = this.translation.dictionary;
  matrices = this.schoolData.schoolMatrices;

  // Helpers for Template (Display only)
  getMatrixTotalHours(matrix: SchoolMatrixModel) {
    return matrix.levels.reduce((acc, level) => {
      const weekly = level.subjects.reduce((sum, s) => sum + s.weeklyLessons, 0);
      return acc + Math.round((weekly * level.lessonDuration * level.schoolWeeks) / 60);
    }, 0);
  }

  getMatrixLevelsSummary(matrix: SchoolMatrixModel) {
    return matrix.levels.map((l) => l.level).join(', ');
  }
}
