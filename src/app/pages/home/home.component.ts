import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HeroComponent } from '../../components/hero/hero.component';
import { PorDecadaComponent } from '../../components/por-decada/por-decada.component';
import { BandaHonorComponent } from '../../components/banda-honor/banda-honor.component';
import { PiezaSemanaComponent } from '../../components/pieza-semana/pieza-semana.component';
import { TiendaService } from '../../services/tienda.service';
import { Categoria } from '../../models/categoria.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, HeroComponent, PorDecadaComponent, BandaHonorComponent, PiezaSemanaComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent {
  private tiendaService = inject(TiendaService);

  readonly categorias: Categoria[] = this.tiendaService.getCategorias();
  selectedDecade: string = '';

  onDecadeChange(decade: string): void {
    this.selectedDecade = decade;
  }
}
