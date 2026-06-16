// Config plugin: makes voice recognition work on Android 11+.
// 1) Ensures RECORD_AUDIO permission.
// 2) Adds the <queries> entry for android.speech.RecognitionService — without
//    this, Android 11+ apps cannot see the on-device speech recognizer and
//    Voice.start() fails with "Could not start voice".
const { withAndroidManifest, AndroidConfig } = require('@expo/config-plugins');

const RECOGNITION_ACTION = 'android.speech.RecognitionService';

module.exports = function withSpeechRecognition(config) {
  // 1) permission
  config = AndroidConfig.Permissions.withPermissions(config, [
    'android.permission.RECORD_AUDIO',
  ]);

  // 2) queries intent
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    manifest.queries = manifest.queries || [];
    if (manifest.queries.length === 0) manifest.queries.push({});
    const q = manifest.queries[0];
    q.intent = q.intent || [];

    const already = q.intent.some((intent) =>
      (intent.action || []).some(
        (a) => a?.$?.['android:name'] === RECOGNITION_ACTION
      )
    );
    if (!already) {
      q.intent.push({ action: [{ $: { 'android:name': RECOGNITION_ACTION } }] });
    }
    return cfg;
  });
};
