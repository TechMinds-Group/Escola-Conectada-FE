import {
  Component,
  Input,
  forwardRef,
  signal,
  computed,
  HostListener,
  ElementRef,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';

export interface SelectOption<T = any> {
  value: T;
  label: string;
}

@Component({
  selector: 'tm-select',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="tm-select-container w-100" [class.disabled]="disabled">
      @if (label) {
        <label class="form-label small fw-bold text-muted text-uppercase tracking-wider mb-2">
          {{ label }}
        </label>
      }
      <div
        class="input-wrapper d-flex align-items-center rounded-3 shadow-sm transition-all cursor-pointer"
        [class.focused]="isOpen() || isFocused()"
        [class.invalid]="isInvalid()"
        (click)="toggleDropdown()"
        (blur)="onInputBlur()"
        tabindex="0"
      >
        @if (icon) {
          <div class="icon-section ps-3 py-2 d-flex align-items-center justify-content-center">
            <i [class]="icon" class="text-primary fs-5"></i>
          </div>
        }

        <div class="selected-value-container flex-fill px-3 py-2 overflow-hidden">
          <span
            class="fw-bold text-truncate d-block"
            [class.placeholder-state]="internalValue() === null"
            [class.text-dark]="internalValue() !== null"
          >
            {{ selectedLabel() || placeholder }}
          </span>
        </div>

        @if (clearable && internalValue() !== null && !disabled) {
          <div
            class="clear-section pe-2 py-2 transition-all opacity-50 hover-opacity-100"
            (click)="clearSelection($event)"
            title="Limpar seleção"
          >
            <i class="bi bi-x-circle-fill text-muted small"></i>
          </div>
        }

        <div class="arrow-section pe-4 py-2" [class.rotated]="isOpen()">
          <i class="bi bi-chevron-down text-muted small d-inline-block"></i>
        </div>
      </div>

      <!-- Dropdown Panel -->
      @if (isOpen()) {
        <div class="dropdown-panel shadow-lg animate-slide-down">
          <div class="options-list custom-scrollbar">
            @if (options.length === 0) {
              <div class="p-3 text-muted small text-center italic">Nenhuma opção disponível</div>
            } @else {
              @for (option of options; track option.value) {
                <div
                  class="option-item transition-all d-flex align-items-center justify-content-between"
                  [class.selected]="internalValue() === option.value"
                  (click)="selectOption(option)"
                >
                  <span class="option-label text-truncate">{{ option.label }}</span>
                  @if (internalValue() === option.value) {
                    <i class="bi bi-check-lg text-primary fw-bold"></i>
                  }
                </div>
              }
            }
          </div>
        </div>
      }

      @if (isInvalid()) {
        <div class="invalid-feedback d-block extra-small mt-1 fw-medium animate-in">
          Este campo é obrigatório ou inválido.
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .tm-select-container {
        position: relative;
        min-width: 200px;

        &.disabled {
          .input-wrapper {
            background-color: var(--input-bg) !important;
            cursor: not-allowed;
            opacity: 0.7;
          }
        }
      }

      .input-wrapper {
        background-color: #ffffff;
        border: 1px solid var(--border-color);
        min-height: 48px;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        outline: none;

        &.focused {
          border-color: var(--bs-primary);
          box-shadow: 0 0 0 0.25rem rgba(var(--bs-primary-rgb), 0.1) !important;
        }

        &.invalid {
          border-color: var(--bs-danger) !important;
        }

        &:hover:not(.disabled) {
          border-color: var(--bs-primary);
        }
      }

      .selected-value-container {
        font-size: 0.95rem;
        display: block;
        min-width: 0;

        .placeholder-state {
          color: rgba(0, 0, 0, 0.4);
          font-weight: 500;
        }

        span {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          width: 100%;
        }
      }

      .arrow-section {
        i {
          transition: transform 0.2s ease;
        }
        &.rotated i {
          transform: rotate(180deg);
        }
      }

      .clear-section {
        cursor: pointer;
        z-index: 2;
        &:hover {
          i {
            color: var(--bs-danger) !important;
          }
        }
      }

      /* Dropdown Panel Styling */
      .dropdown-panel {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        z-index: 1050;
        margin-top: 5px;
        background-color: #ffffff;
        border-radius: 12px;
        overflow: hidden;
        box-shadow:
          0 10px 15px -3px rgba(0, 0, 0, 0.1),
          0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
      }

      .options-list {
        max-height: 250px;
        overflow-y: auto;
        padding: 6px;
      }

      .option-item {
        padding: 12px 16px;
        cursor: pointer;
        border-radius: 8px;
        font-size: 0.95rem;
        font-weight: 500;
        color: var(--text-primary);
        margin-bottom: 2px;

        &:last-child {
          margin-bottom: 0;
        }

        &:hover {
          background-color: #f1f5f9;
          color: var(--bs-primary);
        }

        &.selected {
          background-color: rgba(var(--bs-primary-rgb), 0.08);
          color: var(--bs-primary);
          font-weight: 600;
        }
      }

      /* Custom Scrollbar */
      .custom-scrollbar {
        &::-webkit-scrollbar {
          width: 6px;
        }
        &::-webkit-scrollbar-track {
          background: transparent;
        }
        &::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        &::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      }

      /* Animations */
      .animate-slide-down {
        animation: slideDownFade 0.2s ease-out;
      }

      @keyframes slideDownFade {
        from {
          opacity: 0;
          transform: translateY(-4px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .animate-in {
        animation: fadeIn 0.2s ease-out;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(-4px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      /* Dark Mode Overrides */
      :host-context([data-theme='dark']) {
        .input-wrapper {
          background-color: var(--input-bg);
          border-color: rgba(255, 255, 255, 0.1);
          .text-dark {
            color: #ffffff !important;
          }
          .placeholder-state {
            color: rgba(255, 255, 255, 0.4) !important;
          }
        }

        .dropdown-panel {
          background-color: #1e293b; // slate-800
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .option-item {
          color: #e2e8f0;
          &:hover {
            background-color: rgba(255, 255, 255, 0.05);
            color: #ffffff;
          }
          &.selected {
            background-color: rgba(var(--bs-primary-rgb), 0.2);
            color: #ffffff;
          }
        }

        .custom-scrollbar {
          &::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.1);
          }
          &::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.2);
          }
        }
      }
    `,
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectComponent),
      multi: true,
    },
  ],
})
export class SelectComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() options: SelectOption[] = [];
  @Input() placeholder = 'Selecione...';
  @Input() icon = '';
  @Input() control: any;
  @Input() clearable = false;

  private elementRef = inject(ElementRef);

  internalValue = signal<any>(null);
  disabled = false;
  isOpen = signal(false);
  isFocused = signal(false);

  selectedLabel = computed(() => {
    const value = this.internalValue();
    const opt = this.options.find((o) => o.value === value);
    return opt ? opt.label : null;
  });

  onChange: (value: any) => void = () => {};
  onTouched: () => void = () => {};

  isInvalid = computed(() => {
    if (!this.control) return false;
    return this.control.invalid && (this.control.dirty || this.control.touched);
  });

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.closeDropdown();
    }
  }

  toggleDropdown() {
    if (this.disabled) return;
    this.isOpen.update((v) => !v);
    if (this.isOpen()) {
      this.onTouched();
    }
  }

  closeDropdown() {
    this.isOpen.set(false);
  }

  selectOption(option: SelectOption) {
    this.internalValue.set(option.value);
    this.onChange(option.value);
    this.closeDropdown();
  }

  clearSelection(event: Event) {
    event.stopPropagation();
    this.internalValue.set(null);
    this.onChange(null);
    this.onTouched();
  }

  writeValue(value: any): void {
    this.internalValue.set(value);
  }

  registerOnChange(fn: (value: any) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    if (isDisabled) this.closeDropdown();
  }

  onInputBlur(): void {
    this.isFocused.set(false);
    this.onTouched();
  }

  onInputFocus(): void {
    if (this.disabled) return;
    this.isFocused.set(true);
  }
}
