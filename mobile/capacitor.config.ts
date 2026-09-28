import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ichat.app',
  appName: 'IChat',
  webDir: 'www/browser',
  server: {
    androidScheme: 'http',
    cleartext: true,           // allow plain HTTP traffic to local server
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#00A884',
      showSpinner: false,
    },
  },
};

export default config;

