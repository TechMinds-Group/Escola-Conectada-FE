import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-button-preview',
  standalone: true,
  imports: [CommonModule],
  host: { class: 'w-100 d-block d-lg-inline-block' },
  template: `
    <button
      type="button"
      class="btn btn-outline-primary w-100 d-flex align-items-center justify-content-center py-2 rounded-3 shadow-sm fw-bold transition-hover gap-2 text-nowrap"
      [disabled]="disabled"
      (click)="onClick.emit($event)"
    >
      <i class="bi bi-display"></i>
      {{ label }}
    </button>
  `,
  styles: [
    `
      .btn-outline-primary {
        transition: all 0.2s ease-in-out !important;
        border-width: 1.5px;

        &:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 6px -1px rgba(var(--bs-primary-rgb), 0.1) !important;
        }
      }
    `,
  ],
})
export class ButtonPreviewComponent {
  @Input() label: string = 'Visualizar Agora';
  @Input() disabled: boolean = false;
  @Output() onClick = new EventEmitter<MouseEvent>();
}
