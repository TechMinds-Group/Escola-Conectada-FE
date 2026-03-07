import { Component, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { SchoolDataService } from '../../../core/services/school-data';

@Component({
  selector: 'app-school-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './school-settings.html',
})
export class SchoolSettings {
  private schoolData = inject(SchoolDataService);
  private fb = inject(FormBuilder);

  info = this.schoolData.schoolInfo;

  form = this.fb.group({
    name: [this.info().name, [Validators.required, Validators.maxLength(50)]],
    cnpj: [this.info().cnpj],
    email: [this.info().email, [Validators.required, Validators.email, Validators.maxLength(200)]],
    phone: [this.info().phone],
  });

  constructor() {
    // Re-initialize form when data arrives
    effect(() => {
      const data = this.info();
      this.form.patchValue(
        {
          name: data.name,
          cnpj: data.cnpj,
          email: data.email,
          phone: data.phone,
        },
        { emitEvent: false },
      );
    });
  }

  async save() {
    if (this.form.valid) {
      try {
        await this.schoolData.updateSchoolInfo(this.form.value);
        alert('Configurações salvas com sucesso!');
      } catch (err) {
        alert('Erro ao salvar as configurações.');
      }
    }
  }

  resetForm() {
    this.form.reset({
      name: this.info().name,
      cnpj: this.info().cnpj,
      email: this.info().email,
      phone: this.info().phone,
    });
  }
}
