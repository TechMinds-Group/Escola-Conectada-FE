import { CommonModule } from '@angular/common';
import { Component, Input, TemplateRef, Output, EventEmitter, computed, signal } from '@angular/core';

export interface TableColumn<T = any> {
  header: string;
  key?: keyof T | string;
  template?: TemplateRef<{ $implicit: T }>;
  class?: string;
  headerClass?: string;
  width?: string;
}

@Component({
  selector: 'tm-table',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="tm-table-wrapper shadow-sm border overflow-hidden" [class.is-loading]="isLoading">
      <div class="table-responsive custom-scrollbar">
        <table class="table mb-0">
          <thead>
            <tr>
              @for (col of cols; track col.header) {
                <th
                  [style.width]="col.width"
                  [class]="
                    'header-cell text-uppercase fw-bold tracking-wider py-3 ' +
                    (col.headerClass || '')
                  "
                >
                  {{ col.header }}
                </th>
              }
            </tr>
          </thead>
          <tbody>
            @if (isLoading) {
              @for (i of [1, 2, 3, 4, 5]; track i) {
                <tr>
                  @for (col of cols; track col.header) {
                    <td class="cell-item py-3">
                      <div class="skeleton-line"></div>
                    </td>
                  }
                </tr>
              }
            } @else {
              @for (row of paginatedData(); track $index) {
                <tr
                  class="row-item transition-all"
                  [class.cursor-pointer]="rowClick.observed"
                  [class.table-active]="selectedId && getCellValue(row, 'id') === selectedId"
                  (click)="onRowClick(row)"
                >
                  @for (col of cols; track col.header) {
                    <td [class]="'cell-item py-3 ' + (col.class || '')">
                      @if (col.template) {
                        <ng-container
                          *ngTemplateOutlet="col.template; context: { $implicit: row }"
                        ></ng-container>
                      } @else if (col.key) {
                        {{ getCellValue(row, col.key) }}
                      }
                    </td>
                  }
                </tr>
              } @empty {
                <tr>
                  <td [attr.colspan]="cols.length" class="text-center py-5 border-0">
                    <div class="empty-state animate-in py-5">
                      <div class="empty-icon-container mb-3">
                        <i class="bi bi-search fs-1 opacity-25"></i>
                      </div>
                      <h5 class="fw-bold text-dark opacity-75 mb-2">Nenhum registro encontrado</h5>
                      <p class="text-muted small mb-0 mx-auto" style="max-width: 300px;">
                        Não encontramos nenhum resultado para os filtros aplicados no momento.
                      </p>
                    </div>
                  </td>
                </tr>
              }
            }
          </tbody>
        </table>
      </div>
      
      @if (paginated && _data().length > 0) {
        <div class="table-footer d-flex justify-content-between align-items-center px-4 py-2 border-top">
          <div class="text-secondary" style="font-size: 0.85rem;">
            Mostrando <span class="fw-bold text-dark">{{ (currentPage() - 1) * pageSize + 1 }}</span> - 
            <span class="fw-bold text-dark">{{ Math.min(currentPage() * pageSize, _data().length) }}</span> de 
            <span class="fw-bold text-dark">{{ _data().length }}</span>
          </div>
          
          <div class="d-flex align-items-center gap-1">
            <button class="pagination-btn" [disabled]="currentPage() === 1" (click)="prevPage()">
              <i class="bi bi-chevron-left"></i>
            </button>

            @for (page of pages(); track $index) {
              @if (page === '...') {
                <span class="pagination-dots">...</span>
              } @else {
                <button 
                  class="pagination-btn" 
                  [class.active]="currentPage() === page" 
                  (click)="setPage(page)"
                >
                  {{ page }}
                </button>
              }
            }

            <button class="pagination-btn" [disabled]="currentPage() >= totalPages()" (click)="nextPage()">
              <i class="bi bi-chevron-right"></i>
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .tm-table-wrapper {
        background-color: var(--surface-color);
        border-radius: 12px;
        border: 1px solid var(--border-color);
        transition: all 0.2s ease;
      }

      .header-cell {
        background-color: var(--input-bg, #f8fafc);
        color: var(--text-secondary);
        font-size: 0.75rem;
        border-bottom: 2px solid var(--border-color);
        white-space: nowrap;
      }

      .table-footer {
        background-color: var(--input-bg, #f8fafc);
      }

      .cell-item {
        color: var(--text-primary);
        font-size: 0.9rem;
        vertical-align: middle;
        border-bottom: 1px solid var(--border-color);
      }

      .row-item {
        transition: background-color 0.2s ease;
        &:hover {
          background-color: var(--hover-table-bg, rgba(0, 0, 0, 0.02));
        }

        &:last-child .cell-item {
          border-bottom: none;
        }
      }

      .cursor-pointer {
        cursor: pointer;
      }

      /* Skeleton styles */
      .skeleton-line {
        height: 12px;
        background: linear-gradient(
          90deg,
          rgba(0, 0, 0, 0.05) 25%,
          rgba(0, 0, 0, 0.1) 50%,
          rgba(0, 0, 0, 0.05) 75%
        );
        background-size: 200% 100%;
        animation: loading 1.5s infinite;
        border-radius: 4px;
        width: 80%;
      }

      :host-context([data-theme='dark']) .skeleton-line {
        background: linear-gradient(
          90deg,
          rgba(255, 255, 255, 0.05) 25%,
          rgba(255, 255, 255, 0.1) 50%,
          rgba(255, 255, 255, 0.05) 75%
        );
        background-size: 200% 100%;
      }

      @keyframes loading {
        0% {
          background-position: 200% 0;
        }
        100% {
          background-position: -200% 0;
        }
      }

      .empty-icon-container {
        width: 80px;
        height: 80px;
        background: var(--input-bg);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto;
      }

      :host-context([data-theme='dark']) {
        .tm-table-wrapper {
          border-color: var(--border-color);
        }
        .header-cell {
          background-color: rgba(0, 0, 0, 0.2);
        }
        .row-item:hover {
          background-color: var(--hover-bg);
        }
        .empty-state h5 {
          color: #f8fafc !important;
        }
      }

      .animate-in {
        animation: fadeIn 0.3s ease-out;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(4px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .custom-scrollbar {
        &::-webkit-scrollbar {
          height: 6px;
        }
        &::-webkit-scrollbar-track {
          background: transparent;
        }
        &::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.1);
          border-radius: 10px;
        }
      }

      .pagination-btn {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        border: 1px solid transparent;
        background: transparent;
        color: var(--text-secondary, #64748b);
        font-size: 0.85rem;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.22s ease-in-out;
        cursor: pointer;

        &:hover:not(:disabled) {
          background-color: var(--hover-bg, rgba(0, 0, 0, 0.03));
          color: var(--text-primary);
        }

        &:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }

        &.active {
          background: linear-gradient(135deg, var(--bs-primary, #0d6efd), #0a58ca);
          color: white !important;
          font-weight: 600;
          box-shadow: 0 2px 5px rgba(13, 110, 253, 0.25);
        }
      }

      .pagination-dots {
        color: var(--text-secondary);
        font-size: 0.85rem;
        padding: 0 4px;
        align-self: center;
      }

      :host-context([data-theme='dark']) {
        .pagination-btn:hover:not(:disabled) {
          background-color: rgba(255, 255, 255, 0.06);
        }
      }

      :host-context([data-theme='dark']) .custom-scrollbar::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.1);
      }
    `,
  ],
})
export class TableComponent<T> {
  @Input() cols: TableColumn<T>[] = [];
  
  _data = signal<T[]>([]);
  @Input() set data(value: T[]) {
    this._data.set(value || []);
    this.currentPage.set(1);
  }

  @Input() paginated = false;
  @Input() pageSize = 5;
  @Input() selectedId: any = null;

  @Input() isLoading = false;
  @Output() rowClick = new EventEmitter<T>();

  currentPage = signal(1);
  protected Math = Math;

  paginatedData = computed(() => {
    if (!this.paginated) return this._data();
    const start = (this.currentPage() - 1) * this.pageSize;
    return this._data().slice(start, start + this.pageSize);
  });

  totalPages = computed(() => Math.ceil(this._data().length / this.pageSize));

  pages = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: (number | string)[] = [];

    if (total <= 5) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);
      if (current > 3) pages.push('...');
      
      let start = Math.max(2, current - 1);
      let end = Math.min(total - 1, current + 1);

      if (current <= 3) end = 4;
      if (current >= total - 2) start = total - 3;

      for (let i = start; i <= end; i++) pages.push(i);

      if (current < total - 2) pages.push('...');
      pages.push(total);
    }
    return pages;
  });

  setPage(page: number | string) {
    if (typeof page === 'number') {
      this.currentPage.set(page);
    }
  }

  prevPage() {
    if (this.currentPage() > 1) this.currentPage.update(p => p - 1);
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) this.currentPage.update(p => p + 1);
  }

  onRowClick(row: T) {
    if (this.rowClick.observed) {
      this.rowClick.emit(row);
    }
  }

  getCellValue(row: T, key: keyof T | string): any {
    if (typeof key === 'string' && key.includes('.')) {
      const parts = key.split('.');
      let current: any = row;
      for (const part of parts) {
        if (current && typeof current === 'object' && part in current) {
          current = (current as any)[part];
        } else {
          return undefined;
        }
      }
      return current;
    }
    return (row as any)[key];
  }
}
