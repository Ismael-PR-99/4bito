import { ErrorHandler, Injectable, NgZone, inject } from '@angular/core';
import { ToastService } from '../services/toast.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private zone  = inject(NgZone);
  private toast = inject(ToastService);

  handleError(error: unknown): void {
    console.error('[unhandled]', error);
    this.zone.run(() => this.toast.show('Ocurrió un error inesperado', 'error'));
  }
}
