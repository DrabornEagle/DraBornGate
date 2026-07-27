const { ensureBrandingAssets } = require('./scripts/dkd_generate_branding_assets');
const { ensureNotificationSounds } = require('./scripts/dkd_generate_notification_sounds');

ensureBrandingAssets();
ensureNotificationSounds();

const dkdBase = require('./app.json');
const dkdGoogleAds = dkdBase['react-native-google-mobile-ads'] || {};
const dkdAndroidAppId = process.env.ADMOB_ANDROID_APP_ID
  || dkdGoogleAds.android_app_id
  || 'ca-app-pub-3940256099942544~3347511713';

const dkdPlugins = (dkdBase.expo.plugins || []).map((dkdPlugin) => {
  const dkdPluginName = Array.isArray(dkdPlugin) ? dkdPlugin[0] : dkdPlugin;
  if (dkdPluginName !== 'react-native-google-mobile-ads') return dkdPlugin;
  return [
    'react-native-google-mobile-ads',
    {
      androidAppId: dkdAndroidAppId,
      delayAppMeasurementInit: true,
      optimizeInitialization: true,
      optimizeAdLoading: true,
    },
  ];
});

module.exports = {
  expo: {
    ...dkdBase.expo,
    plugins: dkdPlugins,
  },
};
