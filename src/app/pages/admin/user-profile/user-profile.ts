import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { TextInputComponent } from '../../../core/components/text-input/text-input.component';
import { ButtonSaveComponent } from '../../../core/components/buttons/button-save';
import { ButtonCancelComponent } from '../../../core/components/buttons/button-cancel';
import { ButtonEditComponent } from '../../../core/components/buttons/button-edit';
import { Router } from '@angular/router';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TextInputComponent,
    ButtonSaveComponent,
    ButtonCancelComponent,
    ButtonEditComponent,
  ],
  templateUrl: './user-profile.html',
})
export class UserProfile {
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  get user() {
    return this.auth.getCurrentUser();
  }

  currentTab = signal<'personal' | 'security'>('personal');
  isViewMode = signal(true);

  // Forms
  personalForm = this.fb.group({
    name: [
      { value: this.user?.nome || '', disabled: true },
      [Validators.required, Validators.maxLength(50)],
    ],
    email: [
      { value: this.user?.email || '', disabled: true },
      [Validators.required, Validators.email, Validators.maxLength(200)],
    ],
    phone: [{ value: '', disabled: true }],
    role: [{ value: this.user?.roles?.[0] || 'Usuário', disabled: true }],
  });

  securityForm = this.fb.group({
    username: [
      { value: this.user?.username || this.user?.email || '', disabled: true },
      [Validators.required, Validators.maxLength(50)],
    ],
    currentPassword: [{ value: '', disabled: true }],
    newPassword: [{ value: '', disabled: true }],
    confirmPassword: [{ value: '', disabled: true }],
  });

  enableEdit() {
    this.isViewMode.set(false);
    this.personalForm.enable();
    this.securityForm.enable();
    this.personalForm.get('role')?.disable();
  }

  onCancel() {
    if (this.isViewMode()) {
      this.router.navigate(['/']);
    } else {
      this.isViewMode.set(true);
      this.personalForm.reset({
        name: this.user?.nome || '',
        email: this.user?.email || '',
        phone: '',
        role: this.user?.roles?.[0] || 'Usuário',
      });
      this.securityForm.reset({
        username: this.user?.username || this.user?.email || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      this.personalForm.disable();
      this.securityForm.disable();
    }
  }

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

      const usernameCtrl = this.securityForm.get('username');
      const current = this.securityForm.get('currentPassword')?.value || '';
      const newPass = this.securityForm.get('newPassword')?.value || '';
      const confirm = this.securityForm.get('confirmPassword')?.value || '';

      const isPasswordUpdateAttempt = current || newPass || confirm;
      let usernameUpdated = false;

      // Update username if dirty
      if (usernameCtrl?.dirty && usernameCtrl.value !== this.user?.username) {
        try {
          await this.auth.updateUsername(usernameCtrl.value as string);
          usernameUpdated = true;
          usernameCtrl.markAsPristine();
        } catch (error: any) {
          this.errorMessage.set(error.error?.message || 'Erro ao atualizar o nome de usuário.');
          this.loading.set(false);
          return;
        }
      }

      if (isPasswordUpdateAttempt) {
        if (!current || !newPass || !confirm) {
          this.errorMessage.set(
            'Preencha os campos de senha atual, nova senha e confirmação para alterar a senha.',
          );
          this.loading.set(false);
          return;
        }
        if (newPass !== confirm) {
          this.errorMessage.set('As senhas não coincidem.');
          this.loading.set(false);
          return;
        }

        try {
          await this.auth.changePassword(current, newPass);
          this.successMessage.set(
            usernameUpdated
              ? 'Nome de usuário e senha atualizados com sucesso!'
              : 'Senha alterada com sucesso!',
          );

          this.securityForm.get('currentPassword')?.reset();
          this.securityForm.get('newPassword')?.reset();
          this.securityForm.get('confirmPassword')?.reset();
          this.passwordStrength.set(0);
        } catch (error: any) {
          this.errorMessage.set(
            error.error?.message ||
              'Erro ao alterar senha. Verifique se a senha atual está correta.',
          );
        } finally {
          this.loading.set(false);
        }
      } else {
        if (usernameUpdated) {
          this.successMessage.set('Nome de usuário atualizado com sucesso!');
        }
        this.loading.set(false);
      }
    }
  }
}
