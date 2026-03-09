import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { UserService, UserListDto } from '../../../../core/services/user.service';
import { TextInputComponent } from '../../../../core/components/text-input/text-input.component';
import { SelectComponent } from '../../../../core/components/select/select.component';
import { NotificationService } from '../../../../core/services/notification.service';
import { TranslationService } from '../../../../core/services/translation.service';
import { ConfirmationService } from '../../../../core/services/confirmation.service';
import { ButtonSaveComponent } from '../../../../core/components/buttons/button-save';
import { ButtonCancelComponent } from '../../../../core/components/buttons/button-cancel';
import { ButtonDeleteComponent } from '../../../../core/components/buttons/button-delete';

@Component({
  selector: 'app-cadastro-usuario',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TextInputComponent,
    SelectComponent,
    ButtonSaveComponent,
    ButtonCancelComponent,
    ButtonDeleteComponent,
  ],
  templateUrl: './cadastro-usuario.html',
})
export class CadastroUsuario implements OnInit {
  private userService = inject(UserService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private notification = inject(NotificationService);
  private confirmation = inject(ConfirmationService);
  public translation = inject(TranslationService);
  t = this.translation.dictionary;

  userId = signal<string | null>(null);
  isSaving = signal(false);
  saveAttempted = signal(false);

  userForm: FormGroup = this.fb.group(
    {
      name: ['', [Validators.required, Validators.maxLength(50)]],
      username: ['', [Validators.required, Validators.maxLength(50)]],
      email: ['', [Validators.email, Validators.maxLength(200)]],
      role: ['', Validators.required],
      password: ['', [Validators.minLength(6)]],
      confirmPassword: [''],
    },
    { validators: this.passwordMatchValidator },
  );

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    return null;
  }

  private roles$ = this.userService.getRoles();
  private roles = toSignal(this.roles$, { initialValue: [] });

  roleOptions = computed(() => {
    return this.roles().map((role) => ({
      value: role,
      label: role,
    }));
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.userId.set(id);
      this.loadUser(id);
    }
  }

  loadUser(id: string) {
    this.userService.getUsers().subscribe({
      next: (users) => {
        const user = users.find((u) => u.id === id);
        if (user) {
          this.userForm.patchValue({
            name: user.name,
            username: user.username,
            email: user.email,
            role: user.role,
          });
          this.userForm.get('email')?.disable();
        } else {
          this.notification.error('Usuário não encontrado');
          this.router.navigate(['/users']);
        }
      },
    });
  }

  onUsernameBlur() {
    const username = this.userForm.get('username')?.value;
    if (!username) return;

    this.userService.checkUsernameAvailability(username, this.userId() || undefined).subscribe({
      next: (available) => {
        const control = this.userForm.get('username');
        if (!available) {
          control?.setErrors({ alreadyExists: true });
          this.notification.error('Este nome de usuário já está em uso nesta escola.');
        } else if (control?.hasError('alreadyExists')) {
          control.setErrors(null);
        }
      },
    });
  }

  onCancel() {
    this.router.navigate(['/users']);
  }

  onSubmit() {
    this.saveAttempted.set(true);
    if (this.userForm.invalid) return;

    this.isSaving.set(true);
    const userData = this.userForm.getRawValue();
    const id = this.userId();

    if (userData.email === '') {
      userData.email = null;
    }

    const request = id
      ? this.userService.updateUser(id, {
          name: userData.name,
          username: userData.username,
          role: userData.role,
        })
      : this.userService.createUser({
          name: userData.name,
          username: userData.username,
          email: userData.email,
          role: userData.role,
          password: userData.password || null,
        });

    request.subscribe({
      next: (res: any) => {
        this.notification.success(res.message || (id ? 'Usuário atualizado' : 'Usuário criado'));
        this.router.navigate(['/users']);
      },
      error: (err) => {
        this.isSaving.set(false);
        this.notification.error(err.error?.message || 'Erro ao salvar usuário');
      },
    });
  }

  async deleteUser() {
    const id = this.userId();
    if (!id) return;

    const confirmed = await this.confirmation.confirm({
      title: 'Excluir Usuário',
      message: `Tem certeza que deseja excluir este usuário?`,
      confirmLabel: 'Excluir',
      confirmClass: 'btn-danger',
    });

    if (confirmed) {
      this.userService.deleteUser(id).subscribe({
        next: (res) => {
          this.notification.success(res.message || 'Usuário excluído com sucesso');
          this.router.navigate(['/users']);
        },
        error: (err) => {
          this.notification.error(err.error?.message || 'Erro ao excluir usuário');
        },
      });
    }
  }
}
