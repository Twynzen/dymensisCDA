import { Component, Input, Output, EventEmitter, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon, IonButton, IonSpinner } from '@ionic/angular/standalone';

@Component({
  selector: 'app-image-upload',
  standalone: true,
  imports: [CommonModule, IonIcon, IonButton, IonSpinner],
  template: `
    <div
      class="upload-zone"
      [class.dragover]="isDragging()"
      [class.has-image]="currentImage()"
      (dragover)="onDragOver($event)"
      (dragleave)="onDragLeave($event)"
      (drop)="onDrop($event)"
      (click)="triggerFileInput()"
    >
      <input
        type="file"
        accept="image/*"
        (change)="onFileSelect($event)"
        #fileInputRef
        hidden
      />

      @if (!currentImage()) {
        <div class="upload-placeholder">
          <ion-icon name="cloud-upload-outline"></ion-icon>
          <p class="upload-text">{{ placeholder }}</p>
          <span class="upload-hint">Arrastra una imagen o haz clic para seleccionar</span>
        </div>
      } @else {
        <div class="image-preview">
          <img [src]="currentImage()" [alt]="placeholder" />
          <div class="image-overlay">
            <ion-button fill="clear" color="light" (click)="changeImage($event)">
              <ion-icon slot="icon-only" name="camera"></ion-icon>
            </ion-button>
            <ion-button fill="clear" color="danger" (click)="removeImage($event)">
              <ion-icon slot="icon-only" name="trash"></ion-icon>
            </ion-button>
          </div>
          @if (imageSizeInfo()) {
            <div class="image-size-badge">
              <ion-icon name="image-outline"></ion-icon>
              {{ imageSizeInfo() }}
            </div>
          }
        </div>
      }

      @if (error()) {
        <div class="error-message">
          <ion-icon name="alert-circle"></ion-icon>
          <span>{{ error() }}</span>
        </div>
      }

      @if (isProcessing()) {
        <div class="processing-overlay">
          <ion-spinner name="crescent"></ion-spinner>
          <span>Procesando imagen...</span>
        </div>
      }
    </div>
  `,
  styles: [`
    .upload-zone {
      position: relative;
      border: 2px dashed rgba(255, 255, 255, 0.3);
      border-radius: 12px;
      padding: 24px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s ease;
      min-height: 120px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.02);
    }

    .upload-zone:hover {
      border-color: var(--ion-color-primary);
      background: rgba(var(--ion-color-primary-rgb), 0.05);
    }

    .upload-zone.dragover {
      border-color: var(--ion-color-primary);
      background: rgba(var(--ion-color-primary-rgb), 0.1);
      transform: scale(1.02);
    }

    .upload-zone.has-image {
      padding: 0;
      border: none;
      background: transparent;
    }

    .upload-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }

    .upload-placeholder ion-icon {
      font-size: 48px;
      color: var(--ion-color-primary);
      opacity: 0.7;
    }

    .upload-text {
      margin: 0;
      font-size: 16px;
      font-weight: 500;
    }

    .upload-hint {
      font-size: 13px;
      color: var(--ion-color-medium);
    }

    .size-limit {
      font-size: 11px;
      color: var(--ion-color-medium);
      opacity: 0.7;
    }

    .image-preview {
      position: relative;
      width: 100%;
      border-radius: 12px;
      overflow: hidden;
    }

    .image-preview img {
      width: 100%;
      height: auto;
      max-height: 200px;
      object-fit: cover;
      display: block;
    }

    .image-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      opacity: 0;
      transition: opacity 0.2s ease;
    }

    .image-preview:hover .image-overlay {
      opacity: 1;
    }

    .image-overlay ion-button {
      --background: rgba(255, 255, 255, 0.2);
      --border-radius: 50%;
      width: 48px;
      height: 48px;
    }

    .image-overlay ion-icon {
      font-size: 24px;
    }

    .image-size-badge {
      position: absolute;
      bottom: 8px;
      right: 8px;
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      background: rgba(0, 0, 0, 0.7);
      border-radius: 12px;
      font-size: 11px;
      color: var(--ion-color-success);
      font-weight: 500;
    }

    .image-size-badge ion-icon {
      font-size: 12px;
    }

    .error-message {
      position: absolute;
      bottom: 8px;
      left: 8px;
      right: 8px;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      background: rgba(var(--ion-color-danger-rgb), 0.9);
      border-radius: 8px;
      font-size: 12px;
      color: white;
    }

    .error-message ion-icon {
      font-size: 16px;
      flex-shrink: 0;
    }

    .processing-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      border-radius: 12px;
    }

    .processing-overlay span {
      font-size: 13px;
      color: var(--ion-color-light);
    }
  `]
})
export class ImageUploadComponent {
  @Input() placeholder = 'Imagen';
  @Input() maxSizeKB = 80; // Optimized for Firestore limits while maintaining quality
  @Input() maxWidth = 500;  // Good size for thumbnails
  @Input() maxHeight = 500;
  @Input() quality = 0.7;
  @Input() set value(val: string | null | undefined) {
    this.currentImage.set(val || null);
    if (val) {
      this.updateSizeInfo(val);
    } else {
      this.imageSizeInfo.set(null);
    }
  }

