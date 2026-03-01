import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SchoolDataService } from '../../../core/services/school-data';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { TranslationService } from '../../../core/services/translation.service';

@Component({
  selector: 'app-consulta-calendario',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, FormsModule],
  templateUrl: './consulta-calendario.html',
  styleUrl: './consulta-calendario.scss',
})
export class ConsultaCalendario {
  private schoolData = inject(SchoolDataService);
  private router = inject(Router);
  public translation = inject(TranslationService);
  t = this.translation.dictionary;

  viewMode = signal<'list' | 'month'>('list');

  // Month View State
  currentDate = signal(new Date());

  // Computed week days based on current language
  weekDays = computed(() => {
    const lang = this.translation.lang();
    const locale = lang === 'es' ? 'es-ES' : 'pt-BR';
    const formatter = new Intl.DateTimeFormat(locale, { weekday: 'short' });
    const days = [];
    // Start from Sunday (using a known Sunday date, e.g., 2024-01-07)
    for (let i = 0; i < 7; i++) {
      const date = new Date(2024, 0, 7 + i);
      days.push(formatter.format(date));
    }
    return days;
  });

  events = this.schoolData.schoolEvents;

  // Computed for List View (Sorted by Date)
  sortedEvents = computed(() => {
    return this.events().sort((a, b) => a.startDate.localeCompare(b.startDate));
  });

  // Computed for Month View
  calendarDays = computed(() => {
    const year = this.currentDate().getFullYear();
    const month = this.currentDate().getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days = [];

    // Padding for previous month
    const startDayOfWeek = firstDay.getDay(); // 0 (Sun) to 6 (Sat)
    for (let i = 0; i < startDayOfWeek; i++) {
      const prevDate = new Date(year, month, -(startDayOfWeek - 1 - i));
      days.push({
        date: prevDate,
        day: prevDate.getDate(),
        isToday: false,
        isCurrentMonth: false,
        events: [] as any[],
      });
    }

    // Current month days
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      const dateStr = date.toISOString().split('T')[0];

      // Find events for this day
      const dayEvents = this.events().filter((e) => dateStr >= e.startDate && dateStr <= e.endDate);

      days.push({
        date: date,
        day: d,
        isToday: new Date().toDateString() === date.toDateString(),
        isCurrentMonth: true,
        events: dayEvents,
      });
    }

    // Padding for next month to complete the row (optional, looks better)
    const remainingCells = 7 - (days.length % 7);
    if (remainingCells < 7) {
      for (let i = 1; i <= remainingCells; i++) {
        const nextDate = new Date(year, month + 1, i);
        days.push({
          date: nextDate,
          day: i,
          isToday: false,
          isCurrentMonth: false,
          events: [] as any[],
        });
      }
    }

    return days;
  });

  getTypeColor(type: string): string {
    switch (type) {
      case 'Feriado Nacional':
        return 'danger'; // Laranja/Vermelho
      case 'Feriado Local':
        return 'info'; // Azul (Substituto do Amarelo)
      case 'Recesso Escolar':
        return 'secondary'; // Cinza
      case 'Planejamento Pedagógico':
        return 'info'; // Azul
      case 'Evento Festivo':
        return 'success'; // Verde
      default:
        return 'primary';
    }
  }

  getBadgeClass(type: string): string {
    const color = this.getTypeColor(type);
    return `bg-${color}-subtle text-${color}-emphasis`;
  }

  getEventTypeLabel(type: string): string {
    const types = this.t().admin.calendar.types as Record<string, string>;
    return types[type] || type;
  }

  getScopeLabel(scope: string): string {
    const options = this.t().admin.calendar.form.options as Record<string, string>;
    const map: Record<string, string> = {
      Todos: 'all',
      Fundamental: 'elementary',
      Médio: 'highSchool',
    };
    const key = map[scope];
    return key ? options[key] : scope;
  }

  nextMonth() {
    const curr = this.currentDate();
    this.currentDate.set(new Date(curr.getFullYear(), curr.getMonth() + 1, 1));
  }

  prevMonth() {
    const curr = this.currentDate();
    this.currentDate.set(new Date(curr.getFullYear(), curr.getMonth() - 1, 1));
  }

  formatMonthYear(date: Date): string {
    const lang = this.translation.lang();
    const locale = lang === 'es' ? 'es-ES' : 'pt-BR';
    return date.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  }

  navigateToNew() {
    this.router.navigate(['/cadastro-calendario']);
  }

  editEvent(id: number) {
    this.router.navigate(['/cadastro-calendario', id]);
  }
}
