import { Injectable } from '@angular/core';
import { Categoria } from '../models/categoria.model';

@Injectable({ providedIn: 'root' })
export class TiendaService {

  private categorias: Categoria[] = [
    { id: '1', slug: 'retro-selecciones', nombre: 'Retro Selecciones', imageUrl: 'images/retro_selecciones.jpg' },
    { id: '2', slug: 'retro-serie-a',     nombre: 'Retro Serie A',     imageUrl: 'images/retro_serie_A.jpg' },
    { id: '3', slug: 'retro-cuadros',     nombre: 'Retro Cuadros',     imageUrl: 'images/retro_cuadros.jpg' },
    { id: '4', slug: 'retro-chaquetas',   nombre: 'Retro Chaquetas',   imageUrl: 'images/retro_chaquetas.jpg' },
    { id: '5', slug: 'retro-7',           nombre: 'Retro 7',           imageUrl: 'images/retro7.jpg' },
    { id: '6', slug: 'retro-porteros',    nombre: 'Retro Porteros',    imageUrl: 'images/retro_porteros.jpg' },
    { id: '7', slug: 'retro-objetos',     nombre: 'Retro Objetos',     imageUrl: 'images/retro_objetos.jpg' },
    { id: '8', slug: 'san-valentin',      nombre: 'San Valentín Retro',imageUrl: 'images/retro_San_Valentin.jpg' },
  ];

  getCategorias(): Categoria[] {
    return this.categorias;
  }

  getCategoriaBySlug(slug: string): Categoria | undefined {
    return this.categorias.find(c => c.slug === slug);
  }
}
