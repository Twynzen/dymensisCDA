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
  private authReadyResolver!: () => void;
  private authReadyPromise: Promise<void>;

  // Reactive state with signals
  private _user = signal<AuthUser | null>(null);
  private _loading = signal(true);
  private _error = signal<string | null>(null);
  private _initialized = signal(false);

  // Public computed signals
  user = this._user.asReadonly();
  loading = this._loading.asReadonly();
  error = this._error.asReadonly();
  isAuthenticated = computed(() => this._user() !== null);
  userId = computed(() => this._user()?.uid ?? null);
  initialized = this._initialized.asReadonly();

  constructor() {
    // Create promise that resolves when auth is ready
    this.authReadyPromise = new Promise<void>((resolve) => {
      this.authReadyResolver = resolve;
    });
    this.initAuthListener();
  }

  /**
   * Returns a promise that resolves when Firebase Auth has finished
   * checking for an existing session. Use this before operations that
   * require knowing the auth state.
   */
  async waitForAuthReady(): Promise<boolean> {
    await this.authReadyPromise;
    return this.isAuthenticated();
  }

  private initAuthListener(): void {
    console.log('[AuthService] Initializing auth listener...');
    onAuthStateChanged(this.auth, (user) => {
      console.log('[AuthService] Auth state changed:', {
        hasUser: !!user,
        userId: user?.uid,
        email: user?.email
      });

      if (user) {
        this._user.set(this.mapUser(user));
      } else {
        this._user.set(null);
      }

      this._loading.set(false);
      this._initialized.set(true);

      // Resolve the ready promise on first auth state
      this.authReadyResolver();
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
      'auth/invalid-credential': 'El correo o la contraseña son incorrectos',
      'auth/invalid-login-credentials': 'El correo o la contraseña son incorrectos',
      'auth/user-disabled': 'Esta cuenta ha sido deshabilitada',
      'auth/operation-not-allowed': 'Este método de inicio de sesión no está habilitado',
      'auth/account-exists-with-different-credential': 'Ya existe una cuenta con este correo usando otro método',
      'auth/requires-recent-login': 'Por seguridad, vuelve a iniciar sesión',
      'auth/credential-already-in-use': 'Esta credencial ya está asociada a otra cuenta',
      'auth/timeout': 'La solicitud tardó demasiado. Intenta de nuevo',
      'auth/missing-email': 'Debes ingresar un correo electrónico',
      'auth/missing-password': 'Debes ingresar una contraseña'
    };

    console.error('Firebase Auth Error:', code);
    return errorMessages[code] || `Error de autenticación: ${code}`;
  }
}
