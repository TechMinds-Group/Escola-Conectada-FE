import {
  Component,
  forwardRef,
  inject,
  Input,
  OnInit,
  signal,
  computed,
  ViewChild,
  ElementRef,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  setHours,
  setMinutes,
  isSameMonth,
  isSameDay,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Overlay,
  OverlayModule,
  OverlayRef,
  ConnectedPosition,
  ScrollStrategyOptions,
} from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';

@Component({
  selector: 'tm-date',
  standalone: true,
  imports: [CommonModule, OverlayModule],
  templateUrl: './tm-date.component.html',
  styleUrl: './tm-date.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TmDateComponent),
      multi: true,
    },
  ],
})
export class TmDateComponent implements ControlValueAccessor, OnInit {
  // Configurações e UI
  @Input() label = '';
  @Input() placeholder = 'DD/MM/AAAA HH:mm';
  @Input() disabled = false;

  // Estado Interno (Sinalizado para máxima reatividade)
  internalDate = signal<Date | null>(null);
  currentViewDate = signal<Date>(new Date());

  // Controle do Overlay
  isOpen = signal<boolean>(false);
  @ViewChild('dateInput') dateInput!: ElementRef<HTMLInputElement>;
  @ViewChild('overlayOrigin') overlayOrigin!: ElementRef;

  // Calendário Computado
  positions: ConnectedPosition[] = [
    // Preferencial: abrir abaixo com 10px de margem de segurança
    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 10 },
    // Fallback: abrir acima se não houver espaço abaixo
    { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -10 },
  ];

  scrollStrategy = inject(ScrollStrategyOptions).reposition();

  weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  months = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ];

  calendarDays = computed(() => {
    const viewDate = this.currentViewDate();
    const start = startOfWeek(startOfMonth(viewDate), { weekStartsOn: 0 }); // Domingo
    const end = endOfWeek(endOfMonth(viewDate), { weekStartsOn: 0 });

    const days: { date: Date; isCurrentMonth: boolean; isToday: boolean; isSelected: boolean }[] =
      [];
    let current = start;
    const now = new Date();
    const selected = this.internalDate();

    while (current <= end) {
      days.push({
        date: current,
        isCurrentMonth: isSameMonth(current, viewDate),
        isToday: isSameDay(current, now),
        isSelected: selected ? isSameDay(current, selected) : false,
      });
      current = addDays(current, 1);
    }
    return days;
  });

  // Display Formatado
  displayValue = computed(() => {
    const date = this.internalDate();
    if (!date) return '';
    return format(date, 'dd/MM/yyyy HH:mm', { locale: ptBR });
  });

  // Tempo (Horas e Minutos)
  hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

  selectedHour = computed(() => {
    const d = this.internalDate();
    return d ? String(d.getHours()).padStart(2, '0') : '00';
  });
  selectedMinute = computed(() => {
    const d = this.internalDate();
    return d ? String(d.getMinutes()).padStart(2, '0') : '00';
  });

  // CVA
  onChange: any = () => {};
  onTouched: any = () => {};

  constructor() {}

  ngOnInit() {}

  // ============================
  // CVA Implementation
  // ============================
  writeValue(value: any): void {
    if (value) {
      const parsedDate = new Date(value);
      if (!isNaN(parsedDate.getTime())) {
        this.internalDate.set(parsedDate);
        this.currentViewDate.set(parsedDate);
        return;
      }
    }
    this.internalDate.set(null);
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

  // ============================
  // User Actions
  // ============================
  togglePicker(event?: Event) {
    if (this.disabled) return;
    if (event) event.stopPropagation();
    this.isOpen.update((v) => !v);
  }

  closePicker() {
    this.isOpen.set(false);
    this.onTouched();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (this.isOpen() && !this.overlayOrigin?.nativeElement?.contains(event.target)) {
      // Pequeno bypass para evitar que clique no overlay feche ele próprio caso ele fosse injetado solto,
      // Mas usaremos cdk-overlay connectedTo. Se estivéssemos sem cdk:
      // this.closePicker();
    }
  }

  // ============================
  // Calendar Navigation
  // ============================
  prevMonth(event: Event) {
    event.stopPropagation();
    this.currentViewDate.update((d) => subMonths(d, 1));
  }

  nextMonth(event: Event) {
    event.stopPropagation();
    this.currentViewDate.update((d) => addMonths(d, 1));
  }

  selectDay(day: { date: Date; isCurrentMonth: boolean }) {
    if (!day.isCurrentMonth) {
      this.currentViewDate.set(day.date);
    }

    // Merge new day with existing or default time
    const newDate = new Date(day.date);
    const existing = this.internalDate();
    if (existing) {
      newDate.setHours(existing.getHours());
      newDate.setMinutes(existing.getMinutes());
    } else {
      newDate.setHours(0, 0, 0, 0); // Default midnight if no time set
    }

    this.updateValue(newDate);
  }

  selectHour(hour: string) {
    let current = this.internalDate();
    if (!current) {
      current = new Date();
      current.setMinutes(0);
    }
    const newDate = setHours(current, parseInt(hour, 10));
    this.updateValue(newDate);
  }

  selectMinute(minute: string) {
    let current = this.internalDate();
    if (!current) {
      current = new Date();
      current.setHours(0);
    }
    const newDate = setMinutes(current, parseInt(minute, 10));
    this.updateValue(newDate);
  }

  setToday() {
    this.currentViewDate.set(new Date());
    this.updateValue(new Date());
  }

  clear() {
    this.internalDate.set(null);
    this.onChange(null);
    this.closePicker();
  }

  private updateValue(date: Date) {
    this.internalDate.set(date);
    const isoString = format(date, "yyyy-MM-dd'T'HH:mm:00");
    this.onChange(isoString);
  }
}
