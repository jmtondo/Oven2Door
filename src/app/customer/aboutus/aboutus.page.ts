import {
  Component,
  OnInit,
  CUSTOM_ELEMENTS_SCHEMA,
  ViewChild
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';

import { addIcons } from 'ionicons';

import {
  menuOutline,
  closeOutline,
  searchOutline,
  personOutline,
  cartOutline,
  arrowDownOutline,
  pizzaOutline,
  carOutline,
  heartOutline,
  leafOutline,
  flameOutline,
  happyOutline,
  peopleOutline,
  starOutline,
  logoFacebook,
  logoInstagram,
  logoLinkedin,
  logoTiktok,
  locationOutline,
  callOutline,
  mailOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-about-us',
  templateUrl: './aboutus.page.html',
  styleUrls: ['./aboutus.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    IonContent,
    IonIcon
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AboutUsPage implements OnInit {

  @ViewChild(IonContent)
  content!: IonContent;

  isMobileMenuOpen = false;
  isSearchOpen = false;

  constructor() {
    addIcons({
      menuOutline,
      closeOutline,
      searchOutline,
      personOutline,
      cartOutline,
      arrowDownOutline,
      pizzaOutline,
      carOutline,
      heartOutline,
      leafOutline,
      flameOutline,
      happyOutline,
      peopleOutline,
      starOutline,
      logoFacebook,
      logoInstagram,
      logoLinkedin,
      logoTiktok,
      locationOutline,
      callOutline,
      mailOutline
    });
  }

  ngOnInit(): void {}

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  toggleSearch(): void {
    this.isSearchOpen = !this.isSearchOpen;
  }

  async scrollToOurStory(): Promise<void> {
    const element = document.getElementById('our-story');

    if (!element || !this.content) {
      return;
    }

    const scrollElement = await this.content.getScrollElement();

    const elementPosition =
      element.getBoundingClientRect().top -
      scrollElement.getBoundingClientRect().top;

    const targetPosition =
      scrollElement.scrollTop +
      elementPosition -
      80;

    await this.content.scrollToPoint(
      0,
      Math.max(0, targetPosition),
      600
    );
  }
}