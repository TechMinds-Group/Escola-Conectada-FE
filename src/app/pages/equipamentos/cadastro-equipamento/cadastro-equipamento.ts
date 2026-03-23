import { Component, computed, inject, signal, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { EquipamentoService, Equipamento } from '../../../core/services/equipamento.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ConfirmationService } from '../../../core/services/confirmation.service';
import { TextInputComponent } from '../../../core/components/text-input/text-input.component';
import { SelectComponent } from '../../../core/components/select/select.component';
import { ButtonSaveComponent } from '../../../core/components/buttons/button-save';
import { ButtonCancelComponent } from '../../../core/components/buttons/button-cancel';
import { ButtonDeleteComponent } from '../../../core/components/buttons/button-delete';
import { ButtonEditComponent } from '../../../core/components/buttons/button-edit';
import { ModalManageListComponent } from '../../../core/components/modals/modal-manage-list/modal-manage-list.component';

@Component({
  selector: 'app-cadastro-equipamento',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    TextInputComponent,
    SelectComponent,
    ButtonSaveComponent,
    ButtonCancelComponent,
    ButtonDeleteComponent,
    ButtonEditComponent,
    ModalManageListComponent
  ],
  templateUrl: './cadastro-equipamento.html'
})
export class CadastroEquipamento implements OnInit {
  private fb = inject(FormBuilder);
  private EquipamentoService = inject(EquipamentoService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private notification = inject(NotificationService);
  private confirmationService = inject(ConfirmationService);

  @ViewChild('typeModal') typeModal!: ModalManageListComponent;

  equipamentoForm: FormGroup;
  isEditMode = signal(false);
  isViewMode = signal(false);
  equipamentoId = signal<string | null>(null);
  isSubmitting = signal(false);

  showTypeManager = signal(false);
  equipamentoTypes = signal<any[]>([]);

  typeOptions = computed(() => {
    return this.equipamentoTypes().map((t) => ({ value: t.name, label: t.name }));
  });

  solicitanteOptions = [
    { value: 'Professor', label: 'Professor' },
    { value: 'Aluno', label: 'Aluno' }
  ];


  constructor() {
    this.equipamentoForm = this.fb.group({
      nome: ['', [Validators.required, Validators.maxLength(100)]],
      tipo: ['', Validators.required],
      descricao: [''],
      quantidade: [1, [Validators.required, Validators.min(1)]],
      status: ['Disponível', Validators.required],
      solicitante: ['Aluno', Validators.required]
    });
  }

  ngOnInit() {
    this.loadTypes();
    const id = this.route.snapshot.paramMap.get('id');

    if (id) {
      this.isEditMode.set(true);
      this.isViewMode.set(true);
      this.equipamentoId.set(id);
      this.loadEquipamento(id);
      this.equipamentoForm.disable();
    }
  }

  loadEquipamento(id: string) {
    this.EquipamentoService.getById(id).subscribe({
      next: (res: any) => {
        const eq = res && res.data ? res.data : res;
        if (eq) {
          this.equipamentoForm.patchValue({
            ...eq,
            solicitante: eq.solicitante || 'Aluno'
          });
        }
      },
      error: () => this.notification.error('Erro ao carregar equipamento.')
    });
  }

  enableEdit() {
    this.isViewMode.set(false);
    this.equipamentoForm.enable();
  }

  cancelEdit() {
    this.isViewMode.set(true);
    this.equipamentoForm.disable();
    const id = this.equipamentoId();
    if (id) this.loadEquipamento(id);
  }

  onCancel() {
    this.router.navigate(['/equipamentos']);
  }

  onSubmit() {
    if (this.equipamentoForm.valid) {
      this.isSubmitting.set(true);
      const payload = this.equipamentoForm.value;

      if (this.isEditMode() && this.equipamentoId()) {
        this.EquipamentoService.update(this.equipamentoId()!, payload).subscribe({
          next: () => {
            this.notification.success('Equipamento atualizado com sucesso!');
            this.router.navigate(['/equipamentos']);
          },
          error: () => this.isSubmitting.set(false)
        });
      } else {
        this.EquipamentoService.save(payload).subscribe({
          next: () => {
            this.notification.success('Equipamento cadastrado com sucesso!');
            this.router.navigate(['/equipamentos']);
          },
          error: () => this.isSubmitting.set(false)
        });
      }
    } else {
      this.equipamentoForm.markAllAsTouched();
    }
  }

  async deleteEquipamento() {
    if (this.equipamentoId()) {
      const confirmed = await this.confirmationService.confirm({
        message: 'Deseja realmente excluir este equipamento?',
        confirmClass: 'btn-danger',
        confirmLabel: 'Excluir'
      });

      if (confirmed) {
        this.EquipamentoService.delete(this.equipamentoId()!).subscribe({
          next: () => {
            this.notification.success('Equipamento excluído com sucesso!');
            this.router.navigate(['/equipamentos']);
          },
          error: () => {}
        });
      }
    }
  }

  loadTypes() {
    this.EquipamentoService.listTypes().subscribe({
      next: (res: any) => {
        const types = res && res.data ? res.data : res;
        const mapped = (types || []).map((t: any) => ({ id: t.id, name: t.nome || t.name }));
        this.equipamentoTypes.set(mapped);
      },
      error: () => {}
    });
  }

  openTypeManager() {
    this.showTypeManager.set(true);
  }

  closeTypeManager() {
    this.showTypeManager.set(false);
    this.typeModal?.reset();
  }

  saveType(event: { id?: any; name: string }) {
    const name = event.name;
    const isEditing = !!event.id;

    if (isEditing) {
      this.EquipamentoService.updateType(event.id, { id: event.id, nome: name }).subscribe({
        next: () => {
          this.loadTypes();
          this.typeModal?.reset();
          this.notification.success('Tipo de equipamento atualizado!');
        },
        error: () => {}
      });
    } else {
      this.EquipamentoService.saveType({ nome: name }).subscribe({
        next: () => {
          this.loadTypes();
          this.typeModal?.reset();
          this.notification.success('Tipo de equipamento criado!');
        },
        error: () => {}
      });
    }
  }

  async deleteType(id: any) {
    const confirmed = await this.confirmationService.confirm({
      message: 'Deseja realmente excluir este tipo de equipamento?',
      confirmClass: 'btn-danger',
      confirmLabel: 'Excluir'
    });

    if (confirmed) {
      this.EquipamentoService.deleteType(String(id)).subscribe({
        next: () => {
          this.loadTypes();
          this.notification.success('Tipo removido.');
        },
        error: () => this.notification.error('Erro ao excluir tipo.')
      });
    }
  }
}
