const { withAndroidManifest } = require('expo/config-plugins');

module.exports = (config) =>
  withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const permissions = manifest.manifest['uses-permission'] ?? [];

    const add = (name) => {
      if (!permissions.some((p) => p.$['android:name'] === name)) {
        permissions.push({ $: { 'android:name': name } });
      }
    };

    add('android.permission.RECEIVE_BOOT_COMPLETED');
    add('android.permission.SCHEDULE_EXACT_ALARM');

    manifest.manifest['uses-permission'] = permissions;
    return config;
  });
