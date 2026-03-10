import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
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
  private route       = inject(ActivatedRoute);

  numeroPedido = '';
  isPaypalOrder = false;

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['orderId']) {
        this.numeroPedido  = '#' + params['orderId'];
        this.isPaypalOrder = true;
      } else {
        this.numeroPedido = '';
      }
    });
  }

  volverTienda(): void {
    this.router.navigate(['/']);
  }
}
