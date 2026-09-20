import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  IonContent,
  IonInput,
  IonButton,
  IonIcon,
  IonSpinner
} from '@ionic/angular';

import { addIcons } from 'ionicons';

import {
  mailOutline,
  lockClosedOutline,
  eyeOutline,
  eyeOffOutline,
  logoGoogle
} from 'ionicons/icons';

import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,

  imports: [
    CommonModule,
    FormsModule,

    IonContent,
    IonInput,
    IonButton,
    IonIcon,
    IonSpinner
  ]
})
export class LoginPage {

  email = '';
  password = '';

  obscurePassword = true;
  loading = false;
  remember = false;

  constructor(
    private router: Router,
    private authService: AuthService
  ) {

    addIcons({
      mailOutline,
      lockClosedOutline,
      eyeOutline,
      eyeOffOutline,
      logoGoogle
    });

  }

  togglePassword(): void {
    this.obscurePassword = !this.obscurePassword;
  }

  async submit(): Promise<void> {

    if (!this.email || !this.password) {
      return;
    }

    if (this.password.length < 6) {
      return;
    }

    this.loading = true;

    try {
      const result = await this.authService.login(
        this.email.trim(),
        this.password
      );

      if (!result.success) {
        alert(result.message);
        return;
      }

      await this.router.navigateByUrl('/tabs/home', { replaceUrl: true });
    } finally {
      this.loading = false;
    }
  }

  forgotPassword(): void {

    /*
     * Firebase password reset will be added here.
     */

    console.log('Forgot password:', this.email);

  }

  continueWithGoogle(): void {

    /*
     * Firebase Google authentication will be added here.
     */

    console.log('Continue with Google');

  }

  goToSignup(): void {
    this.router.navigate(['/signup']);
  }

}

