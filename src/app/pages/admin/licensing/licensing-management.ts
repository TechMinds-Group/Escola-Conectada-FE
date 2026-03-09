import { Component, inject, signal, OnInit, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { UnidadeService, Unidade } from '../../../core/services/unidade.service';
import { LicencaService, Licenca } from '../../../core/services/licenca.service';
import { TableComponent, TableColumn } from '../../../core/components/table/table.component';
import { TextInputComponent } from '../../../core/components/text-input/text-input.component';
import { ButtonSaveComponent } from '../../../core/components/buttons/button-save';

@Component({
  selector: 'app-licensing-management',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TableComponent,
    TextInputComponent,
    ButtonSaveComponent,
  ],
  providers: [DatePipe],
  templateUrl: './licensing-management.html',
})
export class LicensingManagement implements OnInit {
  private unidadeService = inject(UnidadeService);
  private licencaService = inject(LicencaService);
  private fb = inject(FormBuilder);
  private datePipe = inject(DatePipe);

  unidades = signal<Unidade[]>([]);
  licencas = signal<Licenca[]>([]);
  activeTab = signal<'unidades' | 'licencas'>('unidades');
  isLoading = signal(true);
  isSubmitting = signal(false);

  // Form
  licencaForm = this.fb.group({
    chave: ['', [Validators.required]],
    diasValidade: [365], // Hidden validade default
  });

  // Template Refs
  @ViewChild('nomeTpl', { static: true }) nomeTpl!: TemplateRef<any>;
  @ViewChild('identificadorTpl', { static: true }) identificadorTpl!: TemplateRef<any>;
  @ViewChild('expiracaoTpl', { static: true }) expiracaoTpl!: TemplateRef<any>;
  @ViewChild('statusTpl', { static: true }) statusTpl!: TemplateRef<any>;

  @ViewChild('chaveTpl', { static: true }) chaveTpl!: TemplateRef<any>;
  @ViewChild('usoTpl', { static: true }) usoTpl!: TemplateRef<any>;
  @ViewChild('dataUsoTpl', { static: true }) dataUsoTpl!: TemplateRef<any>;

  unidadesCols: TableColumn<Unidade>[] = [];
  licencasCols: TableColumn<Licenca>[] = [];

  ngOnInit() {
    this.setupColumns();
    this.loadData();
  }

  setupColumns() {
    this.unidadesCols = [
      { header: 'Unidade', template: this.nomeTpl },
      { header: 'Identificador', template: this.identificadorTpl },
      { header: 'CNPJ', key: 'documento' },
      { header: 'Expiração', template: this.expiracaoTpl },
      { header: 'Status', template: this.statusTpl },
    ];

    this.licencasCols = [
      { header: 'Chave', template: this.chaveTpl },
      { header: 'Duração', key: 'diasValidade' },
      { header: 'Uso', template: this.usoTpl },
      { header: 'Data Uso', template: this.dataUsoTpl },
    ];
  }

  loadData() {
    this.isLoading.set(true);

    // Simulating slight delay for skeleton loader visibility if data is fast
    setTimeout(() => {
      this.unidadeService.list().subscribe((u) => {
        this.unidades.set(u);
        this.isLoading.set(false);
      });
      this.licencaService.list().subscribe((l) => this.licencas.set(l));
    }, 400);
  }

  setTab(tab: 'unidades' | 'licencas') {
    this.activeTab.set(tab);
  }

  saveLicenca() {
    if (this.licencaForm.invalid) return;

    this.isSubmitting.set(true);
    const formValue = this.licencaForm.getRawValue();

    this.licencaService
      .save({
        chave: formValue.chave || '',
        diasValidade: formValue.diasValidade || 365,
      })
      .subscribe({
        next: () => {
          this.licencaForm.reset({ diasValidade: 365 });
          this.loadData();
          this.isSubmitting.set(false);
        },
        error: () => this.isSubmitting.set(false),
      });
  }
}
