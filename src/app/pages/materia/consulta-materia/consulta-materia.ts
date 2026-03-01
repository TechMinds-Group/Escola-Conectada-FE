import {
  Component,
  computed,
  inject,
  signal,
  OnInit,
  AfterViewInit,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SchoolDataService, Subject } from '../../../core/services/school-data';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { LanguageService } from '../../../core/services/language.service';
import { TranslationService } from '../../../core/services/translation.service';
import { ConfirmationService } from '../../../core/services/confirmation.service';

@Component({
  selector: 'app-consulta-materia',
  standalone: true,
  imports: [CommonModule, FormsModule, MatMenuModule, MatButtonModule, MatIconModule],
  templateUrl: './consulta-materia.html',
  styleUrl: './consulta-materia.scss',
})
export class ConsultaMateria implements OnInit, AfterViewInit {
  public lang = inject(LanguageService);
  public schoolData = inject(SchoolDataService);
  private router = inject(Router);
  public translation = inject(TranslationService);
  private cdr = inject(ChangeDetectorRef);
  private confirmationService = inject(ConfirmationService);
  t = this.translation.dictionary;

  // Filters
  filterCategory = signal<string>('Todas');
  searchQuery = signal<string>('');

  // Data
  subjects = computed(() => {
    let list = this.schoolData.subjects();
    const cat = this.filterCategory();
    const query = this.searchQuery().toLowerCase().trim();

    if (cat !== 'Todas') {
      list = list.filter((s) => s.category === cat);
    }

    if (query) {
      list = list.filter((s) => s.name.toLowerCase().includes(query));
    }

    return list;
  });

  ngOnInit() {
    this.schoolData.loadSubjects();
  }

  ngAfterViewInit() {
    this.cdr.detectChanges();
  }

  addSubject() {
    this.router.navigate(['/subjects/new']);
  }

  editSubject(id: string) {
    this.router.navigate(['/subjects/edit', id]);
  }

  async deleteSubject(id: string) {
    const confirmed = await this.confirmationService.confirm({
      message: this.t().admin.subjects.deleteConfirm,
      confirmClass: 'btn-danger',
      confirmLabel: 'Excluir',
    });

    if (confirmed) {
      await this.schoolData.deleteSubject(id);
    }
  }
}
