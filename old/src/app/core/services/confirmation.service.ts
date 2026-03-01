import { Injectable, signal } from '@angular/core';

export interface ConfirmationOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmClass?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ConfirmationService {
  private state = signal<{
    options: ConfirmationOptions;
    resolve: (value: boolean) => void;
  } | null>(null);

  public currentState = this.state.asReadonly();

  confirm(options: ConfirmationOptions | string): Promise<boolean> {
    const finalOptions: ConfirmationOptions =
      typeof options === 'string' ? { message: options } : options;

    return new Promise((resolve) => {
      this.state.set({ options: finalOptions, resolve });
    });
  }

  handleAction(value: boolean) {
    const current = this.state();
    if (current) {
      current.resolve(value);
      this.state.set(null);
    }
  }
}
