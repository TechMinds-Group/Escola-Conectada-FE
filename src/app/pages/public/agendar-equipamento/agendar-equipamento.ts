import { Component, computed, inject, OnInit, signal, ViewChild, TemplateRef, AfterViewInit } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule, Location } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TextInputComponent } from '../../../core/components/text-input/text-input.component';
import { SelectComponent } from '../../../core/components/select/select.component';
import { EquipamentoService, Equipamento } from '../../../core/services/equipamento.service';
import { TableComponent, TableColumn } from '../../../core/components/table/table.component';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { ThemeService } from '../../../core/services/theme.service';
import { TranslationService } from '../../../core/services/translation.service';
import { TRANSLATIONS } from '../../../core/data/translations';
import { TmDateComponent } from '../../../core/components/tm-date/tm-date.component';
import { combineLatest, startWith, forkJoin } from 'rxjs';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-agendar-equipamento',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, TextInputComponent, SelectComponent, TableComponent, TmDateComponent],
  templateUrl: './agendar-equipamento.html',
  styles: [`
    .backdrop-blur { backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
    .sticky-header { background-color: transparent !important; }
    .transition-hover { transition: all 0.2s ease-in-out; &:hover { transform: translateY(-2px); box-shadow: 0 0.5rem 1rem rgba(0,0,0,0.1) !important; } }
    .icon-circle { transition: transform 0.3s ease; &.glow { box-shadow: 0 0 20px rgba(25, 135, 84, 0.1); } }
    .accordion-button:focus { box-shadow: none !important; }
    .custom-scrollbar {
      &::-webkit-scrollbar { width: 6px; }
      &::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.03); border-radius: 4px; }
      &::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.25); border-radius: 4px; }
      &::-webkit-scrollbar-thumb:hover { background: rgba(0, 0, 0, 0.4); }
    }
    .btn-header-action {
      width: 36px !important; height: 36px !important; padding: 0 !important;
      display: flex !important; align-items: center !important; justify-content: center !important;
      background-color: #ffffff !important; color: #1f2937 !important;
      border: 1px solid #e5e7eb !important; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); border-radius: 50% !important; flex-shrink: 0 !important;
      i { font-size: 1.1rem; }
      &:hover { background-color: #f9fafb !important; transform: translateY(-1px); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); color: #000000 !important; }
      &:active { transform: scale(0.95); }
    }
    :host-context([data-theme='dark']) {
      .btn-header-action {
        background-color: #000000 !important; border-color: rgba(255, 255, 255, 0.3) !important; color: #ffffff !important;
        i { color: #ffffff !important; }
        &:hover { background-color: #1a1a1a !important; border-color: rgba(255, 255, 255, 0.5) !important; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6); }
      }
    }
    .glass-dropdown {
      background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
      border-radius: 12px !important; border: 1px solid rgba(0, 0, 0, 0.05) !important; padding: 0.5rem; min-width: 200px;
    }
    .glass-dropdown.language-dropdown {
      min-width: 60px !important; width: auto !important;
      .dropdown-item { padding: 0.5rem !important; justify-content: center !important; }
    }
    .dropdown-item {
      border-radius: 8px; transition: all 0.2s ease;
      &:hover { background-color: rgba(0, 0, 0, 0.04); }
    }
  `]
})
export class AgendarEquipamento implements OnInit, AfterViewInit {
  private fb = inject(FormBuilder);
  private location = inject(Location);
  private EquipamentoService = inject(EquipamentoService);
  private http = inject(HttpClient);
  private notification = inject(NotificationService);
  theme = inject(ThemeService);
  translation = inject(TranslationService);

  itensSelecionados = signal<any[]>([]);

  availableLanguages = Object.keys(TRANSLATIONS).map((code) => ({
    code: code as 'pt' | 'es' | 'en',
    flag: this.getFlagForLanguage(code as 'pt' | 'es' | 'en'),
    name: code,
  }));

