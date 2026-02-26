export interface Producto {
  id: string;
  nombre: string;
  categoriaSlug: string;
  precio: number;
  precioOriginal?: number;
  imageUrl: string;
  tallas: string[];
  descripcion: string;
  anio: number;
  equipo: string;
}
