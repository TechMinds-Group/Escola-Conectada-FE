import { Injectable, inject, computed } from '@angular/core';
import { TranslationService } from './translation.service';

export interface SearchResult {
  label: string;
  route: string;
  icon: string;
  category: string;
}

@Injectable({
  providedIn: 'root',
})
export class SearchService {
  private translation = inject(TranslationService);

  // Define searchable items based on sidebar structure
  private searchableItems = computed(() => {
    const t = this.translation.dictionary();

    return [
      {
        label: t.admin.sidebar.dashboard,
        route: '/dashboard',
        icon: 'bi-speedometer2',
        category: t.admin.sidebar.dashboard,
      },
      // Records
      {
        label: t.admin.sidebar.teachers,
        route: '/professores',
        icon: 'bi-person-badge',
        category: t.admin.sidebar.records,
      },
      {
        label: t.admin.sidebar.classes,
        route: '/classes',
        icon: 'bi-people',
        category: t.admin.sidebar.records,
      },
      {
        label: t.admin.sidebar.rooms,
        route: '/ambientes',
        icon: 'bi-building',
        category: t.admin.sidebar.records,
      },
      {
        label: t.admin.sidebar.matrix,
        route: '/school-matrices',
        icon: 'bi-grid-3x3',
        category: t.admin.sidebar.records,
      },

      {
        label: t.admin.sidebar.calendar,
        route: '/calendar',
        icon: 'bi-calendar-event',
        category: t.admin.sidebar.records,
      },
      // Settings
      {
        label: t.admin.sidebar.timeGrids,
        route: '/time-grids',
        icon: 'bi-clock-history',
        category: t.admin.sidebar.settings,
      },
      {
        label: t.admin.sidebar.academicParams,
        route: '/consulta-configuracao',
        icon: 'bi-sliders',
        category: t.admin.sidebar.settings,
      },
      {
        label: t.admin.sidebar.tvSettings,
        route: '/tv-settings',
        icon: 'bi-display',
        category: t.admin.sidebar.settings,
      },
      // Profile
      {
        label: t.admin.sidebar.profile,
        route: '/profile',
        icon: 'bi-person-circle',
        category: t.admin.sidebar.profile,
      },
      {
        label: t.admin.sidebar.schoolSettings,
        route: '/school-settings',
        icon: 'bi-building-gear',
        category: t.admin.sidebar.schoolSettings,
      },
      {
        label: t.admin.sidebar.users,
        route: '/users',
        icon: 'bi-people-fill',
        category: t.admin.sidebar.users,
      },
    ];
  });

  search(query: string): SearchResult[] {
    if (!query || query.trim().length < 2) return [];

    const normalizedQuery = query.toLowerCase().trim();
    return this.searchableItems().filter((item) =>
      item.label.toLowerCase().includes(normalizedQuery),
    );
  }
}