  getFlagForLanguage(lang: 'pt' | 'es' | 'en'): string {
    const flagMap = { pt: 'br', es: 'es', en: 'us' };
    return 'assets/flags/' + flagMap[lang] + '.svg';
  }

  @ViewChild('qtyTemplate') qtyTemplate!: TemplateRef<any>;
  @ViewChild('actionsTemplate') actionsTemplate!: TemplateRef<any>;

  isSubmitting = signal(false);
  saveAttempted = signal(false);

  tipoUsuarioOptions = [
    { value: 'Aluno', label: 'Sou Aluno' },
    { value: 'Professor', label: 'Sou Professor' }
  ];

  gradesHorarias = signal<any[]>([]);

  turnoOptions = computed(() => {
    const list = this.gradesHorarias();
    
    // Proteção contra g.Turno (Upper) ou g.turno (Lower)
    const distinct = Array.from(new Set(list.map(g => (g.turno !== undefined ? g.turno : g.Turno)).filter(t => t !== undefined && t !== null)));
    const mapped = distinct.map(t => {
      let label = String(t);
      if (t === 1 || t === 'Manha') label = 'Manhã';
      else if (t === 2 || t === 'Tarde') label = 'Tarde';
      else if (t === 3 || t === 'Noite') label = 'Noite';
      else if (t === 4 || t === 'Integral') label = 'Integral';
      return { value: label, label: label };
    });
    return mapped;
  });

  turmas = signal<any[]>([]);
  horarios = signal<any[]>([]);
  horariosDinamicos = signal<any[]>([]);
  selectedHoras = signal<string[]>([]);
  matriculaConsulta = signal<string>('');
  matriculaConsultaControl = new FormControl<string>('');
  historicoList = signal<any[]>([]);

  colsHistorico = [
    { header: 'Equipamento', key: 'tipo' },
    { header: 'Nome', key: 'nome' },
    { header: 'Data', key: 'dataPretty' }
  ];

  cols = signal<TableColumn<Equipamento>[]>([]);
  selectedEquipamentoName = signal<string>('');

  agendaForm: FormGroup = this.fb.group({
    tipoUsuario: ['Aluno', Validators.required],
    data: ['', Validators.required],
    turmaId: ['', Validators.required],
    horas: ['', Validators.required],
    turno: ['', Validators.required],
    matricula: ['', Validators.required],
    nomeCompleto: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
    celular: ['', [Validators.required, Validators.minLength(14), Validators.maxLength(20)]]
  });

  private turno$ = this.agendaForm.get('turno')!.valueChanges;
  turno = toSignal(this.turno$, { initialValue: '' });

  turmasFiltradasByTurno = computed(() => {
    const selectedTurno = this.turno();
    if (!selectedTurno) return [];
    return this.turmas()
      .filter(t => t.turno === selectedTurno)
      .map(t => ({ value: t.id, label: t.nome }));
  });

  horariosDaGrade = computed(() => {
    const selectedTurno = this.turno();
    if (!selectedTurno) return [];
    
    // Filtrar todas as grades que pertencem ao turno selecionado
    const matches = this.gradesHorarias().filter(g => {
      const t = g.turno !== undefined ? g.turno : g.Turno;
      let mapped = String(t);
      if (t === 1 || t === 'Manha') mapped = 'Manhã';
      else if (t === 2 || t === 'Tarde') mapped = 'Tarde';
      else if (t === 3 || t === 'Noite') mapped = 'Noite';
      else if (t === 4 || t === 'Integral') mapped = 'Integral';
      return mapped === selectedTurno;
    });

    // Reunir TODOS os itens de todas as grades encontradas
    const allItems: any[] = [];
    matches.forEach(g => {
      const items = g.itens && g.itens.$values ? g.itens.$values : (g.itens || []);
      allItems.push(...items);
    });

    // Remover duplicidades de horários (HoraInicio + HoraFim iguais)
    const distinctItems: any[] = [];
    const seen = new Set<string>();
    allItems.forEach(i => {
      const key = `${i.horaInicio}-${i.horaFim}`;
      if (!seen.has(key)) {
        seen.add(key);
        distinctItems.push(i);
      }
    });

    return distinctItems.sort((a, b) => a.ordemAula - b.ordemAula);
  });

