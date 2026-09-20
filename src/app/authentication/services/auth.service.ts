import { Injectable } from '@angular/core';

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  User
} from 'firebase/auth';

import {
  doc,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';

import { auth, db } from '../../firebase.config';

export interface AuthResult {
  success: boolean;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  async signUp(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    phone: string
  ): Promise<AuthResult> {

    try {

      // 1. Create Firebase Authentication account
      const credential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      const user = credential.user;

      // 2. Set Firebase display name
      await updateProfile(user, {
        displayName: `${firstName} ${lastName}`
      });

      // 3. Create user profile in Firestore
      await setDoc(
        doc(db, 'users', user.uid),
        {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),

          // Default values for newly registered customers
          role: 'customer',
          status: 'active',

          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }
      );

      return {
        success: true,
        message: 'Account created successfully'
      };

    } catch (error: any) {

      if (error?.code === 'auth/email-already-in-use') {
        return {
          success: false,
          message: 'This email address is already registered.'
        };
      }

      if (error?.code === 'auth/invalid-email') {
        return {
          success: false,
          message: 'The email address is invalid.'
        };
      }

      if (error?.code === 'auth/weak-password') {
        return {
          success: false,
          message: 'The password is too weak.'
        };
      }

      if (error?.code === 'auth/network-request-failed') {
        return {
          success: false,
          message: 'Network error. Please check your internet connection.'
        };
      }

      if (error?.code === 'permission-denied') {
        return {
          success: false,
          message: 'Unable to create your user profile. Please check Firestore permissions.'
        };
      }

      return {
        success: false,
        message: error?.message || 'Signup failed'
      };
    }
  }

  async login(
    email: string,
    password: string
  ): Promise<AuthResult> {

    try {

      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      return {
        success: true,
        message: 'Login successful'
      };

    } catch (error: any) {

      if (error?.code === 'auth/invalid-credential') {
        return {
          success: false,
          message: 'Invalid email or password.'
        };
      }

      if (error?.code === 'auth/user-not-found') {
        return {
          success: false,
          message: 'No account was found with this email.'
        };
      }

      if (error?.code === 'auth/wrong-password') {
        return {
          success: false,
          message: 'Incorrect password.'
        };
      }

      if (error?.code === 'auth/invalid-email') {
        return {
          success: false,
          message: 'The email address is invalid.'
        };
      }

      if (error?.code === 'auth/network-request-failed') {
        return {
          success: false,
          message: 'Network error. Please check your internet connection.'
        };
      }

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