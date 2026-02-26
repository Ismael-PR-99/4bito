import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeroComponent } from '../../components/hero/hero.component';
import { VitrinaComponent } from '../../components/vitrina/vitrina.component';
import { PorDecadaComponent } from '../../components/por-decada/por-decada.component';
import { BandaHonorComponent } from '../../components/banda-honor/banda-honor.component';
import { RetroProduct } from '../../models/product.model';
import { MOCK_PRODUCTS, VITRINA_PRODUCT } from '../../data/products.data';

interface Categoria {
  id: number;
  titulo: string;
  imagen: string;
  link: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, HeroComponent, VitrinaComponent, PorDecadaComponent, BandaHonorComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent {
  readonly vitrinaProduct: RetroProduct = VITRINA_PRODUCT;
  readonly allProducts: RetroProduct[] = MOCK_PRODUCTS;

  carritoItems: RetroProduct[] = [];

  categorias: Categoria[] = [
    { id: 1, titulo: 'RETRO SELECCIONES', imagen: 'images/retro_selecciones.jpg', link: '#selecciones' },
    { id: 2, titulo: 'RETRO SERIE A', imagen: 'images/retro_serie_A.jpg', link: '#serie-a' },
    { id: 3, titulo: 'RETRO CUADROS', imagen: 'images/retro_cuadros.jpg', link: '#cuadros' },
    { id: 4, titulo: 'RETRO CHAQUETAS', imagen: 'images/retro_chaquetas.jpg', link: '#chaquetas' },
    { id: 5, titulo: 'RETRO 7', imagen: 'images/retro7.jpg', link: '#retro7' },
    { id: 6, titulo: 'RETRO PORTEROS', imagen: 'images/retro_porteros.jpg', link: '#porteros' },
    { id: 7, titulo: 'RETRO OBJETOS', imagen: 'images/retro_objetos.jpg', link: '#objetos' },
    { id: 8, titulo: 'SAN VALENTÍN RETRO', imagen: 'images/retro_San_Valentin.jpg', link: '#san-valentin' },
  ];

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
