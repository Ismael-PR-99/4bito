import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HeroComponent } from '../../components/hero/hero.component';
import { VitrinaComponent } from '../../components/vitrina/vitrina.component';
import { PorDecadaComponent } from '../../components/por-decada/por-decada.component';
import { BandaHonorComponent } from '../../components/banda-honor/banda-honor.component';
import { RetroProduct } from '../../models/product.model';
import { MOCK_PRODUCTS, VITRINA_PRODUCT } from '../../data/products.data';
import { TiendaService } from '../../services/tienda.service';
import { Categoria } from '../../models/categoria.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, HeroComponent, VitrinaComponent, PorDecadaComponent, BandaHonorComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent {
  private router = inject(Router);
  private tiendaService = inject(TiendaService);

  readonly vitrinaProduct: RetroProduct = VITRINA_PRODUCT;
  readonly allProducts: RetroProduct[] = MOCK_PRODUCTS;

  carritoItems: RetroProduct[] = [];

  readonly categorias: Categoria[] = this.tiendaService.getCategorias();

  irACategoria(slug: string): void {
    this.router.navigate(['/categoria', slug]);
  }

  onDecadeChange(decade: string): void {
    console.log('Década seleccionada:', decade);
  }

  onAddToCart(product: RetroProduct): void {
    this.carritoItems.push(product);
    console.log('Añadido al carrito:', product.name);
  }

  onViewProduct(product: RetroProduct): void {
    console.log('Ver producto:', product.name);
  }
}
