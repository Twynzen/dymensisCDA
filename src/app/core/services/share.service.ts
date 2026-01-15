import { Injectable, inject } from '@angular/core';
import { Platform } from '@ionic/angular/standalone';
import { FirebaseService } from './firebase.service';

export interface ShareOptions {
  title: string;
  text?: string;
  imageBase64: string;
  characterName: string;
}

@Injectable({ providedIn: 'root' })
export class ShareService {
  private platform = inject(Platform);
  private firebaseService = inject(FirebaseService);

  /**
   * Check if native sharing is available
   */
  canShare(): boolean {
    return 'share' in navigator || this.platform.is('capacitor');
  }

  /**
   * Check if file sharing is supported
   */
  canShareFiles(): boolean {
    return 'canShare' in navigator && navigator.canShare({ files: [new File([], '')] });
  }

  /**
   * Share character card as an image using native sharing
   */
  async shareAsImage(options: ShareOptions): Promise<void> {
    const { title, text, imageBase64, characterName } = options;
    const fileName = `${characterName.replace(/\s+/g, '-')}-ficha.png`;

    if (this.platform.is('capacitor')) {
      await this.shareCapacitor(title, text, imageBase64, fileName);
    } else if (this.canShareFiles()) {
      await this.shareWeb(title, text, imageBase64, fileName);
    } else {
      // Fallback: download the image
      this.downloadImage(imageBase64, fileName);
    }
  }

  /**
   * Share using Capacitor (native mobile)
   */
  private async shareCapacitor(
    title: string,
    text: string | undefined,
    imageBase64: string,
    fileName: string
  ): Promise<void> {
    // Dynamic import for Capacitor plugins
    const { Share } = await import('@capacitor/share');
    const { Filesystem, Directory } = await import('@capacitor/filesystem');

    // Save to temp file
    const savedFile = await Filesystem.writeFile({
      path: fileName,
      data: imageBase64.split(',')[1], // Remove data URL prefix
      directory: Directory.Cache
    });

    await Share.share({
      title,
      text: text || `Ficha de personaje RPG`,
      url: savedFile.uri,
      dialogTitle: 'Compartir ficha'
    });
  }

  /**
   * Share using Web Share API
   */
  private async shareWeb(
    title: string,
    text: string | undefined,
    imageBase64: string,
    fileName: string
  ): Promise<void> {
    const response = await fetch(imageBase64);
    const blob = await response.blob();
    const file = new File([blob], fileName, { type: 'image/png' });

    await navigator.share({
      title,
      text: text || 'Ficha de personaje RPG',
      files: [file]
    });
  }

  /**
   * Fallback: Download the image
   */
  downloadImage(imageBase64: string, fileName: string): void {
    const link = document.createElement('a');
    link.href = imageBase64;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Create a temporary shareable link stored in Firebase
   */
  async createTemporaryLink(
    userId: string,
    characterId: string,
    imageBase64: string,
    expirationMinutes: number = 60
  ): Promise<string> {
    const shareId = crypto.randomUUID();

    // Upload image to Firebase Storage
    const downloadUrl = await this.firebaseService.uploadSharedCard(
      shareId,
      imageBase64
    );

    // Create share token in Firestore
    await this.firebaseService.createShareToken(
      userId,
      characterId,
      downloadUrl,
      expirationMinutes
    );

    // Return shareable URL (app URL with share ID)
    const baseUrl = window.location.origin;
    return `${baseUrl}/shared/${shareId}`;
  }

  /**
   * Get shared content from a share ID
   */
  async getSharedContent(shareId: string): Promise<{
    downloadUrl: string;
    expired: boolean;
  } | null> {
    const token = await this.firebaseService.getShareToken(shareId);

    if (!token) {
      return null;
    }

    return {
      downloadUrl: token.downloadUrl,
      expired: token.expiresAt < new Date()
    };
  }

  /**
   * Copy shareable link to clipboard
   */
  async copyToClipboard(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      return success;
    }
  }
}
