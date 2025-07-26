import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.dpt.financesmanager',
    appName: 'Finances Manager',
    webDir: 'dist/finances-manager/browser',
    server: {
        androidScheme: 'file',
        hostname: 'localhost',
        allowNavigation: ['fonts.gstatic.com','apis.dividendosparatodos.com.br'],
    },
    plugins: {
        SplashScreen: {
            launchAutoHide: true,
            showSpinner: false,
            androidSplashResourceName: 'splash',
            splashFullScreen: true,
            splashImmersive: true
        }
    }
};

export default config;
