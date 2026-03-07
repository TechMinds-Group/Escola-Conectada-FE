import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-button-save',
  standalone: true,
  imports: [CommonModule],
  host: { class: 'w-100 d-block d-lg-inline-block' },
  template: `
    <button
      [type]="type"
      class="btn btn-success w-100 d-flex align-items-center justify-content-center py-2 rounded-3 shadow-sm fw-bold transition-hover gap-2 text-white"
      [disabled]="disabled || isSubmitting"
      (click)="onClick.emit($event)"
    >
      <div
        style="width: 20px; height: 20px;"
        class="d-flex align-items-center justify-content-center"
      >
        <ng-container *ngIf="isSubmitting; else iconTemplate">
          <span class="spinner-border spinner-border-sm" style="width: 1rem; height: 1rem;"></span>
        </ng-container>
        <ng-template #iconTemplate>
          <i class="bi bi-check2-circle fs-5"></i>
        </ng-template>
      </div>
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
