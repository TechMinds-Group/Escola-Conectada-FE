import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-button-cancel',
  standalone: true,
  imports: [CommonModule],
  host: { class: 'w-100 d-block d-lg-inline-block' },
  template: `
    <button
      type="button"
      class="btn btn-light border w-100 d-flex align-items-center justify-content-center py-2 rounded-3 shadow-sm fw-bold transition-hover"
      [disabled]="disabled"
      (click)="onClick.emit($event)"
    >
      {{ label }}
    </button>
  `,
  styles: [],
})
export class ButtonCancelComponent {
  @Input() label: string = 'Cancelar';
  @Input() disabled: boolean = false;
  @Output() onClick = new EventEmitter<MouseEvent>();
}
