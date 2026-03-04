import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UnidadeService, Unidade } from '../../../core/services/unidade.service';
import { LicencaService, Licenca } from '../../../core/services/licenca.service';

@Component({
  selector: 'app-licensing-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './licensing-management.html',
})
export class LicensingManagement implements OnInit {
  private unidadeService = inject(UnidadeService);
  private licencaService = inject(LicencaService);

  unidades = signal<Unidade[]>([]);
  licencas = signal<Licenca[]>([]);
  activeTab = signal<'unidades' | 'licencas'>('unidades');

  // Form State
  editingUnidade = signal<Unidade | null>(null);
  newLicenca = signal({ chave: '', diasValidade: 365 });

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.unidadeService.list().subscribe((u) => this.unidades.set(u));
    this.licencaService.list().subscribe((l) => this.licencas.set(l));
  }

  setTab(tab: 'unidades' | 'licencas') {
    this.activeTab.set(tab);
  }

  editUnidade(u: Unidade) {
    this.editingUnidade.set({ ...u });
  }

  saveUnidade() {
    const u = this.editingUnidade();
    if (!u) return;

    this.unidadeService.update(u.id, u).subscribe(() => {
      this.editingUnidade.set(null);
      this.loadData();
    });
  }

  generateKey() {
    const prefix = 'MICHEL-' + new Date().getFullYear() + '-';
    // Gera 6 caracteres aleatórios
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.newLicenca.update((l) => ({ ...l, chave: prefix + random }));
  }

  saveLicenca() {
    this.licencaService.save(this.newLicenca()).subscribe(() => {
      this.newLicenca.set({ chave: '', diasValidade: 365 });
      this.loadData();
    });
  }

  deleteLicenca(id: string) {
    if (confirm('Tem certeza que deseja excluir esta licença?')) {
      this.licencaService.delete(id).subscribe(() => this.loadData());
    }
  }
}
