import { Component, OnInit, OnDestroy, signal } from '@angular/core';

import { CommonModule } from '@angular/common';

import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { Subscription } from 'rxjs';

import { StorefrontService } from '../../services/storefront.service';

import { IonHeader, IonIcon, IonRouterOutlet } from '@ionic/angular';

import { addIcons } from 'ionicons';

import {
  searchOutline,
  personOutline,
  cart,
  menuOutline,
  closeOutline,
} from 'ionicons/icons';

import { doc, onSnapshot } from 'firebase/firestore';

import { onAuthStateChanged, signOut, Unsubscribe } from 'firebase/auth';

import { auth, db } from '../../firebase.config';

@Component({
  selector: 'app-layout',
  templateUrl: './layout.page.html',
  styleUrls: ['./layout.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    IonHeader,
    IonIcon,
    IonRouterOutlet,
  ],
})
export class LayoutPage implements OnInit, OnDestroy {
  isMobileMenuOpen = false;

  // Signals notify Angular when Firebase state changes.
  isLoggedIn = signal(false);
  loggedInUserName = signal('');

  private cartSubscription?: Subscription;
  private authUnsubscribe?: Unsubscribe;
  private profileUnsubscribe?: Unsubscribe;

  constructor(
    public storefront: StorefrontService,
    private router: Router,
  ) {
    addIcons({
      searchOutline,
      personOutline,
      cart,
      menuOutline,
      closeOutline,
    });

    this.cartSubscription = this.storefront.changed.subscribe(() => {
      // Preserve existing cart subscription.
    });
  }

  ngOnInit(): void {
    this.loadLoggedInUser();
  }

  private loadLoggedInUser(): void {
    this.authUnsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        // Remove the previous Firestore listener.
        this.profileUnsubscribe?.();
        this.profileUnsubscribe = undefined;

        this.isLoggedIn.set(!!user);

        if (!user) {
          this.loggedInUserName.set('');
          return;
        }

        // Fallback while the Firestore profile loads.
        const fallbackName =
          user.displayName?.split(' ')[0] ||
          user.email?.split('@')[0] ||
          'Customer';

        this.loggedInUserName.set(fallbackName);

        // Listen to the current customer's profile.
        const userRef = doc(db, 'users', user.uid);

        this.profileUnsubscribe = onSnapshot(
          userRef,
          (snapshot) => {
            // Ignore updates from a previous login session.
            if (auth.currentUser?.uid !== user.uid) {
              return;
            }

            if (!snapshot.exists()) {
              this.loggedInUserName.set(fallbackName);
              return;
            }

            const userData = snapshot.data();
            const firstName = userData['firstName'];

            if (typeof firstName === 'string' && firstName.trim()) {
              this.loggedInUserName.set(firstName.trim());
            } else {
              this.loggedInUserName.set(fallbackName);
            }
          },
          (error) => {
            console.error('Layout: Profile listener error:', error);
          },
        );
      },
      (error) => {
        console.error('Layout: Authentication listener error:', error);

        this.isLoggedIn.set(false);
        this.loggedInUserName.set('');
      },
    );
  }

  async logout(): Promise<void> {
    try {
      await signOut(auth);

      this.isLoggedIn.set(false);
      this.loggedInUserName.set('');

      this.closeMobileMenu();

      await this.router.navigateByUrl('/login', {
        replaceUrl: true,
      });
    } catch (error) {
      console.error('Logout failed:', error);
      alert('Unable to log out. Please try again.');
    }
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
  }

  ngOnDestroy(): void {
    this.cartSubscription?.unsubscribe();
    this.profileUnsubscribe?.();
    this.authUnsubscribe?.();
  }
}
