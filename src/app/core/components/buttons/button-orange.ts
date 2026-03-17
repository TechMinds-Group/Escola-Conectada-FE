import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-button-orange',
  standalone: true,
  imports: [CommonModule],
  host: { class: 'w-100 d-block d-lg-inline-block' },
  template: `
    <button
      type="button"
      class="btn btn-orange w-100 d-flex align-items-center justify-content-center py-2 rounded-3 shadow-sm fw-bold transition-hover gap-2 text-white"
      [disabled]="disabled"
      (click)="onClick.emit($event)"
    >
      @if (icon) {
        <i [class]="icon"></i>
      }
      {{ label }}
    </button>
  `,
  styles: [
    `
      .btn-orange {
        background-color: #ea580c !important; /* Laranja escuro para contraste com branco */
        color: #ffffff !important;
        border: none !important;
        transition: all 0.2s ease-in-out !important;

        &:hover {
          background-color: #c2410c !important; /* orange-700 */
          color: #ffffff !important;
        }

        &:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }
      }
    `,
  ],
})
export class ButtonOrangeComponent {
  @Input() label: string = 'Ação';
  @Input() icon: string = '';
  @Input() disabled: boolean = false;
  @Output() onClick = new EventEmitter<MouseEvent>();
}
