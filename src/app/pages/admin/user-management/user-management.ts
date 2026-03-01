import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SchoolDataService } from '../../../core/services/school-data';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './user-management.html',
})
export class UserManagement {
  private schoolData = inject(SchoolDataService);
  private fb = inject(FormBuilder);

  users = this.schoolData.schoolUsers;
  showModal = signal(false);
  saveAttempted = signal(false);

  userForm: FormGroup = this.fb.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    role: ['Coordenador', Validators.required],
  });

  openModal() {
    this.userForm.reset({ role: 'Coordenador' });
    this.saveAttempted.set(false);
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  saveUser() {
    this.saveAttempted.set(true);
    if (this.userForm.valid) {
      this.schoolData.addUser(this.userForm.value);
      this.closeModal();
    }
  }

  getBadgeClass(role: string): string {
    switch (role) {
      case 'Administrador':
        return 'bg-primary-subtle text-dark';
      case 'Coordenador':
        return 'bg-lavender-subtle text-lavender';
      case 'Secretaria':
        return 'bg-mint-subtle text-mint';
      default:
        return 'bg-light-alpha text-muted';
    }
  }
}
