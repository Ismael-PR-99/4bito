import { Component, OnInit, OnDestroy, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Observable, combineLatest, map, Subscription } from 'rxjs';
import { CartService } from '../../../services/cart.service';
import { CheckoutService } from '../../../services/checkout.service';
import { ToastService } from '../../../services/toast.service';
import { CartItem, AppliedDiscount } from '../../../models/cart-item.model';
import { environment } from '../../../../environments/environment';

declare var paypal: any;

@Component({
  selector: 'app-pago',
  standalone: true,
  imports: [CommonModule, AsyncPipe, ReactiveFormsModule, RouterLink],
  templateUrl: './pago.component.html',
  styleUrl: './pago.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PagoComponent implements OnInit, OnDestroy {
  private fb              = inject(FormBuilder);
  private cartService     = inject(CartService);
  private checkoutService = inject(CheckoutService);
  private toastService    = inject(ToastService);
  private router          = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private subs: Subscription[] = [];

  items$      !: Observable<CartItem[]>;
  subtotal$   !: Observable<number>;
  discount$   !: Observable<AppliedDiscount | null>;
  shipping$   !: Observable<number>;
  discountAmt$!: Observable<number>;
  total$      !: Observable<number>;

  private currentTotal = 0;
  private paypalRendered = false;

  selectedMethod: 'paypal' | 'card' = 'paypal';
  paymentStatus: 'idle' | 'processing' | 'error' = 'idle';
  cardType: 'visa' | 'mastercard' | 'amex' | 'unknown' = 'unknown';
  focusedField: string | null = null;

  get shipping() { return this.checkoutService.shippingData; }

  cardForm = this.fb.group({
    numero:   ['', [Validators.required, Validators.pattern(/^[\d\s]{19}$/)]],
    titular:  ['', [Validators.required, Validators.minLength(3)]],
    expiry:   ['', [Validators.required, Validators.pattern(/^(0[1-9]|1[0-2])\/\d{2}$/)]],
    cvv:      ['', [Validators.required, Validators.pattern(/^\d{3,4}$/)]],
  });

  get cf() { return this.cardForm.controls; }

  ngOnInit(): void {
    if (!this.checkoutService.hasShippingData()) {
      this.router.navigate(['/checkout']);
      return;
    }

    this.items$    = this.cartService.getItems();
    this.subtotal$ = this.cartService.getSubtotal();
    this.discount$ = this.cartService.getDiscount();
    this.shipping$ = this.subtotal$.pipe(map(s => s >= 50 ? 0 : 4.99));
    this.discountAmt$ = combineLatest([this.subtotal$, this.discount$]).pipe(
      map(([sub, disc]) => disc ? (sub * disc.discount) / 100 : 0)
    );
    this.total$ = combineLatest([this.subtotal$, this.shipping$, this.discountAmt$]).pipe(
      map(([sub, ship, disc]) => Math.max(0, sub - disc + ship))
    );

    this.subs.push(
      this.total$.subscribe(t => { this.currentTotal = t; })
    );

    this.loadPaypalScript().then(() => {
      setTimeout(() => this.renderPaypalButton(), 200);
    });
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    const script = document.getElementById('paypal-sdk');
    if (script) script.remove();
    this.paypalRendered = false;
  }

  private loadPaypalScript(): Promise<void> {
    return new Promise((resolve) => {
      if (document.getElementById('paypal-sdk')) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.id = 'paypal-sdk';
      script.src = `https://www.paypal.com/sdk/js?client-id=${environment.paypalClientId}&currency=EUR`;
      script.onload = () => resolve();
      script.onerror = () => {
        this.toastService.show('Error al cargar PayPal — recarga la página', 'error');
      };
      document.body.appendChild(script);
    });
  }

  private renderPaypalButton(): void {
    if (this.paypalRendered) return;
    const container = document.getElementById('paypal-button-container');
    if (!container || typeof paypal === 'undefined') return;

    this.paypalRendered = true;
    paypal.Buttons({
      style: { layout: 'vertical', color: 'black', shape: 'rect', label: 'pay' },
      createOrder: (_data: any, actions: any) => {
        return actions.order.create({
          intent: 'CAPTURE',
          purchase_units: [{
            description: '4BITO Retro Sports',
            amount: { currency_code: 'EUR', value: this.currentTotal.toFixed(2) }
          }]
        });
      },
      onApprove: (data: any, actions: any) => {
        this.paymentStatus = 'processing';
        this.cdr.markForCheck();
        return actions.order.capture().then(() => {
          this.completarPedido(data.orderID);
        });
      },
      onCancel: () => {
        this.toastService.show('PAGO CANCELADO — Puedes intentarlo de nuevo', 'warning');
      },
      onError: (err: any) => {
        console.error('PayPal error:', err);
        this.paymentStatus = 'error';
        this.cdr.markForCheck();
        this.toastService.show('ERROR EN EL PAGO — Inténtalo de nuevo', 'error');
      }
    }).render('#paypal-button-container');
  }

  selectPaypal(): void {
    this.selectedMethod = 'paypal';
    if (!this.paypalRendered) {
      setTimeout(() => this.renderPaypalButton(), 100);
    }
  }

  detectCardType(value: string): 'visa' | 'mastercard' | 'amex' | 'unknown' {
    if (value.startsWith('4')) return 'visa';
    if (value.startsWith('5')) return 'mastercard';
    if (value.startsWith('3')) return 'amex';
    return 'unknown';
  }

  formatCardNumber(event: Event): void {
    const input = event.target as HTMLInputElement;
    let val = input.value.replace(/\D/g, '').slice(0, 16);
    val = val.replace(/(.{4})/g, '$1 ').trim();
    input.value = val;
    this.cardForm.get('numero')?.setValue(val, { emitEvent: false });
    this.cardType = this.detectCardType(val.replace(/\s/g, ''));
  }

  formatExpiry(event: Event): void {
    const input = event.target as HTMLInputElement;
    let val = input.value.replace(/\D/g, '').slice(0, 4);
    if (val.length >= 3) val = val.slice(0, 2) + '/' + val.slice(2);
    input.value = val;
    this.cardForm.get('expiry')?.setValue(val, { emitEvent: false });
  }

  pagarConTarjeta(): void {
    if (this.cardForm.invalid) {
      this.cardForm.markAllAsTouched();
      return;
    }
    this.paymentStatus = 'processing';
    this.completarPedido();
  }

  private completarPedido(paypalTxnId?: string): void {
    const ship = this.checkoutService.shippingData;
    if (!ship) return;

    let items: CartItem[] = [];
    this.subs.push(
      this.items$.subscribe(i => items = i)
    );

    const productos = items.map(item => ({
      id: Number(item.id),
      nombre: item.nombre,
      imageUrl: item.imagen,
      talla: item.talla,
      cantidad: item.cantidad,
      precio: item.precio,
    }));

    this.checkoutService.crearPedido({
      nombre: `${ship.nombre} ${ship.apellidos}`,
      email: ship.email,
      telefono: ship.telefono,
      direccion: ship.direccion,
      ciudad: ship.ciudad,
      cp: ship.cp,
      pais: ship.pais,
      productos,
      total: this.currentTotal,
      paypalTransactionId: paypalTxnId,
    }).subscribe({
      next: (res) => {
        this.cartService.clearCart();
        this.checkoutService.clear();
        this.router.navigate(['/pedido-confirmado'], {
          queryParams: { orderId: res.pedidoId }
        });
      },
      error: () => {
        this.paymentStatus = 'error';
        this.cdr.markForCheck();
        this.toastService.show('ERROR AL REGISTRAR EL PEDIDO', 'error');
      },
    });
  }
}
