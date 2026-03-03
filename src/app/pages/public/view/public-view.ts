import {
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
  effect,
  ViewChild,
  ViewChildren,
  QueryList,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { SchoolDataService, SchoolClass } from '../../../core/services/school-data';
import { TranslationService } from '../../../core/services/translation.service';
import { MatIconModule } from '@angular/material/icon';
import { debounceTime } from 'rxjs';

@Component({
  selector: 'app-public-view',
  standalone: true,
  imports: [CommonModule, MatIconModule, ReactiveFormsModule],
  templateUrl: './public-view.html',
  styleUrl: './public-view.scss',
})
export class PublicView implements OnInit, OnDestroy {
  private schoolData = inject(SchoolDataService);
  public translationService = inject(TranslationService);

  // Translation Helper for Template
  t = this.translationService.dictionary;

  // Mode detection
  isMobile = signal(window.innerWidth < 992);
  activeTab = signal<'timetable' | 'notices' | 'calendar'>('timetable');

  // TV Mode: Scenes
  currentScene = signal<'timetable' | 'events' | 'notices'>('timetable');
  currentPage = signal(0);
  currentTime = signal(new Date()); // Clock
  private loopInterval: any;
  private clockInterval: any;
  private dataSyncInterval: any;
  private scenes: ('timetable' | 'events' | 'notices')[] = ['timetable', 'events', 'notices'];

  // Data
  classes = this.schoolData.schoolClasses;
  events = this.schoolData.schoolEvents;
  lastSync = signal<Date>(new Date());

  // Search (Mobile mainly)
  searchControl = new FormControl('');
  searchQuery = signal('');

  // Computed
  upcomingEvents = computed(() => {
    // Show next 3 events and translate types
    const dict = this.t().public.data.events;
    return this.events()
      .slice(0, 3)
      .map((ev) => ({
        ...ev,
        translatedType: this.translateEventType(ev.type),
      }));
  });

  translateEventType(type: string): string {
    const dict = this.t().public.data.events;
    if (type === 'Feriado Nacional') return dict.holiday;
    if (type === 'Evento Festivo') return dict.party;
    return dict.academic;
  }

  filteredClasses = computed(() => {
    const q = this.searchQuery().toLowerCase();
    if (!q) return [];
    return this.classes().filter((c) => c.name.toLowerCase().includes(q));
  });

  // Today's Mock Schedule (Just for demo visual) -> Now Computed for i18n
  mockSchedule = computed(() => {
    const d = this.t().public.data.schedule;
    return [
      { time: '07:30 - 08:20', subject: d.math, teacher: 'Dr. Ricardo', room: 'Ambiente 101' },
      { time: '08:20 - 09:10', subject: d.port, teacher: 'Profa. Amanda', room: 'Ambiente 101' },
      { time: '09:10 - 09:30', subject: d.break, isBreak: true },
      { time: '09:30 - 10:20', subject: d.history, teacher: 'Dr. Roberto', room: 'Ambiente 101' },
      { time: '10:20 - 11:10', subject: d.physics, teacher: 'Dra. Elena', room: 'Laboratório' },
    ];
  });

  mockNotices = computed(() => {
    const d = this.t().public.data.notices;
    return [
      {
        title: d.renewalTitle,
        message: d.renewalMsg,
        type: 'alert',
      },
      {
        title: d.scienceTitle,
        message: d.scienceMsg,
        type: 'info',
      },
      {
        title: d.meetingTitle,
        message: d.meetingMsg,
        type: 'event',
      },
    ];
  });

  currentNoticeIndex = signal(0);

  constructor() {
    // Listen to search changes
    this.searchControl.valueChanges.pipe(debounceTime(300)).subscribe((val) => {
      this.searchQuery.set(val || '');
    });

    // Resize listener
    window.addEventListener('resize', this.onResize.bind(this));

    // Effect to restart loop when settings change (instant dynamic update)
    effect(() => {
      const settings = this.schoolData.tvSettings();
      if (!this.isMobile()) {
        this.startTvLoop();
      }
    });
  }

  ngOnInit() {
    if (!this.isMobile()) {
      this.startTvLoop();
    }

    // Start Clock
    this.clockInterval = setInterval(() => {
      this.currentTime.set(new Date());
    }, 1000);

    // Start Real-Time Data Sync (Heartbeat)
    this.startDataSync();
  }

  private startDataSync() {
    // Initial sync check
    this.schoolData.loadAll();

    // Polling every 30 seconds
    this.dataSyncInterval = setInterval(() => {
      console.log('[PublicView] Heartbeat: Syncing real-time data...');
      this.schoolData.loadAll().then(() => {
        this.lastSync.set(new Date());
      });
    }, 30000);
  }

  ngOnDestroy() {
    this.stopTvLoop();
    if (this.clockInterval) clearInterval(this.clockInterval);
    if (this.dataSyncInterval) clearInterval(this.dataSyncInterval);
    window.removeEventListener('resize', this.onResize.bind(this));
  }

  onResize() {
    const mobile = window.innerWidth < 992;
    this.isMobile.set(mobile);

    if (mobile) {
      this.stopTvLoop();
    } else {
      this.startTvLoop();
    }
  }

  changeLang(lang: string) {
    this.translationService.setLang(lang as 'pt' | 'es');
  }

  // Intelligent Scaling Logic:
  // Mobile/Tablet: 4 items (2x2)
  // TV/Desktop: 6 items (3x2)
  dynamicItemsPerPage = computed(() => (this.isMobile() ? 4 : 6));

  tvClasses = computed(() => {
    const list = this.relevantClasses();
    const page = this.currentPage();
    const itemsPerPage = this.dynamicItemsPerPage();
    const start = page * itemsPerPage;
    return list.slice(start, start + itemsPerPage);
  });

  // Grid Calculation for Zero-Scroll scaling
  gridRows = computed(() => {
    const count = this.tvClasses().length;
    if (this.isMobile()) {
      return count <= 2 ? 1 : 2; // 2x1 or 2x2
    }
    return count <= 3 ? 1 : 2; // 3x1 or 3x2
  });

  startTvLoop() {
    this.stopTvLoop();
    this.runSceneLoop();
  }

  // View Children for Auto Scroll
  @ViewChild('eventsContainer') eventsContainer!: ElementRef;
  @ViewChild('eventsList') eventsList!: ElementRef;
  // Use ViewChildren because elements inside @for (even with 1 item) are dynamic
  @ViewChildren('noticeContainer') noticeContainers!: QueryList<ElementRef>;
  @ViewChildren('noticeContent') noticeContents!: QueryList<ElementRef>;

  runSceneLoop() {
    const settings = this.schoolData.tvSettings();
    const current = this.currentScene();

    // Base setting (seconds)
    const baseDuration = settings.sceneDurations[current] * 1000;
    let actualDuration = baseDuration;

    // Handle Timetable Sequential Rotation
    if (current === 'timetable') {
      this.currentPage.set(0);
      this.runTimetableSequence(0, baseDuration);
    } else if (current === 'notices') {
      // Notices Logic: Recursive Sequence to handle per-item duration (scrolling)
      this.currentNoticeIndex.set(0);
      this.runNoticeSequence(0, baseDuration);
    } else {
      // Handle Auto-Scroll for Events (Async calculation)
      if (current === 'events') {
        setTimeout(() => {
          const scrollTotal = this.checkAndAnimateScroll(baseDuration);
          if (scrollTotal > 0) {
            // Override default loop to wait for 1s + scroll + 1s
            clearTimeout(this.loopInterval);
            this.loopInterval = setTimeout(() => {
              this.nextScene(current);
            }, scrollTotal);
          }
        }, 50);
      }

      // Default Loop (will be cancelled/overridden if scroll is detected above)
      this.loopInterval = setTimeout(() => {
        this.nextScene(current);
      }, actualDuration);
    }
  }

  runNoticeSequence(index: number, baseDuration: number) {
    const total = this.mockNotices().length;
    if (index >= total) {
      this.nextScene('notices');
      return;
    }

    this.currentNoticeIndex.set(index);

    // Wait for entrance animation (500ms) to complete before measuring
    setTimeout(() => {
      const scrollDuration = this.checkNoticeScroll(baseDuration);
      let itemDuration = baseDuration;

      if (scrollDuration > 0) {
        // User requested: "dentro do tempo", but also "rolagem vertical automatica".
        // Logic: 2s delay + scroll (duration) + 2s end.
        itemDuration = 2000 + scrollDuration + 2000;
      }

      this.loopInterval = setTimeout(() => {
        if (index < total - 1) {
          this.runNoticeSequence(index + 1, baseDuration);
        } else {
          this.nextScene('notices');
        }
      }, itemDuration);
    }, 600);
  }

  checkNoticeScroll(durationMs: number): number {
    if (!this.noticeContainers?.length || !this.noticeContents?.length) return 0;

    const container = this.noticeContainers.first.nativeElement;
    const content = this.noticeContents.first.nativeElement;

    // Reset
    content.style.transition = 'none';
    content.style.transform = 'translateY(0)';

    const containerHeight = container.getBoundingClientRect().height;
    const contentHeight = content.getBoundingClientRect().height;

    // Precise Float comparison with minimal tolerance (1px)
    if (contentHeight > containerHeight + 1) {
      const distance = contentHeight - containerHeight + 50; // Padding buffer

      // Animation
      setTimeout(() => {
        content.style.transition = `transform ${durationMs}ms linear`;
        content.style.transform = `translateY(-${distance}px)`;
      }, 2000);

      return durationMs;
    }
    return 0;
  }

  nextScene(current: string) {
    const currentIndex = this.scenes.indexOf(current as any);
    const nextIndex = (currentIndex + 1) % this.scenes.length;
    this.currentScene.set(this.scenes[nextIndex]);
    this.runSceneLoop();
  }

  checkAndAnimateScroll(durationMs: number = 20000): number {
    if (!this.eventsContainer || !this.eventsList) return 0;

    const container = this.eventsContainer.nativeElement;
    const list = this.eventsList.nativeElement;

    // Reset
    list.style.transition = 'none';
    list.style.transform = 'translateY(0)';

    if (list.offsetHeight > container.offsetHeight) {
      const distance = list.offsetHeight - container.offsetHeight + 100;

      // Logic: 1s pause at start + scroll (durationMs) + 1s pause at end
      setTimeout(() => {
        list.style.transition = `transform ${durationMs}ms linear`;
        list.style.transform = `translateY(-${distance}px)`;
      }, 1000);

      return durationMs + 2000;
    }
    return 0;
  }

  runTimetableSequence(page: number, duration: number) {
    const itemsPerPage = this.dynamicItemsPerPage();
    const totalItems = this.relevantClasses().length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    this.currentPage.set(page);

    this.loopInterval = setTimeout(() => {
      if (page < totalPages - 1) {
        this.runTimetableSequence(page + 1, duration);
      } else {
        this.nextScene('timetable');
      }
    }, duration);
  }

  stopTvLoop() {
    if (this.loopInterval) {
      clearTimeout(this.loopInterval);
      this.loopInterval = null;
    }
  }

  // Shift Logic
  currentShift = computed(() => {
    const now = this.currentTime();
    const timeStr =
      now.getHours().toString().padStart(2, '0') +
      ':' +
      now.getMinutes().toString().padStart(2, '0');

    const grids = this.schoolData.schoolTimeGrids();
    const dict = this.t().common.shifts;

    // 1. Try to find shift by active slot in any grid
    for (const grid of grids) {
      const hasActiveSlot = grid.slots.some((s) => timeStr >= s.start && timeStr <= s.end);
      if (hasActiveSlot) return grid.shift;
    }

    // 2. Fallback to triggers
    const triggers = this.schoolData.tvSettings().shiftTriggers;
    if (timeStr >= triggers.night) return dict.night;
    if (timeStr >= triggers.afternoon) return dict.afternoon;
    return dict.morning;
  });

  relevantClasses = computed(() => {
    const shift = this.currentShift();
    const all = this.classes();
    // Do NOT slice here, let pagination handle overflow
    return all.filter((c) => c.shift === shift);
  });

  getEventColor(type: string): string {
    switch (type) {
      case 'Feriado Nacional':
        return '#ef4444';
      case 'Evento Festivo':
        return '#10b981';
      default:
        return '#3b82f6';
    }
  }

  formatClassName(name: string): string {
    return name
      .replace(' - Manhã', '')
      .replace(' - Tarde', '')
      .replace(' - Noite', '')
      .replace(' - Integral', '');
  }

  getRoomInfo(roomId?: string): string {
    if (!roomId) return '';
    const room = this.schoolData.schoolRooms().find((r) => r.id === roomId);
    if (!room) return roomId;
    return room.block ? `${room.block} - ${room.name}` : room.name;
  }

  getCurrentSlot(gridId?: string | null): { index: number; type: string; time: string } | null {
    const now = this.currentTime();
    const timeStr =
      now.getHours().toString().padStart(2, '0') +
      ':' +
      now.getMinutes().toString().padStart(2, '0');

    const grids = this.schoolData.schoolTimeGrids();

    // If gridId provided (from class), use it. Otherwise use current shift detection.
    const grid = gridId
      ? grids.find((g) => String(g.id) === String(gridId))
      : grids.find((g) => g.shift === this.currentShift());

    if (!grid) return null;

    // 1. Find exact active slot
    const activeSlot = grid.slots.find((s) => timeStr >= s.start && timeStr <= s.end);

    if (activeSlot) {
      // 2. If it's a break, return the NEXT 'Aula' slot if it exists
      if (activeSlot.type === 'Intervalo') {
        const nextAula = grid.slots
          .filter((s) => (s.index ?? 0) > (activeSlot.index ?? 0))
          .find((s) => s.type === 'Aula');
        if (nextAula) {
          return {
            index: nextAula.index ?? 0,
            type: 'Aula',
            time: `${nextAula.start} - ${nextAula.end}`,
          };
        }
      }
      return {
        index: activeSlot.index ?? 0,
        type: activeSlot.type,
        time: `${activeSlot.start} - ${activeSlot.end}`,
      };
    }

    // 3. No exact slot found: check if we are BEFORE the first slot of the turn
    const firstSlot = grid.slots[0];
    if (firstSlot && timeStr < firstSlot.start) {
      const firstAula = grid.slots.find((s) => s.type === 'Aula');
      if (firstAula) {
        return {
          index: firstAula.index ?? 0,
          type: 'Aula',
          time: `${firstAula.start} - ${firstAula.end}`,
        };
      }
    }

    return null;
  }

  getTeacherName(teacherId: string | null): string {
    if (!teacherId) return '---';
    const teacher = this.schoolData.teachers().find((t) => t.id === teacherId);
    return teacher ? teacher.name : '---';
  }

  getSubjectName(matrixId: string, subjectId: string): string {
    const matrix = this.schoolData.schoolMatrices().find((m) => String(m.id) === String(matrixId));
    if (!matrix) return '---';

    // MatrixSubject link
    let matrixSub;
    for (const level of matrix.levels) {
      matrixSub = level.subjects.find((s) => String(s.id) === String(subjectId));
      if (matrixSub) break;
    }

    if (!matrixSub) return '---';

    // Global Subject lookup
    const globalSub = this.schoolData
      .subjects()
      .find((s) => String(s.id) === String(matrixSub!.subjectId));
    return globalSub ? globalSub.name : '---';
  }

  getActiveAssignment(cls: SchoolClass) {
    const slot = this.getCurrentSlot(cls.gradeHorariaId);
    const day = new Date().getDay(); // 0-6 (Sun-Sat)

    if (!slot || slot.type !== 'Aula') return null;

    // Normalizing Mon=1 to Sun=7
    const adjustedDay = day === 0 ? 7 : day;

    return cls.assignments.find(
      (a: { dayOfWeek?: number; slotIndex?: number }) =>
        String(a.dayOfWeek) === String(adjustedDay) && String(a.slotIndex) === String(slot.index),
    );
  }
}
