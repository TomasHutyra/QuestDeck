const { withAndroidManifest } = require('expo/config-plugins');

// expo-audio bundles AudioRecordingService (microphone) and AudioControlsService
// (mediaPlayback via Media3 MediaSessionService). Media3 registers a BOOT_COMPLETED
// receiver to resume playback, which Android 15 forbids for these service types.
// QuestDeck only plays short sound effects — neither service is used — so we strip
// them and their associated permissions via manifest merger's tools:node="remove".
module.exports = function withAudioAndroid15Fix(config) {
  return withAndroidManifest(config, (mod) => {
    const { manifest } = mod.modResults;

    // Ensure tools namespace is present
    manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';

    // Remove unused services (triggers Android 15 BOOT_COMPLETED restriction)
    const application = manifest.application[0];
    if (!application.service) {
      application.service = [];
    }

    const servicesToRemove = [
      'expo.modules.audio.service.AudioRecordingService',
      'expo.modules.audio.service.AudioControlsService',
    ];
    for (const name of servicesToRemove) {
      if (!application.service.some((s) => s.$['android:name'] === name)) {
        application.service.push({
          $: { 'android:name': name, 'tools:node': 'remove' },
        });
      }
    }

    // Remove unused permissions tied to the removed services
    // (POST_NOTIFICATIONS is kept — QuestDeck uses local reminders)
    if (!manifest['uses-permission']) {
      manifest['uses-permission'] = [];
    }
    const permissionsToRemove = [
      'android.permission.RECORD_AUDIO',
      'android.permission.FOREGROUND_SERVICE_MICROPHONE',
      'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
    ];
    for (const name of permissionsToRemove) {
      if (!manifest['uses-permission'].some((p) => p.$['android:name'] === name)) {
        manifest['uses-permission'].push({
          $: { 'android:name': name, 'tools:node': 'remove' },
        });
      }
    }

    return mod;
  });
};
