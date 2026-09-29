import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';


import {
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
  IonIcon
} from '@ionic/angular';


import { addIcons } from 'ionicons';


import {
  searchOutline,
  personOutline,
  cart,
  menuOutline,
  closeOutline,
  carOutline,
  cardOutline,
  pizza,
  chevronDownOutline,
  logoFacebook,
  logoInstagram,
  logoTiktok,
  locationOutline,
  callOutline,
  mailOutline
} from 'ionicons/icons';


interface FaqItem {
  question: string;
  answer: string;
  open?: boolean;
}


interface FaqGroup {
  title: string;
  icon: string;
  items: FaqItem[];
}


@Component({
  selector: 'app-faqs',
  templateUrl: 'faqs.page.html',
  styleUrls: ['faqs.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    IonContent,
    IonGrid,
    IonRow,
    IonCol,
    IonIcon
  ]
})
export class FaqsPage {
  isMobileMenuOpen = false;
  isSearchOpen = false; // seacrh icon


  faqGroups: FaqGroup[] = [
    {
      title: 'Ordering & Delivery',
      icon: 'car-outline',
      items: [
        {
          question: 'How long does delivery take?',
          answer:
            'Our standard delivery time is 30 to 45 minutes depending on traffic conditions and your distance from our nearest branch.',
          open: true
        },
        {
          question:
            'Is there a minimum order requirement for delivery?',
          answer:
            'No, there is no minimum order requirement! You can order as much or as little as you’d like.'
        },
        {
          question:
            'How can I track my active order?',
          answer:
            'You can use the Order Tracking page in the top menu bar.'
        }
      ]
    },
    {
      title: 'Payment Methods',
      icon: 'card-outline',
      items: [
        {
          question:
            'What payment methods do you accept?',
          answer:
            'We currently accept payments exclusively through PayMaya.'
        },
        {
          question:
            'Can I pay with cash or credit cards?',
          answer:
            'We currently do not accept cash on delivery or direct card payments. All transactions are processed through Maya for a fast and cashless checkout.'
        }
      ]
    },
    {
      title: 'Menu & Dietary Options',
      icon: 'pizza',
      items: [
        {
          question:
            'Do you offer vegetarian options?',
          answer:
            'Yes! We offer delicious plant-based options like our Veggie Supreme pizza, extra cheese variations, and vegetarian sides.'
        },
        {
          question:
            'Can I customize pizza toppings or crust?',
          answer:
            'We do not offer custom topping or crust modifications, but we have a wide variety of uniquely crafted pizzas on our menu to satisfy every craving!'
        }
      ]
    }
  ];


  constructor() {
    addIcons({
      searchOutline,
      personOutline,
      cart,
      menuOutline,
      closeOutline,
      carOutline,
      cardOutline,
      pizza,
      chevronDownOutline,
      logoFacebook,
      logoInstagram,
      logoTiktok,
      locationOutline,
      callOutline,
      mailOutline
    });
  }


  toggleMobileMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }


  //mobile search bar
  toggleSearch() {
    this.isSearchOpen = !this.isSearchOpen;
  }
}
