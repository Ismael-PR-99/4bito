import {
  Component,
  Input,
  Output,
  EventEmitter,
  computed,
  signal,
} from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { RetroProduct } from '../../models/product.model';

@Component({
  selector: 'app-banda-honor',
  standalone: true,
  imports: [CommonModule, CurrencyPipe],
  templateUrl: './banda-honor.component.html',
  styleUrl: './banda-honor.component.css',
})
export class BandaHonorComponent {
  @Input() set products(value: RetroProduct[]) {
    this._products.set(
      [...value].sort((a, b) => b.unitsSold - a.unitsSold).slice(0, 10)
    );
  }
  @Output() viewProduct = new EventEmitter<RetroProduct>();

  private readonly _products = signal<RetroProduct[]>([]);

  readonly ranked = computed(() => this._products());

  readonly maxUnitsSold = computed(() =>
    this._products().length > 0 ? this._products()[0].unitsSold : 1
  );

  barWidth(unitsSold: number): string {
    return `${(unitsSold / this.maxUnitsSold()) * 100}%`;
  }

  onView(product: RetroProduct): void {
    this.viewProduct.emit(product);
  }
}
