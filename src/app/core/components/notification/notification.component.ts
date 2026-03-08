import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container position-fixed top-0 end-0 p-3 pt-4" style="z-index: 2050">
      @for (n of notifications(); track n.id) {
        <div
          class="toast-premium mb-3 d-flex align-items-center animate-toast"
          [class.success]="n.type === 'success'"
          [class.error]="n.type === 'error'"
          [class.info]="n.type === 'info'"
          role="alert"
        >
          <div class="toast-icon-box d-flex align-items-center justify-content-center">
            <i class="bi" [class]="getIcon(n.type)"></i>
          </div>

          <div class="toast-content flex-grow-1 mx-2">
            <span class="message text-truncate-2">{{ n.message }}</span>
          </div>

          <button
            type="button"
            class="btn-close-custom ms-2"
            (click)="service.remove(n.id)"
            aria-label="Close"
          >
            <i class="bi bi-x fs-5"></i>
          </button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .toast-container {
        pointer-events: none;
      }

      .toast-premium {
        pointer-events: auto;
        min-width: 320px;
        max-width: 400px;
        background: rgba(255, 255, 255, 0.85);
        backdrop-filter: blur(12px) saturate(180%);
        -webkit-backdrop-filter: blur(12px) saturate(180%);
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 16px;
        padding: 12px 16px;
        box-shadow:
          0 10px 15px -3px rgba(0, 0, 0, 0.05),
          0 4px 6px -2px rgba(0, 0, 0, 0.02),
          inset 0 0 0 1px rgba(255, 255, 255, 0.4);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }

      :host-context([data-theme='dark']) .toast-premium {
        background: rgba(30, 41, 59, 0.8);
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow:
          0 20px 25px -5px rgba(0, 0, 0, 0.2),
          0 10px 10px -5px rgba(0, 0, 0, 0.1);
      }

      .toast-icon-box {
        width: 38px;
        height: 38px;
        border-radius: 12px;
        flex-shrink: 0;
        font-size: 1.2rem;
      }

      .success .toast-icon-box {
        background: rgba(34, 197, 94, 0.15);
        color: #16a34a;
      }
      .error .toast-icon-box {
        background: rgba(239, 68, 68, 0.15);
        color: #dc2626;
      }
      .info .toast-icon-box {
        background: rgba(59, 130, 246, 0.15);
        color: #2563eb;
      }

      .toast-content .message {
        font-size: 0.9rem;
        font-weight: 500;
        color: #1e293b;
        line-height: 1.4;
      }

      :host-context([data-theme='dark']) .toast-content .message {
        color: #f1f5f9;
      }

      .btn-close-custom {
        background: transparent;
        border: none;
        color: #94a3b8;
        padding: 4px;
        border-radius: 8px;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;

        &:hover {
          background: rgba(0, 0, 0, 0.05);
          color: #64748b;
        }
      }

      :host-context([data-theme='dark']) .btn-close-custom:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #cbd5e1;
      }

      .animate-toast {
        animation: toastIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }

      @keyframes toastIn {
        from {
          opacity: 0;
          transform: translateX(24px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateX(0) scale(1);
        }
      }

      .text-truncate-2 {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
    `,
  ],
})
export class NotificationComponent {
  public service = inject(NotificationService);
  public notifications = this.service.activeNotifications;

  getIcon(type: string) {
    switch (type) {
      case 'success':
        return 'bi-check2-circle';
      case 'error':
        return 'bi-exclamation-triangle';
      case 'info':
        return 'bi-info-circle';
      default:
        return 'bi-bell';
    }
  }
}
