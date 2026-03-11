import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
} from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { RetroProduct } from '../../models/product.model';

@Component({
  selector: 'app-vitrina',
  standalone: true,
  imports: [CommonModule, CurrencyPipe],
  templateUrl: './vitrina.component.html',
  styleUrl: './vitrina.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VitrinaComponent implements OnInit, OnDestroy {
  private cdr = inject(ChangeDetectorRef);
  @Input() product!: RetroProduct;
  @Output() addToCart = new EventEmitter<RetroProduct>();

  countdown = { hours: '00', minutes: '00', seconds: '00' };
  private interval: ReturnType<typeof setInterval> | null = null;

  get discount(): number {
    if (!this.product?.originalPrice) return 0;
    return Math.round(
      ((this.product.originalPrice - this.product.price) /
        this.product.originalPrice) *
        100
    );
  }

  ngOnInit(): void {
    this.updateCountdown();
    this.interval = setInterval(() => this.updateCountdown(), 1000);
  }

  trackBySize(_: number, size: string): string { return size; }

  ngOnDestroy(): void {
    if (this.interval) clearInterval(this.interval);
  }

  private updateCountdown(): void {
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    const diff = midnight.getTime() - now.getTime();

    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);

    this.countdown = {
      hours: String(h).padStart(2, '0'),
      minutes: String(m).padStart(2, '0'),
      seconds: String(s).padStart(2, '00'),
    };
    this.cdr.markForCheck();
  }

  onAddToCart(): void {
    this.addToCart.emit(this.product);
  }
}
