import { Component, OnDestroy } from '@angular/core';

import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { Subscription } from 'rxjs';

import { StorefrontService } from '../../services/storefront.service';

import {
  IonHeader,
  IonIcon,
  IonRouterOutlet
} from '@ionic/angular';

import { addIcons } from 'ionicons';

import {
  searchOutline,
  personOutline,
  cart,
  menuOutline,
  closeOutline
} from 'ionicons/icons';

import {
  doc,
  getDoc
} from 'firebase/firestore';

import {
  onAuthStateChanged,
  Unsubscribe
} from 'firebase/auth';

import {
  auth,
  db
} from '../../firebase.config';

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
    IonRouterOutlet
  ]
})
export class LayoutPage implements OnDestroy {

  isMobileMenuOpen = false;

  loggedInUserName = '';

  private cartSubscription?: Subscription;

  private authUnsubscribe?: Unsubscribe;

  constructor(
    public storefront: StorefrontService
  ) {

    addIcons({
      searchOutline,
      personOutline,
      cart,
      menuOutline,
      closeOutline
    });

    this.cartSubscription =
      this.storefront.changed.subscribe(() => {
        // Keeps the layout updated whenever the cart changes.
      });

    this.loadLoggedInUser();
  }

  private loadLoggedInUser(): void {

    this.authUnsubscribe =
      onAuthStateChanged(auth, async (user) => {

        if (!user) {

          this.loggedInUserName = '';

          return;
        }

        try {

          console.log(
            'Layout: Logged-in Firebase user:',
            user.uid
          );

          const userRef =
            doc(db, 'users', user.uid);

          const userSnapshot =
            await getDoc(userRef);

          if (userSnapshot.exists()) {

            const userData =
              userSnapshot.data();

            const firstName =
              userData['first_name'];

            if (
              typeof firstName === 'string' &&
              firstName.trim()
            ) {

              this.loggedInUserName =
                firstName.trim();

            } else if (user.displayName) {

              this.loggedInUserName =
                user.displayName.split(' ')[0];

            } else if (user.email) {

              this.loggedInUserName =
                user.email.split('@')[0];

            } else {

              this.loggedInUserName =
                'Customer';

            }

          } else if (user.displayName) {

            this.loggedInUserName =
              user.displayName.split(' ')[0];

          } else if (user.email) {

            this.loggedInUserName =
              user.email.split('@')[0];

          } else {

            this.loggedInUserName =
              'Customer';

          }

          console.log(
            'Layout: Logged-in user name:',
            this.loggedInUserName
          );

        } catch (error) {

          console.error(
            'Layout: Failed to load user profile:',
            error
          );

          // Fallback if Firestore profile cannot be read.
          if (user.displayName) {

            this.loggedInUserName =
              user.displayName.split(' ')[0];

          } else if (user.email) {

            this.loggedInUserName =
              user.email.split('@')[0];

          } else {

            this.loggedInUserName =
              'Customer';

          }
        }
      });
  }

  ngOnDestroy(): void {

    this.cartSubscription?.unsubscribe();

    this.authUnsubscribe?.();
  }

  toggleMobileMenu(): void {

    this.isMobileMenuOpen =
      !this.isMobileMenuOpen;
  }

  closeMobileMenu(): void {

    this.isMobileMenuOpen = false;
  }
}