import { Component, inject, signal, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService, ChatMessage } from '../../services/chat.service';
import { ChatbotService } from '../../services/chatbot.service';
import { LucideAngularModule, MessageCircle, X, Send } from 'lucide-angular';

@Component({
  selector: 'app-chat-widget',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './chat-widget.component.html',
  styleUrl: './chat-widget.component.css',
})
export class ChatWidgetComponent implements AfterViewChecked {
  chatSvc = inject(ChatService);
  botSvc = inject(ChatbotService);

  icons = { MessageCircle, X, Send };
  newMessage = '';
  botGreeted = false;

  @ViewChild('messagesContainer') messagesContainer!: ElementRef;
  private shouldScroll = false;

  toggle() {
    this.chatSvc.toggle();
    if (this.chatSvc.isOpen() && !this.botGreeted && this.chatSvc.messages().length === 0) {
      setTimeout(() => {
        const welcome = this.botSvc.getWelcomeMessage();
        this.chatSvc.sendMessage(welcome, 'bot');
        this.botGreeted = true;
      }, 500);
    }
  }

  send() {
    const msg = this.newMessage.trim();
    if (!msg) return;
    this.newMessage = '';
    this.chatSvc.sendMessage(msg, 'user');
    this.shouldScroll = true;

    // Bot response
    setTimeout(() => {
      const botReply = this.botSvc.getResponse(msg);
      if (botReply) {
        this.chatSvc.sendMessage(botReply, 'bot');
        this.shouldScroll = true;
      }
    }, 800);
  }

  ngAfterViewChecked() {
    if (this.shouldScroll && this.messagesContainer) {
      const el = this.messagesContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
      this.shouldScroll = false;
    }
  }

  formatTime(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }
}
