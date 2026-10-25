import { Component, NgZone, OnDestroy } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular';
import { Router } from '@angular/router';

import { App } from '@capacitor/app';
import { Capacitor, PluginListenerHandle } from '@capacitor/core';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent implements OnDestroy {
  private appUrlListener?: PluginListenerHandle;
  private destroyed = false;

  constructor(private router: Router, private ngZone: NgZone) {
    void this.initializeMayaDeepLinks();
  }

  private async initializeMayaDeepLinks(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    try {
      // Handles Maya returning while Oven2Door is already running.
      const listener = await App.addListener('appUrlOpen', ({ url }) => {
        this.handleMayaRedirect(url);
      });

      if (this.destroyed) {
        await listener.remove();
        return;
      }

      this.appUrlListener = listener;

      // Handles opening Oven2Door from a payment URL when closed.
      const launchUrl = await App.getLaunchUrl();

      if (launchUrl?.url) {
        this.handleMayaRedirect(launchUrl.url);
      }
    } catch (error) {
      console.error('Failed to initialize Maya deep links:', error);
    }
  }

  private handleMayaRedirect(url: string): void {
    try {
      const parsedUrl = new URL(url);

      // Only handle Oven2Door payment result links.
      if (
        parsedUrl.protocol !== 'https:' ||
        parsedUrl.hostname !== 'oven2door.netlify.app' ||
        parsedUrl.pathname !== '/payment-result'
      ) {
        return;
      }

      const result = parsedUrl.searchParams.get('result');

      // Only accept the expected payment return types.
      if (result !== 'success' && result !== 'failure' && result !== 'cancel') {
        console.warn('Unknown Maya payment result:', result);
        return;
      }

      const queryParams: Record<string, string> = {};

      parsedUrl.searchParams.forEach((value, key) => {
        queryParams[key] = value;
      });

      this.ngZone.run(() => {
        void this.router.navigate(['/payment-result'], {
          queryParams,
        });
      });
    } catch (error) {
      console.error('Invalid Maya payment redirect URL:', error);
    }
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    void this.appUrlListener?.remove();
  }
}
