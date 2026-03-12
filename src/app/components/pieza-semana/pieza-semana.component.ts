import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  inject,
  signal,
  computed,
  ElementRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription, skip } from 'rxjs';
import { DiscountService, PiezaSemana } from '../../services/discount.service';

export interface CountdownParts {
  days: string;
  hours: string;
  mins: string;
  secs: string;
  urgent: boolean;
}

@Component({
  selector: 'app-pieza-semana',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pieza-semana.component.html',
  styleUrl: './pieza-semana.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PiezaSemanaComponent implements OnInit, AfterViewInit, OnDestroy {
  private discount = inject(DiscountService);
  private router   = inject(Router);
  private el       = inject(ElementRef);
  private sub?: Subscription;
  private timerRef: any;
  private observer?: IntersectionObserver;

  pieza    = signal<PiezaSemana | null>(null);
  cargando = signal<boolean>(true);
  private loaded = false;

  // ── Reveal state ──────────────────────────────────────
  bgVisible   = signal(false);
  cardVisible = signal(false);
  titleVisible = signal(false);
  lineVisible  = signal(false);
  imgFlash     = signal(false);
  imgVisible   = signal(false);
  private revealed = false;

  // ── Price count-up ────────────────────────────────────
  displayPrice = signal(0);

  // ── Countdown ─────────────────────────────────────────
  countdown = signal<CountdownParts>({ days: '00', hours: '00', mins: '00', secs: '00', urgent: false });

  readonly badgePercent = computed(() => {
    const p = this.pieza();
    if (!p) return 0;
    return Math.round((1 - p.finalPrice / p.originalPrice) * 100);
  });

  readonly titleChars = computed(() =>
    'PIEZA DE LA SEMANA'.split('').map((c, i) => ({ char: c, i }))
  );

  ngOnInit(): void {
    this.sub = this.discount.pieza$.pipe(skip(1)).subscribe(p => {
      this.pieza.set(p);
      this.cargando.set(false);
      this.loaded = true;
      if (p && this.revealed) this.startAnimations(p);
    });

    this.discount.cargarPieza().subscribe({
      next: p => {
        if (!this.loaded) {
          this.pieza.set(p);
          this.cargando.set(false);
          this.loaded = true;
          if (p && this.revealed) this.startAnimations(p);
        }
      },
      error: () => { if (!this.loaded) this.cargando.set(false); },
    });
  }

  ngAfterViewInit(): void {
    this.observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && !this.revealed) {
          this.revealed = true;
          const p = this.pieza();
          if (p) this.startAnimations(p);
        }
      },
      { threshold: 0.12 }
    );
    this.observer.observe(this.el.nativeElement);
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    clearInterval(this.timerRef);
    this.observer?.disconnect();
  }

  // ── Secuencia de animaciones ───────────────────────────
  private startAnimations(p: PiezaSemana): void {
    this.bgVisible.set(true);
    setTimeout(() => this.cardVisible.set(true), 200);
    setTimeout(() => this.titleVisible.set(true), 400);
    setTimeout(() => this.lineVisible.set(true), 900);
    setTimeout(() => {
      this.imgFlash.set(true);
      setTimeout(() => { this.imgFlash.set(false); this.imgVisible.set(true); }, 120);
    }, 350);
    setTimeout(() => this.animatePrice(p.finalPrice), 750);
    this.startCountdown(p.validUntil);
  }

  private animatePrice(target: number): void {
    const duration = 1200;
    const start    = performance.now();
    const easeOutExpo = (t: number) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    const tick = (now: number) => {
      const elapsed  = Math.min(now - start, duration);
      const progress = easeOutExpo(elapsed / duration);
      this.displayPrice.set(Math.round(progress * target * 100) / 100);
      if (elapsed < duration) requestAnimationFrame(tick);
      else this.displayPrice.set(target);
    };
    requestAnimationFrame(tick);
  }

  private startCountdown(validUntil: string): void {
    clearInterval(this.timerRef);
    const update = () => {
      const diff = new Date(validUntil).getTime() - Date.now();
      if (diff <= 0) {
        this.countdown.set({ days: '00', hours: '00', mins: '00', secs: '00', urgent: false });
        clearInterval(this.timerRef);
        return;
      }
      const days  = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const mins  = Math.floor((diff % 3600000) / 60000);
      const secs  = Math.floor((diff % 60000) / 1000);
      this.countdown.set({
        days:  String(days).padStart(2, '0'),
        hours: String(hours).padStart(2, '0'),
        mins:  String(mins).padStart(2, '0'),
        secs:  String(secs).padStart(2, '0'),
        urgent: diff < 86400000,
      });
    };
    update();
    this.timerRef = setInterval(update, 1000);
  }

  verProducto(): void {
    const p = this.pieza();
    if (p) this.router.navigate(['/producto', p.productId]);
  }
}
