import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './user-profile.html',
})
export class UserProfile {
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);

  get user() {
    return this.auth.getCurrentUser();
  }

  currentTab = signal<'personal' | 'security'>('personal');

  // Forms
  personalForm = this.fb.group({
    name: [this.user?.nome || '', [Validators.required, Validators.maxLength(50)]],
    email: [
      this.user?.email || '',
      [Validators.required, Validators.email, Validators.maxLength(200)],
    ],
    phone: [''],
    role: [{ value: this.user?.roles?.[0] || 'Usuário', disabled: true }],
  });

  securityForm = this.fb.group({
    currentPassword: [''],
    newPassword: [''],
    confirmPassword: [''],
  });

  // Computed State
  passwordStrength = signal(0); // 0-4
  loading = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  onPasswordInput() {
    const pass = this.securityForm.get('newPassword')?.value || '';
    let strength = 0;
    if (pass.length > 6) strength++;
    if (pass.match(/[A-Z]/)) strength++;
    if (pass.match(/[0-9]/)) strength++;
    if (pass.match(/[^a-zA-Z0-9]/)) strength++;
    this.passwordStrength.set(strength);
  }

  setTab(tab: 'personal' | 'security') {
    this.currentTab.set(tab);
  }

  async savePersonal() {
    if (this.personalForm.valid && this.personalForm.dirty) {
      this.loading.set(true);
      this.errorMessage.set(null);
      this.successMessage.set(null);

      try {
        const name = this.personalForm.get('name')?.value || '';
        await this.auth.updateProfile(name);
        this.successMessage.set('Perfil atualizado com sucesso!');
        this.personalForm.markAsPristine();
      } catch (error: any) {
        this.errorMessage.set(error.error?.message || 'Erro ao atualizar perfil.');
      } finally {
        this.loading.set(false);
      }
    }
  }

  async saveSecurity() {
    if (this.securityForm.valid) {
      this.loading.set(true);
      this.errorMessage.set(null);
      this.successMessage.set(null);

      const current = this.securityForm.get('currentPassword')?.value || '';
      const newPass = this.securityForm.get('newPassword')?.value || '';
      const confirm = this.securityForm.get('confirmPassword')?.value || '';

      if (newPass !== confirm) {
        this.errorMessage.set('As senhas não coincidem.');
        this.loading.set(false);
        return;
      }

      try {
        await this.auth.changePassword(current, newPass);
        this.successMessage.set('Senha alterada com sucesso!');
        this.securityForm.reset();
        this.passwordStrength.set(0);
      } catch (error: any) {
        this.errorMessage.set(
          error.error?.message || 'Erro ao alterar senha. Verifique se a senha atual está correta.',
        );
      } finally {
        this.loading.set(false);
      }
    }
  }
}
