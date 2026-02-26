import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TiendaService } from '../../services/tienda.service';
import { Producto } from '../../models/producto.model';

@Component({
  selector: 'app-producto',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './producto.component.html',
  styleUrl: './producto.component.css',
})
export class ProductoComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private tiendaService = inject(TiendaService);

  producto: Producto | undefined;

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id') ?? '';
      this.producto = this.tiendaService.getProductoById(id);
    });
  }

  volver(): void {
    this.router.navigate(['/']);
  }
}
