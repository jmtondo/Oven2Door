import { Injectable } from '@angular/core';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  User
} from 'firebase/auth';
import { auth } from '../../firebase.config';
import { ApiService } from '../../services/api.service';

export interface AuthResult {
  success: boolean;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  constructor(private api: ApiService) {}

  async signUp(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    phone: string
  ): Promise<AuthResult> {
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      const user = credential.user;

      await updateProfile(user, {
        displayName: `${firstName} ${lastName}`
      });

      const idToken = await user.getIdToken();
      if (!idToken) {
        return {
          success: false,
          message: 'Could not verify the new Firebase account.'
        };
      }

      await this.api.signUp({
        idToken,
        firstName,
        lastName,
        email,
        phone
      });

      return { success: true, message: 'Account created successfully' };
    } catch (error: any) {
      if (error?.code === 'auth/email-already-in-use') {
        return { success: false, message: 'This email address is already registered.' };
      }
      if (error?.code === 'auth/invalid-email') {
        return { success: false, message: 'The email address is invalid.' };
      }
      if (error?.code === 'auth/weak-password') {
        return { success: false, message: 'The password is too weak.' };
      }
      if (error?.code === 'auth/network-request-failed') {
        return { success: false, message: 'Network error. Please check your internet connection.' };
      }
      return {
        success: false,
        message: error?.message || 'Signup failed'
      };
    }
  }

  async login(email: string, password: string): Promise<AuthResult> {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { success: true, message: 'Login successful' };
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || 'Login failed'
      };
    }
  }

  async logout(): Promise<void> {
    await signOut(auth);
  }

  getCurrentUser(): User | null {
    return auth.currentUser;
  }

  async getIdToken(): Promise<string | null> {
    const user = auth.currentUser;
    if (!user) {
      return null;
    }
    return user.getIdToken();
  }
}
