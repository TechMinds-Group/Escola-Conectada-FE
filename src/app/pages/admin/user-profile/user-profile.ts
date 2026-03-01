import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { SchoolDataService } from '../../../core/services/school-data';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './user-profile.html',
})
export class UserProfile {
  private schoolData = inject(SchoolDataService);
  private fb = inject(FormBuilder);

  user = this.schoolData.currentUser;
  currentTab = signal<'personal' | 'security' | 'preferences'>('personal');

  // Forms
  personalForm = this.fb.group({
    name: [this.user().name, Validators.required],
    email: [this.user().email, [Validators.required, Validators.email]],
    phone: [this.user().phone],
    role: [{ value: this.user().role, disabled: true }],
  });

  securityForm = this.fb.group({
    currentPassword: [''],
    newPassword: [''],
    confirmPassword: [''],
  });

  // Computed State
  passwordStrength = signal(0); // 0-4

  onPasswordInput() {
    const pass = this.securityForm.get('newPassword')?.value || '';
    let strength = 0;
    if (pass.length > 6) strength++;
    if (pass.match(/[A-Z]/)) strength++;
    if (pass.match(/[0-9]/)) strength++;
    if (pass.match(/[^a-zA-Z0-9]/)) strength++;
    this.passwordStrength.set(strength);
  }

  setTab(tab: 'personal' | 'security' | 'preferences') {
    this.currentTab.set(tab);
  }

  toggle2FA() {
    // Mock toggle
    this.user().security.twoFactorEnabled = !this.user().security.twoFactorEnabled;
  }

  togglePreference(key: 'emailAlerts' | 'weeklyReports' | 'notificationSounds') {
    // Mutate the signal value directly for this mock (in real app use update or immutable spread)
    const prefs = this.user().preferences;
    prefs[key] = !prefs[key];
  }

  terminateSession(id: number) {
    alert(`Sessão ${id} encerrada.`);
  }

  savePersonal() {
    if (this.personalForm.valid && this.personalForm.dirty) {
      alert('Dados pessoais atualizados com sucesso!');
      this.personalForm.markAsPristine();
    }
  }

  saveSecurity() {
    if (this.securityForm.valid) {
      alert('Senha alterada com sucesso!');
      this.securityForm.reset();
      this.passwordStrength.set(0);
    }
  }
}
