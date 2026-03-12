import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable, combineLatest, map } from 'rxjs';
import { CartService } from '../../services/cart.service';
import { CartDrawerService } from '../../services/cart-drawer.service';
import { CartItem, AppliedDiscount } from '../../models/cart-item.model';

@Component({
  selector: 'app-cart-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cart-drawer.component.html',
  styleUrl: './cart-drawer.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartDrawerComponent implements OnInit {
  private cartService   = inject(CartService);
  private drawerService = inject(CartDrawerService);
  private router        = inject(Router);

  isOpen$     !: Observable<boolean>;
  items$      !: Observable<CartItem[]>;
  itemCount$  !: Observable<number>;
  subtotal$   !: Observable<number>;
  discount$   !: Observable<AppliedDiscount | null>;
  shipping$   !: Observable<number>;
  discountAmt$!: Observable<number>;
  total$      !: Observable<number>;

  discountInput = '';
  discountStatus: 'idle' | 'valid' | 'invalid' = 'idle';

  ngOnInit(): void {
    this.isOpen$    = this.drawerService.isOpen();
    this.items$     = this.cartService.getItems();
    this.itemCount$ = this.cartService.getItemCount();
    this.discount$  = this.cartService.getDiscount();

    this.subtotal$ = this.cartService.getSubtotal();

    this.shipping$ = this.subtotal$.pipe(
      map(sub => sub >= 50 ? 0 : 4.99)
    );

    this.discountAmt$ = combineLatest([this.subtotal$, this.discount$]).pipe(
      map(([sub, disc]) => disc ? (sub * disc.discount) / 100 : 0)
    );

    this.total$ = combineLatest([this.subtotal$, this.shipping$, this.discountAmt$]).pipe(
      map(([sub, ship, disc]) => Math.max(0, sub - disc + ship))
    );
  }

  close(): void { this.drawerService.close(); }

  removeItem(id: string, talla: string): void {
    this.cartService.removeItem(id, talla);
  }

  updateQty(id: string, talla: string, delta: number): void {
    this.cartService.updateQuantity(id, talla, delta);
  }

  applyCode(): void {
    if (!this.discountInput.trim()) return;
    const result = this.cartService.applyCode(this.discountInput);
    this.discountStatus = result;
  }

  removeDiscount(): void {
    this.cartService.removeDiscount();
    this.discountInput  = '';
    this.discountStatus = 'idle';
  }

  goToColeccion(): void {
    this.drawerService.close();
    this.router.navigate(['/coleccion']);
  }

  goToCheckout(): void {
    this.drawerService.close();
    this.router.navigate(['/checkout']);
  }
}
