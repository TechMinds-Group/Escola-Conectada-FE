import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-button-cancel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      type="button"
      class="btn btn-light border px-4 fw-bold transition-hover"
      [disabled]="disabled"
      (click)="onClick.emit($event)"
    >
      {{ label }}
    </button>
  `,
  styles: [
    `
      :host {
        display: inline-block;
      }
    `,
  ],
})
export class ButtonCancelComponent {
  @Input() label: string = 'Cancelar';
  @Input() disabled: boolean = false;
  @Output() onClick = new EventEmitter<MouseEvent>();
}
