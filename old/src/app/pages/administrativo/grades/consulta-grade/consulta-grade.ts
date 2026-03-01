import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SchoolDataService } from '../../../../core/services/school-data';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslationService } from '../../../../core/services/translation.service';

@Component({
  selector: 'app-consulta-grade',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: './consulta-grade.html',
  styleUrl: './consulta-grade.scss',
})
export class ConsultaGrade implements OnInit {
  private schoolData = inject(SchoolDataService);
  private router = inject(Router);
  public translation = inject(TranslationService);
  t = this.translation.dictionary;

  grids = this.schoolData.schoolTimeGrids;

  ngOnInit() {
    this.schoolData.loadTimeGrids();
  }

  navigateToAdd() {
    this.router.navigate(['/time-grids/new']);
  }

  editGrid(id: string) {
    this.router.navigate(['/time-grids/edit', id]);
  }

  getShiftColor(shift: string): string {
    switch (shift) {
      case 'Manhã':
        return 'info'; // Azul (Manhã)
      case 'Tarde':
        return 'danger'; // Laranja (Pôr do sol)
      case 'Noite':
        return 'indigo'; // Roxo/Azul (Noite)
      default:
        return 'primary';
    }
  }

  getShiftName(shift: string): string {
    const shifts = this.t().admin.timegrid.shifts as Record<string, string>;
    return shifts[shift] || shift;
  }

  countLessons(slots: any[]): number {
    return slots.filter((s) => s.type === 'Aula').length;
  }
}
