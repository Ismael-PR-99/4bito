import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from './auth.service';

export interface ReturnRequest {
  id: number;
  order_id: number;
  user_id: number;
  products_json: any[];
  reason: string;
  description: string;
  photos_json: string[];
  resolution: 'refund' | 'exchange';
  status: 'pending' | 'approved' | 'rejected' | 'processing' | 'completed';
  case_number: string;
  admin_notes: string | null;
  refund_amount: number | null;
  paypal_refund_id: string | null;
  created_at: string;
  completed_at: string | null;
  user_name?: string;
  user_email?: string;
}

@Injectable({ providedIn: 'root' })
export class ReturnsService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private api = 'http://localhost/4bito/4bito-api/returns';

  returns = signal<ReturnRequest[]>([]);
  loading = signal(false);

  private headers() {
    return new HttpHeaders({ Authorization: 'Bearer ' + this.auth.getToken() });
  }

  create(data: { orderId: number; products: any[]; reason: string; description: string; photos: string[]; resolution: string }) {
    return this.http.post<{ success: boolean; returnId: number; caseNumber: string }>(
      `${this.api}/create.php`, data, { headers: this.headers() }
    );
  }

  list(status?: string) {
    this.loading.set(true);
    const params: any = {};
    if (status) params.status = status;
    this.http.get<ReturnRequest[]>(`${this.api}/list.php`, { headers: this.headers(), params })
      .subscribe({
        next: data => { this.returns.set(data); this.loading.set(false); },
        error: () => this.loading.set(false),
      });
  }

  get(id: number) {
    return this.http.get<ReturnRequest>(`${this.api}/get.php`, { headers: this.headers(), params: { id: id.toString() } });
  }

  updateStatus(id: number, status: string, adminNotes?: string) {
    return this.http.post<{ success: boolean }>(
      `${this.api}/update.php`,
      { id, status, admin_notes: adminNotes || '' },
      { headers: this.headers() }
    );
  }
}
