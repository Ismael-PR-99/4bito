import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-pedido-confirmado',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pedido-confirmado.component.html',
  styleUrl: './pedido-confirmado.component.css',
})
export class PedidoConfirmadoComponent implements OnInit {
  private cartService = inject(CartService);
  private router      = inject(Router);

  numeroPedido = '';

  ngOnInit(): void {
    this.numeroPedido = '#4B-' + Math.floor(100000 + Math.random() * 900000);
    this.cartService.clearCart();
  }

  volverTienda(): void {
    this.router.navigate(['/']);
  }
}
