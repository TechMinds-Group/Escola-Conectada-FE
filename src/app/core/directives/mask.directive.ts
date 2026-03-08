import { Directive, HostListener, Input } from '@angular/core';

@Directive({
  selector: '[appMask]',
  standalone: true,
})
export class MaskDirective {
  @Input('appMask') maskType: 'cpf' | 'phone' | string | null = null;

  @HostListener('input', ['$event'])
  onInput(event: Event) {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, '');

    if (this.maskType === 'cpf') {
      value = this.applyCpfMask(value);
    } else if (this.maskType === 'phone') {
      value = this.applyPhoneMask(value);
    }

    input.value = value;
  }

  private applyCpfMask(value: string): string {
    value = value.substring(0, 11);
    if (value.length > 9) {
      return value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else if (value.length > 6) {
      return value.replace(/(\d{3})(\d{3})(\d{0,3})/, '$1.$2.$3');
    } else if (value.length > 3) {
      return value.replace(/(\d{3})(\d{0,3})/, '$1.$2');
    }
    return value;
  }

  private applyPhoneMask(value: string): string {
    value = value.substring(0, 11);
    if (value.length > 10) {
      return value.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (value.length > 6) {
      return value.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    } else if (value.length > 2) {
      return value.replace(/(\d{2})(\d{0,5})/, '($1) $2');
    }
    return value;
  }
}
