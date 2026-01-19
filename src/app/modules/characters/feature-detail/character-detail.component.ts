import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonButton, IonIcon,
  IonContent, IonFab, IonFabButton,
  ModalController, ToastController
} from '@ionic/angular/standalone';
import { CharacterStore } from '../data-access/character.store';
import { UniverseStore } from '../../universes/data-access/universe.store';
import { StatBarComponent } from '../../../shared/ui/stat-bar/stat-bar.component';
import { StatsRadarComponent } from '../../../shared/ui/radar-chart/stats-radar.component';
import { SkillEditorModalComponent } from '../ui/skill-editor-modal.component';
import { fadeInAnimation, statChangeAnimation } from '../../../shared/animations/stat-animations';
import { CharacterSkill } from '../../../core/models';
import { SkillIconComponent, SkillIconName } from '../../../shared/ui/skill-icon/skill-icon.component';

@Component({
  selector: 'app-character-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonButton, IonIcon, IonContent, IonFab, IonFabButton, StatBarComponent, StatsRadarComponent, SkillIconComponent],
  animations: [fadeInAnimation, statChangeAnimation],
  template: `
    <ion-header class="qdt-header">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/characters" text=""></ion-back-button>
        </ion-buttons>
        <ion-title>
          <div class="header-title">
            <span class="title-prefix">●</span>
            <span class="title-text">{{ characterStore.selectedCharacter()?.name?.toUpperCase() || 'SUJETO' }}</span>
          </div>
        </ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="editCharacter()">
            <ion-icon slot="icon-only" name="create-outline"></ion-icon>
          </ion-button>
          <ion-button (click)="shareCharacter()">
            <ion-icon slot="icon-only" name="share-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="qdt-content">
      @if (characterStore.loading()) {
        <div class="loading-container">
          <div class="loading-spinner"></div>
          <span class="loading-text">CARGANDO DATOS...</span>
        </div>
      } @else if (character()) {
        <!-- Character Header Panel -->
        <div class="character-header-panel">
          <div class="panel-corner top-left"></div>
          <div class="panel-corner top-right"></div>
          <div class="panel-corner bottom-left"></div>
          <div class="panel-corner bottom-right"></div>

          <div class="header-content">
            <div class="avatar-container">
              @if (character()!.avatar?.photoUrl) {
                <img [src]="character()!.avatar?.photoUrl" class="avatar" alt="Avatar">
              } @else {
                <div class="avatar-placeholder">
                  <ion-icon name="person-outline"></ion-icon>
                </div>
              }
              <div class="avatar-scanline"></div>
              @if (universeHasAwakening()) {
                <div class="awakening-badge" [class]="'rank-' + character()!.progression.awakening">
                  {{ character()!.progression.awakening }}
                </div>
              }
            </div>

            <div class="character-info">
              <div class="info-row">
                <span class="info-label">ID</span>
                <span class="info-value">{{ (character()!.id?.slice(0, 8) || '').toUpperCase() }}</span>
              </div>
              <h1 class="character-name">{{ character()!.name }}</h1>
              @if (universeHasAwakening()) {
                <div class="level-row">
                  <span class="level-label">NIVEL</span>
                  <span class="level-value">{{ character()!.progression.level }}</span>
                </div>
              }
              @if (character()!.progression.title) {
                <div class="title-row">{{ character()!.progression.title }}</div>
              }
            </div>

            <div class="status-indicator">
              <div class="status-dot active"></div>
              <span class="status-text">ACTIVO</span>
            </div>
          </div>
        </div>

        <!-- Character Description -->
        @if (character()!.description) {
          <div class="description-panel">
            <div class="description-header">
              <span class="desc-icon">▸</span>
              <span class="desc-label">DESCRIPCIÓN</span>
            </div>
            <p class="description-text">{{ character()!.description }}</p>
          </div>
        }

        <!-- View Mode Tabs -->
        <div class="view-tabs">
          <button
            class="tab-btn"
            [class.active]="viewMode() === 'stats'"
            (click)="viewMode.set('stats')"
          >
            <span class="tab-icon">◈</span>
            <span class="tab-label">STATS</span>
          </button>
          <button
            class="tab-btn"
            [class.active]="viewMode() === 'radar'"
            (click)="viewMode.set('radar')"
          >
            <span class="tab-icon">◇</span>
            <span class="tab-label">RADAR</span>
          </button>
          <button
            class="tab-btn"
            [class.active]="viewMode() === 'skills'"
            (click)="viewMode.set('skills')"
          >
            <span class="tab-icon">⚡</span>
            <span class="tab-label">HABILIDADES</span>
          </button>
          <button
            class="tab-btn"
            [class.active]="viewMode() === 'history'"
            (click)="viewMode.set('history')"
          >
            <span class="tab-icon">◷</span>
            <span class="tab-label">HISTORIAL</span>
          </button>
        </div>

        @switch (viewMode()) {
          @case ('stats') {
            <div class="stats-section" @fadeIn>
              <div class="total-stats-panel">
                <span class="total-label">PODER TOTAL</span>
                <span class="total-value">{{ characterStore.totalStats() }}</span>
              </div>

              <div class="stats-list">
                @for (stat of sortedStats(); track stat.key) {
                  <app-stat-bar
                    [statName]="getStatName(stat.key)"
                    [statAbbreviation]="getStatAbbreviation(stat.key)"
                    [statIcon]="getStatIcon(stat.key)"
                    [statValue]="stat.value"
                    [statMaxValue]="getStatMax(stat.key)"
                    [statColor]="getStatColor(stat.key)"
                  ></app-stat-bar>
                }
              </div>
            </div>
          }
          @case ('radar') {
            <div class="radar-section" @fadeIn>
              <app-stats-radar
                [stats]="character()!.stats"
                [labels]="statLabels()"
                [maxValue]="200"
                [chartSize]="300"
              ></app-stats-radar>
            </div>
          }
          @case ('skills') {
            <div class="skills-section" @fadeIn>
              @if (characterStore.selectedCharacterSkills().length === 0) {
                <div class="empty-section">
                  <div class="empty-icon-box">
                    <ion-icon name="flash-outline"></ion-icon>
                  </div>
                  <p class="empty-text">SIN HABILIDADES REGISTRADAS</p>
                  <button class="qdt-button" (click)="addSkill()">
                    <ion-icon name="add"></ion-icon>
                    <span>AÑADIR HABILIDAD</span>
                  </button>
                </div>
              } @else {
                <div class="skills-list">
                  @for (skill of characterStore.selectedCharacterSkills(); track skill.id) {
                    <div class="skill-card" (click)="viewSkill(skill)">
                      <div class="skill-corner tl"></div>
                      <div class="skill-corner tr"></div>
                      <div class="skill-corner bl"></div>
                      <div class="skill-corner br"></div>

                      <div class="skill-header">
                        <div class="skill-icon">
                          <app-skill-icon [icon]="$any(skill.icon) || 'sparkle'" [size]="28"></app-skill-icon>
                        </div>
                        <div class="skill-titles">
                          <h3 class="skill-name">{{ skill.name }}</h3>
                          @if (skill.subtitle) {
                            <span class="skill-subtitle">"{{ skill.subtitle }}"</span>
                          }
                        </div>
                        <span class="skill-category" [attr.data-category]="skill.category">
                          {{ skill.category }}
                        </span>
                      </div>

                      @if (skill.quote) {
                        <p class="skill-quote">"{{ skill.quote }}"</p>
                      }

                      <p class="skill-description">
                        {{ skill.description.length > 150 ? (skill.description | slice:0:150) + '...' : skill.description }}
                      </p>

                      @if (skill.effects && skill.effects.length > 0) {
                        <div class="skill-effects">
                          @for (effect of skill.effects.slice(0, 2); track $index) {
                            @if (effect.description) {
                              <span class="effect-badge">
                                <ion-icon name="checkmark-circle"></ion-icon>
                                {{ effect.description.length > 50 ? (effect.description | slice:0:50) + '...' : effect.description }}
                              </span>
                            }
                          }
                          @if (skill.effects.length > 2) {
                            <span class="more-effects">+{{ skill.effects.length - 2 }} más</span>
                          }
                        </div>
                      }

                      @if (skill.limitations && skill.limitations.length > 0) {
                        <div class="skill-limitations">
                          <ion-icon name="warning"></ion-icon>
                          <span>{{ skill.limitations.length }} limitación{{ skill.limitations.length > 1 ? 'es' : '' }}</span>
                        </div>
                      }
                    </div>
                  }
                </div>

                <button class="qdt-button full-width" (click)="addSkill()">
                  <ion-icon name="add"></ion-icon>
                  <span>AÑADIR HABILIDAD</span>
                </button>
              }
            </div>
          }
          @case ('history') {
            <div class="history-section" @fadeIn>
              @if (characterStore.selectedCharacterHistory().length === 0) {
                <div class="empty-section">
                  <div class="empty-icon-box">
                    <ion-icon name="time-outline"></ion-icon>
                  </div>
                  <p class="empty-text">SIN HISTORIAL DE ACCIONES</p>
                </div>
              } @else {
                <div class="history-list">
                  @for (entry of characterStore.selectedCharacterHistory(); track entry.id) {
                    <div class="history-item">
                      <div class="history-marker"></div>
                      <div class="history-content">
                        <div class="history-header">
                          <span class="history-action">{{ entry.action }}</span>
                          <span class="history-time">{{ entry.timestamp | date:'short' }}</span>
                        </div>
                        <div class="history-changes">
                          @for (change of entry.appliedChanges; track change.stat) {
                            <span class="change-badge" [class.positive]="change.change > 0" [class.negative]="change.change < 0">
                              {{ change.stat }}: {{ change.change > 0 ? '+' : '' }}{{ change.change }}
                            </span>
                          }
                        </div>
                        @if (entry.appliedChanges[0]?.reason) {
                          <p class="change-reason">{{ entry.appliedChanges[0].reason }}</p>
                        }
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          }
        }

        <!-- FAB Button -->
        <ion-fab slot="fixed" vertical="bottom" horizontal="end">
          <ion-fab-button (click)="analyzeAction()" class="qdt-fab">
            <ion-icon name="sparkles-outline"></ion-icon>
          </ion-fab-button>
        </ion-fab>
      }
    </ion-content>
  `,
  styles: [`
    .qdt-header ion-toolbar {
      --background: var(--qdt-bg-primary);
      --border-color: var(--qdt-border-subtle);
      --color: var(--qdt-text-primary);
    }

    .header-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-family: var(--qdt-font-mono);
      font-size: 12px;
      letter-spacing: 0.1em;
    }

    .title-prefix {
      color: var(--qdt-accent-green);
      animation: qdt-pulse 2s ease-in-out infinite;
    }

    .title-text {
      color: var(--qdt-text-primary);
      font-weight: 500;
    }

    .qdt-content {
      --background: var(--qdt-bg-primary);
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 50vh;
      gap: 16px;
    }

    .loading-spinner {
      width: 32px;
      height: 32px;
      border: 2px solid var(--qdt-border-subtle);
      border-top-color: var(--qdt-accent-amber);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    .loading-text {
      font-family: var(--qdt-font-mono);
      font-size: 10px;
      letter-spacing: 0.2em;
      color: var(--qdt-text-muted);
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @keyframes qdt-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }

    /* Character Header Panel */
    .character-header-panel {
      position: relative;
      background: var(--qdt-bg-secondary);
      border: 1px solid var(--qdt-border-subtle);
      margin: 16px;
      padding: 20px;
    }

    .panel-corner {
      position: absolute;
      width: 16px;
      height: 16px;
      border-color: var(--qdt-text-subtle);
      border-style: solid;
      border-width: 0;
    }

    .panel-corner.top-left { top: 4px; left: 4px; border-top-width: 1px; border-left-width: 1px; }
    .panel-corner.top-right { top: 4px; right: 4px; border-top-width: 1px; border-right-width: 1px; }
    .panel-corner.bottom-left { bottom: 4px; left: 4px; border-bottom-width: 1px; border-left-width: 1px; }
    .panel-corner.bottom-right { bottom: 4px; right: 4px; border-bottom-width: 1px; border-right-width: 1px; }

    .header-content {
      display: flex;
      align-items: flex-start;
      gap: 16px;
    }

    .avatar-container {
      position: relative;
      flex-shrink: 0;
    }

    .avatar {
      width: 80px;
      height: 80px;
      object-fit: cover;
      border: 1px solid var(--qdt-border-default);
      filter: grayscale(20%) contrast(1.1);
    }

    .avatar-placeholder {
      width: 80px;
      height: 80px;
      background: var(--qdt-bg-tertiary);
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid var(--qdt-border-default);
    }

    .avatar-placeholder ion-icon {
      font-size: 36px;
      color: var(--qdt-text-subtle);
    }

    .avatar-scanline {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: repeating-linear-gradient(
        0deg,
        transparent,
        transparent 2px,
        rgba(0, 0, 0, 0.1) 2px,
        rgba(0, 0, 0, 0.1) 4px
      );
      pointer-events: none;
    }

    .awakening-badge {
      position: absolute;
      bottom: -6px;
      right: -6px;
      width: 26px;
      height: 26px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: var(--qdt-font-mono);
      font-size: 10px;
      font-weight: 700;
      background: var(--qdt-bg-tertiary);
      border: 1px solid var(--qdt-border-default);
    }

    .rank-E { background: #52525b; color: #a1a1aa; }
    .rank-D { background: #365314; color: #84cc16; }
    .rank-C { background: #164e63; color: #22d3ee; }
    .rank-B { background: #581c87; color: #a855f7; }
    .rank-A { background: #7c2d12; color: #fb923c; }
    .rank-S, .rank-SS, .rank-SSS { background: #78350f; color: #fbbf24; }

    .character-info {
      flex: 1;
    }

    .info-row {
      display: flex;
      gap: 8px;
      margin-bottom: 4px;
    }

    .info-label {
      font-family: var(--qdt-font-mono);
      font-size: 9px;
      letter-spacing: 0.1em;
      color: var(--qdt-text-subtle);
    }

    .info-value {
      font-family: var(--qdt-font-mono);
      font-size: 9px;
      letter-spacing: 0.05em;
      color: var(--qdt-text-muted);
    }

    .character-name {
      font-family: var(--qdt-font-mono);
      font-size: 18px;
      font-weight: 500;
      letter-spacing: 0.05em;
      color: var(--qdt-text-primary);
      margin: 0 0 8px 0;
      text-transform: uppercase;
    }

    .level-row {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 4px;
    }

    .level-label {
      font-family: var(--qdt-font-mono);
      font-size: 9px;
      letter-spacing: 0.15em;
      color: var(--qdt-text-subtle);
    }

    .level-value {
      font-family: var(--qdt-font-mono);
      font-size: 14px;
      font-weight: 600;
      color: var(--qdt-accent-amber);
    }

    .title-row {
      font-family: var(--qdt-font-mono);
      font-size: 10px;
      font-style: italic;
      color: var(--qdt-text-muted);
    }

    .status-indicator {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--qdt-text-subtle);
    }

    .status-dot.active {
      background: var(--qdt-accent-green);
      animation: qdt-pulse 2s ease-in-out infinite;
    }

    .status-text {
      font-family: var(--qdt-font-mono);
      font-size: 8px;
      letter-spacing: 0.1em;
      color: var(--qdt-text-subtle);
    }

    /* Description Panel */
    .description-panel {
      margin: 0 16px 16px;
      padding: 12px 16px;
      background: var(--qdt-bg-secondary);
      border: 1px solid var(--qdt-border-subtle);
    }

    .description-header {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 8px;
    }

    .desc-icon {
      color: var(--qdt-text-subtle);
      font-size: 10px;
    }

    .desc-label {
      font-family: var(--qdt-font-mono);
      font-size: 9px;
      letter-spacing: 0.15em;
      color: var(--qdt-text-subtle);
    }

    .description-text {
      font-family: var(--qdt-font-mono);
      font-size: 11px;
      line-height: 1.6;
      color: var(--qdt-text-muted);
      margin: 0;
    }

    /* View Tabs */
    .view-tabs {
      display: flex;
      margin: 0 16px 16px;
      border: 1px solid var(--qdt-border-subtle);
      background: var(--qdt-bg-secondary);
    }

    .tab-btn {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 12px 8px;
      background: transparent;
      border: none;
      border-right: 1px solid var(--qdt-border-subtle);
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .tab-btn:last-child {
      border-right: none;
    }

    .tab-btn .tab-icon {
      font-size: 12px;
      color: var(--qdt-text-subtle);
    }

    .tab-btn .tab-label {
      font-family: var(--qdt-font-mono);
      font-size: 9px;
      letter-spacing: 0.1em;
      color: var(--qdt-text-muted);
    }

    .tab-btn:hover {
      background: var(--qdt-bg-tertiary);
    }

    .tab-btn.active {
      background: var(--qdt-bg-tertiary);
      border-bottom: 2px solid var(--qdt-accent-amber);
    }

    .tab-btn.active .tab-icon,
    .tab-btn.active .tab-label {
      color: var(--qdt-text-primary);
    }

    /* Stats Section */
    .stats-section {
      padding: 0 16px 16px;
    }

    .total-stats-panel {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      background: var(--qdt-bg-secondary);
      border: 1px solid var(--qdt-border-subtle);
      margin-bottom: 16px;
    }

    .total-label {
      font-family: var(--qdt-font-mono);
      font-size: 10px;
      letter-spacing: 0.15em;
      color: var(--qdt-text-subtle);
    }

    .total-value {
      font-family: var(--qdt-font-mono);
      font-size: 24px;
      font-weight: 600;
      color: var(--qdt-accent-amber);
      font-variant-numeric: tabular-nums;
    }

    .stats-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    /* Radar Section */
    .radar-section {
      display: flex;
      justify-content: center;
      padding: 20px 16px;
    }

    /* Empty Section */
    .empty-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      text-align: center;
    }

    .empty-icon-box {
      width: 64px;
      height: 64px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid var(--qdt-border-subtle);
      margin-bottom: 16px;
    }

    .empty-icon-box ion-icon {
      font-size: 28px;
      color: var(--qdt-text-subtle);
    }

    .empty-text {
      font-family: var(--qdt-font-mono);
      font-size: 10px;
      letter-spacing: 0.15em;
      color: var(--qdt-text-muted);
      margin: 0 0 16px 0;
    }

    .qdt-button {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px 24px;
      font-family: var(--qdt-font-mono);
      font-size: 10px;
      letter-spacing: 0.1em;
      font-weight: 500;
      border: 1px solid var(--qdt-border-default);
      background: var(--qdt-bg-secondary);
      color: var(--qdt-text-primary);
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .qdt-button:hover {
      background: var(--qdt-bg-tertiary);
      border-color: var(--qdt-text-subtle);
    }

    .qdt-button.full-width {
      width: calc(100% - 32px);
      margin: 16px;
    }

    .qdt-button ion-icon {
      font-size: 14px;
    }

    /* Skills Section */
    .skills-section {
      padding: 0 16px 80px;
    }

    .skills-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .skill-card {
      position: relative;
      background: var(--qdt-bg-secondary);
      border: 1px solid var(--qdt-border-subtle);
      padding: 16px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .skill-card:hover {
      border-color: var(--qdt-border-default);
      background: var(--qdt-bg-tertiary);
    }

    .skill-corner {
      position: absolute;
      width: 8px;
      height: 8px;
      border-color: var(--qdt-text-subtle);
      border-style: solid;
      border-width: 0;
      opacity: 0.5;
    }

    .skill-corner.tl { top: 4px; left: 4px; border-top-width: 1px; border-left-width: 1px; }
    .skill-corner.tr { top: 4px; right: 4px; border-top-width: 1px; border-right-width: 1px; }
    .skill-corner.bl { bottom: 4px; left: 4px; border-bottom-width: 1px; border-left-width: 1px; }
    .skill-corner.br { bottom: 4px; right: 4px; border-bottom-width: 1px; border-right-width: 1px; }

    .skill-header {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 8px;
    }

    .skill-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      background: var(--qdt-bg-tertiary);
      border: 1px solid var(--qdt-border-subtle);
      flex-shrink: 0;
    }

    .skill-titles {
      flex: 1;
    }

    .skill-name {
      font-family: var(--qdt-font-mono);
      font-size: 13px;
      font-weight: 500;
      letter-spacing: 0.05em;
      color: var(--qdt-text-primary);
      margin: 0;
      text-transform: uppercase;
    }

    .skill-subtitle {
      font-family: var(--qdt-font-mono);
      font-size: 10px;
      font-style: italic;
      color: var(--qdt-text-muted);
      display: block;
      margin-top: 2px;
    }

    .skill-category {
      font-family: var(--qdt-font-mono);
      font-size: 8px;
      letter-spacing: 0.1em;
      padding: 4px 8px;
      background: var(--qdt-bg-tertiary);
      border: 1px solid var(--qdt-border-subtle);
      color: var(--qdt-text-muted);
    }

    .skill-category[data-category="Activa"] { color: var(--qdt-accent-amber); border-color: var(--qdt-accent-amber); }
    .skill-category[data-category="Pasiva"] { color: var(--qdt-text-muted); }
    .skill-category[data-category="Magia"] { color: #a855f7; border-color: #a855f7; }
    .skill-category[data-category="Combate"] { color: var(--qdt-accent-red); border-color: var(--qdt-accent-red); }
    .skill-category[data-category="Soporte"] { color: var(--qdt-accent-green); border-color: var(--qdt-accent-green); }

    .skill-quote {
      font-family: var(--qdt-font-mono);
      font-size: 10px;
      font-style: italic;
      color: var(--qdt-text-muted);
      margin: 8px 0;
      padding-left: 12px;
      border-left: 2px solid var(--qdt-border-default);
    }

    .skill-description {
      font-family: var(--qdt-font-mono);
      font-size: 11px;
      line-height: 1.5;
      color: var(--qdt-text-secondary);
      margin: 8px 0;
    }

    .skill-effects {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 12px;
    }

    .effect-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-family: var(--qdt-font-mono);
      font-size: 9px;
      padding: 4px 8px;
      background: rgba(22, 163, 74, 0.1);
      border: 1px solid rgba(22, 163, 74, 0.3);
      color: var(--qdt-accent-green);
    }

    .effect-badge ion-icon {
      font-size: 10px;
    }

    .more-effects {
      font-family: var(--qdt-font-mono);
      font-size: 9px;
      color: var(--qdt-text-subtle);
      padding: 4px 8px;
    }

    .skill-limitations {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 8px;
      font-family: var(--qdt-font-mono);
      font-size: 10px;
      color: var(--qdt-accent-amber);
    }

    .skill-limitations ion-icon {
      font-size: 12px;
    }

    /* History Section */
    .history-section {
      padding: 0 16px 16px;
    }

    .history-list {
      display: flex;
      flex-direction: column;
      gap: 0;
    }

    .history-item {
      display: flex;
      gap: 12px;
      padding: 12px 0;
      border-bottom: 1px solid var(--qdt-border-subtle);
    }

    .history-item:last-child {
      border-bottom: none;
    }

    .history-marker {
      width: 8px;
      height: 8px;
      background: var(--qdt-border-default);
      flex-shrink: 0;
      margin-top: 4px;
    }

    .history-content {
      flex: 1;
    }

    .history-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .history-action {
      font-family: var(--qdt-font-mono);
      font-size: 11px;
      font-weight: 500;
      color: var(--qdt-text-primary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .history-time {
      font-family: var(--qdt-font-mono);
      font-size: 9px;
      color: var(--qdt-text-subtle);
      font-variant-numeric: tabular-nums;
    }

    .history-changes {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .change-badge {
      font-family: var(--qdt-font-mono);
      font-size: 9px;
      padding: 3px 6px;
      border: 1px solid var(--qdt-border-subtle);
      background: var(--qdt-bg-tertiary);
      color: var(--qdt-text-muted);
    }

    .change-badge.positive {
      color: var(--qdt-accent-green);
      border-color: rgba(22, 163, 74, 0.3);
      background: rgba(22, 163, 74, 0.1);
    }

    .change-badge.negative {
      color: var(--qdt-accent-red);
      border-color: rgba(220, 38, 38, 0.3);
      background: rgba(220, 38, 38, 0.1);
    }

    .change-reason {
      font-family: var(--qdt-font-mono);
      font-size: 10px;
      font-style: italic;
      color: var(--qdt-text-muted);
      margin: 8px 0 0 0;
    }

    /* FAB */
    .qdt-fab {
      --background: var(--qdt-bg-secondary);
      --border-radius: 0;
      border: 1px solid var(--qdt-accent-amber);
    }

    .qdt-fab ion-icon {
      color: var(--qdt-accent-amber);
    }
  `]
})
export class CharacterDetailComponent implements OnInit {
  characterStore = inject(CharacterStore);
  universeStore = inject(UniverseStore);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private modalController = inject(ModalController);
  private toastController = inject(ToastController);

