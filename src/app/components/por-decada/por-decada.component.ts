import {
  Component,
  OnInit,
  OnChanges,
  Input,
  SimpleChanges,
  inject,
  signal,
  ElementRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProductosService, ProductoApi } from '../../services/productos.service';

@Component({
  selector: 'app-por-decada',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './por-decada.component.html',
  styleUrl: './por-decada.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PorDecadaComponent implements OnInit, OnChanges {
  private productosService = inject(ProductosService);
  private el = inject(ElementRef);

  /** Década que puede venir del Hero (opcional) */
  @Input() heroDecade: string = '';

  decades           = signal<string[]>([]);
  activeDecade      = signal<string>('');
  products          = signal<ProductoApi[]>([]);
  cargandoDecadas   = signal<boolean>(true);
  cargandoProductos = signal<boolean>(false);

  ngOnInit(): void {
    this.productosService.getDecades().subscribe({
      next: list => {
        this.decades.set(list);
        this.cargandoDecadas.set(false);
        const initial = this.heroDecade && list.includes(this.heroDecade)
          ? this.heroDecade
          : list[0];
        if (initial) this.loadDecade(initial);
      },
      error: () => this.cargandoDecadas.set(false),
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    const d = changes['heroDecade']?.currentValue as string;
    if (d && d !== this.activeDecade() && this.decades().includes(d)) {
      this.loadDecade(d);
      // scroll suave hasta esta sección
      this.el.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  setDecade(decade: string): void {
    if (decade === this.activeDecade()) return;
    this.loadDecade(decade);
  }

  private loadDecade(decade: string): void {
    this.activeDecade.set(decade);
    this.cargandoProductos.set(true);
    this.productosService.getByDecade(decade).subscribe({
      next: list => {
        this.products.set(list);
        this.cargandoProductos.set(false);
      },
      error: () => {
        this.products.set([]);
        this.cargandoProductos.set(false);
      },
    });
  }
}

