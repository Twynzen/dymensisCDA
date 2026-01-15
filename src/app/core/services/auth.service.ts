import { Injectable, inject, signal, computed } from '@angular/core';
import {
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  updateProfile,
  sendPasswordResetEmail,
  UserCredential
} from '@angular/fire/auth';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth);
  private googleProvider = new GoogleAuthProvider();

  // Reactive state with signals
  private _user = signal<AuthUser | null>(null);
  private _loading = signal(true);
  private _error = signal<string | null>(null);

  // Public computed signals
  user = this._user.asReadonly();
  loading = this._loading.asReadonly();
  error = this._error.asReadonly();
  isAuthenticated = computed(() => this._user() !== null);
  userId = computed(() => this._user()?.uid ?? null);

  constructor() {
    this.initAuthListener();
  }

  private initAuthListener(): void {
    onAuthStateChanged(this.auth, (user) => {
      if (user) {
        this._user.set(this.mapUser(user));
      } else {
        this._user.set(null);
      }
      this._loading.set(false);
    });
  }

  private mapUser(user: User): AuthUser {
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL
    };
  }

  async signInWithEmail(email: string, password: string): Promise<AuthUser> {
    this._loading.set(true);
    this._error.set(null);

    try {
      const credential = await signInWithEmailAndPassword(this.auth, email, password);
      const authUser = this.mapUser(credential.user);
      this._user.set(authUser);
      return authUser;
    } catch (err: any) {
      const errorMessage = this.getErrorMessage(err.code);
      this._error.set(errorMessage);
      throw new Error(errorMessage);
    } finally {
      this._loading.set(false);
    }
  }

  async signUpWithEmail(email: string, password: string, displayName?: string): Promise<AuthUser> {
    this._loading.set(true);
    this._error.set(null);

    try {
      const credential = await createUserWithEmailAndPassword(this.auth, email, password);

      if (displayName) {
        await updateProfile(credential.user, { displayName });
      }

      const authUser = this.mapUser(credential.user);
      this._user.set(authUser);
      return authUser;
    } catch (err: any) {
      const errorMessage = this.getErrorMessage(err.code);
      this._error.set(errorMessage);
      throw new Error(errorMessage);
    } finally {
      this._loading.set(false);
    }
  }

  async signInWithGoogle(): Promise<AuthUser> {
    this._loading.set(true);
    this._error.set(null);

    try {
      const credential = await signInWithPopup(this.auth, this.googleProvider);
      const authUser = this.mapUser(credential.user);
      this._user.set(authUser);
      return authUser;
    } catch (err: any) {
      const errorMessage = this.getErrorMessage(err.code);
      this._error.set(errorMessage);
      throw new Error(errorMessage);
    } finally {
      this._loading.set(false);
    }
  }

  async signOut(): Promise<void> {
    this._loading.set(true);
    try {
      await signOut(this.auth);
      this._user.set(null);
    } finally {
      this._loading.set(false);
    }
  }

  async resetPassword(email: string): Promise<void> {
    this._error.set(null);
    try {
      await sendPasswordResetEmail(this.auth, email);
    } catch (err: any) {
      const errorMessage = this.getErrorMessage(err.code);
      this._error.set(errorMessage);
      throw new Error(errorMessage);
    }
  }

  async updateDisplayName(displayName: string): Promise<void> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) throw new Error('No user logged in');

    await updateProfile(currentUser, { displayName });
    this._user.update(user => user ? { ...user, displayName } : null);
  }

  clearError(): void {
    this._error.set(null);
  }

  private getErrorMessage(code: string): string {
    const errorMessages: Record<string, string> = {
      'auth/user-not-found': 'No existe una cuenta con este correo electrónico',
      'auth/wrong-password': 'Contraseña incorrecta',
      'auth/email-already-in-use': 'Este correo electrónico ya está registrado',
      'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres',
      'auth/invalid-email': 'Correo electrónico inválido',
      'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde',
      'auth/popup-closed-by-user': 'Inicio de sesión cancelado',
      'auth/network-request-failed': 'Error de conexión. Verifica tu internet',
      'auth/invalid-credential': 'Credenciales inválidas'
    };

    return errorMessages[code] || 'Ha ocurrido un error inesperado';
  }
}
