import { Component, computed, inject, signal, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SchoolDataService } from '../../core/services/school-data';
import { TranslationService } from '../../core/services/translation.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements AfterViewInit {
  private schoolData = inject(SchoolDataService);
  private translation = inject(TranslationService);
  t = this.translation.dictionary;

  // 1. Shift Control (Time removed per user request)
  selectedShift = signal<'Manhã' | 'Tarde' | 'Noite'>(this.getSystemShift());

  // Data Signals
  classes = this.schoolData.schoolClasses;
  teachers = this.schoolData.teachers;
  events = this.schoolData.schoolEvents;
  rooms = this.schoolData.schoolRooms;
  grids = this.schoolData.schoolTimeGrids;

  // 2. KPIs (Strategic)
  kpis = computed(() => {
    const classes = this.classes();
    const rooms = this.rooms();
    const shift = this.selectedShift();

    // Rooms Capacity
    const totalRooms = rooms.length || 1;
    const occupiedInShift = classes.filter((c) => c.shift === shift && c.roomId).length;
    const roomUtilization = Math.round((occupiedInShift / totalRooms) * 100);

    // Efficiency (How much of matrix is filled)
    let totalAssigned = 0;
    let totalNeeded = 0;
    classes.forEach((c) => {
      if (c.assignments) {
        totalNeeded += c.assignments.length;
        totalAssigned += c.assignments.filter((a) => a.teacherId !== null).length;
      }
    });
    const efficiency = totalNeeded > 0 ? Math.round((totalAssigned / totalNeeded) * 100) : 0;

    // Students Impact
    const totalStudents = classes.reduce((acc, curr) => acc + (curr.studentsCount || 0), 0);

    // Next Event
    const today = new Date().toISOString().split('T')[0];
    const nextEvent = this.events()
      .filter((e) => e.startDate >= today)
      .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];

    return {
      utilization: roomUtilization,
      efficiency,
      students: totalStudents,
      nextEvent: nextEvent ? nextEvent.name : 'Nenhum próximo',
    };
  });

  // 3. Monitor Slot Logic (Keeping only the Slot name/type logic for context)
  monitor = computed(() => {
    const shift = this.selectedShift();
    const now = new Date();
    const currentHhMm = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const grid = this.grids().find((g) => g.shift === shift);
    const currentSlot = grid?.slots.find((s) => s.start <= currentHhMm && s.end >= currentHhMm);

    return {
      slot: currentSlot
        ? `${currentSlot.index ? currentSlot.index + 'º' : ''} ${currentSlot.type} (${currentSlot.start} - ${currentSlot.end})`
        : 'Intervalo / Sem Aula',
    };
  });

  // 4. Critical Alerts (Management by Exception)
  criticalAlerts = computed(() => {
    const alerts: any[] = [];
    const classes = this.classes();
    const shift = this.selectedShift();
    const dictionary = this.t();

    // Safety check for translations
    const dashboardSub = (dictionary.admin as any)?.dashboard;
    const t = dashboardSub?.critical_alerts?.types || {
      conflict: 'Conflito de Horário',
      missingTeacher: 'Disciplina Sem Professor',
      fatigue: 'Alerta de Fadiga Docente',
    };

    // 4a. Time Conflicts (Same Room/Same Shift)
    const occupancy = new Map<string, string[]>();
    classes.forEach((c) => {
      if (c.roomId) {
        const key = `room-${c.roomId}-${c.shift}`;
        if (!occupancy.has(key)) occupancy.set(key, []);
        occupancy.get(key)?.push(c.name);
      }
    });

    occupancy.forEach((classNames, key) => {
      if (classNames.length > 1) {
        const roomId = key.split('-')[1];
        const room = this.rooms().find((r) => String(r.id) === String(roomId));
        alerts.push({
          severity: 'error',
          icon: 'bi-exclamation-octagon-fill',
          title: t.conflict,
          message: `${classNames.length} turmas (${classNames.join(' e ')}) alocadas na ${room?.name} no turno ${shift}.`,
          link: '/classes',
        });
      }
    });

    // 4b. Missing Teachers
    const missingCount = classes.filter(
      (c) => c.assignments && c.assignments.some((a) => a.teacherId === null),
    ).length;
    if (missingCount > 0) {
      alerts.push({
        severity: 'warning',
        icon: 'bi-person-badge',
        title: t.missingTeacher,
        message: `${missingCount} disciplinas ainda não possuem docente vinculado.`,
        link: '/records/professor',
      });
    }

    // 4c. Teacher Fatigue (Mock/Simulated logic)
    const teachers = this.teachers().slice(0, 3);
    teachers.forEach((teach) => {
      if (teach.contractualWorkload > 35) {
        alerts.push({
          severity: 'warning',
          icon: 'bi-lightning-charge-fill',
          title: t.fatigue,
          message: `O Professor ${teach.name} ultrapassou o limite de tempos seguidos na quarta-feira.`,
          link: '/records/professor',
        });
      }
    });

    return alerts;
  });

  // 5. Refined Room Heatmap (Detailed with Class/Teacher)
  roomHeatmap = computed(() => {
    const shift = this.selectedShift();
    const classes = this.classes().filter((c) => c.shift === shift);
    const rooms = this.rooms();
    const teachers = this.teachers();

    return rooms.map((room) => {
      const roomClasses = classes.filter((c) => String(c.roomId) === String(room.id));

      let status: 'green' | 'gray' | 'red' = 'gray';
      let details = '';
      let teacherName = '';

      if (roomClasses.length > 1) {
        status = 'red';
        details = roomClasses.map((c) => c.name).join(' + ');
      } else if (roomClasses.length === 1) {
        status = 'green';
        const activeClass = roomClasses[0];
        details = activeClass.name;

        // Find teacher for this shift/class (Simulated check)
        const primaryAssignment = activeClass.assignments?.[0];
        if (primaryAssignment?.teacherId) {
          const teacher = teachers.find((t) => t.id === primaryAssignment.teacherId);
          teacherName = teacher ? teacher.name : '';
        }
      }

      return {
        ...room,
        indicator: status,
        className: details,
        teacherName: teacherName,
      };
    });
  });

  // 6. Monthly Preview Data
  monthDays = computed(() => {
    const days: any[] = [];
    const year = 2026;
    const month = 1; // February (0-indexed)
    const numDays = new Date(year, month + 1, 0).getDate();
    const dictionary = this.t();

    for (let i = 1; i <= numDays; i++) {
      const date = new Date(year, month, i);
      const dayOfWeek = date.getDay();

      // Weekday names
      const names = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
      const name = names[dayOfWeek];
      const isToday = i === 4; // Based on system time 2026-02-04

      // Simulated Events Logic
      let event = '';
      let cssClass = '';

      if (dayOfWeek === 0 || dayOfWeek === 6) {
        event = '';
        cssClass = 'opacity-25'; // Weekend
      } else if (i === 2) {
        event = 'RECESSO';
        cssClass = 'event-recess';
      } else if (i === 3 || i === 17) {
        event = 'REUNIÃO';
        cssClass = 'event-meeting';
      } else if (i === 5 || i === 24) {
        event = 'FERIADO';
        cssClass = 'event-holiday';
      }

      days.push({
        num: i,
        name: name,
        event: event,
        class: cssClass,
        isToday: isToday,
      });
    }
    return days;
  });

  setShift(s: 'Manhã' | 'Tarde' | 'Noite') {
    this.selectedShift.set(s);
  }

  private getSystemShift(): 'Manhã' | 'Tarde' | 'Noite' {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return 'Manhã';
    if (hour >= 12 && hour < 18) return 'Tarde';
    return 'Noite';
  }

  copyLink() {
    const url = window.location.origin + '/view';
    navigator.clipboard.writeText(url).then(() => {
      const msg = this.t().admin.dashboard.quickAccess.copyUrl || 'Link Copiado';
      alert(msg + ': ' + url);
    });
  }

  ngAfterViewInit() {
    // Disabled disruptive auto-scroll that was pulling the page to the bottom on reload
    /*
    setTimeout(() => {
      const todayEl = document.getElementById('day-4');
      if (todayEl) {
        todayEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }, 500); 
    */
  }
}
