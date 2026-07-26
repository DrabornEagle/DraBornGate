const { ensureBrandingAssets } = require('./scripts/dkd_generate_branding_assets');
const { ensureNotificationSounds } = require('./scripts/dkd_generate_notification_sounds');

ensureBrandingAssets();
ensureNotificationSounds();

module.exports = require('./app.json');
