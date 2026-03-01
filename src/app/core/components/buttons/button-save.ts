import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-button-save',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      [type]="type"
      class="btn btn-success px-4 fw-bold shadow-sm transition-hover d-flex align-items-center gap-2 text-white"
      [disabled]="disabled || isSubmitting"
      (click)="onClick.emit($event)"
    >
      <ng-container *ngIf="isSubmitting; else iconTemplate">
        <span class="spinner-border spinner-border-sm"></span>
      </ng-container>
      <ng-template #iconTemplate>
        <i class="bi bi-check2-circle fs-5"></i>
      </ng-template>
      {{ label }}
    </button>
  `,
  styles: [
    `
      .btn-success {
        transition: all 0.2s ease-in-out !important;

        &:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }
      }
    `,
  ],
})
export class ButtonSaveComponent {
  @Input() label: string = 'Salvar';
  @Input() isSubmitting: boolean = false;
  @Input() disabled: boolean = false;
  @Input() type: 'button' | 'submit' = 'submit';
  @Output() onClick = new EventEmitter<MouseEvent>();
}
