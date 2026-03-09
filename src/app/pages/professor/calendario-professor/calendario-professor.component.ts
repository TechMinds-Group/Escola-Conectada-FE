import { Component, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SchoolDataService } from '../../../core/services/school-data';

@Component({
  selector: 'app-calendario-professor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './calendario-professor.component.html',
  styleUrl: './calendario-professor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarioProfessorComponent {
  private schoolData = inject(SchoolDataService);

  // Title and subtitle
  // Date and view management
  currentDate = signal<Date>(new Date());

  daysOfWeek = signal(['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta']);

  // Generates a unified, sorted array of all active class slots in the system
  hoursArray = computed(() => {
    const classes = this.schoolData.schoolClasses();
    const allGrids = this.schoolData.schoolTimeGrids();

    // Get all grids actually used by classes
    const activeGridIds = new Set(classes.map((c) => c.gradeHorariaId));

    const uniqueSlots = new Map<string, any>(); // key="HH:MM - HH:MM"

    for (const gridId of activeGridIds) {
      const grid = allGrids.find((g) => g.id === gridId);
      if (grid) {
        grid.slots
          .filter((s) => s.type === 'Aula')
          .forEach((s) => {
            const timeStr = `${s.start} - ${s.end}`;
            if (!uniqueSlots.has(timeStr)) {
              uniqueSlots.set(timeStr, {
                start: s.start,
                timeString: timeStr,
              });
            }
          });
      }
    }

    // Sort chronologically
    return Array.from(uniqueSlots.values()).sort((a, b) => a.start.localeCompare(b.start));
  });

  // Filtros
  showFilters = signal(false);

  viewMonth = computed(() => {
    return this.currentDate().toLocaleString('pt-BR', { month: 'long' });
  });

  viewYear = computed(() => {
    return this.currentDate().getFullYear();
  });

  activeFilters = computed(() => {
    return [];
  });

  // Assignment Lookup - Returns all assignments globally
  getAssignmentsForSlotTime(dayIndex: number, timeString: string) {
    const classes = this.schoolData.schoolClasses();
    const allGrids = this.schoolData.schoolTimeGrids();

    const dayOfWeek = dayIndex + 1; // 1-5 (Mon-Fri)
    const results: any[] = [];

    for (const cls of classes) {
      // Find which slot index corresponds to this time string in this class's grid
      const grid = allGrids.find((g) => g.id === cls.gradeHorariaId);
      if (!grid) continue;

      const slot = grid.slots.find(
        (s: any) => s.type === 'Aula' && `${s.start} - ${s.end}` === timeString,
      );
      if (!slot) continue;

      if (cls.assignments) {
        const assignment = cls.assignments.find(
          (a: any) =>
            String(a.dayOfWeek) === String(dayOfWeek) && String(a.slotIndex) === String(slot.index),
        );

        if (assignment) {
          results.push({
            classContext: cls,
            ...assignment,
          });
        }
      }
    }
    return results;
  }

  getSubjectName(matrixId: string, subjectId: string): string {
    const matrix = this.schoolData.schoolMatrices().find((m) => String(m.id) === String(matrixId));
    if (!matrix) return '---';

    let matrixSub;
    for (const level of matrix.levels) {
      matrixSub = level.subjects.find((s) => String(s.id) === String(subjectId));
      if (matrixSub) break;
    }

    if (!matrixSub) return '---';

    const globalSub = this.schoolData
      .subjects()
      .find((s) => String(s.id) === String(matrixSub!.subjectId));
    return globalSub ? globalSub.name : '---';
  }

  getSubjectColor(matrixId: string, subjectId: string): string {
    const matrix = this.schoolData.schoolMatrices().find((m) => String(m.id) === String(matrixId));
    if (!matrix) return '#e2e8f0';

    let matrixSub;
    for (const level of matrix.levels) {
      matrixSub = level.subjects.find((s) => String(s.id) === String(subjectId));
      if (matrixSub) break;
    }

    if (!matrixSub) return '#e2e8f0';

    const globalSub = this.schoolData
      .subjects()
      .find((s) => String(s.id) === String(matrixSub!.subjectId));
    return globalSub ? globalSub.color : '#e2e8f0';
  }

  getTeacherName(teacherId: string | null): string {
    if (!teacherId) return 'Sem Prof.';
    const teacher = this.schoolData.teachers().find((t) => t.id === teacherId);
    return teacher ? teacher.name : 'Sem Prof.';
  }

  getRoomInfo(roomId?: string): string {
    if (!roomId) return '';
    const room = this.schoolData.schoolRooms().find((r) => r.id === roomId);
    if (!room) return '';
    // Simplify for calendar block
    return room.name || '';
  }

  decrementDate() {
    const prev = new Date(this.currentDate());
    prev.setDate(prev.getDate() - 7);
    this.currentDate.set(prev);
  }

  incrementDate() {
    const next = new Date(this.currentDate());
    next.setDate(next.getDate() + 7);
    this.currentDate.set(next);
  }

  today() {
    this.currentDate.set(new Date());
  }

  toggleFilters() {
    this.showFilters.set(!this.showFilters());
  }

  clearFilters() {
    // No specific filters to clear currently as it's global,
    // but the method is needed for the UI button.
    this.showFilters.set(false);
  }
}
