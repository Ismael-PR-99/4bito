import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable, combineLatest, map } from 'rxjs';
import { CartService } from '../../services/cart.service';
import { CheckoutService } from '../../services/checkout.service';
import { CartItem, AppliedDiscount } from '../../models/cart-item.model';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, AsyncPipe, ReactiveFormsModule],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutComponent implements OnInit {
  private fb              = inject(FormBuilder);
  private cartService     = inject(CartService);
  private checkoutService = inject(CheckoutService);
  private router          = inject(Router);

  items$      !: Observable<CartItem[]>;
  subtotal$   !: Observable<number>;
  discount$   !: Observable<AppliedDiscount | null>;
  shipping$   !: Observable<number>;
  discountAmt$!: Observable<number>;
  total$      !: Observable<number>;

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

    // Prellenar si ya hay datos guardados
    const saved = this.checkoutService.shippingData;
    if (saved) { this.form.patchValue(saved); }
  }

  get f() { return this.form.controls; }

  continuar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.checkoutService.shippingData = this.form.value as any;
    this.router.navigate(['/checkout/pago']);
  }
}
