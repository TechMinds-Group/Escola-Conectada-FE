import { Component, Input, forwardRef, signal, computed } from '@angular/core';
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
    <div class="w-100">
      <label *ngIf="label" class="form-label small fw-bold text-muted text-uppercase mb-1">
        {{ label }}
      </label>
      <div class="input-group" [class.is-invalid]="isInvalid()" [class.bg-inherit]="true">
        <span
          *ngIf="icon"
          class="input-group-text bg-transparent border-end-0 rounded-start-3 shadow-none"
        >
          <i
            [class]="icon"
            class="text-primary"
            [class.text-white]="true"
            style="color: inherit !important"
          ></i>
        </span>
        <select
          [class.is-invalid]="isInvalid()"
          class="form-select fw-bold py-2.5 px-3 rounded-end-3 shadow-sm border-start-0 text-inherit"
          [class.ps-3]="icon"
          [disabled]="disabled"
          (change)="onSelectChange($event)"
          (blur)="onTouched()"
          style="color: inherit !important; background-color: transparent !important;"
        >
          <option [ngValue]="null" [selected]="value === null">{{ placeholder }}</option>
          <option
            *ngFor="let option of options"
            [value]="option.value"
            [selected]="value === option.value"
          >
            {{ option.label }}
          </option>
        </select>
      </div>
      <div *ngIf="isInvalid()" class="invalid-feedback d-block extra-small mt-1 fw-medium">
        Este campo é obrigatório.
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }

      .form-select {
        border-radius: 0.75rem !important; /* rounded-3 */
        padding-top: 0.7rem;
        padding-bottom: 0.7rem;
        transition: all 0.2s ease-in-out !important;

        &:focus {
          border-color: var(--bs-primary);
          box-shadow: 0 0 0 0.25rem rgba(var(--bs-primary-rgb), 0.1) !important;
        }
      }

      .input-group-text {
        border-radius: 0.75rem 0 0 0.75rem !important;
        border-right: none;
        padding-left: 1rem;
        padding-right: 0.5rem;
      }

      .input-group > .form-select {
        border-top-left-radius: 0 !important;
        border-bottom-left-radius: 0 !important;
      }

      .shadow-sm {
        box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.05) !important;
      }

      .extra-small {
        font-size: 0.75rem;
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
export class SelectComponent<T> implements ControlValueAccessor {
  @Input() label: string = '';
  @Input() options: SelectOption<T>[] = [];
  @Input() placeholder: string = 'Selecione...';
  @Input() icon: string = '';
  @Input() control: any; // Optional for validation status

  value: T | null = null;
  disabled: boolean = false;

  onChange: (value: T | null) => void = () => {};
  onTouched: () => void = () => {};

  isInvalid = computed(() => {
    if (!this.control) return false;
    return this.control.invalid && (this.control.dirty || this.control.touched);
  });

  writeValue(value: T | null): void {
    this.value = value;
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

  onSelectChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    const selectedValue = selectElement.value;

    // Find the original typed value from options
    const option = this.options.find((opt) => String(opt.value) === selectedValue);
    this.value = option ? option.value : null;

    this.onChange(this.value);
    this.onTouched();
  }
}
