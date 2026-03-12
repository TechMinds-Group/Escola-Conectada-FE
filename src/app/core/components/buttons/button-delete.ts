import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-button-delete',
  standalone: true,
  imports: [CommonModule],
  host: { class: 'w-100 d-block d-lg-inline-block' },
  template: `
    <button
      type="button"
      [class]="buttonClass"
      [disabled]="disabled"
      [title]="title"
      (click)="onClick.emit($event)"
    >
      <i [class]="iconClass"></i>
      <span *ngIf="variant === 'full'" [class.d-lg-none]="responsiveLabel">
        {{ label }}
      </span>
    </button>
  `,
  styles: [
    `
      :host {
        background: transparent !important;
      }

      .btn-delete-custom {
        transition: all 0.2s ease-in-out !important;
        border: none !important;

        &:active {
          opacity: 0.8 !important;
          transform: scale(0.96);
        }
      }

      /* Unified Solid Style for both themes */
      .btn-solid-danger {
        background-color: #ef4444 !important;
        color: #ffffff !important;
        border: none !important;
        height: 38px;

        i,
        span {
          color: #ffffff !important;
        }

        &:hover {
          background-color: #dc2626 !important;
          transform: translateY(-1px);
          box-shadow: 0 4px 6px -1px rgba(220, 38, 38, 0.2) !important;
        }

        &.btn-sm {
          height: 32px !important;
        }
      }

      .btn-outline-danger-custom {
        border: 1px solid #dc2626 !important;
        color: #dc2626 !important;
        background-color: transparent !important;

        &:hover {
          background-color: #dc2626 !important;
          color: #ffffff !important;
          i,
          span {
            color: #ffffff !important;
          }
        }
      }
    `,
  ],
})
export class ButtonDeleteComponent {
  @Input() label: string = 'Excluir';
  @Input() variant: 'icon' | 'full' = 'full';
  @Input() isSolid: boolean = false;
  @Input() responsiveLabel: boolean = false;
  @Input() disabled: boolean = false;
  @Input() isSmall: boolean = false;
  @Input() title: string = 'Excluir';
  @Input() size: number = 38;
  @Output() onClick = new EventEmitter<MouseEvent>();

  get buttonClass(): string {
    const base = 'btn d-flex align-items-center justify-content-center rounded-3 shadow-sm transition-hover';
    const widthClass = this.variant === 'icon' ? '' : 'w-100';
    const colorClass = this.isSolid
      ? 'btn-solid-danger'
      : 'btn-outline-danger-custom btn-delete-custom';
    const sizeClass = this.isSmall ? 'btn-sm px-3' : 'py-2';
    const variantClass = this.variant === 'icon' ? 'p-0' : 'gap-2 fw-bold';
    return `${base} ${widthClass} ${colorClass} ${sizeClass} ${variantClass}`;
  }

  get iconClass(): string {
    const margin =
      this.variant === 'full' && this.responsiveLabel ? 'me-2 me-lg-0 me-xl-2' : '';
    const baseIcon = this.variant === 'icon' ? 'bi bi-trash fs-5' : `bi bi-trash ${margin}`;
    return baseIcon;
  }
}
