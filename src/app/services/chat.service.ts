import { Injectable, inject, signal, OnDestroy } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from './auth.service';

export interface ChatMessage {
  id: number;
  conversation_id: number;
  sender: 'user' | 'admin' | 'bot';
  message: string;
  is_read: number;
  created_at: string;
}

export interface ChatConversation {
  id: number;
  user_id: number | null;
  session_id: string;
  user_name: string;
  subject: string;
  status: 'active' | 'waiting' | 'closed';
  admin_id: number | null;
  created_at: string;
  updated_at: string;
  unread_count?: number;
}

@Injectable({ providedIn: 'root' })
export class ChatService implements OnDestroy {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private api = 'http://localhost/4bito/4bito-api/chat';

  messages = signal<ChatMessage[]>([]);
  conversationId = signal<number | null>(null);
  sessionId = signal<string>(localStorage.getItem('chat_session') || '');
  isOpen = signal(false);
  loading = signal(false);

  // Admin
  rooms = signal<ChatConversation[]>([]);
  activeRoom = signal<number | null>(null);
  activeMessages = signal<ChatMessage[]>([]);

  private pollTimer: any = null;
  private adminPollTimer: any = null;
  private lastRealId = 0;
  private lastRealAdminId = 0;

  private headers() {
    const token = this.auth.getToken();
    return token ? new HttpHeaders({ Authorization: 'Bearer ' + token }) : new HttpHeaders();
  }

  toggle() {
    this.isOpen.update(v => !v);
    if (this.isOpen() && !this.conversationId()) {
      this.createConversation();
    }
    if (this.isOpen()) this.startPolling();
    else this.stopPolling();
  }

  createConversation(subject?: string) {
    this.loading.set(true);
    this.http.post<any>(`${this.api}/create.php`, {
      sessionId: this.sessionId(),
      subject: subject || 'Consulta general',
    }, { headers: this.headers() }).subscribe({
      next: res => {
        this.conversationId.set(res.conversationId);
        this.sessionId.set(res.sessionId);
        localStorage.setItem('chat_session', res.sessionId);
        this.lastRealId = 0;
        this.messages.set([]);
        this.loadMessages();
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  loadMessages() {
    const cid = this.conversationId();
    if (!cid) return;
    this.http.get<ChatMessage[]>(`${this.api}/messages.php`, {
      params: { conversationId: cid.toString(), after: this.lastRealId.toString() },
    }).subscribe(msgs => {
      if (msgs.length > 0) {
        this.lastRealId = Math.max(...msgs.map(m => m.id));
        this.messages.update(prev => {
          // Remove local placeholders that now exist in DB
          const incoming = new Set(msgs.map(m => `${m.sender}|${m.message}`));
          const cleaned = prev.filter(m => !(m.id > 1_000_000_000 && incoming.has(`${m.sender}|${m.message}`)));
          return [...cleaned, ...msgs];
        });
      }
    });
  }

  sendMessage(text: string, sender: 'user' | 'admin' | 'bot' = 'user') {
    const cid = sender === 'admin' ? this.activeRoom() : this.conversationId();
    if (!cid || !text.trim()) return;
    this.http.post<any>(`${this.api}/send.php`, {
      conversationId: cid,
      message: text.trim(),
      sender,
    }).subscribe(() => {
      if (sender === 'admin') this.loadAdminMessages();
      else this.loadMessages();
    });
  }

  /** Añade un mensaje localmente sin enviar al backend */
  addLocalMessage(text: string, sender: 'user' | 'bot' | 'admin') {
    const now = new Date().toISOString();
    const msg: ChatMessage = {
      id: Date.now(),
      conversation_id: this.conversationId() ?? 0,
      sender,
      message: text.trim(),
      is_read: 1,
      created_at: now,
    };
    this.messages.update(prev => [...prev, msg]);
  }

  private startPolling() {
    this.stopPolling();
    this.pollTimer = setInterval(() => this.loadMessages(), 3000);
  }

  private stopPolling() {
    if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = null; }
  }

  // Admin methods
  loadRooms(status?: string) {
    const params: any = {};
    if (status) params.status = status;
    this.http.get<ChatConversation[]>(`${this.api}/rooms.php`, { headers: this.headers(), params })
      .subscribe(data => this.rooms.set(data));
  }

  selectRoom(convId: number) {
    this.activeRoom.set(convId);
    this.activeMessages.set([]);
    this.lastRealAdminId = 0;
    this.loadAdminMessages();
    this.startAdminPolling();
  }

  loadAdminMessages() {
    const rid = this.activeRoom();
    if (!rid) return;
    this.http.get<ChatMessage[]>(`${this.api}/messages.php`, {
      params: { conversationId: rid.toString(), after: this.lastRealAdminId.toString() },
    }).subscribe(msgs => {
      if (this.lastRealAdminId === 0 && msgs.length) {
        this.lastRealAdminId = Math.max(...msgs.map(m => m.id));
        this.activeMessages.set(msgs);
      } else if (msgs.length) {
        this.lastRealAdminId = Math.max(...msgs.map(m => m.id));
        this.activeMessages.update(prev => [...prev, ...msgs]);
      }
    });
  }

  resolveConversation(convId: number) {
    this.http.post<any>(`${this.api}/resolve.php`, { conversationId: convId }, { headers: this.headers() })
      .subscribe(() => this.loadRooms());
  }

  startAdminView() {
    this.startAdminPolling();
  }

  private startAdminPolling() {
    this.stopAdminPolling();
    this.adminPollTimer = setInterval(() => {
      this.loadAdminMessages();
      this.loadRooms();
    }, 4000);
  }

  stopAdminPolling() {
    if (this.adminPollTimer) { clearInterval(this.adminPollTimer); this.adminPollTimer = null; }
  }

  close() {
    this.isOpen.set(false);
    this.stopPolling();
  }

  ngOnDestroy() {
    this.stopPolling();
    this.stopAdminPolling();
  }
}
