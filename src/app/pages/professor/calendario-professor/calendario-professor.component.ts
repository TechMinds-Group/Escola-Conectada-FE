import { Component, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SchoolDataService } from '../../../core/services/school-data';
import { SelectComponent } from '../../../core/components/select/select.component';
import { addMonths, subMonths, format, startOfWeek, addDays, startOfToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

@Component({
  selector: 'app-calendario-professor',
  standalone: true,
  imports: [CommonModule, FormsModule, SelectComponent],
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

  weekDates = computed(() => {
    const start = startOfWeek(this.currentDate(), { weekStartsOn: 1 }); // Monday
    return [0, 1, 2, 3, 4].map((i) => {
      const date = addDays(start, i);
      return {
        label: this.daysOfWeek()[i],
        dateStr: format(date, 'dd/MM'),
        fullDate: date,
      };
    });
  });

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

  isDropdownActive = signal(false);

  // Filtros
  showFilters = signal(false);
  turmaFilter = signal<string | null>(null);
  teacherFilter = signal<string | null>(null);
  subjectFilter = signal<string | null>(null);

  turmaOptions = computed(() =>
    this.schoolData.schoolClasses().map((c) => ({ value: c.id, label: c.name })),
  );

  teacherOptions = computed(() =>
    this.schoolData.teachers().map((t) => ({ value: t.id, label: t.name })),
  );

  subjectOptions = computed(() =>
    this.schoolData.subjects().map((s) => ({ value: s.id, label: s.name })),
  );

  monthOptions = signal([
    { value: 0, label: 'Janeiro' },
    { value: 1, label: 'Fevereiro' },
    { value: 2, label: 'Março' },
    { value: 3, label: 'Abril' },
    { value: 4, label: 'Maio' },
    { value: 5, label: 'Junho' },
    { value: 6, label: 'Julho' },
    { value: 7, label: 'Agosto' },
    { value: 8, label: 'Setembro' },
    { value: 9, label: 'Outubro' },
    { value: 10, label: 'Novembro' },
    { value: 11, label: 'Dezembro' },
  ]);

  yearOptions = computed(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 5; i <= currentYear + 5; i++) {
      years.push({ value: i, label: String(i) });
    }
    return years;
  });

  currentMonthValue = computed(() => this.currentDate().getMonth());
  currentYearValue = computed(() => this.currentDate().getFullYear());

  onMonthChange(month: number) {
    this.currentDate.update((d) => {
      const next = new Date(d);
      next.setMonth(month);
      return next;
    });
  }

  onYearChange(year: number) {
    this.currentDate.update((d) => {
      const next = new Date(d);
      next.setFullYear(year);
      return next;
    });
  }

  viewMonth = computed(() => {
    return format(this.currentDate(), 'MMMM', { locale: ptBR });
  });

  viewYear = computed(() => {
    return format(this.currentDate(), 'yyyy', { locale: ptBR });
  });

  activeFilters = computed(() => {
    const active = [];
    if (this.turmaFilter()) active.push('Turma');
    if (this.teacherFilter()) active.push('Professor');
    if (this.subjectFilter()) active.push('Disciplina');
    return active;
  });

  // Assignment Lookup - Returns all assignments globally or filtered
  getAssignmentsForSlotTime(dayIndex: number, timeString: string) {
    const allClasses = this.schoolData.schoolClasses();
    const allGrids = this.schoolData.schoolTimeGrids();

    const tFilter = this.turmaFilter();
    const pFilter = this.teacherFilter();
    const sFilter = this.subjectFilter();

    const dayOfWeek = dayIndex + 1; // 1-5 (Mon-Fri)
    const results: any[] = [];

    // Filter classes first if turmaFilter is active
    const classes = tFilter ? allClasses.filter((c) => c.id === tFilter) : allClasses;

    for (const cls of classes) {
      const grid = allGrids.find((g) => g.id === cls.gradeHorariaId);
      if (!grid) continue;

      const slot = grid.slots.find(
        (s: any) => s.type === 'Aula' && `${s.start} - ${s.end}` === timeString,
      );
      if (!slot) continue;

      if (cls.assignments) {
        const assignments = cls.assignments.filter((a: any) => {
          const matchDay = String(a.dayOfWeek) === String(dayOfWeek);
          const matchSlot = String(a.slotIndex) === String(slot.index);
          if (!matchDay || !matchSlot) return false;

          // Apply Teacher Filter
          if (pFilter && a.teacherId !== pFilter) return false;

          // Apply Subject Filter
          if (sFilter) {
            // Find global subject from assignment's subjectId (which is MatrixSubject.id)
            const matrix = this.schoolData
              .schoolMatrices()
              .find((m) => String(m.id) === String(cls.matrixId));
            if (!matrix) return false;

            let matrixSub = null;
            for (const level of matrix.levels) {
              matrixSub = level.subjects.find((s) => String(s.id) === String(a.subjectId));
              if (matrixSub) break;
            }
            if (!matrixSub || matrixSub.subjectId !== sFilter) return false;
          }

          return true;
        });

        assignments.forEach((assignment: any) => {
          results.push({
            classContext: cls,
            ...assignment,
          });
        });
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
    this.currentDate.update((d) => subMonths(d, 1));
  }

  incrementDate() {
    this.currentDate.update((d) => addMonths(d, 1));
  }

  today() {
    this.currentDate.set(startOfToday());
  }

  toggleFilters() {
    this.showFilters.set(!this.showFilters());
  }

  clearFilters() {
    this.turmaFilter.set(null);
    this.teacherFilter.set(null);
    this.subjectFilter.set(null);
  }

  toggleDropdown(isOpen: boolean) {
    this.isDropdownActive.set(isOpen);
  }
}