  viewMode = signal<'stats' | 'radar' | 'skills' | 'history'>('stats');

  character = computed(() => this.characterStore.selectedCharacter());

  universeHasAwakening = computed(() => {
    const character = this.character();
    if (!character) return false;
    const universe = this.universeStore.allUniverses().find(u => u.id === character.universeId);
    return universe?.awakeningSystem?.enabled === true;
  });

  sortedStats = computed(() => {
    const character = this.character();
    if (!character) return [];
    return Object.entries(character.stats)
      .map(([key, value]) => ({ key, value }))
      .sort((a, b) => b.value - a.value);
  });

  statLabels = computed(() => {
    const universe = this.getUniverse();
    if (!universe) return {};
    return Object.entries(universe.statDefinitions).reduce(
      (acc, [key, def]) => {
        acc[key] = def.abbreviation;
        return acc;
      },
      {} as Record<string, string>
    );
  });

  ngOnInit(): void {
    const characterId = this.route.snapshot.paramMap.get('id');
    if (characterId) {
      this.characterStore.selectCharacter(characterId);
    }

    // Load universes if needed
    if (this.universeStore.allUniverses().length === 0) {
      this.universeStore.loadUniverses();
    }
  }

  private getUniverse() {
    const character = this.character();
    if (!character) return null;
    return this.universeStore.allUniverses().find(u => u.id === character.universeId);
  }

