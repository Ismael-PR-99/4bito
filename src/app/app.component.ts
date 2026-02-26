import { Component, ViewEncapsulation, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { LucideAngularModule, ShoppingCart, User, LUCIDE_ICONS, LucideIconProvider } from 'lucide-angular';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, LucideAngularModule],
  providers: [
    { provide: LUCIDE_ICONS, multi: true, useValue: new LucideIconProvider({ ShoppingCart, User }) }
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  encapsulation: ViewEncapsulation.None
})
export class AppComponent {
  title = '4BITO RETRO SPORTS';
  carritoCount = 0;

  private auth = inject(AuthService);
  private router = inject(Router);

  get loggedIn(): boolean { return this.auth.isLoggedIn(); }
  get esAdmin(): boolean { return this.auth.isAdmin(); }
  get usuario() { return this.auth.getUsuario(); }
  get nombreCorto(): string {
    return this.usuario?.nombre?.split(' ')[0] ?? 'MI CUENTA';
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/']);
  }
}

