const { ensureBrandingAssets } = require('./scripts/dkd_generate_branding_assets');
const { ensureNotificationSounds } = require('./scripts/dkd_generate_notification_sounds');

ensureBrandingAssets();
ensureNotificationSounds();

const dkdBase = require('./app.json');
const dkdGoogleAds = dkdBase['react-native-google-mobile-ads'] || {};

module.exports = {
  ...dkdBase,
  'react-native-google-mobile-ads': {
    ...dkdGoogleAds,
    android_app_id: process.env.ADMOB_ANDROID_APP_ID || dkdGoogleAds.android_app_id || 'ca-app-pub-3940256099942544~3347511713',
  },
};
