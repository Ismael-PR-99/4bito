import { Injectable } from '@angular/core';

export interface ShippingData {
  nombre:    string;
  apellidos: string;
  email:     string;
  telefono:  string;
  direccion: string;
  ciudad:    string;
  cp:        string;
  pais:      string;
}

@Injectable({ providedIn: 'root' })
export class CheckoutService {
  private _shippingData: ShippingData | null = null;

  set shippingData(data: ShippingData) {
    this._shippingData = data;
  }

  get shippingData(): ShippingData | null {
    return this._shippingData;
  }

  hasShippingData(): boolean {
    return this._shippingData !== null;
  }

  clear(): void {
    this._shippingData = null;
  }
}
