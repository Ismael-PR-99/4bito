import { Injectable } from '@angular/core';

interface FaqEntry {
  keywords: string[];
  answer: string;
}

@Injectable({ providedIn: 'root' })
export class ChatbotService {
  private faqs: FaqEntry[] = [
    {
      keywords: ['devolucion', 'devolver', 'devoluciones', 'return'],
      answer: 'Puedes solicitar una devolución desde tu perfil, en la sección de pedidos. Tienes 30 días desde la entrega para hacerlo. ¿Necesitas más ayuda con esto?',
    },
    {
      keywords: ['envio', 'envío', 'shipping', 'entrega', 'cuanto tarda'],
      answer: 'Los envíos nacionales tardan 3-5 días laborables. Los internacionales entre 7-15 días. Recibirás un email con el tracking cuando se envíe tu pedido.',
    },
    {
      keywords: ['talla', 'tallas', 'size', 'medidas', 'guia de tallas'],
      answer: 'Puedes consultar nuestra guía de tallas en la página de cada producto. Si tienes dudas, te recomendamos pedir una talla más grande. También puedes guardar tus tallas preferidas en tu perfil.',
    },
    {
      keywords: ['pago', 'paypal', 'tarjeta', 'pagar', 'metodo de pago'],
      answer: 'Aceptamos pagos con PayPal. Es rápido, seguro y puedes usar tu tarjeta a través de PayPal sin necesidad de tener cuenta.',
    },
    {
      keywords: ['precio', 'descuento', 'oferta', 'promocion', 'cupon'],
      answer: 'Los descuentos se aplican automáticamente en los productos marcados. Puedes ver el precio original y el precio con descuento en cada producto.',
    },
    {
      keywords: ['pedido', 'estado', 'seguimiento', 'tracking', 'donde esta'],
      answer: 'Puedes ver el estado de tus pedidos desde tu perfil, en la pestaña "Mis Pedidos". Ahí encontrarás el tracker con el estado actual.',
    },
    {
      keywords: ['cuenta', 'registrar', 'registro', 'crear cuenta'],
      answer: 'Para crear una cuenta, haz clic en el icono de usuario en la esquina superior derecha y selecciona "Registrarse". Solo necesitas tu nombre, email y una contraseña.',
    },
    {
      keywords: ['contacto', 'telefono', 'email', 'hablar', 'agente', 'persona', 'humano'],
      answer: 'Entiendo que necesitas hablar con un agente. Estoy transfiriendo tu conversación a nuestro equipo de soporte. Un agente te responderá pronto.',
    },
    {
      keywords: ['hola', 'buenas', 'hey', 'buenos dias', 'buenas tardes'],
      answer: '¡Hola! 👋 Soy el asistente de 4BITO. ¿En qué puedo ayudarte? Puedes preguntarme sobre envíos, devoluciones, tallas, pagos o cualquier otra duda.',
    },
    {
      keywords: ['gracias', 'perfecto', 'genial', 'ok', 'vale'],
      answer: '¡De nada! Si tienes alguna otra pregunta, no dudes en escribirme. ¡Que tengas un buen día! ⚽',
    },
  ];

  getResponse(userMessage: string): string | null {
    const msg = userMessage.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    for (const faq of this.faqs) {
      for (const kw of faq.keywords) {
        const normalizedKw = kw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (msg.includes(normalizedKw)) {
          return faq.answer;
        }
      }
    }

    return null;
  }

  getWelcomeMessage(): string {
    return '¡Hola! 👋 Soy el asistente virtual de 4BITO Retro Sports. Puedo ayudarte con información sobre envíos, devoluciones, tallas, pagos y más. Si necesitas hablar con un agente, solo dímelo. ¿En qué puedo ayudarte?';
  }

  needsHumanAgent(message: string): boolean {
    const keywords = ['agente', 'persona', 'humano', 'hablar con alguien', 'soporte'];
    const msg = message.toLowerCase();
    return keywords.some(kw => msg.includes(kw));
  }
}
