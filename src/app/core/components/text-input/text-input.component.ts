import {
  Component,
  Input,
  forwardRef,
  signal,
  computed,
  ViewChild,
  ElementRef,
} from '@angular/core';
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
        @if (icon || isDatePicker()) {
          <div
            class="icon-section ps-3 py-2 d-flex align-items-center justify-content-center"
            [class.cursor-pointer]="isDatePicker()"
            (mousedown)="isDatePicker() ? $event.preventDefault() : null"
            (click)="isDatePicker() ? openPicker() : null"
            [title]="isDatePicker() ? 'Abrir seletor de data' : ''"
          >
            <i
              [class]="
                isDatePicker() ? (type === 'time' ? 'bi bi-clock' : 'bi bi-calendar3') : icon
              "
              class="text-primary fs-5"
              [class.transition-hover]="isDatePicker()"
            ></i>
          </div>
        }
        @if (textarea) {
          <textarea
            #textareaEl
            [placeholder]="placeholder"
            [disabled]="disabled"
            [value]="internalValue()"
            (input)="onInputChange($event)"
            (blur)="onInputBlur()"
            (focus)="onInputFocus()"
            [attr.maxlength]="maxlength || null"
            [rows]="rows"
            class="custom-input flex-grow-1 fw-bold border-0 bg-transparent"
          ></textarea>
        } @else {
          <input
            #inputEl
            [type]="type"
            [placeholder]="placeholder"
            [disabled]="disabled"
            [value]="internalValue()"
            (input)="onInputChange($event)"
            (blur)="onInputBlur()"
            (focus)="onInputFocus()"
            [appMask]="mask"
            [attr.maxlength]="maxlength || null"
            [attr.inputmode]="inputmode || (type === 'number' ? 'numeric' : null)"
            [attr.pattern]="type === 'number' ? '[0-9]*' : null"
            [attr.step]="type === 'time' || type === 'datetime-local' ? '60' : null"
            lang="pt-BR"
            class="custom-input flex-grow-1 fw-bold border-0 bg-transparent"
          />
        }

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
        min-width: 200px;

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
        padding: 0.6rem 1.25rem 0.6rem 1rem;
        outline: none;
        color: var(--text-primary);
        font-size: 0.95rem;
        width: 100%;

        &:focus {
          outline: none;
        }

        /* Oculta o ícone nativo de calendário do navegador que fica duplicado com o nosso */
        &::-webkit-calendar-picker-indicator {
          display: none;
          -webkit-appearance: none;
        }

        /* Força padrão 24h ocultando o campo AM/PM nativo em navegadores Webkit */
        &::-webkit-datetime-edit-ampm-field {
          display: none;
        }

        &::placeholder {
          color: rgba(var(--text-secondary-rgb), 0.5);
          font-weight: 500;
        }

        /* Hide Number Spinners */
        &[type='number'] {
          -moz-appearance: textfield;
          appearance: textfield;

          &::-webkit-outer-spin-button,
          &::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }
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
        .custom-input {
          color-scheme: dark;
        }

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
  @Input() type: 'text' | 'number' | 'password' | 'email' | 'date' | 'datetime-local' | 'time' =
    'text';
  @Input() mask: 'cpf' | 'phone' | '' = '';
  @Input() suffix = '';
  @Input() maxlength: number | null = null;
  @Input() control: any;
  @Input() inputmode: string | null = null;
  @Input() textarea = false;
  @Input() rows = 3;

  @ViewChild('inputEl') inputEl!: ElementRef;
  @ViewChild('textareaEl') textareaEl!: ElementRef;

  internalValue = signal<any>('');
  disabled = false;
  isFocused = signal(false);

  onChange: (value: any) => void = () => {};
  onTouched: () => void = () => {};

  isInvalid = computed(() => {
    if (!this.control) return false;
    return this.control.invalid && (this.control.dirty || this.control.touched);
  });

  isDatePicker(): boolean {
    return this.type === 'date' || this.type === 'datetime-local' || this.type === 'time';
  }

  openPicker() {
    const el = this.inputEl || this.textareaEl;
    if (this.isDatePicker() && el) {
      const inputEl = el.nativeElement as HTMLInputElement;
      try {
        if (document.activeElement === inputEl) {
          inputEl.blur(); // Fecha o picker nativo removendo o foco
        } else {
          inputEl.showPicker(); // Abre o picker nativo
        }
      } catch (e) {
        inputEl.focus();
      }
    }
  }

  writeValue(value: any): void {
    let formattedValue = value;

    if (value && this.isDatePicker()) {
      try {
        const d = new Date(value);
        if (!isNaN(d.getTime())) {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          const hours = String(d.getHours()).padStart(2, '0');
          const minutes = String(d.getMinutes()).padStart(2, '0');

          if (this.type === 'date') {
            formattedValue = `${year}-${month}-${day}`;
          } else if (this.type === 'datetime-local') {
            formattedValue = `${year}-${month}-${day}T${hours}:${minutes}`;
          } else if (this.type === 'time') {
            formattedValue = `${hours}:${minutes}`;
          }
        }
      } catch (e) {
        // Fallback para o valor original se não for pareável
      }

      // Corta strings longas do backend "2026-03-08T00:00:00Z" se o tipo for apenas 'date'
      if (typeof value === 'string' && this.type === 'date' && value.includes('T')) {
        formattedValue = value.split('T')[0];
      }
    }

    this.internalValue.set(formattedValue ?? '');
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
    this.internalValue.set(input.value);
    this.onChange(input.value);
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
