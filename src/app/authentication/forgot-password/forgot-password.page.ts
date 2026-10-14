import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { IonContent, IonIcon, IonInput, IonButton } from '@ionic/angular';

import { addIcons } from 'ionicons';
import {
  mailOutline,
  arrowBackOutline,
  checkmarkCircleOutline,
} from 'ionicons/icons';

import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../firebase.config';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./forgot-password.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    IonContent,
    IonIcon,
    IonInput,
    IonButton,
  ],
})
export class ForgotPasswordPage {
  email = '';

  loading = signal(false);
  emailSent = signal(false);
  errorMessage = signal('');

  constructor() {
    addIcons({
      mailOutline,
      arrowBackOutline,
      checkmarkCircleOutline,
    });
  }

  async resetPassword(): Promise<void> {
    const email = this.email.trim();

    if (!email) {
      this.errorMessage.set('Please enter your email address.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.errorMessage.set('Please enter a valid email address.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    try {
      await sendPasswordResetEmail(auth, email);

      this.emailSent.set(true);
    } catch (error: any) {
      console.error('Password reset error:', error);

      if (error.code === 'auth/invalid-email') {
        this.errorMessage.set('Please enter a valid email address.');
      } else if (error.code === 'auth/too-many-requests') {
        this.errorMessage.set('Too many attempts. Please try again later.');
      } else {
        this.errorMessage.set(
          'Unable to send the reset email. Please try again.',
        );
      }
    } finally {
      this.loading.set(false);
    }
  }
}
