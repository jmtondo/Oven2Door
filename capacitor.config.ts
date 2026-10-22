import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'Oven2Door',
  webDir: 'www',
  plugins: {
    CapacitorHttp: {
      enabled: false,
    },
  },
};

export default config;
