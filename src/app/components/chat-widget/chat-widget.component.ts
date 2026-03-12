import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { Nl2brPipe } from '../../shared/pipes/nl2br.pipe';
import { environment } from '../../../environments/environment';

interface ChatMsg {
  id?: number;
  sender: 'user' | 'bot' | 'admin' | 'system';
  content: string;
  timestamp: Date;
  quickReplies?: string[];
}

type ChatMode = 'bot' | 'waiting_human' | 'human';

@Component({
  selector: 'app-chat-widget',
  standalone: true,
  imports: [CommonModule, FormsModule, Nl2brPipe],
  templateUrl: './chat-widget.component.html',
  styleUrl: './chat-widget.component.css',
})
export class ChatWidgetComponent implements OnInit, OnDestroy {
  @ViewChild('messagesEl') messagesEl!: ElementRef;

  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private api  = environment.apiUrl + '/chat';

  isOpen        = false;
  messages: ChatMsg[] = [];
  inputMessage  = '';
  isTyping      = false;
  mode: ChatMode = 'bot';
  conversationId: number | null = null;
  sessionId     = '';
  lastMsgId     = 0;

  private pollTimer: any;
  private waitingTimer: any;

  ngOnInit(): void {
    this.sessionId = localStorage.getItem('4bito_session') || this.newSessionId();
    localStorage.setItem('4bito_session', this.sessionId);
    this.loadState();
    const savedConv = localStorage.getItem('4bito_conv_' + this.sessionId);
    if (savedConv) {
      this.conversationId = +savedConv;
    }
  }

  ngOnDestroy(): void {
    clearInterval(this.pollTimer);
    clearTimeout(this.waitingTimer);
  }

  private newSessionId(): string {
    return 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
  }

