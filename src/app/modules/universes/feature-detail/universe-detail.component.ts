import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { UniverseStore } from '../data-access/universe.store';
import { Universe, StatDefinition } from '../../../core/models';

@Component({
  selector: 'app-universe-detail',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <ion-header class="qdt-header">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/universes" text=""></ion-back-button>
        </ion-buttons>
        <ion-title>
          <div class="header-title">
            <span class="title-prefix">◈</span>
            <span class="title-text">{{ universe()?.name?.toUpperCase() || 'UNIVERSO' }}</span>
          </div>
        </ion-title>
        @if (isOwner()) {
          <ion-buttons slot="end">
            <ion-button (click)="editUniverse()">
              <ion-icon slot="icon-only" name="create-outline"></ion-icon>
            </ion-button>
          </ion-buttons>
        }
      </ion-toolbar>
    </ion-header>

    <ion-content class="qdt-content">
      @if (loading()) {
        <div class="loading-container">
          <div class="loading-spinner"></div>
          <span class="loading-text">CARGANDO ARCHIVO...</span>
        </div>
      } @else if (!universe()) {
        <div class="error-container">
          <div class="error-icon-box">
            <ion-icon name="alert-circle-outline"></ion-icon>
          </div>
          <h2 class="error-title">ARCHIVO NO ENCONTRADO</h2>
          <p class="error-text">El universo que buscas no existe o no tienes acceso.</p>
          <button class="qdt-button" routerLink="/tabs/universes">
            <ion-icon name="arrow-back"></ion-icon>
            <span>VOLVER A UNIVERSOS</span>
          </button>
        </div>
      } @else {
        <!-- Header Panel -->
        <div class="header-panel">
          <div class="panel-corner tl"></div>
          <div class="panel-corner tr"></div>
          <div class="panel-corner bl"></div>
          <div class="panel-corner br"></div>

          <div class="header-content">
            @if (universe()!.coverImage) {
              <div class="header-image">
                <img [src]="universe()!.coverImage" [alt]="universe()!.name" />
                <div class="image-scanline"></div>
              </div>
            } @else {
              <div class="header-gradient" [style.background]="getGradient()">
                <ion-icon name="planet-outline" class="header-icon"></ion-icon>
              </div>
            }

            <div class="header-info">
              <div class="info-row">
                <span class="info-label">ID</span>
                <span class="info-value">{{ (universe()!.id?.slice(0, 8) || '').toUpperCase() }}</span>
              </div>
              <h1 class="universe-name">{{ universe()!.name }}</h1>
              <p class="universe-description">{{ universe()!.description || 'Sin descripción' }}</p>

              <div class="badges">
                <span class="badge" [class.public]="universe()!.isPublic">
                  <ion-icon [name]="universe()!.isPublic ? 'globe-outline' : 'lock-closed-outline'"></ion-icon>
                  <span>{{ universe()!.isPublic ? 'PÚBLICO' : 'PRIVADO' }}</span>
                </span>
                <span class="badge">
                  <ion-icon name="stats-chart-outline"></ion-icon>
                  <span>{{ statsCount() }} STATS</span>
                </span>
                @if (universe()!.raceSystem?.enabled && universe()!.raceSystem!.races.length > 0) {
                  <span class="badge success">
                    <ion-icon name="people-outline"></ion-icon>
                    <span>{{ universe()!.raceSystem!.races.length }} RAZAS</span>
                  </span>
                }
                @if (universe()!.awakeningSystem?.enabled === true) {
                  <span class="badge warning">
                    <ion-icon name="trophy-outline"></ion-icon>
                    <span>{{ universe()!.awakeningSystem!.levels.length }} RANGOS</span>
                  </span>
                }
              </div>
            </div>
          </div>
        </div>

        <!-- Stats Section -->
        <div class="section">
          <div class="section-header">
            <span class="section-icon">◇</span>
            <span class="section-label">ESTADÍSTICAS</span>
            <span class="section-count">[{{ statsCount() }}]</span>
          </div>

          <div class="stats-grid">
            @for (stat of statsList(); track stat.key) {
              <div class="stat-card" [style.--stat-color]="stat.color">
                <div class="stat-corner tl"></div>
                <div class="stat-corner tr"></div>
                <div class="stat-corner bl"></div>
                <div class="stat-corner br"></div>

                <div class="stat-header">
                  <span class="stat-abbr">{{ stat.abbreviation }}</span>
                  @if (stat.isDerived) {
                    <span class="derived-badge">DERIVADO</span>
                  }
                </div>
                <div class="stat-body">
                  <h3 class="stat-name">{{ stat.name }}</h3>
                  <div class="stat-range">
                    <span class="range-label">RANGO</span>
                    <span class="range-value">{{ stat.minValue }} — {{ stat.maxValue }}</span>
                  </div>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Progression Rules Section -->
        @if (universe()!.progressionRules.length > 0) {
          <div class="section">
            <div class="section-header">
              <span class="section-icon">▸</span>
              <span class="section-label">REGLAS DE PROGRESIÓN</span>
              <span class="section-count">[{{ universe()!.progressionRules.length }}]</span>
            </div>

            <div class="rules-list">
              @for (rule of universe()!.progressionRules; track rule.id) {
                <div class="rule-item">
                  <div class="rule-marker"></div>
                  <div class="rule-content">
                    <h3 class="rule-title">{{ rule.description }}</h3>
                    <div class="rule-meta">
                      <span class="rule-stats">STATS: {{ rule.affectedStats.join(', ') }}</span>
                      <span class="rule-max">MÁX +{{ rule.maxChangePerAction }}</span>
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>
        }

        <!-- Race System Section -->
        @if (universe()!.raceSystem?.enabled && universe()!.raceSystem!.races.length > 0) {
          <div class="section">
            <div class="section-header">
              <span class="section-icon">⬡</span>
              <span class="section-label">RAZAS DISPONIBLES</span>
              <span class="section-count">[{{ universe()!.raceSystem!.races.length }}]</span>
            </div>

            <div class="races-grid">
              @for (race of universe()!.raceSystem!.races; track race.id) {
                <div class="race-card">
                  <div class="race-corner tl"></div>
                  <div class="race-corner tr"></div>
                  <div class="race-corner bl"></div>
                  <div class="race-corner br"></div>

                  @if (race.image) {
                    <div class="race-image">
                      <img [src]="race.image" [alt]="race.name" />
                      <div class="image-scanline"></div>
                    </div>
                  } @else {
                    <div class="race-image race-placeholder">
                      <ion-icon name="person-outline"></ion-icon>
                    </div>
                  }

                  <div class="race-info">
                    <h3 class="race-name">{{ race.name }}</h3>
                    <p class="race-description">{{ race.description }}</p>

                    <div class="race-stats">
                      <span class="stats-label">STATS BASE</span>
                      <div class="stats-chips">
                        @for (stat of getBaseStatsArray(race.baseStats); track stat.key) {
                          <span class="stat-chip" [class.positive]="stat.value > 0">
                            {{ stat.key }}: {{ stat.value }}
                          </span>
                        }
                      </div>
                    </div>

                    <div class="race-free-points">
                      <ion-icon name="sparkles-outline"></ion-icon>
                      <span>{{ race.freePoints }} PUNTOS LIBRES</span>
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>
        }

        <!-- Awakening System Section -->
        @if (universe()!.awakeningSystem?.enabled === true) {
          <div class="section">
            <div class="section-header">
              <span class="section-icon">★</span>
              <span class="section-label">SISTEMA DE RANGOS</span>
            </div>

            <div class="ranks-list">
              @for (level of universe()!.awakeningSystem!.levels; track level; let i = $index) {
                <div class="rank-item">
                  <div class="rank-number">{{ i + 1 }}</div>
                  <div class="rank-info">
                    <h3 class="rank-name">{{ level }}</h3>
                    <div class="rank-threshold">
                      <span class="threshold-label">UMBRAL</span>
                      <span class="threshold-value">{{ universe()!.awakeningSystem!.thresholds[i] }} PTS</span>
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>
        }

        <!-- Action Button -->
        <div class="action-section">
          <button class="qdt-button primary full-width" (click)="createCharacter()">
            <ion-icon name="person-add-outline"></ion-icon>
            <span>CREAR PERSONAJE CON ESTE UNIVERSO</span>
          </button>
        </div>
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
      color: var(--qdt-accent-amber);
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
      height: 60vh;
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

    .error-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 60vh;
      padding: 20px;
      text-align: center;
    }

    .error-icon-box {
      width: 64px;
      height: 64px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid var(--qdt-accent-red);
      margin-bottom: 16px;
    }

    .error-icon-box ion-icon {
      font-size: 28px;
      color: var(--qdt-accent-red);
    }

    .error-title {
      font-family: var(--qdt-font-mono);
      font-size: 14px;
      letter-spacing: 0.15em;
      color: var(--qdt-text-primary);
      margin: 0 0 8px 0;
    }

    .error-text {
      font-family: var(--qdt-font-mono);
      font-size: 11px;
      color: var(--qdt-text-muted);
      margin: 0 0 24px 0;
    }

    /* Header Panel */
    .header-panel {
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

    .panel-corner.tl { top: 4px; left: 4px; border-top-width: 1px; border-left-width: 1px; }
    .panel-corner.tr { top: 4px; right: 4px; border-top-width: 1px; border-right-width: 1px; }
    .panel-corner.bl { bottom: 4px; left: 4px; border-bottom-width: 1px; border-left-width: 1px; }
    .panel-corner.br { bottom: 4px; right: 4px; border-bottom-width: 1px; border-right-width: 1px; }

    .header-content {
      display: flex;
      gap: 20px;
    }

    .header-image {
      position: relative;
      width: 100px;
      height: 100px;
      flex-shrink: 0;
    }

    .header-image img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border: 1px solid var(--qdt-border-default);
      filter: grayscale(20%) contrast(1.1);
    }

    .image-scanline {
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

    .header-gradient {
      width: 100px;
      height: 100px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .header-icon {
      font-size: 40px;
      color: var(--qdt-text-subtle);
    }

    .header-info {
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
      color: var(--qdt-text-muted);
    }

    .universe-name {
      font-family: var(--qdt-font-mono);
      font-size: 18px;
      font-weight: 500;
      letter-spacing: 0.05em;
      color: var(--qdt-text-primary);
      margin: 0 0 4px 0;
      text-transform: uppercase;
    }

    .universe-description {
      font-family: var(--qdt-font-mono);
      font-size: 11px;
      color: var(--qdt-text-muted);
      margin: 0 0 12px 0;
      line-height: 1.5;
    }

    .badges {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .badge {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      background: var(--qdt-bg-tertiary);
      border: 1px solid var(--qdt-border-subtle);
      font-family: var(--qdt-font-mono);
      font-size: 9px;
      letter-spacing: 0.1em;
      color: var(--qdt-text-muted);
    }

    .badge ion-icon {
      font-size: 10px;
    }

    .badge.public {
      border-color: var(--qdt-accent-green);
      color: var(--qdt-accent-green);
    }

    .badge.success {
      border-color: var(--qdt-accent-green);
      color: var(--qdt-accent-green);
    }

    .badge.warning {
      border-color: var(--qdt-accent-amber);
      color: var(--qdt-accent-amber);
    }

    /* Section */
    .section {
      margin: 0 16px 24px;
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--qdt-border-subtle);
      margin-bottom: 12px;
    }

    .section-icon {
      color: var(--qdt-accent-amber);
      font-size: 10px;
    }

    .section-label {
      font-family: var(--qdt-font-mono);
      font-size: 10px;
      letter-spacing: 0.15em;
      color: var(--qdt-text-muted);
    }

    .section-count {
      font-family: var(--qdt-font-mono);
      font-size: 9px;
      color: var(--qdt-text-subtle);
    }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 12px;
    }

    .stat-card {
      position: relative;
      background: var(--qdt-bg-secondary);
      border: 1px solid var(--qdt-border-subtle);
      border-left: 3px solid var(--stat-color, var(--qdt-text-subtle));
      padding: 12px;
    }

    .stat-corner {
      position: absolute;
      width: 6px;
      height: 6px;
      border-color: var(--stat-color, var(--qdt-text-subtle));
      border-style: solid;
      border-width: 0;
      opacity: 0.5;
    }

    .stat-corner.tl { top: 4px; left: 4px; border-top-width: 1px; border-left-width: 1px; }
    .stat-corner.tr { top: 4px; right: 4px; border-top-width: 1px; border-right-width: 1px; }
    .stat-corner.bl { bottom: 4px; left: 4px; border-bottom-width: 1px; border-left-width: 1px; }
    .stat-corner.br { bottom: 4px; right: 4px; border-bottom-width: 1px; border-right-width: 1px; }

    .stat-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .stat-abbr {
      font-family: var(--qdt-font-mono);
      font-size: 14px;
      font-weight: 700;
      color: var(--stat-color, var(--qdt-text-primary));
      letter-spacing: 0.1em;
    }

    .derived-badge {
      font-family: var(--qdt-font-mono);
      font-size: 7px;
      letter-spacing: 0.1em;
      padding: 2px 4px;
      background: var(--qdt-bg-tertiary);
      color: var(--qdt-text-subtle);
    }

    .stat-body h3 {
      font-family: var(--qdt-font-mono);
      font-size: 11px;
      font-weight: 500;
      color: var(--qdt-text-primary);
      margin: 0 0 6px 0;
      text-transform: uppercase;
    }

    .stat-range {
      display: flex;
      gap: 6px;
      align-items: center;
    }

    .range-label {
      font-family: var(--qdt-font-mono);
      font-size: 8px;
      letter-spacing: 0.1em;
      color: var(--qdt-text-subtle);
    }

    .range-value {
      font-family: var(--qdt-font-mono);
      font-size: 10px;
      color: var(--qdt-text-muted);
      font-variant-numeric: tabular-nums;
    }

    /* Rules List */
    .rules-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .rule-item {
      display: flex;
      gap: 12px;
      padding: 12px;
      background: var(--qdt-bg-secondary);
      border: 1px solid var(--qdt-border-subtle);
    }

    .rule-marker {
      width: 8px;
      height: 8px;
      background: var(--qdt-accent-green);
      flex-shrink: 0;
      margin-top: 4px;
    }

    .rule-content {
      flex: 1;
    }

    .rule-title {
      font-family: var(--qdt-font-mono);
      font-size: 12px;
      color: var(--qdt-text-primary);
      margin: 0 0 6px 0;
    }

    .rule-meta {
      display: flex;
      gap: 12px;
    }

    .rule-stats {
      font-family: var(--qdt-font-mono);
      font-size: 9px;
      color: var(--qdt-text-muted);
      letter-spacing: 0.05em;
    }

    .rule-max {
      font-family: var(--qdt-font-mono);
      font-size: 9px;
      color: var(--qdt-accent-green);
      letter-spacing: 0.05em;
    }

    /* Races Grid */
    .races-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 12px;
    }

    .race-card {
      position: relative;
      background: var(--qdt-bg-secondary);
      border: 1px solid var(--qdt-border-subtle);
      overflow: hidden;
    }

    .race-corner {
      position: absolute;
      width: 8px;
      height: 8px;
      border-color: var(--qdt-text-subtle);
      border-style: solid;
      border-width: 0;
      opacity: 0.4;
      z-index: 1;
    }

    .race-corner.tl { top: 4px; left: 4px; border-top-width: 1px; border-left-width: 1px; }
    .race-corner.tr { top: 4px; right: 4px; border-top-width: 1px; border-right-width: 1px; }
    .race-corner.bl { bottom: 4px; left: 4px; border-bottom-width: 1px; border-left-width: 1px; }
    .race-corner.br { bottom: 4px; right: 4px; border-bottom-width: 1px; border-right-width: 1px; }

    .race-image {
      position: relative;
      width: 100%;
      height: 120px;
      background: var(--qdt-bg-tertiary);
    }

    .race-image img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      filter: grayscale(30%) contrast(1.1);
    }

    .race-placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .race-placeholder ion-icon {
      font-size: 40px;
      color: var(--qdt-text-subtle);
    }

    .race-info {
      padding: 12px;
    }

    .race-name {
      font-family: var(--qdt-font-mono);
      font-size: 14px;
      font-weight: 500;
      color: var(--qdt-text-primary);
      margin: 0 0 4px 0;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .race-description {
      font-family: var(--qdt-font-mono);
      font-size: 10px;
      color: var(--qdt-text-muted);
      margin: 0 0 12px 0;
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .race-stats {
      margin-bottom: 8px;
    }

    .stats-label {
      font-family: var(--qdt-font-mono);
      font-size: 8px;
      letter-spacing: 0.15em;
      color: var(--qdt-text-subtle);
      display: block;
      margin-bottom: 6px;
    }

    .stats-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    .stat-chip {
      font-family: var(--qdt-font-mono);
      font-size: 9px;
      padding: 2px 6px;
      background: var(--qdt-bg-tertiary);
      border: 1px solid var(--qdt-border-subtle);
      color: var(--qdt-text-muted);
    }

    .stat-chip.positive {
      border-color: rgba(22, 163, 74, 0.3);
      color: var(--qdt-accent-green);
    }

    .race-free-points {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px;
      background: rgba(217, 119, 6, 0.1);
      border: 1px solid rgba(217, 119, 6, 0.3);
      font-family: var(--qdt-font-mono);
      font-size: 10px;
      color: var(--qdt-accent-amber);
      letter-spacing: 0.05em;
    }

    .race-free-points ion-icon {
      font-size: 12px;
    }

    /* Ranks List */
    .ranks-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .rank-item {
      display: flex;
      gap: 16px;
      padding: 16px;
      background: var(--qdt-bg-secondary);
      border: 1px solid var(--qdt-border-subtle);
    }

    .rank-number {
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--qdt-bg-tertiary);
      border: 1px solid var(--qdt-accent-amber);
      font-family: var(--qdt-font-mono);
      font-size: 14px;
      font-weight: 700;
      color: var(--qdt-accent-amber);
      flex-shrink: 0;
    }

    .rank-info {
      flex: 1;
    }

    .rank-name {
      font-family: var(--qdt-font-mono);
      font-size: 14px;
      font-weight: 500;
      color: var(--qdt-text-primary);
      margin: 0 0 4px 0;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .rank-threshold {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .threshold-label {
      font-family: var(--qdt-font-mono);
      font-size: 8px;
      letter-spacing: 0.15em;
      color: var(--qdt-text-subtle);
    }

    .threshold-value {
      font-family: var(--qdt-font-mono);
      font-size: 11px;
      color: var(--qdt-text-muted);
      font-variant-numeric: tabular-nums;
    }

    /* Action Section */
    .action-section {
      padding: 24px 16px 40px;
    }

    .qdt-button {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 14px 24px;
      font-family: var(--qdt-font-mono);
      font-size: 11px;
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

    .qdt-button.primary {
      border-color: var(--qdt-accent-amber);
      color: var(--qdt-accent-amber);
    }

    .qdt-button.primary:hover {
      background: rgba(217, 119, 6, 0.1);
    }

    .qdt-button.full-width {
      width: 100%;
    }

    .qdt-button ion-icon {
      font-size: 16px;
    }
  `]
})
export class UniverseDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private universeStore = inject(UniverseStore);

  loading = signal(true);
  universeId = signal<string | null>(null);

  universe = computed(() => {
    const id = this.universeId();
    if (!id) return null;
    const found = this.universeStore.allUniverses().find(u => u.id === id) ?? null;

    // Debug logging
    if (found) {
      console.log('[UniverseDetail] Universe loaded:', {
        id: found.id,
        name: found.name,
        hasCoverImage: !!found.coverImage,
        coverImageLength: found.coverImage?.length,
        awakeningSystem: found.awakeningSystem,
        awakeningEnabled: found.awakeningSystem?.enabled,
        raceSystem: found.raceSystem,
        raceSystemEnabled: found.raceSystem?.enabled,
        racesCount: found.raceSystem?.races?.length
      });
    }

    return found;
  });

  isOwner = computed(() => {
    const u = this.universe();
    if (!u) return false;
    return this.universeStore.userUniverses().some(uu => uu.id === u.id);
  });

  statsCount = computed(() => {
    const u = this.universe();
    if (!u) return 0;
    return Object.keys(u.statDefinitions).filter(
      key => !u.statDefinitions[key].isDerived
    ).length;
  });

  statsList = computed(() => {
    const u = this.universe();
    if (!u) return [];
    return Object.entries(u.statDefinitions).map(([key, def]) => ({
      key,
      ...def
    }));
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.universeId.set(id);
    this.loadUniverse();
  }

  async loadUniverse(): Promise<void> {
    this.loading.set(true);
    try {
      await this.universeStore.loadUniverses();
    } finally {
      this.loading.set(false);
    }
  }

  getGradient(): string {
    const u = this.universe();
    if (!u) return 'linear-gradient(135deg, #667eea, #764ba2)';

    const colors = Object.values(u.statDefinitions)
      .slice(0, 2)
      .map(d => d.color || '#667eea');

    if (colors.length < 2) {
      return 'linear-gradient(135deg, #667eea, #764ba2)';
    }
    return `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`;
  }

  editUniverse(): void {
    const id = this.universeId();
    if (id) {
      this.router.navigate(['/tabs/universes', id, 'edit']);
    }
  }

  createCharacter(): void {
    this.router.navigate(['/tabs/creation'], {
      queryParams: { universeId: this.universeId() }
    });
  }

  getBaseStatsArray(baseStats: Record<string, number>): { key: string; value: number }[] {
    if (!baseStats) return [];
    return Object.entries(baseStats).map(([key, value]) => ({ key, value }));
  }
}
