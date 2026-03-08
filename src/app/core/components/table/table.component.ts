import { CommonModule } from '@angular/common';
import { Component, Input, TemplateRef, Output, EventEmitter, computed } from '@angular/core';

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
    <div class="tm-table-wrapper shadow-sm border overflow-hidden">
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
            @for (row of data; track $index) {
              <tr
                class="row-item transition-all"
                [class.cursor-pointer]="rowClick.observed"
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
                <td [attr.colspan]="cols.length" class="text-center py-5 text-muted opacity-50">
                  <div class="empty-state animate-in">
                    <i class="bi bi-inbox fs-1 mb-2 d-block"></i>
                    <p class="mb-0 fw-medium">Nenhum dado encontrado para exibir.</p>
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
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
        background-color: var(--input-bg);
        color: var(--text-secondary);
        font-size: 0.75rem;
        border-bottom: 2px solid var(--border-color);
        white-space: nowrap;
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

      /* Dark Mode Specific Fine-tuning if needed, but variables should handle most */
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

      :host-context([data-theme='dark']) .custom-scrollbar::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.1);
      }
    `,
  ],
})
export class TableComponent<T> {
  @Input() cols: TableColumn<T>[] = [];
  @Input() data: T[] = [];
  @Output() rowClick = new EventEmitter<T>();

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
