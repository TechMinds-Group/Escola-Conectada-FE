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
        class="modal-backdrop-blur d-flex align-items-center justify-content-center animate-fade"
        (click)="confirmationService.handleAction(false)"
      >
        <div class="modal-premium animate-scale" (click)="$event.stopPropagation()">
          <div class="modal-premium-content">
            <div class="modal-premium-header">
              <div
                class="icon-indicator"
                [class.danger]="state.options.confirmClass?.includes('danger')"
              >
                <i
                  class="bi"
                  [class]="
                    state.options.confirmClass?.includes('danger')
                      ? 'bi-trash3'
                      : 'bi-question-circle'
                  "
                ></i>
              </div>
              <h5 class="modal-title fw-bold mt-3 mb-1">
                {{ state.options.title || 'Confirmação' }}
              </h5>
            </div>

            <div class="modal-premium-body mt-2">
              <p class="mb-0 text-muted opacity-85">
                {{ state.options.message }}
              </p>
            </div>

            <div class="modal-premium-footer d-flex gap-2 mt-4 pt-2">
              <button
                type="button"
                class="btn btn-ghost flex-fill py-2 fw-bold"
                (click)="confirmationService.handleAction(false)"
              >
                {{ state.options.cancelLabel || 'Cancelar' }}
              </button>
              <button
                type="button"
                class="btn flex-fill py-2 fw-bold shadow-sm"
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
      .modal-backdrop-blur {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(15, 23, 42, 0.4);
        backdrop-filter: blur(8px);
        z-index: 2100;
        padding: 20px;
      }

      .modal-premium {
        width: 100%;
        max-width: 420px;
        background: #ffffff;
        border-radius: 24px;
        overflow: hidden;
        box-shadow:
          0 25px 50px -12px rgba(0, 0, 0, 0.15),
          0 0 0 1px rgba(0, 0, 0, 0.05);
      }

      :host-context([data-theme='dark']) .modal-premium {
        background: #1e293b;
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      }

      .modal-premium-content {
        padding: 32px;
        text-align: center;
      }

      .icon-indicator {
        width: 64px;
        height: 64px;
        margin: 0 auto;
        background: rgba(59, 130, 246, 0.1);
        color: #2563eb;
        border-radius: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.8rem;
      }

      .icon-indicator.danger {
        background: rgba(239, 68, 68, 0.1);
        color: #dc2626;
      }

      .modal-title {
        color: #0f172a;
      }

      :host-context([data-theme='dark']) .modal-title {
        color: #f8fafc;
      }

      .btn-ghost {
        background: rgba(0, 0, 0, 0.03);
        color: #64748b;
        border: none;
        transition: all 0.2s;

        &:hover {
          background: rgba(0, 0, 0, 0.08);
          color: #475569;
        }
      }

      :host-context([data-theme='dark']) .btn-ghost {
        background: rgba(255, 255, 255, 0.05);
        color: #94a3b8;

        &:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #cbd5e1;
        }
      }

      .animate-fade {
        animation: fadeIn 0.3s ease-out;
      }

      .animate-scale {
        animation: scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      @keyframes scaleIn {
        from {
          transform: scale(0.9) translateY(20px);
          opacity: 0;
        }
        to {
          transform: scale(1) translateY(0);
          opacity: 1;
        }
      }
    `,
  ],
})
export class ConfirmationModal {
  public confirmationService = inject(ConfirmationService);
}
