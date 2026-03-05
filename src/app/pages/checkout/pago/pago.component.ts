import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Observable, combineLatest, map, Subscription } from 'rxjs';
import { NgxPayPalModule, IPayPalConfig, ICreateOrderRequest } from 'ngx-paypal';
import { CartService } from '../../../services/cart.service';
import { CheckoutService } from '../../../services/checkout.service';
import { ToastService } from '../../../services/toast.service';
import { CartItem, AppliedDiscount } from '../../../models/cart-item.model';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-pago',
  standalone: true,
  imports: [CommonModule, AsyncPipe, ReactiveFormsModule, NgxPayPalModule, RouterLink],
  templateUrl: './pago.component.html',
  styleUrl: './pago.component.css',
})
export class PagoComponent implements OnInit, OnDestroy {
  private fb              = inject(FormBuilder);
  private cartService     = inject(CartService);
  private checkoutService = inject(CheckoutService);
  private toastService    = inject(ToastService);
  private router          = inject(Router);
  private subs: Subscription[] = [];

  items$      !: Observable<CartItem[]>;
  subtotal$   !: Observable<number>;
  discount$   !: Observable<AppliedDiscount | null>;
  shipping$   !: Observable<number>;
  discountAmt$!: Observable<number>;
  total$      !: Observable<number>;

  private currentTotal = 0;
  private currentItems: CartItem[] = [];

  selectedMethod: 'paypal' | 'card' = 'paypal';
  paymentStatus: 'idle' | 'processing' | 'success' | 'error' = 'idle';
  paypalConfig!: IPayPalConfig;

  get shipping() { return this.checkoutService.shippingData; }

  cardForm = this.fb.group({
    numero:   ['', [Validators.required, Validators.pattern(/^[\d\s]{19}$/)]],
    titular:  ['', [Validators.required, Validators.minLength(3)]],
    expiry:   ['', [Validators.required, Validators.pattern(/^(0[1-9]|1[0-2])\/\d{2}$/)]],
    cvv:      ['', [Validators.required, Validators.pattern(/^\d{3,4}$/)]],
  });

  get cf() { return this.cardForm.controls; }

  ngOnInit(): void {
    // Redirigir si no hay datos de envío
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
      this.total$.subscribe(t => { this.currentTotal = t; this.buildPaypalConfig(); }),
      this.items$.subscribe(i => { this.currentItems = i; })
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  private buildPaypalConfig(): void {
    this.paypalConfig = {
      currency: 'EUR',
      clientId: environment.paypalClientId,
      createOrderOnClient: () => ({
        intent: 'CAPTURE',
        purchase_units: [{
          description: '4BITO Retro Sports — Pedido',
          amount: {
            currency_code: 'EUR',
            value: this.currentTotal.toFixed(2),
            breakdown: {
              item_total: { currency_code: 'EUR', value: this.currentTotal.toFixed(2) }
            }
          },
          items: this.currentItems.map(item => ({
            name: item.nombre,
            quantity: item.cantidad.toString(),
            unit_amount: { currency_code: 'EUR', value: item.precio.toFixed(2) },
            category: 'PHYSICAL_GOODS'
          }))
        }]
      } as ICreateOrderRequest),
      advanced: { commit: 'true' },
      style: { label: 'pay', layout: 'vertical', color: 'gold', shape: 'rect' },
      onApprove: (_data, actions) => {
        this.paymentStatus = 'processing';
        actions.order.get().then(() => {});
      },
      onClientAuthorization: (data) => {
        this.paymentStatus = 'success';
        this.cartService.clearCart();
        this.checkoutService.clear();
        this.router.navigate(['/pedido-confirmado'], { queryParams: { orderId: data.id } });
      },
      onCancel: () => {
        this.toastService.show('PAGO CANCELADO — Puedes intentarlo de nuevo', 'warning');
      },
      onError: () => {
        this.paymentStatus = 'error';
        this.toastService.show('ERROR EN EL PAGO — Inténtalo de nuevo', 'error');
      }
    };
  }

  formatCardNumber(event: Event): void {
    const input = event.target as HTMLInputElement;
    let val = input.value.replace(/\D/g, '').slice(0, 16);
    val = val.replace(/(.{4})/g, '$1 ').trim();
    input.value = val;
    this.cardForm.get('numero')?.setValue(val, { emitEvent: false });
  }

  pagarConTarjeta(): void {
    if (this.cardForm.invalid) {
      this.cardForm.markAllAsTouched();
      return;
    }
    this.paymentStatus = 'processing';
    setTimeout(() => {
      this.cartService.clearCart();
      this.checkoutService.clear();
      this.router.navigate(['/pedido-confirmado'], {
        queryParams: { orderId: '#4B-' + Math.floor(100000 + Math.random() * 900000) }
      });
    }, 2000);
  }
}
