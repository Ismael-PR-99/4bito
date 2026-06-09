import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuthService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    http    = TestBed.inject(HttpTestingController);
    localStorage.clear();
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('isLoggedIn()', () => {
    it('returns false when no token and no localStorage', () => {
      expect(service.isLoggedIn()).toBeFalse();
    });

    it('returns true when usuario is in localStorage', () => {
      localStorage.setItem('usuario', JSON.stringify({ id: 1, nombre: 'Test', email: 't@t.com', rol: 'cliente' }));
      expect(service.isLoggedIn()).toBeTrue();
    });
  });

  describe('isAdmin()', () => {
    it('returns false when no usuario', () => {
      expect(service.isAdmin()).toBeFalse();
    });

    it('returns false for cliente rol', () => {
      localStorage.setItem('usuario', JSON.stringify({ id: 1, nombre: 'T', email: 't@t.com', rol: 'cliente' }));
      expect(service.isAdmin()).toBeFalse();
    });

    it('returns true for admin rol', () => {
      localStorage.setItem('usuario', JSON.stringify({ id: 1, nombre: 'Admin', email: 'a@t.com', rol: 'admin' }));
      expect(service.isAdmin()).toBeTrue();
    });
  });

  describe('getUsuario()', () => {
    it('returns null when localStorage is empty', () => {
      expect(service.getUsuario()).toBeNull();
    });

    it('returns null for corrupt JSON', () => {
      localStorage.setItem('usuario', '{not-json}');
      expect(service.getUsuario()).toBeNull();
    });

    it('returns parsed usuario', () => {
      const u = { id: 5, nombre: 'Ana', email: 'ana@t.com', rol: 'cliente' };
      localStorage.setItem('usuario', JSON.stringify(u));
      expect(service.getUsuario()).toEqual(u);
    });
  });

  describe('login()', () => {
    it('stores token and usuario on success', () => {
      const u = { id: 1, nombre: 'Test', email: 't@t.com', rol: 'cliente' };
      service.login('t@t.com', 'pass').subscribe(res => {
        expect(res.token).toBe('fake-token');
        expect(service.getToken()).toBe('fake-token');
        expect(service.getUsuario()).toEqual(u);
      });

      const req = http.expectOne(r => r.url.includes('/auth/login'));
      expect(req.request.method).toBe('POST');
      req.flush({ success: true, data: { token: 'fake-token', usuario: u } });
    });
  });

  describe('logout()', () => {
    it('clears token and localStorage', () => {
      localStorage.setItem('usuario', JSON.stringify({ id: 1, nombre: 'T', email: 't@t.com', rol: 'cliente' }));

      service.logout();

      expect(service.getToken()).toBeNull();
      expect(localStorage.getItem('usuario')).toBeNull();

      http.expectOne(r => r.url.includes('/auth/logout')).flush({});
    });
  });
});