  @Output() imageChange = new EventEmitter<string | null>();

  @ViewChild('fileInputRef') fileInput!: ElementRef<HTMLInputElement>;

  currentImage = signal<string | null>(null);
  imageSizeInfo = signal<string | null>(null);
  isDragging = signal(false);
  isProcessing = signal(false);
  error = signal<string | null>(null);

  triggerFileInput(): void {
    if (this.fileInput?.nativeElement && !this.currentImage()) {
      this.fileInput.nativeElement.click();
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.processFile(files[0]);
    }
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.processFile(file);
    }
    input.value = '';
  }

  changeImage(event: Event): void {
    event.stopPropagation();
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        this.processFile(file);
      }
    };
    input.click();
  }

  removeImage(event: Event): void {
    event.stopPropagation();
    this.currentImage.set(null);
    this.imageSizeInfo.set(null);
    this.error.set(null);
    this.imageChange.emit(null);
  }

  private async processFile(file: File): Promise<void> {
    this.error.set(null);

    if (!file.type.startsWith('image/')) {
      this.error.set('El archivo debe ser una imagen');
      return;
    }

    this.isProcessing.set(true);

    try {
      // Always compress to ensure we stay under limits
      const base64 = await this.compressImageIteratively(file);

      const finalSize = this.getBase64Size(base64);
      console.log(`[ImageUpload] Final image size: ${Math.round(finalSize / 1024)}KB`);

      if (finalSize > this.maxSizeKB * 1024) {
        this.error.set(`No se pudo comprimir la imagen a ${this.maxSizeKB}KB. Intenta con una imagen más pequeña.`);
        return;
      }

      this.currentImage.set(base64);
      this.updateSizeInfo(base64);
      this.imageChange.emit(base64);
    } catch (err) {
      console.error('Error processing image:', err);
      this.error.set('Error al procesar la imagen');
    } finally {
      this.isProcessing.set(false);
    }
  }

  private updateSizeInfo(base64: string): void {
    const sizeBytes = this.getBase64Size(base64);
    const sizeKB = Math.round(sizeBytes / 1024);
    this.imageSizeInfo.set(`${sizeKB}KB`);
  }

  private readAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Iteratively compress image until it's under maxSizeKB
   * Starts with maxWidth/maxHeight and quality, then reduces if needed
   */
  private async compressImageIteratively(file: File): Promise<string> {
    const maxTargetSize = this.maxSizeKB * 1024;

    // Start with configured dimensions and quality
    let currentWidth = this.maxWidth;
    let currentHeight = this.maxHeight;
    let currentQuality = this.quality;

    const img = await this.loadImage(file);

    // Calculate initial dimensions maintaining aspect ratio
    let { width, height } = img;
    if (width > currentWidth || height > currentHeight) {
      const ratio = Math.min(currentWidth / width, currentHeight / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    let result = this.canvasToBase64(img, width, height, currentQuality);
    let attempts = 0;
    const maxAttempts = 10;

    // Iteratively reduce quality and size until under limit
    while (this.getBase64Size(result) > maxTargetSize && attempts < maxAttempts) {
      attempts++;

      // First reduce quality
      if (currentQuality > 0.3) {
        currentQuality -= 0.1;
      } else {
        // Then reduce dimensions
        width = Math.round(width * 0.8);
        height = Math.round(height * 0.8);
        currentQuality = 0.5; // Reset quality
      }

      result = this.canvasToBase64(img, width, height, currentQuality);
      console.log(`[ImageUpload] Compression attempt ${attempts}: ${Math.round(this.getBase64Size(result) / 1024)}KB (${width}x${height}, q=${currentQuality.toFixed(1)})`);
    }

    return result;
  }

  private loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(img.src);
        resolve(img);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  private canvasToBase64(img: HTMLImageElement, width: number, height: number, quality: number): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = width;
    canvas.height = height;

    if (ctx) {
      ctx.drawImage(img, 0, 0, width, height);
      return canvas.toDataURL('image/jpeg', quality);
    }

    throw new Error('Could not get canvas context');
  }

  private compressImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      img.onload = () => {
        let { width, height } = img;

        if (width > this.maxWidth || height > this.maxHeight) {
          const ratio = Math.min(this.maxWidth / width, this.maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;

        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const base64 = canvas.toDataURL('image/jpeg', this.quality);
          resolve(base64);
        } else {
          reject(new Error('Could not get canvas context'));
        }
      };

      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  private getBase64Size(base64: string): number {
    const base64Length = base64.length - (base64.indexOf(',') + 1);
    const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
    return (base64Length * 3) / 4 - padding;
  }
}