  private tipoUsuario$ = this.agendaForm.get('tipoUsuario')!.valueChanges;
  tipoUsuario = toSignal(this.tipoUsuario$, { initialValue: 'Aluno' });

  equipamentos = signal<Equipamento[]>([]);
  equipamentosFiltrados = computed(() => {
    const uType = this.tipoUsuario();
    const list = this.equipamentos().filter(eq => {
      if (uType === 'Aluno') {
        return eq.solicitante === 'Aluno';
      } else if (uType === 'Professor') {
        return eq.solicitante === 'Professor' || eq.solicitante === 'Aluno';
      }
      return false;
    });
    return list.map(eq => ({ ...eq, currentQty: 0 }));
  });

  adicionarItem() {
    const itemsWithQty = this.equipamentosFiltrados().filter(i => i.currentQty > 0);
    
    if (itemsWithQty.length === 0) {
      this.notification.error('Por favor, informe a quantidade de pelo menos um equipamento.');
      return;
    }

    const addedList = [...this.itensSelecionados()];

    for (const item of itemsWithQty) {
      const existing = addedList.find(x => x.id === item.id);
      if (existing) {
        this.notification.error(`O equipamento ${item.nome} já foi adicionado.`);
        continue;
      }

      if (this.tipoUsuario() === 'Aluno' && item.currentQty > 1) {
        this.notification.error('Alunos podem solicitar apenas 1 unidade de cada equipamento.');
        item.currentQty = 1;
      }

      if (item.currentQty > item.quantidade) {
        this.notification.error(`Quantidade de ${item.nome} excede o limite disponível (${item.quantidade}).`);
        continue;
      }

      addedList.push({
        id: item.id,
        nome: item.nome,
        quantidade: item.currentQty,
        tipo: item.tipo
      });
    }

    this.itensSelecionados.set(addedList);
    this.equipamentosFiltrados().forEach(i => i.currentQty = 0);
    this.notification.success('Item adicionado à lista.');
  }

  removerItem(id: string) {
    this.itensSelecionados.update(list => list.filter(item => item.id !== id));
    this.notification.success('Item removido da lista.');
  }

  clearEquipamentoSelection() {
    this.selectedEquipamentoName.set('');
  }

