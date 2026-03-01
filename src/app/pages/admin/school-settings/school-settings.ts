import { Component, inject } from '@angular/core';
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
    name: [this.info().name, Validators.required],
    slogan: [this.info().slogan],
    cnpj: [this.info().cnpj],
    email: [this.info().email, [Validators.required, Validators.email]],
    phone: [this.info().phone],
  });

  save() {
    if (this.form.valid) {
      this.schoolData.updateSchoolInfo(this.form.value);
      alert('Configurações salvas com sucesso!');
    }
  }
}
