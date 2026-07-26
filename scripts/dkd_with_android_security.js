const { withAndroidManifest } = require('expo/config-plugins');

const BLOCKED_PERMISSION = 'android.permission.SYSTEM_ALERT_WINDOW';

module.exports = function withDkdAndroidSecurity(config) {
  return withAndroidManifest(config, (androidConfig) => {
    const manifest = androidConfig.modResults.manifest;
    manifest.$ = manifest.$ || {};
    manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';

    const application = manifest.application?.[0];
    if (!application) {
      throw new Error('Android application manifest bölümü bulunamadı.');
    }

    application.$ = application.$ || {};
    application.$['android:allowBackup'] = 'false';
    application.$['android:restoreAnyVersion'] = 'false';

    const permissions = Array.isArray(manifest['uses-permission']) ? manifest['uses-permission'] : [];
    manifest['uses-permission'] = permissions.filter(
      (entry) => entry?.$?.['android:name'] !== BLOCKED_PERMISSION,
    );

    manifest['uses-permission'].push({
      $: {
        'android:name': BLOCKED_PERMISSION,
        'tools:node': 'remove',
      },
    });

    return androidConfig;
  });
};
