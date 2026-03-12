import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CompareService } from '../../services/compare.service';
import { ProductoApi } from '../../services/productos.service';

@Component({
  selector: 'app-compare-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './compare-bar.component.html',
  styleUrl: './compare-bar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompareBarComponent {
  compareService = inject(CompareService);
  private router = inject(Router);

  get items(): ProductoApi[] {
    return this.compareService.items();
  }

  remove(id: number): void {
    this.compareService.remove(id);
  }

  comparar(): void {
    this.router.navigate(['/comparar']);
  }

  limpiar(): void {
    this.compareService.clear();
  }
}
