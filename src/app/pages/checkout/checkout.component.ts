import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable, combineLatest, map } from 'rxjs';
import { CartService } from '../../services/cart.service';
import { CartItem, AppliedDiscount } from '../../models/cart-item.model';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, AsyncPipe, ReactiveFormsModule],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.css',
})
export class CheckoutComponent implements OnInit {
  private fb          = inject(FormBuilder);
  private cartService = inject(CartService);
  private router      = inject(Router);

  items$      !: Observable<CartItem[]>;
  subtotal$   !: Observable<number>;
  discount$   !: Observable<AppliedDiscount | null>;
  shipping$   !: Observable<number>;
  discountAmt$!: Observable<number>;
  total$      !: Observable<number>;

  loading = false;

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
  }

  get f() { return this.form.controls; }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    setTimeout(() => {
      this.loading = false;
      this.router.navigate(['/pedido-confirmado']);
    }, 1500);
  }
}
