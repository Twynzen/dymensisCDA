import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * QDT Effects Component
 * Provides VHS Surveillance visual effects:
 * - Scanlines overlay
 * - Vignette overlay
 * - Corner brackets decoration
 * - Random glitch effect
 */
@Component({
  selector: 'app-qdt-effects',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Scanlines -->
    <div class="qdt-scanlines"></div>

    <!-- Vignette -->
    <div class="qdt-vignette"></div>

    <!-- Glitch Effect (random) -->
    @if (showGlitch()) {
      <div class="qdt-glitch"></div>
    }
  `,
  styles: [`
    :host {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 9990;
    }
  `]
})
export class QdtEffectsComponent implements OnInit, OnDestroy {
  showGlitch = signal(false);

  private glitchInterval: any;

  ngOnInit(): void {
    // Random glitch effect every 3-8 seconds
    this.startGlitchEffect();
  }

  ngOnDestroy(): void {
    if (this.glitchInterval) {
      clearInterval(this.glitchInterval);
    }
  }

  private startGlitchEffect(): void {
    const randomGlitch = () => {
      // 8% chance of glitch
      if (Math.random() > 0.92) {
        this.showGlitch.set(true);
        // Glitch duration: 80-150ms
        setTimeout(() => {
          this.showGlitch.set(false);
        }, 80 + Math.random() * 70);
      }
    };

    // Check for glitch every 3 seconds
    this.glitchInterval = setInterval(randomGlitch, 3000);
  }
}