  getStatName(key: string): string {
    const universe = this.getUniverse();
    return universe?.statDefinitions[key]?.name ?? key;
  }

  getStatAbbreviation(key: string): string {
    const universe = this.getUniverse();
    return universe?.statDefinitions[key]?.abbreviation ?? key.substring(0, 3).toUpperCase();
  }

  getStatIcon(key: string): string {
    const universe = this.getUniverse();
    return universe?.statDefinitions[key]?.icon ?? 'stats-chart';
  }

  getStatMax(key: string): number {
    const universe = this.getUniverse();
    return universe?.statDefinitions[key]?.maxValue ?? 999;
  }

  getStatColor(key: string): string {
    const universe = this.getUniverse();
    return universe?.statDefinitions[key]?.color ?? '#4CAF50';
  }

  getCategoryColor(category: string): string {
    const colors: Record<string, string> = {
      'Pasiva': 'medium',
      'Activa': 'primary',
      'Equipo': 'tertiary',
      'Magia': 'secondary',
      'Combate': 'danger',
      'Soporte': 'success',
      'Especial': 'warning'
    };
    return colors[category] || 'medium';
  }

  editCharacter(): void {
    const character = this.character();
    if (character?.id) {
      this.router.navigate(['/tabs/characters', character.id, 'edit']);
    }
  }

