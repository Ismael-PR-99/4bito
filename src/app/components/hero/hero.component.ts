import {
  Component,
  Output,
  EventEmitter,
  OnDestroy,
  signal,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './hero.component.html',
  styleUrl: './hero.component.css',
})
export class HeroComponent implements OnDestroy {
  private router = inject(Router);

  @Output() decadeChange = new EventEmitter<string>();

  readonly decades = ['70s', '80s', '90s', '00s'];
  readonly activeDecade = signal<string>('90s');

  readonly stats = [
    { value: '+2K', label: 'Piezas únicas' },
    { value: '50%', label: 'Descuento auto' },
    { value: '24H', label: 'Entrega mundial' },
  ];

  readonly tickerItems = [
    'Selecciones históricas',
    'Calcio Anni 80–90',
    'Objetos de culto',
    'Chaquetas de equipación',
    'Leyendas del 7',
    'El último hombre',
    'Entrega 24/48H',
    'Hasta 50% descuento',
  ];

  setDecade(decade: string): void {
    this.activeDecade.set(decade);
    this.decadeChange.emit(decade);
  }

  goToCollection(): void {
    this.router.navigate(['/coleccion']);
  }

  goToNew(): void {
    this.router.navigate(['/coleccion'], { queryParams: { new: 1 } });
  }

  ngOnDestroy(): void {}
}
