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

@Component({
  selector: 'tm-time',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './time-input.component.html',
  styleUrl: './time-input.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TimeInputComponent),
      multi: true,
    },
  ],
})
export class TimeInputComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() placeholder = '00:00';
  @Input() isInvalid = false;
  @Input() disabled = false;
  @Input() control: any; // Optional: to auto-detect invalid state if passed

  @ViewChild('timeInput') timeInput!: ElementRef<HTMLInputElement>;

  value = signal<string>('');
  isFocused = signal(false);

  // ControlValueAccessor methods
  onChange: (value: string) => void = () => {};
  onTouched: () => void = () => {};

  // Computed invalid state
  internalIsInvalid = computed(() => {
    if (this.isInvalid) return true;
    if (this.control && this.control.invalid && (this.control.dirty || this.control.touched)) {
      return true;
    }
    return false;
  });

  writeValue(val: string): void {
    const formatted = this.formatTime(val || '');
    this.value.set(formatted);
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

  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let val = input.value;

    // Apply HH:mm mask and constraints
    val = this.formatTime(val);

    input.value = val;
    this.value.set(val);
    this.onChange(val);
  }

  private formatTime(val: string): string {
    // Remove all non-digits
    let digits = val.replace(/\D/g, '');

    // Limit to 4 digits
    if (digits.length > 4) {
      digits = digits.substring(0, 4);
    }

    let hours = digits.substring(0, 2);
    let minutes = digits.substring(2, 4);

    // Validate hours (00-23)
    if (hours.length === 2) {
      const h = parseInt(hours, 10);
      if (h > 23) hours = '23';
    } else if (hours.length === 1) {
      const h = parseInt(hours, 10);
      // Optional: could auto-prefix with 0 if first digit > 2, but let's keep it simple
    }

    // Validate minutes (00-59)
    if (minutes.length === 2) {
      const m = parseInt(minutes, 10);
      if (m > 59) minutes = '59';
    }

    if (digits.length >= 3) {
      return `${hours}:${minutes}`;
    }
    return hours;
  }

  onBlur(): void {
    this.isFocused.set(false);
    this.onTouched();

    // Auto-complete if partial (e.g., "8" -> "08:00", "08:3" -> "08:30")
    let val = this.value();
    if (val && val.length > 0 && val.length < 5) {
      const parts = val.split(':');
      let h = parts[0].padStart(2, '0');
      let m = (parts[1] || '').padEnd(2, '0');

      const newVal = `${h}:${m}`;
      this.value.set(newVal);
      this.onChange(newVal);
      if (this.timeInput) {
        this.timeInput.nativeElement.value = newVal;
      }
    }
  }

  onFocus(): void {
    this.isFocused.set(true);
  }

  focusInput(): void {
    if (!this.disabled && this.timeInput) {
      this.timeInput.nativeElement.focus();
    }
  }
}
