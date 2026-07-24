const base = require('./app.json');

const googleMapsApiKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';
const android = { ...base.expo.android };
const plugins = [...(base.expo.plugins || [])];

if (googleMapsApiKey) {
  android.config = { ...(android.config || {}), googleMaps: { apiKey: googleMapsApiKey } };
  plugins.push([
    'react-native-maps',
    {
      androidGoogleMapsApiKey: googleMapsApiKey,
    },
  ]);
}

module.exports = {
  ...base,
  expo: {
    ...base.expo,
    android,
    plugins,
  },
};
