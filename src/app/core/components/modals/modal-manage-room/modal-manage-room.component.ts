import { Component, Input, Output, EventEmitter, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  FormsModule,
} from '@angular/forms';
import { SchoolDataService, SchoolRoom } from '../../../../core/services/school-data';
import { AmbienteService } from '../../../../core/services/ambiente.service';
import { TranslationService } from '../../../../core/services/translation.service';
import { MatIconModule } from '@angular/material/icon';
import { ConfirmationService } from '../../../../core/services/confirmation.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ModalManageListComponent } from '../modal-manage-list/modal-manage-list.component';

@Component({
  selector: 'app-modal-manage-room',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatIconModule,
    ModalManageListComponent,
  ],
  templateUrl: './modal-manage-room.component.html',
  styleUrls: ['./modal-manage-room.component.scss'],
})
export class ModalManageRoomComponent implements OnInit {
  @Input() isOpen: boolean = false;
  @Output() close = new EventEmitter<void>();
  @Output() onSaved = new EventEmitter<string>(); // Emits ID of saved room

  private fb = inject(FormBuilder);
  public schoolData = inject(SchoolDataService);
  private ambienteService = inject(AmbienteService);
  private confirmation = inject(ConfirmationService);
  private notification = inject(NotificationService);
  public translation = inject(TranslationService);
  t = this.translation.dictionary;

  viewMode = signal<'list' | 'edit'>('list');
  roomForm: FormGroup;
  editingRoomId = signal<string | null>(null);
  saveAttempted = signal(false);
  isSubmitting = signal(false);

  // Modal State for Inner Managers (Type, Block, Resource)
  showTypeManager = signal(false);
  showBlockManager = signal(false);
  showResourceManager = signal(false);

  constructor() {
    this.roomForm = this.fb.group({
      name: ['', Validators.required],
      typeId: ['', Validators.required],
      block: ['', Validators.required],
      capacity: [30, [Validators.required, Validators.min(1)]],
      resources: [[]],
    });
  }

  ngOnInit() {
    this.loadTypes();
    this.loadBlocks();
    this.loadResources();
  }

  loadTypes() {
    this.ambienteService.listTypes().subscribe((res: any) => {
      const types = res && res.data ? res.data : res;
      this.schoolData.roomTypes.set(types);
    });
  }

  loadBlocks() {
    this.ambienteService.listBlocks().subscribe((res: any) => {
      const blocks = res && res.data ? res.data : res;
      this.schoolData.schoolBlocks.set(blocks);
    });
  }

  loadResources() {
    this.ambienteService.listResources().subscribe((res: any) => {
      const resources = res && res.data ? res.data : res;
      this.schoolData.schoolResources.set(resources.map((r: any) => ({ id: r.id, name: r.name })));
    });
  }

  closeModal() {
    this.close.emit();
    this.reset();
  }

  reset() {
    this.viewMode.set('list');
    this.editingRoomId.set(null);
    this.roomForm.reset({ capacity: 30, resources: [] });
    this.saveAttempted.set(false);
  }

  startNew() {
    this.reset();
    this.viewMode.set('edit');
  }

  startEdit(room: SchoolRoom) {
    this.editingRoomId.set(room.id);
    this.roomForm.patchValue({
      name: room.name,
      typeId: room.typeId,
      block: room.block,
      capacity: room.capacity,
      resources: room.resources || [],
    });
    this.viewMode.set('edit');
  }

  toggleResource(res: string) {
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

  async saveRoom() {
    this.saveAttempted.set(true);
    if (this.roomForm.invalid) {
      return;
    }

    this.isSubmitting.set(true);
    const formValue = this.roomForm.value;
    const payload = {
      ...formValue,
      id: this.editingRoomId() || '00000000-0000-0000-0000-000000000000',
    };

    this.ambienteService.save(payload).subscribe({
      next: (res: any) => {
        const savedRoom = res && res.data ? res.data : res;
        this.schoolData.loadRooms(); // Refresh the signal
        this.onSaved.emit(savedRoom.id);
        this.notification.success('Ambiente salvo com sucesso!');
        this.viewMode.set('list');
        this.isSubmitting.set(false);
      },
      error: () => {
        this.notification.error('Erro ao salvar ambiente.');
        this.isSubmitting.set(false);
      },
    });
  }

  async deleteRoom(id: string) {
    const confirmed = await this.confirmation.confirm({
      message: 'Tem certeza que deseja excluir este ambiente?',
      confirmClass: 'btn-danger',
      confirmLabel: 'Excluir',
    });

    if (confirmed) {
      this.ambienteService.delete(id).subscribe({
        next: () => {
          this.notification.success('Ambiente excluído.');
          this.schoolData.loadRooms();
        },
        error: (err) => {
          let errorMessage = 'Erro ao excluir ambiente.';
          if (err.error) {
            if (typeof err.error === 'string') errorMessage = err.error;
            else if (err.error.message) errorMessage = err.error.message;
            else if (err.error.errors) {
              const firstKey = Object.keys(err.error.errors)[0];
              if (firstKey && err.error.errors[firstKey].length > 0) {
                errorMessage = err.error.errors[firstKey][0];
              }
            }
          }
          this.notification.error(errorMessage);
        },
      });
    }
  }

  // Inner Manager Logic (Simplified for brevity)
  openTypeManager() {
    this.showTypeManager.set(true);
  }
  closeTypeManager() {
    this.showTypeManager.set(false);
  }
  saveType(event: any) {
    this.ambienteService.saveType({ name: event.name }).subscribe(() => {
      this.loadTypes();
      this.closeTypeManager();
    });
  }

  openBlockManager() {
    this.showBlockManager.set(true);
  }
  closeBlockManager() {
    this.showBlockManager.set(false);
  }
  saveBlock(event: any) {
    this.ambienteService.saveBlock({ name: event.name }).subscribe(() => {
      this.loadBlocks();
      this.closeBlockManager();
    });
  }

  openResourceManager() {
    this.showResourceManager.set(true);
  }
  closeResourceManager() {
    this.showResourceManager.set(false);
  }
  saveResource(event: any) {
    this.ambienteService.saveResource({ name: event.name }).subscribe(() => {
      this.loadResources();
      this.closeResourceManager();
    });
  }
}
