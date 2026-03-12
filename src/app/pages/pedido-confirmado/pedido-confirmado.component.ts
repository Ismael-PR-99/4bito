import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { CartService } from '../../services/cart.service';
import { AnimateOnScrollDirective } from '../../shared/directives/animate-on-scroll.directive';

@Component({
  selector: 'app-pedido-confirmado',
  standalone: true,
  imports: [CommonModule, RouterLink, AnimateOnScrollDirective],
  templateUrl: './pedido-confirmado.component.html',
  styleUrl: './pedido-confirmado.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PedidoConfirmadoComponent implements OnInit {
  private cartService = inject(CartService);
  private router      = inject(Router);
  private route       = inject(ActivatedRoute);

  numeroPedido = '';
  isPaypalOrder = false;
  scored       = false;
  showContent  = false;

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['orderId']) {
        this.numeroPedido  = '#' + params['orderId'];
        this.isPaypalOrder = true;
      } else {
        this.numeroPedido = '';
      }
    });

    setTimeout(() => { this.scored = true; },      200);
    setTimeout(() => { this.showContent = true; }, 600);
    setTimeout(() => { this.launchConfetti(); },   400);
  }

  volverTienda(): void {
    this.router.navigate(['/']);
  }

  launchConfetti(): void {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const colors  = ['#29524A', '#94A187', '#E75A7C', '#F2F5EA', '#2C363F', '#FFFFFF'];
    const shapes  = ['square', 'circle', 'ribbon'];
    const count   = window.innerWidth < 768 ? 40 : 70;

    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const el    = document.createElement('div');
        const shape = shapes[Math.floor(Math.random() * shapes.length)];
        const color = colors[Math.floor(Math.random() * colors.length)];
        const size     = Math.random() * 10 + 6;
        const startX   = Math.random() * window.innerWidth;
        const duration = Math.random() * 2.5 + 2.5;
        const delay    = Math.random() * 0.4;
        const rotation = (Math.random() - 0.5) * 720;
        const drift    = (Math.random() - 0.5) * 250;

        el.style.cssText = `
          position: fixed;
          top: -20px;
          left: ${startX}px;
          width: ${shape === 'ribbon' ? Math.round(size / 3) : size}px;
          height: ${shape === 'ribbon' ? size * 3 : size}px;
          background: ${color};
          border-radius: ${shape === 'circle' ? '50%' : '2px'};
          z-index: 99998;
          pointer-events: none;
          animation: confettiFall ${duration}s ${delay}s cubic-bezier(0.25,0.46,0.45,0.94) forwards;
          --drift: ${drift}px;
          --rotation: ${rotation}deg;
        `;

        document.body.appendChild(el);
        setTimeout(() => el.remove(), (duration + delay + 0.5) * 1000);
      }, i * 25);
    }
  }
}

