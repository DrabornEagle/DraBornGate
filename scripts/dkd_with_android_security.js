const { withAndroidManifest, withAndroidStyles } = require('expo/config-plugins');

const BLOCKED_PERMISSION = 'android.permission.SYSTEM_ALERT_WINDOW';

function dkdUpsertStyleItem(dkdStyle, dkdName, dkdValue) {
  dkdStyle.item = Array.isArray(dkdStyle.item) ? dkdStyle.item : [];
  const dkdExisting = dkdStyle.item.find((dkdItem) => dkdItem?.$?.name === dkdName);
  if (dkdExisting) {
    dkdExisting._ = dkdValue;
    return;
  }
  dkdStyle.item.push({ $: { name: dkdName }, _: dkdValue });
}

module.exports = function withDkdAndroidSecurity(config) {
  let dkdConfig = withAndroidManifest(config, (androidConfig) => {
    const manifest = androidConfig.modResults.manifest;
    manifest.$ = manifest.$ || {};
    manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';

    const application = manifest.application?.[0];
    if (!application) throw new Error('Android application manifest bölümü bulunamadı.');

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

  dkdConfig = withAndroidStyles(dkdConfig, (androidConfig) => {
    const dkdResources = androidConfig.modResults.resources;
    const dkdStyles = Array.isArray(dkdResources.style) ? dkdResources.style : [];
    const dkdAppStyles = dkdStyles.filter((dkdStyle) => String(dkdStyle?.$?.name || '').includes('AppTheme'));
    if (!dkdAppStyles.length) throw new Error('Android AppTheme stili bulunamadı.');

    dkdAppStyles.forEach((dkdStyle) => {
      dkdUpsertStyleItem(dkdStyle, 'android:navigationBarColor', '@android:color/transparent');
      dkdUpsertStyleItem(dkdStyle, 'android:windowLightNavigationBar', 'false');
      dkdUpsertStyleItem(dkdStyle, 'android:enforceNavigationBarContrast', 'false');
      dkdUpsertStyleItem(dkdStyle, 'android:windowDrawsSystemBarBackgrounds', 'true');
      dkdUpsertStyleItem(dkdStyle, 'android:windowActionModeOverlay', 'true');
    });

    dkdResources.style = dkdStyles;
    return androidConfig;
  });

  return dkdConfig;
};
