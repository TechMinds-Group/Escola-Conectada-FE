import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container position-fixed bottom-0 end-0 p-3" style="z-index: 2000">
      @for (n of notifications(); track n.id) {
        <div
          class="toast show align-items-center border-0 mb-2 shadow-lg animate-toast"
          [class.bg-success]="n.type === 'success'"
          [class.bg-danger]="n.type === 'error'"
          [class.bg-info]="n.type === 'info'"
          [class.text-white]="true"
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
        >
          <div class="d-flex">
            <div class="toast-body d-flex align-items-center gap-2">
              <i class="bi" [class]="getIcon(n.type)"></i>
              {{ n.message }}
            </div>
            <button
              type="button"
              class="btn-close btn-close-white me-2 m-auto"
              (click)="service.remove(n.id)"
              aria-label="Close"
            ></button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .animate-toast {
        animation: slideIn 0.3s ease-out;
      }
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
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
        return 'bi-check-circle-fill';
      case 'error':
        return 'bi-exclamation-triangle-fill';
      default:
        return 'bi-info-circle-fill';
    }
  }
}
