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

    if (!this.email.trim()) {
      alert('Please enter your email.');
      return;
    }

    if (!this.password) {
      alert('Please enter your password.');
      return;
    }

    if (this.password.length < 6) {
      alert('Password must be at least 6 characters.');
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

      // Get the role of the logged-in user
      const role = await this.authService.getCurrentUserRole();

      console.log('Logged-in user role:', role);

      // Redirect based on role
      switch (role) {

        case 'rider':
          await this.router.navigateByUrl(
            '/delivery-dashboard',
            {
              replaceUrl: true
            }
          );
          break;

        case 'staff':
        case 'admin':
          window.location.replace('/admin/index.html');
          return;

        case 'customer':
        default:
          await this.router.navigateByUrl(
            '/home',
            {
              replaceUrl: true
            }
          );
          break;
      }

    } catch (error: any) {

      console.error('Login error:', error);

      alert(
        error?.message ||
        'Something went wrong while logging in.'
      );

    } finally {

      this.loading = false;

    }
  }

  forgotPassword(): void {

    console.log(
      'Forgot password:',
      this.email
    );

    alert(
      'Password reset will be added next.'
    );

  }

  continueWithGoogle(): void {

    console.log('Continue with Google');

    alert(
      'Google login will be added next.'
    );

  }

  goToSignup(): void {

    this.router.navigate(['/signup']);

  }

}