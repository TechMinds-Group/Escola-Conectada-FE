import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmationService } from '../../services/confirmation.service';

@Component({
  selector: 'app-confirmation-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (confirmationService.currentState(); as state) {
      <div
        class="modal fade show d-block"
        tabindex="-1"
        style="background: rgba(0, 0, 0, 0.4); z-index: 2000;"
      >
        <div class="modal-dialog modal-dialog-centered mx-auto" style="max-width: 400px;">
          <div class="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
            <div class="modal-header border-0 pb-0">
              <h6 class="modal-title fw-bold text-primary text-uppercase small">
                {{ state.options.title || 'Confirmação' }}
              </h6>
              <button
                type="button"
                class="btn-close scale-75"
                (click)="confirmationService.handleAction(false)"
              ></button>
            </div>
            <div class="modal-body py-3">
              <p class="mb-0 text-muted small fw-medium">
                {{ state.options.message }}
              </p>
            </div>
            <div class="modal-footer border-0 pt-0">
              <button
                type="button"
                class="btn btn-sm btn-light px-3 rounded-3"
                (click)="confirmationService.handleAction(false)"
              >
                {{ state.options.cancelLabel || 'Cancelar' }}
              </button>
              <button
                type="button"
                class="btn btn-sm px-3 rounded-3 text-white"
                [class]="state.options.confirmClass || 'btn-primary'"
                (click)="confirmationService.handleAction(true)"
              >
                {{ state.options.confirmLabel || 'Confirmar' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      :host-context([data-theme='dark']) {
        .modal-content {
          background-color: var(--surface-color) !important;
          color: var(--text-primary) !important;
          border: 1px solid var(--border-color) !important;
        }
        .modal-header .btn-close {
          filter: invert(1) grayscale(100%) brightness(200%);
        }
        .btn-light {
          background-color: var(--input-bg);
          border-color: var(--border-color);
          color: var(--text-primary);
        }
        .text-muted {
          color: var(--text-secondary) !important;
        }
      }
    `,
  ],
})
export class ConfirmationModal {
  public confirmationService = inject(ConfirmationService);
}
