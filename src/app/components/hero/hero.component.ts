import {
  Component,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  HostListener,
  signal,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './hero.component.html',
  styleUrl: './hero.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroComponent implements OnInit, OnDestroy {
  private router = inject(Router);

  // Parallax state
  private ticking   = false;
  private scrollY   = 0;
  private isMobile  = window.innerWidth < 768;
  private prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  private heroContentEl: HTMLElement | null = null;
  private heroBgEl:      HTMLElement | null = null;

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

  trackByStat(_: number, s: { value: string; label: string }): string { return s.label; }
  trackByDecade(_: number, d: string): string { return d; }
  trackByTicker(i: number, _: string): number { return i; }

  goToCollection(): void {
    this.router.navigate(['/coleccion']);
  }

  goToNew(): void {
    this.router.navigate(['/coleccion'], { queryParams: { new: 1 } });
  }

  ngOnInit(): void {
    if (this.prefersReduced || this.isMobile) return;
    this.heroContentEl = document.querySelector('.hero-content');
    this.heroBgEl      = document.querySelector('.grid-bg');
  }

  ngOnDestroy(): void {
    this.heroContentEl = null;
    this.heroBgEl      = null;
  }

  @HostListener('window:scroll')
  onScroll(): void {
    if (this.prefersReduced || this.isMobile) return;
    this.scrollY = window.scrollY;

    if (!this.ticking) {
      requestAnimationFrame(() => {
        this.updateParallax();
        this.ticking = false;
      });
      this.ticking = true;
    }
  }

  private updateParallax(): void {
    const sy = this.scrollY;

    if (this.heroBgEl) {
      this.heroBgEl.style.transform = `translateY(${sy * 0.3}px)`;
    }

    if (this.heroContentEl) {
      const opacity    = Math.max(0, 1 - sy / 600);
      const translateY = sy * 0.12;
      this.heroContentEl.style.transform = `translateY(${translateY}px)`;
      this.heroContentEl.style.opacity   = String(opacity);
    }
  }
}
