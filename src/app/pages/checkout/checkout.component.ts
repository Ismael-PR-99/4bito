import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable, combineLatest, map, Subscription } from 'rxjs';
import { NgxPayPalModule, IPayPalConfig, ICreateOrderRequest } from 'ngx-paypal';
import { CartService } from '../../services/cart.service';
import { ToastService } from '../../services/toast.service';
import { CartItem, AppliedDiscount } from '../../models/cart-item.model';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, AsyncPipe, ReactiveFormsModule, NgxPayPalModule],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.css',
})
export class CheckoutComponent implements OnInit, OnDestroy {
  private fb           = inject(FormBuilder);
  private cartService  = inject(CartService);
  private toastService = inject(ToastService);
  private router       = inject(Router);
  private subs: Subscription[] = [];

  items$      !: Observable<CartItem[]>;
  subtotal$   !: Observable<number>;
  discount$   !: Observable<AppliedDiscount | null>;
  shipping$   !: Observable<number>;
  discountAmt$!: Observable<number>;
  total$      !: Observable<number>;

  // Valores síncronos para PayPal config
  private currentTotal = 0;
  private currentItems: CartItem[] = [];

  paymentStatus: 'idle' | 'processing' | 'success' | 'cancelled' | 'error' = 'idle';
  paypalConfig!: IPayPalConfig;

  form = this.fb.group({
    nombre:    ['', [Validators.required, Validators.minLength(2)]],
    apellidos: ['', [Validators.required, Validators.minLength(2)]],
    email:     ['', [Validators.required, Validators.email]],
    telefono:  ['', [Validators.required, Validators.pattern(/^\+?[0-9\s\-]{7,15}$/)]],
    direccion: ['', [Validators.required, Validators.minLength(5)]],
    ciudad:    ['', [Validators.required, Validators.minLength(2)]],
    cp:        ['', [Validators.required, Validators.pattern(/^[0-9]{4,10}$/)]],
    pais:      ['', Validators.required],
  });

  ngOnInit(): void {
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

    // Mantener valores síncronos actualizados
    this.subs.push(
      this.total$.subscribe(t => { this.currentTotal = t; this.initPaypalConfig(); }),
      this.items$.subscribe(i => { this.currentItems = i; })
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  get f() { return this.form.controls; }

  private initPaypalConfig(): void {
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
              item_total: {
                currency_code: 'EUR',
                value: this.currentTotal.toFixed(2)
              }
            }
          },
          items: this.currentItems.map(item => ({
            name: item.nombre,
            quantity: item.cantidad.toString(),
            unit_amount: {
              currency_code: 'EUR',
              value: item.precio.toFixed(2)
            },
            category: 'PHYSICAL_GOODS'
          }))
        }]
      } as ICreateOrderRequest),
      advanced: { commit: 'true' },
      style: {
        label: 'pay',
        layout: 'vertical',
        color: 'black',
        shape: 'rect'
      },
      onApprove: (_data, actions) => {
        actions.order.get().then(() => {
          this.paymentStatus = 'processing';
        });
      },
      onClientAuthorization: (data) => {
        this.paymentStatus = 'success';
        this.cartService.clearCart();
        this.router.navigate(['/pedido-confirmado'], {
          queryParams: { orderId: data.id }
        });
      },
      onCancel: () => {
        this.paymentStatus = 'cancelled';
        this.showToast('PAGO CANCELADO — Puedes intentarlo de nuevo', 'warning');
      },
      onError: () => {
        this.paymentStatus = 'error';
        this.showToast('ERROR EN EL PAGO — Inténtalo de nuevo', 'error');
      }
    };
  }

  showToast(msg: string, type: 'success' | 'warning' | 'error' = 'success'): void {
    this.toastService.show(msg, type);
  }
}