  consultarHistorico() {
    const mat = this.matriculaConsultaControl.value;
    
    if (!mat || mat.trim() === '') {
      return;
    }
    
    const url = `${environment.apiUrl}/ReservaEquipamentos/historico?matricula=${mat}`;

    this.http.get(url).subscribe({
      next: (res: any) => {
        const mapped = (res || []).map((r: any) => ({
          ...r,
          dataPretty: r.data ? new Date(r.data).toLocaleDateString('pt-BR') : '-'
        }));
        this.historicoList.set(mapped);
      },
      error: (err) => {
        console.error('Erro na requisição de Histórico:', err);
      }
    });
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.cols.set([
        { header: 'Nome', key: 'nome' },
        { header: 'Tipo', key: 'tipo' },
        { header: 'Disponível', key: 'quantidade' },
        { header: 'Qtd', template: this.qtyTemplate, width: '90px' }
      ]);
    });
  }

  ngOnInit() {
    // Escutar mudança de Tipo de Usuário para travar quantidade
    this.agendaForm.get('tipoUsuario')?.valueChanges.subscribe(tipo => {
      const qtyControl = this.agendaForm.get('quantidade');
      if (tipo === 'Aluno') {
        qtyControl?.setValue(1);
        qtyControl?.disable();
      } else {
        qtyControl?.enable();
      }
    });

    this.loadEquipamentos();
    this.loadTurmas();
    this.loadGradesHorarias();

    this.agendaForm.get('turmaId')!.valueChanges.subscribe(() => {
      this.selectedHoras.set([]);
      this.agendaForm.patchValue({ horas: '' });
    });

    this.agendaForm.get('turno')!.valueChanges.subscribe(() => {
      this.agendaForm.patchValue({ turmaId: '', horas: '' });
      this.selectedHoras.set([]);
      this.horarios.set([]);
    });

    this.agendaForm.get('data')!.valueChanges.subscribe(() => {
      this.agendaForm.patchValue({ turno: '', turmaId: '', horas: '' }, { emitEvent: false });
      this.selectedHoras.set([]);
      this.horariosDinamicos.set([]);
    });

    combineLatest([
      this.agendaForm.get('turmaId')!.valueChanges.pipe(startWith(this.agendaForm.get('turmaId')?.value || '')),
      this.agendaForm.get('data')!.valueChanges.pipe(startWith(this.agendaForm.get('data')?.value || ''))
    ]).subscribe(([turmaId, data]) => {
      if (turmaId && data) {
        this.loadHorariosDisponiveis(turmaId, data);
      } else {
        this.horariosDinamicos.set([]);
      }
    });
  }

  loadEquipamentos() {
    this.EquipamentoService.list().subscribe({
      next: (res: any) => {
        const data = res && res.data ? res.data : res;
        this.equipamentos.set(data || []);
      }
    });
  }

  loadTurmas() {
    this.http.get(`${environment.apiUrl}/Turmas`).subscribe({
      next: (res: any) => {
        const data = res && res.data ? res.data : res;
        this.turmas.set(data || []);
      }
    });
  }

  loadGradesHorarias() {
    this.http.get(`${environment.apiUrl}/GradesHoraria`).subscribe({
      next: (res: any) => {
        let data = res && res.data ? res.data : (res && res.$values ? res.$values : res);
        const actualList = Array.isArray(data) ? data : (data && data.$values ? data.$values : []);
        this.gradesHorarias.set(actualList);

        setTimeout(() => {
          const opts = this.turnoOptions();
          if (opts.length > 0 && !opts.some(o => o.value === this.agendaForm.get('turno')?.value)) {
            this.agendaForm.patchValue({ turno: opts[0].value });
          }
        });
      }
    });
  }

  loadHorariosDisponiveis(turmaId: string, data: string) {
    const formattedData = new Date(data).toISOString();
    this.http.get(`${environment.apiUrl}/ReservaEquipamentos/horarios-disponiveis?turmaId=${turmaId}&data=${formattedData}`).subscribe({
      next: (res: any) => {
        const list = res && res.data ? res.data : res;
        this.horariosDinamicos.set(list || []);
      }
    });
  }

  toggleHora(hora: string, Checked: boolean) {
    const list = [...this.selectedHoras()];
    if (Checked) {
      if (!list.includes(hora)) list.push(hora);
    } else {
      const idx = list.indexOf(hora);
      if (idx !== -1) list.splice(idx, 1);
    }
    this.selectedHoras.set(list);
    this.agendaForm.patchValue({ horas: list.join(', ') });
  }

  selectEquipamento(id: string) {
    this.agendaForm.patchValue({ equipamentoId: id });
  }

  onSubmit() {
    this.saveAttempted.set(true);
    this.agendaForm.markAllAsTouched();

    if (this.itensSelecionados().length === 0) {
      this.notification.error('Adicione pelo menos um equipamento à lista para agendar.');
      return;
    }

    if (this.agendaForm.invalid) {
      this.notification.error('Preencha todos os campos obrigatórios corretamente.');
      return;
    }

    this.isSubmitting.set(true);
    const dataVal = this.agendaForm.get('data')?.value;

    const requests = this.itensSelecionados().map(item => {
      const payload = {
        ...this.agendaForm.getRawValue(),
        equipamentoId: item.id,
        quantidade: item.quantidade,
        dataReserva: dataVal
      };
      return this.EquipamentoService.criarReserva(payload);
    });

    forkJoin(requests).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.notification.success('Todos os agendamentos foram realizados com sucesso!');
        this.location.back();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.notification.error(err.error?.message || 'Erro ao realizar agendamentos.');
      }
    });
  }

  onCancel() {
    this.location.back();
  }
}