  shareCharacter(): void {
    const character = this.character();
    if (character?.id) {
      this.router.navigate(['/tabs/characters', character.id, 'share']);
    }
  }

  analyzeAction(): void {
    this.router.navigate(['/tabs/ai']);
  }

  async addSkill(): Promise<void> {
    console.log('[CharacterDetail] addSkill: Opening modal');
    const modal = await this.modalController.create({
      component: SkillEditorModalComponent
    });

    await modal.present();
    const { data, role } = await modal.onDidDismiss();
    console.log('[CharacterDetail] addSkill: Modal dismissed with role:', role, 'data:', data?.name);

    if (role === 'save' && data) {
      const character = this.character();
      console.log('[CharacterDetail] addSkill: Character id:', character?.id);
      if (character?.id) {
        try {
          console.log('[CharacterDetail] addSkill: Calling store.addSkill...');
          await this.characterStore.addSkill(character.id, {
            ...data,
            level: 1,
            acquiredAt: new Date()
          } as CharacterSkill);
          console.log('[CharacterDetail] addSkill: Store updated. Skills count:', this.characterStore.selectedCharacterSkills().length);

          const toast = await this.toastController.create({
            message: 'Habilidad añadida',
            duration: 2000,
            color: 'success',
            position: 'bottom'
          });
          await toast.present();
        } catch (error) {
          console.error('[CharacterDetail] addSkill: Error:', error);
          const toast = await this.toastController.create({
            message: 'Error al añadir habilidad',
            duration: 2000,
            color: 'danger',
            position: 'bottom'
          });
          await toast.present();
        }
      }
    } else {
      console.log('[CharacterDetail] addSkill: Modal dismissed without saving');
    }
  }

