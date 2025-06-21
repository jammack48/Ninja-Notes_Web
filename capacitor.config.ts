
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.fe0a188b17834f1393b8515bcfc08b91',
  appName: 'whisper-to-task-flow',
  webDir: 'dist',
  server: {
    url: 'https://fe0a188b-1783-4f13-93b8-515bcfc08b91.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#488AFF",
      sound: "beep.wav",
    },
  },
};

export default config;
