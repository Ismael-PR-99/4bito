import { Directive, ElementRef, Input, OnInit, OnDestroy } from '@angular/core';

export type AnimationType = 'fadeUp' | 'fadeIn' | 'slideLeft' | 'slideRight' | 'zoomIn' | 'flipIn';

@Directive({
  selector: '[animateOnScroll]',
  standalone: true,
})
export class AnimateOnScrollDirective implements OnInit, OnDestroy {
  @Input() animateOnScroll: AnimationType = 'fadeUp';
  @Input() aosDelay: number = 0;
  @Input() aosThreshold: number = 0.15;

  private observer!: IntersectionObserver;

  private initialStates: Record<AnimationType, string> = {
    fadeUp:     'opacity:0; transform:translateY(40px)',
    fadeIn:     'opacity:0; transform:translateY(0)',
    slideLeft:  'opacity:0; transform:translateX(-40px)',
    slideRight: 'opacity:0; transform:translateX(40px)',
    zoomIn:     'opacity:0; transform:scale(0.88)',
    flipIn:     'opacity:0; transform:rotateY(80deg) scale(0.9)',
  };

  constructor(private el: ElementRef) {}

  ngOnInit(): void {
    // Respetar prefers-reduced-motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const element = this.el.nativeElement as HTMLElement;
    const styles  = this.initialStates[this.animateOnScroll].split(';');

    styles.forEach(s => {
      const [prop, val] = s.split(':');
      if (prop && val) (element.style as any)[prop.trim()] = val.trim();
    });

    element.style.transition = [
      `opacity var(--dur-slow) var(--ease-out-expo) ${this.aosDelay}ms`,
      `transform var(--dur-slow) var(--ease-spring) ${this.aosDelay}ms`,
    ].join(', ');

    element.style.willChange = 'opacity, transform';

    this.observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          element.style.opacity = '1';
          element.style.transform = 'translate(0) scale(1) rotateY(0)';
          setTimeout(() => {
            element.style.willChange = 'auto';
          }, 700);
          this.observer.unobserve(element);
        }
      },
      { threshold: this.aosThreshold, rootMargin: '0px 0px -40px 0px' }
    );

    this.observer.observe(element);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
