export interface CartItem {
  id: string;
  nombre: string;
  imagen: string;
  precio: number;
  precioOriginal?: number;
  talla: string;
  cantidad: number;
}

export interface DiscountCode {
  code: string;
  discount: number; // percentage
}

export interface AppliedDiscount {
  code: string;
  discount: number;
}
