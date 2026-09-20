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
import { mailOutline, eyeOutline, eyeOffOutline } from 'ionicons/icons';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.page.html',
  styleUrls: ['./signup.page.scss'],
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
export class SignupPage {
  firstName = '';
  lastName = '';
  email = '';
  mobile = '';
  password = '';
  confirmPassword = '';
  obscurePassword = true;
  obscureConfirmPassword = true;
  loading = false;
  agree = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    addIcons({ mailOutline, eyeOutline, eyeOffOutline });
  }

  togglePassword(): void {
    this.obscurePassword = !this.obscurePassword;
  }

  toggleConfirmPassword(): void {
    this.obscureConfirmPassword = !this.obscureConfirmPassword;
  }

  async submit(): Promise<void> {
    if (this.loading) {
      return;
    }

    if (
      !this.firstName.trim() ||
      !this.lastName.trim() ||
      !this.email.trim() ||
      !this.mobile.trim() ||
      !this.password ||
      !this.confirmPassword
    ) {
      alert('Please complete all fields.');
      return;
    }

    if (this.password.length < 6) {
      alert('Password must be at least 6 characters.');
      return;
    }

    if (this.password !== this.confirmPassword) {
      alert('Passwords do not match.');
      return;
    }

    if (!this.agree) {
      alert('You must agree to the Terms & Privacy Policy.');
      return;
    }

    this.loading = true;

    try {
      const result = await this.authService.signUp(
        this.email.trim(),
        this.password,
        this.firstName.trim(),
        this.lastName.trim(),
        this.mobile.trim()
      );

      if (!result.success) {
        alert(result.message);
        return;
      }

      alert('Account created successfully');
      await this.router.navigateByUrl('/tabs/home', { replaceUrl: true });
    } finally {
      this.loading = false;
    }
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
