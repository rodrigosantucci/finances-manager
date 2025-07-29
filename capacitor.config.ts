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
      launchShowDuration: 3000, // Duração em milissegundos que a splash screen será exibida (3 segundos)
      launchAutoHide: true, // Se a splash screen deve esconder automaticamente
      backgroundColor: "##036A35", // Cor de fundo da splash screen (branco para a logo do Angular)
      androidSplashResourceName: "splash", // Nome do arquivo de imagem da splash screen para Android (sem extensão)
      androidScaleType: "CENTER_CROP", // Ou "CENTER", "FIT_CENTER", etc.
      showSpinner: true, // Mostrar um spinner de carregamento
      androidSpinnerStyle: "large", // Estilo do spinner no Android ("small", "large")
      iosSpinnerStyle: "small", // Estilo do spinner no iOS ("small", "large")
      spinnerColor: "#999999", // Cor do spinner
      splashFullScreen: true, // A splash screen ocupa a tela inteira (Android)
      splashImmersive: true, // A splash screen é imersiva (Android)
      layoutName: "launch_screen", // Nome do layout da splash screen (Android)
      }
  }
};

export default config;
