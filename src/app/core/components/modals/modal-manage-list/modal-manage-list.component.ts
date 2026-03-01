import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-modal-manage-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './modal-manage-list.component.html',
  styleUrls: ['./modal-manage-list.component.scss'],
})
export class ModalManageListComponent {
  @Input() isOpen: boolean = false;

  @Input() title: string = 'Gerenciar Itens';
  @Input() subtitle: string = 'Configure a lista de iten disponíveis';
  @Input() labelNew: string = 'Novo Item';
  @Input() labelEdit: string = 'Editar Item';
  @Input() inputPlaceholder: string = 'Ex: Laboratório';

  @Input() items: { id: any; name: string }[] = [];
  @Input() emptyMessage: string = 'Nenhum item cadastrado.';
  @Input() emptyIcon: string = 'bi-box-seam';

  // Opcionais para tours guiados
  @Input() tourAnchorInput?: string;
  @Input() tourAnchorSave?: string;

  @Output() close = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<{ id?: any; name: string }>();
  @Output() onDelete = new EventEmitter<any>(); // envia apenas o ID

  // Internal state
  editingItem = signal<{ id: any; name: string } | null>(null);
  newItemName = signal('');

  closeModal() {
    this.close.emit();
  }

  // Edit Workflow
  startEdit(item: { id: any; name: string }) {
    this.editingItem.set(item);
    this.newItemName.set(item.name);
  }

  cancelEdit() {
    this.editingItem.set(null);
    this.newItemName.set('');
  }

  // Exposed method via ViewChild to reset internal state gracefully after API success
  reset() {
    this.editingItem.set(null);
    this.newItemName.set('');
  }

  saveItem() {
    const name = this.newItemName().trim();
    if (!name) return;

    if (this.editingItem()) {
      this.onSave.emit({ id: this.editingItem()!.id, name });
    } else {
      this.onSave.emit({ name });
    }
  }

  deleteItem(id: any) {
    this.onDelete.emit(id);
  }
}
