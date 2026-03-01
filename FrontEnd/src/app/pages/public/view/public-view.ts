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
import { SchoolDataService } from '../../../core/services/school-data';
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
  private pageInterval: any;
  private clockInterval: any;
  private scenes: ('timetable' | 'events' | 'notices')[] = ['timetable', 'events', 'notices'];

  // Data
  classes = this.schoolData.schoolClasses;
  events = this.schoolData.schoolEvents;

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

  // Helper for Date Formatting
  formatDate(
    date: Date | string,
    format: 'time' | 'shortDate' | 'month' | 'day' | 'timeSeconds' = 'shortDate',
  ): string {
    const d = new Date(date);
    const lang = this.translationService.lang(); // 'pt', 'es'
    const localeMap = { pt: 'pt-BR', es: 'es-ES' };
    const locale = localeMap[lang] || 'pt-BR';

    if (format === 'time') {
      return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(d);
    }
    if (format === 'timeSeconds') {
      // Special case for clock
      // Handled in template pipe manually usually, but let's provide string
      return d.toLocaleTimeString(locale);
    }
    if (format === 'month') {
      return new Intl.DateTimeFormat(locale, { month: 'short' })
        .format(d)
        .toUpperCase()
        .replace('.', '');
    }
    if (format === 'day') {
      return new Intl.DateTimeFormat(locale, { day: '2-digit' }).format(d);
    }

    return new Intl.DateTimeFormat(locale).format(d);
  }

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
      this.calculateItemsPerPage();
      this.startTvLoop();
    }

    // Start Clock
    this.clockInterval = setInterval(() => {
      this.currentTime.set(new Date());
    }, 1000);
  }

  ngOnDestroy() {
    this.stopTvLoop();
    if (this.clockInterval) clearInterval(this.clockInterval);
    window.removeEventListener('resize', this.onResize.bind(this));
  }

  onResize() {
    const mobile = window.innerWidth < 992;
    this.isMobile.set(mobile);

    if (mobile) {
      this.stopTvLoop();
    } else {
      this.calculateItemsPerPage();
      this.startTvLoop();
    }
  }

  changeLang(lang: string) {
    this.translationService.setLang(lang as 'pt' | 'es');
  }

  // Dynamic Pagination Calculation
  calculateItemsPerPage() {
    const height = window.innerHeight;

    // Header + Footer + Padding estimation (~220px)
    // Generous buffer to ensure 4 items fit on 14" screens with diminished font size
    const availableHeight = height - 220;

    // Reduced min height threshold to match new CSS clamp values
    const minCardHeight = 220;

    const possibleRows = Math.floor(availableHeight / minCardHeight);

    // Dynamic Logic:
    // If we can fit 2 rows -> 4 items (2x2).
    // If not -> 2 items (1x2).
    const items = possibleRows >= 2 ? 4 : 2;

    this.dynamicItemsPerPage.set(items);
  }

  dynamicItemsPerPage = signal(12); // Default

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

    // Handle Timetable Pagination Rotation
    if (current === 'timetable') {
      const itemsPerPage = this.dynamicItemsPerPage();
      const totalItems = this.relevantClasses().length;
      const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
      actualDuration = baseDuration * totalPages;
      this.startPageRotation(baseDuration, totalPages);

      this.loopInterval = setTimeout(() => {
        this.nextScene(current);
      }, actualDuration);
    } else if (current === 'notices') {
      // Notices Logic: Recursive Sequence to handle per-item duration (scrolling)
      this.currentNoticeIndex.set(0);
      this.stopPageRotation();
      this.runNoticeSequence(0, baseDuration);
    } else {
      this.stopPageRotation();

      // Handle Auto-Scroll for Events (Async calculation)
      if (current === 'events') {
        setTimeout(() => {
          const scrollDuration = this.checkAndAnimateScroll(baseDuration);
          if (scrollDuration > 0) {
            actualDuration = 2000 + scrollDuration + 2000;

            // Re-schedule
            clearTimeout(this.loopInterval);
            this.loopInterval = setTimeout(() => {
              this.nextScene(current);
            }, actualDuration);
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
      const distance = list.offsetHeight - container.offsetHeight + 100; // +100 for padding

      // User Request: Scroll Speed based on Defined Time (durationMs)
      // The duration of the scroll animation IS the defined time.

      // Start Animation after 2s delay
      setTimeout(() => {
        list.style.transition = `transform ${durationMs}ms linear`;
        list.style.transform = `translateY(-${distance}px)`;
      }, 2000);

      return durationMs;
    }
    return 0;
  }

  stopTvLoop() {
    if (this.loopInterval) {
      clearTimeout(this.loopInterval);
      this.loopInterval = null;
    }
    this.stopPageRotation();
  }

  startPageRotation(timePerPage: number, totalPages: number) {
    this.stopPageRotation();
    this.currentPage.set(0);

    if (totalPages > 1) {
      this.pageInterval = setInterval(() => {
        this.currentPage.update((p) => (p + 1) % totalPages);
      }, timePerPage);
    }
  }

  stopPageRotation() {
    if (this.pageInterval) {
      clearInterval(this.pageInterval);
      this.pageInterval = null;
    }
  }

  // Shift Logic
  currentShift = computed(() => {
    const now = new Date();
    // For demo purposes, refreshes every time change detection runs (or trigger by interval)
    // In real app, use a timer signal.
    const timeStr = now.toTimeString().slice(0, 5);
    const triggers = this.schoolData.tvSettings().shiftTriggers;
    const dict = this.t().common.shifts;

    if (timeStr >= triggers.night) return dict.night;
    if (timeStr >= triggers.afternoon) return dict.afternoon;
    return dict.morning;
  });

  relevantClasses = computed(() => {
    const shift = this.currentShift();
    const all = this.classes();
    // LIMIT TOTAL TO 6 items for TV loop as per user request
    return all.filter((c) => c.shift === shift).slice(0, 6);
  });

  tvClasses = computed(() => {
    const list = this.relevantClasses();
    const page = this.currentPage();
    // Use dynamic count instead of fixed setting
    const itemsPerPage = this.dynamicItemsPerPage();

    const start = page * itemsPerPage;
    return list.slice(start, start + itemsPerPage);
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
}
