import { Component, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { LucideAngularModule, ShoppingCart, LUCIDE_ICONS, LucideIconProvider } from 'lucide-angular';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, LucideAngularModule],
  providers: [
    { provide: LUCIDE_ICONS, multi: true, useValue: new LucideIconProvider({ ShoppingCart }) }
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  encapsulation: ViewEncapsulation.None
})
export class AppComponent {
  title = '4BITO RETRO SPORTS';
  carritoCount = 0;
}

