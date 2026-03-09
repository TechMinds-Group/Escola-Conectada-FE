import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  FormControl,
} from '@angular/forms';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { UserService, UserListDto } from '../../../../core/services/user.service';
import { TextInputComponent } from '../../../../core/components/text-input/text-input.component';
import { SelectComponent } from '../../../../core/components/select/select.component';
import { TableComponent } from '../../../../core/components/table/table.component';
import { TranslationService } from '../../../../core/services/translation.service';

@Component({
  selector: 'app-consulta-usuario',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TextInputComponent, SelectComponent, TableComponent],
  templateUrl: './consulta-usuario.html',
})
export class ConsultaUsuario implements OnInit {
  private userService = inject(UserService);
  private router = inject(Router);
  public translation = inject(TranslationService);
  t = this.translation.dictionary;

  users = signal<UserListDto[]>([]);
  isLoading = signal(true);
  isFilterPanelOpen = signal(false);

  // Form Controls
  searchText = new FormControl('');
  filterRole = new FormControl('Todos');

  // Values currently applied to the list
  appliedFilters = signal({
    search: '',
    role: 'Todos',
  });

  private roles$ = this.userService.getRoles();
  private roles = toSignal(this.roles$, { initialValue: [] });

  roleOptions = computed(() => {
    const rolesList = this.roles();
    const options = rolesList.map((role) => ({
      value: role,
      label: role,
    }));
    return [{ value: 'Todos', label: 'Todos os Níveis' }, ...options];
  });

  // Derived
  filteredUsers = computed(() => {
    let list = this.users();
    const filters = this.appliedFilters();
    const search = (filters.search || '').toLowerCase();

    if (search) {
      list = list.filter(
        (u) =>
          u.name.toLowerCase().includes(search) ||
          u.username.toLowerCase().includes(search) ||
          (u.email || '').toLowerCase().includes(search),
      );
    }

    if (filters.role !== 'Todos') {
      list = list.filter((u) => u.role === filters.role);
    }

    return list;
  });

  isFilterActive = computed(
    () => !!this.appliedFilters().search || this.appliedFilters().role !== 'Todos',
  );

  toggleFilterPanel() {
    this.isFilterPanelOpen.update((v) => !v);
  }

  applyFilters() {
    this.appliedFilters.set({
      search: this.searchText.value || '',
      role: this.filterRole.value || 'Todos',
    });
  }

  clearFilters() {
    this.searchText.setValue('');
    this.filterRole.setValue('Todos');
    this.applyFilters();
  }

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.isLoading.set(true);
    this.userService.getUsers().subscribe({
      next: (data) => {
        this.users.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  navigateToNew() {
    this.router.navigate(['/users/novo']);
  }

  navigateToEdit(user: UserListDto) {
    this.router.navigate(['/users/editar', user.id]);
  }

  getBadgeClass(role: string): string {
    switch (role) {
      case 'SuperAdmin':
      case 'Admin':
      case 'Administrador':
        return 'bg-primary-subtle text-primary border-primary-subtle';
      case 'AdminEscola':
      case 'Coordenador':
        return 'bg-info-subtle text-info border-info-subtle';
      case 'Professor':
        return 'bg-success-subtle text-success border-success-subtle';
      default:
        return 'bg-light text-secondary border';
    }
  }
}