  async viewSkill(skill: CharacterSkill): Promise<void> {
    const modal = await this.modalController.create({
      component: SkillEditorModalComponent,
      componentProps: {
        skill,
        isEditing: true
      }
    });

    await modal.present();
    const { data, role } = await modal.onDidDismiss();

    const character = this.character();

    if (role === 'save' && data) {
      if (character?.id && skill.id) {
        try {
          await this.characterStore.updateSkill(character.id, skill.id, data);

          const toast = await this.toastController.create({
            message: 'Habilidad actualizada',
            duration: 2000,
            color: 'success',
            position: 'bottom'
          });
          await toast.present();
        } catch (error) {
          const toast = await this.toastController.create({
            message: 'Error al actualizar habilidad',
            duration: 2000,
            color: 'danger',
            position: 'bottom'
          });
          await toast.present();
        }
      }
    } else if (role === 'delete' && data?.skillId) {
      if (character?.id) {
        try {
          await this.characterStore.deleteSkill(character.id, data.skillId);

          const toast = await this.toastController.create({
            message: 'Habilidad eliminada',
            duration: 2000,
            color: 'success',
            position: 'bottom'
          });
          await toast.present();
        } catch (error) {
          const toast = await this.toastController.create({
            message: 'Error al eliminar habilidad',
            duration: 2000,
            color: 'danger',
            position: 'bottom'
          });
          await toast.present();
        }
      }
    }
  }
}
