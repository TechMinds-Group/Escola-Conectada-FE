import { Component, computed, inject, signal, effect, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  SchoolDataService,
  SchoolRoom,
  SchoolRoomType,
  SchoolBlock,
} from '../../../core/services/school-data';
import { AmbienteService } from '../../../core/services/ambiente.service';
import { TranslationService } from '../../../core/services/translation.service';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ConfirmationService } from '../../../core/services/confirmation.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ButtonDeleteComponent } from '../../../core/components/buttons/button-delete';
import { ButtonEditComponent } from '../../../core/components/buttons/button-edit';
import { ButtonSaveComponent } from '../../../core/components/buttons/button-save';
import { ButtonCancelComponent } from '../../../core/components/buttons/button-cancel';
import { ModalManageListComponent } from '../../../core/components/modals/modal-manage-list/modal-manage-list.component';
import { TextInputComponent } from '../../../core/components/text-input/text-input.component';
import { SelectComponent } from '../../../core/components/select/select.component';

@Component({
  selector: 'app-cadastro-ambiente',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatMenuModule,
    MatButtonModule,
    MatIconModule,
    ButtonDeleteComponent,
    ButtonEditComponent,
    ButtonSaveComponent,
    ButtonCancelComponent,
    ModalManageListComponent,
    TextInputComponent,
    SelectComponent,
  ],
  templateUrl: './cadastro-ambiente.html',
  styleUrl: './cadastro-ambiente.scss',
})
export class CadastroAmbiente {
  private fb = inject(FormBuilder);
  public schoolData = inject(SchoolDataService);
  private ambienteService = inject(AmbienteService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  public translation = inject(TranslationService);
  private confirmationService = inject(ConfirmationService);
  private notificationService = inject(NotificationService);
  t = this.translation.dictionary;

  // Modal State Control (Open/Close only, inner state handled by component)
  @ViewChild('typeModal') typeModal!: ModalManageListComponent;
  @ViewChild('blockModal') blockModal!: ModalManageListComponent;
  @ViewChild('resourceModal') resourceModal!: ModalManageListComponent;

  showTypeManager = signal(false);
  showBlockManager = signal(false);
  isResourceManagerOpen = signal(false);

  roomForm: FormGroup;
  isEditMode = signal(false);
  isViewMode = signal(false);
  classId = signal<string | null>(null);
  saveAttempted = signal(false);
  isSubmitting = signal(false);

  // Available Resources for Selection
  availableResources = [
    'Ar-condicionado',
    'Projetor',
    'Quadro Branco',
    'Computadores',
    'Ventilador',
    'Pias de Laboratório',
    'Arquibancada',
    'Sistema de Som',
  ];

  constructor() {
    this.roomForm = this.fb.group({
      name: ['', [Validators.required, this.duplicateNameValidator()]],
      typeId: ['', Validators.required],
      block: ['', Validators.required],
      capacity: [30, [Validators.required, Validators.min(1)]],
      resources: [[]], // Array of strings
    });
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');

    // Load data from API
    this.loadTypes();
    this.loadBlocks();
    this.loadRooms();
    this.loadResources();

    if (id) {
      this.isEditMode.set(true);
      this.isViewMode.set(true);
      this.classId.set(id);
      this.loadRoom(id);
      this.roomForm.disable();
    }
  }

  enableEdit() {
    this.isViewMode.set(false);
    this.roomForm.enable();
  }

  cancelEdit() {
    this.isViewMode.set(true);
    this.roomForm.disable();
    // Recarrega os dados originais do ambiente para descartar alterações
    const id = this.classId();
    if (id) this.loadRoom(id);
    this.saveAttempted.set(false);
  }

  onCancel() {
    this.router.navigate(['/ambientes']);
  }

  loadRooms() {
    this.ambienteService.list().subscribe({
      next: (res: any) => {
        const rooms = res && res.data ? res.data : res;
        this.schoolData.schoolRooms.set(rooms);
      },
      error: (err) => console.error('Erro ao carregar ambientes:', err),
    });
  }

  duplicateNameValidator() {
    return (control: any) => {
      if (!control.value) return null;

      const rooms = this.schoolData.schoolRooms();
      const currentName = control.value.trim().toLowerCase();
      const currentId = this.classId();

      const exists = rooms.some(
        (room) => room.name.trim().toLowerCase() === currentName && room.id !== currentId,
      );

      return exists ? { duplicateName: true } : null;
    };
  }

  loadTypes() {
    this.ambienteService.listTypes().subscribe({
      next: (res: any) => {
        const types = res && res.data ? res.data : res;
        this.schoolData.roomTypes.set(types);
      },
      error: (err) => console.error('Erro ao carregar tipos de sala:', err),
    });
  }

  loadBlocks() {
    this.ambienteService.listBlocks().subscribe({
      next: (res: any) => {
        const blocks = res && res.data ? res.data : res;
        this.schoolData.schoolBlocks.set(blocks);
      },
      error: (err) => console.error('Erro ao carregar blocos:', err),
    });
  }

  loadRoom(id: string) {
    this.ambienteService.getById(id).subscribe({
      next: (res: any) => {
        const room = res && res.data ? res.data : res;
        if (room) {
          this.roomForm.patchValue({
            name: room.name,
            typeId: room.typeId,
            block: room.block,
            capacity: room.capacity,
            resources: room.resources,
          });
        }
      },
      error: (err) => console.error('Erro ao carregar sala:', err),
    });
  }

  toggleResource(res: string) {
    if (this.roomForm.disabled) return;
    const current = this.roomForm.get('resources')?.value as string[];
    if (current.includes(res)) {
      this.roomForm.patchValue({ resources: current.filter((r) => r !== res) });
    } else {
      this.roomForm.patchValue({ resources: [...current, res] });
    }
  }

  isResourceSelected(res: string): boolean {
    return (this.roomForm.get('resources')?.value as string[])?.includes(res);
  }

  onSubmit() {
    this.saveAttempted.set(true);
    if (this.roomForm.valid) {
      this.isSubmitting.set(true);
      const formValue = this.roomForm.value;
      const payload = {
        id: this.classId() || '00000000-0000-0000-0000-000000000000',
        name: formValue.name,
        capacity: formValue.capacity,
        block: formValue.block,
        typeId: formValue.typeId,
        resources: formValue.resources,
      };

      if (this.isEditMode() && this.classId()) {
        this.ambienteService.update(this.classId()!, payload).subscribe({
          next: () => {
            this.notificationService.success('Ambiente atualizado com sucesso!');
            this.router.navigate(['/ambientes']);
          },
          error: (err) => {
            console.error('Erro ao atualizar ambiente:', err);
            this.isSubmitting.set(false);
          },
        });
      } else {
        this.ambienteService.save(payload).subscribe({
          next: () => {
            this.notificationService.success('Ambiente cadastrado com sucesso!');
            this.router.navigate(['/ambientes']);
          },
          error: (err) => {
            console.error('Erro ao cadastrar ambiente:', err);
            this.isSubmitting.set(false);
          },
        });
      }
    } else {
      this.roomForm.markAllAsTouched();
    }
  }

  async deleteRoom() {
    if (this.classId()) {
      const confirmed = await this.confirmationService.confirm({
        message: this.t().admin.rooms.deleteConfirm,
        confirmClass: 'btn-danger',
        confirmLabel: 'Excluir',
      });

      if (confirmed) {
        this.ambienteService.delete(this.classId()!).subscribe({
          next: () => {
            this.notificationService.success('Ambiente excluído com sucesso!');
            this.router.navigate(['/ambientes']);
          },
          error: (err) => console.error('Erro ao excluir ambiente:', err),
        });
      }
    }
  }

  // Premium Modal Methods
  openRoomTypeManager() {
    this.showTypeManager.set(true);
  }

  closeRoomTypeManager() {
    this.showTypeManager.set(false);
    this.typeModal?.reset();
  }

  saveType(event: { id?: any; name: string }) {
    const name = event.name;
    const isEditing = !!event.id;

    // Local validation for duplicates
    const exists = this.schoolData
      .roomTypes()
      .some((t) => t.name.trim().toLowerCase() === name.toLowerCase() && t.id !== event.id);
    if (exists) {
      this.notificationService.error('Já existe um tipo de sala com este nome.');
      return;
    }

    if (isEditing) {
      this.ambienteService.updateType(event.id, { id: event.id, name: name }).subscribe({
        next: () => {
          this.loadTypes();
          this.typeModal?.reset();
          this.notificationService.success('Tipo de ambiente atualizado!');
        },
        error: (err) => {
          console.error('Erro ao atualizar tipo:', err);
        },
      });
    } else {
      this.ambienteService.saveType({ name: name }).subscribe({
        next: () => {
          this.loadTypes();
          this.typeModal?.reset();
          this.notificationService.success('Tipo de ambiente criado!');
        },
        error: (err) => {
          console.error('Erro ao salvar tipo:', err);
        },
      });
    }
  }

  async deleteType(id: any) {
    const confirmed = await this.confirmationService.confirm({
      message: this.t().admin.rooms.form.typeManagement.deleteConfirm,
      confirmClass: 'btn-danger',
      confirmLabel: 'Excluir',
    });

    if (confirmed) {
      this.ambienteService.deleteType(String(id)).subscribe({
        next: () => {
          this.loadTypes();
          this.notificationService.success('Tipo removido.');
        },
        error: (err) => {
          console.error('Erro ao excluir tipo:', err);
          this.notificationService.error(this.extractErrorMessage(err, 'Erro ao excluir tipo.'));
        },
      });
    }
  }

  // Block Modal Methods
  openBlockManager() {
    this.showBlockManager.set(true);
  }

  closeBlockManager() {
    this.showBlockManager.set(false);
    this.blockModal?.reset();
  }

  saveBlock(event: { id?: any; name: string }) {
    const name = event.name;
    const isEditing = !!event.id;

    // Local validation for duplicates
    const exists = this.schoolData
      .schoolBlocks()
      .some((b) => b.name.trim().toLowerCase() === name.toLowerCase() && b.id !== event.id);
    if (exists) {
      this.notificationService.error('Já existe um bloco com este nome.');
      return;
    }

    if (isEditing) {
      this.ambienteService.updateBlock(event.id, { id: event.id, name: name }).subscribe({
        next: () => {
          this.loadBlocks();
          this.blockModal?.reset();
          this.notificationService.success('Bloco atualizado!');
        },
        error: (err) => {
          console.error('Erro ao atualizar bloco:', err);
        },
      });
    } else {
      this.ambienteService.saveBlock({ name: name }).subscribe({
        next: () => {
          this.loadBlocks();
          this.blockModal?.reset();
          this.notificationService.success('Bloco criado!');
        },
        error: (err) => {
          console.error('Erro ao salvar bloco:', err);
        },
      });
    }
  }

  async deleteBlock(id: any) {
    const confirmed = await this.confirmationService.confirm({
      message: this.t().admin.rooms.form.blockManagement.deleteConfirm,
      confirmClass: 'btn-danger',
      confirmLabel: 'Excluir',
    });

    if (confirmed) {
      this.ambienteService.deleteBlock(String(id)).subscribe({
        next: () => {
          this.loadBlocks();
          this.notificationService.success('Bloco removido.');
        },
        error: (err) => {
          console.error('Erro ao excluir bloco:', err);
          this.notificationService.error(this.extractErrorMessage(err, 'Erro ao excluir bloco.'));
        },
      });
    }
  }

  // Resource Management Methods
  openResourceManager() {
    this.isResourceManagerOpen.set(true);
    this.resourceModal?.reset();
  }

  closeResourceManager() {
    this.isResourceManagerOpen.set(false);
    this.resourceModal?.reset();
  }

  saveResource(event: { id?: any; name: string }) {
    const name = event.name;
    const isEditing = !!event.id;

    // Local validation for duplicates
    const exists = this.schoolData
      .schoolResources()
      .some((r) => r.name.trim().toLowerCase() === name.toLowerCase() && r.id !== event.id);
    if (exists) {
      this.notificationService.error('Já existe um recurso com este nome.');
      return;
    }

    if (isEditing) {
      this.ambienteService.updateResource(event.id, { id: event.id, name: name }).subscribe({
        next: () => {
          this.loadResources();
          this.resourceModal?.reset();
          this.notificationService.success('Recurso atualizado!');
        },
        error: (err) => {
          console.error('Erro ao atualizar recurso:', err);
        },
      });
    } else {
      this.ambienteService.saveResource({ name: name }).subscribe({
        next: () => {
          this.loadResources();
          this.resourceModal?.reset();
          this.notificationService.success('Recurso criado!');
        },
        error: (err) => {
          console.error('Erro ao salvar recurso:', err);
        },
      });
    }
  }

  async deleteResource(id: string) {
    const confirmed = await this.confirmationService.confirm({
      message: this.t().admin.rooms.form.resourceManagement.deleteConfirm,
      confirmClass: 'btn-danger',
      confirmLabel: 'Excluir',
    });

    if (confirmed) {
      this.ambienteService.deleteResource(id).subscribe({
        next: () => {
          this.loadResources();
          this.notificationService.success('Recurso removido.');
        },
        error: (err) => {
          console.error('Erro ao excluir recurso:', err);
          this.notificationService.error(this.extractErrorMessage(err, 'Erro ao excluir recurso.'));
        },
      });
    }
  }

  private loadResources() {
    this.ambienteService.listResources().subscribe((res: any) => {
      const resources = res && res.data ? res.data : res;
      this.schoolData.schoolResources.set(resources.map((r: any) => ({ id: r.id, name: r.name })));
    });
  }

  getResourceLabel(res: string): string {
    const dynamic = this.schoolData.schoolResources().find((r) => r.name === res);
    if (dynamic) return dynamic.name;

    const resources = this.t().admin.rooms.form.resources as Record<string, string>;
    return resources[res] || res;
  }

  private extractErrorMessage(err: any, fallback: string): string {
    if (!err) return fallback;
    if (typeof err.error === 'string') return err.error;
    if (err.error?.errors && Array.isArray(err.error.errors) && err.error.errors.length > 0) {
      return err.error.errors[0];
    }
    if (err.error?.title) return err.error.title;
    if (err.error?.message) return err.error.message;
    if (err.error?.error) return err.error.error;
    if (err.message) return err.message;

    return fallback;
  }

  // Dropdown options
  typeOptions = computed(() => {
    return this.schoolData.roomTypes().map((t) => ({ value: t.id, label: t.name }));
  });

  blockOptions = computed(() => {
    return this.schoolData.schoolBlocks().map((b) => ({ value: b.name, label: b.name }));
  });
}
