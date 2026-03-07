import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-button-edit',
  standalone: true,
  imports: [CommonModule],
  host: { class: 'w-100 d-block d-lg-inline-block' },
  template: `
    <button
      type="button"
      class="btn btn-primary w-100 d-flex align-items-center justify-content-center py-2 rounded-3 shadow-sm fw-bold transition-hover gap-2"
      [disabled]="disabled"
      (click)="onClick.emit($event)"
    >
      <i class="bi bi-pencil"></i>
      {{ label }}
    </button>
  `,
  styles: [
    `
      .btn-primary {
        transition: all 0.2s ease-in-out !important;
      }
    `,
  ],
})
export class ButtonEditComponent {
  @Input() label: string = 'Editar';
  @Input() disabled: boolean = false;
  @Output() onClick = new EventEmitter<MouseEvent>();
}
