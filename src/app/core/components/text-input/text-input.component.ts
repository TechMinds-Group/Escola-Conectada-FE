import { Component, Input, forwardRef, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';
import { MaskDirective } from '../../directives/mask.directive';

@Component({
  selector: 'tm-text',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaskDirective],
  template: `
    <div class="tm-text-container w-100" [class.disabled]="disabled">
      @if (label) {
        <label class="form-label small fw-bold text-muted text-uppercase tracking-wider mb-2">
          {{ label }}
        </label>
      }
      <div
        class="input-wrapper d-flex align-items-center rounded-3 shadow-sm transition-all"
        [class.focused]="isFocused()"
        [class.invalid]="isInvalid()"
      >
        @if (icon) {
          <div class="icon-section ps-3 py-2 d-flex align-items-center justify-content-center">
            <i [class]="icon" class="text-primary fs-5"></i>
          </div>
        }
        <input
          [type]="type"
          [placeholder]="placeholder"
          [disabled]="disabled"
          [value]="value"
          (input)="onInputChange($event)"
          (blur)="onInputBlur()"
          (focus)="onInputFocus()"
          [appMask]="mask"
          [attr.maxlength]="maxlength || null"
          class="custom-input flex-grow-1 fw-bold border-0 bg-transparent"
        />
        @if (suffix) {
          <div class="suffix-section pe-3 py-2">
            <span
              class="badge bg-light text-muted border py-2 px-3 rounded-3 small fw-bold shadow-xs"
            >
              {{ suffix }}
            </span>
          </div>
        }
      </div>
      @if (isInvalid()) {
        <div class="invalid-feedback d-block extra-small mt-1 fw-medium animate-in">
          Este campo é obrigatório ou inválido.
        </div>
      }
    </div>
  `,
  styles: [
    `
      .tm-text-container {
        position: relative;

        &.disabled {
          .input-wrapper {
            background-color: var(--input-bg) !important;
            cursor: not-allowed;
            opacity: 0.7;
          }
          .custom-input {
            cursor: not-allowed;
          }
        }
      }

      .input-wrapper {
        background-color: #ffffff;
        border: 1px solid var(--border-color);
        min-height: 48px;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

        &.focused {
          border-color: var(--bs-primary);
          box-shadow: 0 0 0 0.25rem rgba(var(--bs-primary-rgb), 0.1) !important;
        }

        &.invalid {
          border-color: var(--bs-danger) !important;
        }
      }

      .custom-input {
        padding: 0.6rem 1rem;
        outline: none;
        color: var(--text-primary);
        font-size: 0.95rem;

        &:focus {
          outline: none;
        }

        &::placeholder {
          color: rgba(var(--text-secondary-rgb), 0.5);
          font-weight: 500;
        }
      }

      .icon-section {
        color: var(--bs-primary);
      }

      .extra-small {
        font-size: 0.75rem;
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

      /* Dark Mode Specific Overrides */
      :host-context([data-theme='dark']) {
        .input-wrapper {
          background-color: var(--input-bg);
          border-color: rgba(255, 255, 255, 0.1);
        }
        .custom-input {
          color: #ffffff;

          &::placeholder {
            color: rgba(255, 255, 255, 0.4) !important;
          }
        }
      }
    `,
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TextInputComponent),
      multi: true,
    },
  ],
})
export class TextInputComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() placeholder = '';
  @Input() icon = '';
  @Input() type: 'text' | 'email' | 'number' | 'tel' = 'text';
  @Input() mask: 'cpf' | 'phone' | '' = '';
  @Input() suffix = '';
  @Input() maxlength: number | null = null;
  @Input() control: any;

  value: any = '';
  disabled = false;
  isFocused = signal(false);

  onChange: (value: any) => void = () => {};
  onTouched: () => void = () => {};

  isInvalid = computed(() => {
    if (!this.control) return false;
    return this.control.invalid && (this.control.dirty || this.control.touched);
  });

  writeValue(value: any): void {
    this.value = value || '';
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.value = input.value;
    this.onChange(this.value);
  }

  onInputFocus(): void {
    if (this.disabled) return;
    this.isFocused.set(true);
  }

  onInputBlur(): void {
    this.isFocused.set(false);
    this.onTouched();
  }
}
