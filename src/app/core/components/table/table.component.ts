import { CommonModule } from '@angular/common';
import { Component, Input, TemplateRef, Output, EventEmitter } from '@angular/core';

export interface TableColumn<T> {
  header: string;
  key?: keyof T | string;
  template?: TemplateRef<{ $implicit: T }>;
  class?: string;
  headerClass?: string;
}

@Component({
  selector: 'tm-table',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="table-responsive rounded-4 border bg-white shadow-xs">
      <table class="table table-hover align-middle mb-0">
        <thead class="bg-light bg-opacity-50">
          <tr class="small text-uppercase fw-bold text-muted">
            @for (col of cols; track col.header) {
              <th [class]="'border-0 py-3 ' + (col.headerClass || '')">
                {{ col.header }}
              </th>
            }
          </tr>
        </thead>
        <tbody>
          @for (row of data; track $index) {
            <tr
              class="border-bottom-light"
              [class.cursor-pointer]="rowClick.observed"
              (click)="onRowClick(row)"
            >
              @for (col of cols; track col.header) {
                <td [class]="'py-3 ' + (col.class || '')">
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
              <td [attr.colspan]="cols.length" class="text-center py-5 text-muted">
                <ng-content select="[emptyState]"></ng-content>
                @if (!hasEmptyStateContent) {
                  <p class="mb-0">Nenhum dado encontrado.</p>
                }
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: [
    `
      .cursor-pointer {
        cursor: pointer;
      }
    `,
  ],
})
export class TableComponent<T> {
  @Input() cols: TableColumn<T>[] = [];
  @Input() data: T[] = [];
  @Output() rowClick = new EventEmitter<T>();

  onRowClick(row: T) {
    console.log('[TableComponent] Row clicked:', row);
    if (this.rowClick.observed) {
      console.log('[TableComponent] Emitting rowClick event');
      this.rowClick.emit(row);
    } else {
      console.warn('[TableComponent] rowClick event has no observers');
    }
  }

  getCellValue(row: T, key: keyof T | string): string | number | boolean | null | undefined {
    if (typeof key === 'string' && key.includes('.')) {
      const parts = key.split('.');
      let current: unknown = row;
      for (const part of parts) {
        if (current && typeof current === 'object' && part in current) {
          current = (current as Record<string, unknown>)[part];
        } else {
          return undefined;
        }
      }
      return current as string | number | boolean | null | undefined;
    }
    return (row as Record<string, unknown>)[key as string] as
      | string
      | number
      | boolean
      | null
      | undefined;
  }

  get hasEmptyStateContent(): boolean {
    return this.data && this.data.length === 0;
  }
}
