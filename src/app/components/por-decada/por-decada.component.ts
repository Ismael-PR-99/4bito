import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  computed,
} from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { RetroProduct } from '../../models/product.model';

type Decade = '70s' | '80s' | '90s' | '00s';

@Component({
  selector: 'app-por-decada',
  standalone: true,
  imports: [CommonModule, CurrencyPipe],
  templateUrl: './por-decada.component.html',
  styleUrl: './por-decada.component.css',
})
export class PorDecadaComponent {
  @Input() products: RetroProduct[] = [];

  readonly decades: Decade[] = ['70s', '80s', '90s', '00s'];
  readonly activeDecade = signal<Decade>('90s');

  readonly filteredProducts = computed(() =>
    this.products.filter((p) => p.decade === this.activeDecade())
  );

  setDecade(d: Decade): void {
    this.activeDecade.set(d);
  }
}