  toggle(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      if (!this.conversationId) this.initConversation();
      else this.startPolling();
      this.scrollToBottom(150);
    } else {
      clearInterval(this.pollTimer);
    }
  }

  private initConversation(): void {
    this.http.post<any>(`${this.api}/create.php`, {
      sessionId: this.sessionId,
    }).subscribe({
      next: (res) => {
        if (res.conversationId) {
          this.conversationId = res.conversationId;
          localStorage.setItem('4bito_conv_' + this.sessionId, String(res.conversationId));
          if (res.isNew && this.messages.length === 0) {
            setTimeout(() => this.addMsg({
              sender:      'bot',
              content:     '👋 ¡Hola! Soy el asistente virtual de 4BITO Retro Sports. Puedo ayudarte con información sobre envíos, devoluciones, tallas, pagos y más. Si necesitas hablar con un agente, solo dímelo. ¿En qué puedo ayudarte?',
              timestamp:   new Date(),
              quickReplies: ['¿Cómo es el envío?', '¿Qué tallas hay?', '¿Cómo devuelvo?', '¿Cómo pago?'],
            }), 400);
          }
          this.startPolling();
        }
      },
    });
  }

  send(text?: string): void {
    const content = (text ?? this.inputMessage).trim();
    if (!content) return;
    this.inputMessage = '';

    this.addMsg({ sender: 'user', content, timestamp: new Date() });

    if (this.conversationId) {
      this.http.post<any>(`${this.api}/send.php`, {
        conversationId: this.conversationId,
        message:        content,
        sender:         'user',
      }).subscribe({
        next: (r) => {
          if (r.messageId) this.lastMsgId = Math.max(this.lastMsgId, r.messageId);
        },
      });
    }

    if (this.mode === 'bot') this.askBot(content);
  }

  private askBot(content: string): void {
    this.isTyping = true;
    this.http.post<any>(`${this.api}/bot-response.php`, {
      message:        content,
      conversationId: this.conversationId,
    }).subscribe({
      next: (res) => {
        this.isTyping = false;
        if (res.success) {
          if (res.messageId) this.lastMsgId = Math.max(this.lastMsgId, res.messageId);
          this.addMsg({
            id:          res.messageId,
            sender:      'bot',
            content:     res.response,
            timestamp:   new Date(),
            quickReplies: res.quickReplies ?? [],
          });
        }
      },
      error: () => {
        this.isTyping = false;
        this.addMsg({
          sender:      'bot',
          content:     '😕 Ha ocurrido un error. ¿Quieres hablar con un agente?',
          timestamp:   new Date(),
          quickReplies: ['Hablar con agente'],
        });
      },
    });
  }

  requestHuman(): void {
    if (!this.conversationId) return;
    this.mode = 'waiting_human';
    this.saveState();

    this.http.post<any>(`${this.api}/request-human.php`, {
      conversationId: this.conversationId,
    }).subscribe({
      next: (res) => {
        if (res.success) {
          this.addMsg({ sender: 'system', content: res.message, timestamp: new Date() });
          if (!res.inOfficeHours) {
            this.waitingTimer = setTimeout(() => this.backToBot(false), 5000);
          }
        }
      },
    });
  }

  backToBot(showMsg = true): void {
    this.mode = 'bot';
    this.saveState();
    clearTimeout(this.waitingTimer);
    if (showMsg) {
      this.addMsg({
        sender:      'bot',
        content:     '🤖 De vuelta con el asistente. ¿En qué puedo ayudarte?',
        timestamp:   new Date(),
        quickReplies: ['¿Cómo es el envío?', '¿Qué tallas hay?', '¿Cómo devuelvo?'],
      });
    }
  }

  private startPolling(): void {
    clearInterval(this.pollTimer);
    this.pollTimer = setInterval(() => this.pollNew(), 3000);
  }

  private pollNew(): void {
    if (!this.conversationId || !this.isOpen) return;
    this.http.get<any[]>(`${this.api}/messages.php`, {
      params: {
        conversationId: String(this.conversationId),
        after:          String(this.lastMsgId),
      },
    }).subscribe({
      next: (msgs) => {
        if (!msgs?.length) return;
        msgs.forEach(m => {
          this.lastMsgId = Math.max(this.lastMsgId, m.id);
          if (m.sender === 'user') return; // already shown locally
          if (this.messages.some(x => x.id === m.id)) return; // already shown

          if (m.sender === 'admin' && this.mode === 'waiting_human') {
            this.mode = 'human';
            this.saveState();
            clearTimeout(this.waitingTimer);
            this.addMsg({ sender: 'system', content: '✅ ¡Un agente se ha conectado!', timestamp: new Date() });
          }

          this.addMsg({
            id:        m.id,
            sender:    m.sender as ChatMsg['sender'],
            content:   m.message,
            timestamp: new Date(m.created_at),
          });
        });
      },
    });
  }

  private addMsg(msg: ChatMsg): void {
    this.messages.push(msg);
    this.saveState();
    this.scrollToBottom(60);
  }

  private saveState(): void {
    localStorage.setItem('4bito_msgs_' + this.sessionId, JSON.stringify(this.messages));
    localStorage.setItem('4bito_mode_' + this.sessionId, this.mode);
  }

  private loadState(): void {
    const raw  = localStorage.getItem('4bito_msgs_' + this.sessionId);
    const mode = localStorage.getItem('4bito_mode_' + this.sessionId) as ChatMode;
    if (raw) {
      try {
        this.messages = JSON.parse(raw).map((x: any) => ({ ...x, timestamp: new Date(x.timestamp) }));
        const ids = this.messages.filter(m => m.id).map(m => m.id as number);
        if (ids.length) this.lastMsgId = Math.max(...ids);
      } catch { this.messages = []; }
    }
    if (mode) this.mode = mode;
  }

  private scrollToBottom(delay = 60): void {
    setTimeout(() => {
      if (this.messagesEl?.nativeElement) {
        this.messagesEl.nativeElement.scrollTop = this.messagesEl.nativeElement.scrollHeight;
      }
    }, delay);
  }
}
