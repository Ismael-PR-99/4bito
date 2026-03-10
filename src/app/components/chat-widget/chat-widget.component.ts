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
    if (this.chatSvc.isOpen() && !this.botGreeted) {
      this.botGreeted = true;
      setTimeout(() => {
        if (this.chatSvc.messages().length === 0) {
          const welcome = this.botSvc.getWelcomeMessage();
          this.chatSvc.addLocalMessage(welcome, 'bot');
        }
      }, 800);
    }
  }

  send() {
    const msg = this.newMessage.trim();
    if (!msg) return;
    this.newMessage = '';
    this.chatSvc.addLocalMessage(msg, 'user');
    this.shouldScroll = true;

    // Bot response
    setTimeout(() => {
      const botReply = this.botSvc.getResponse(msg);
      if (botReply) {
        this.chatSvc.addLocalMessage(botReply, 'bot');
      } else {
        this.chatSvc.addLocalMessage('No estoy seguro de cómo ayudarte con eso. ¿Puedes reformular tu pregunta?', 'bot');
      }
      this.shouldScroll = true;
    }, 800);
  }

  ngAfterViewChecked() {
    if (this.shouldScroll && this.messagesContainer) {
      const el = this.messagesContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
      this.shouldScroll = false;
    }
  }

  sendQuick(text: string) {
    this.newMessage = text;
    this.send();
  }

  formatTime(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }
}
