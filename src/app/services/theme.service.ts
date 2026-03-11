import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private isDark = new BehaviorSubject<boolean>(false);
  isDark$ = this.isDark.asObservable();

  constructor() {
    // Leer preferencia guardada — tema claro es el default
    const saved = localStorage.getItem('4bito_theme') as 'dark' | 'light' | null;
    const theme = saved || 'light';
    this.applyTheme(theme);
  }

  toggle() {
    const next = this.isDark.value ? 'light' : 'dark';
    this.applyTheme(next);
  }

  private applyTheme(theme: 'dark' | 'light') {
    this.isDark.next(theme === 'dark');
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('4bito_theme', theme);
  }

  isDarkMode(): boolean { return this.isDark.value; }
}
