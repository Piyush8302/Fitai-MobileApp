// Config plugin: ensures android.enableJetifier=true survives `expo prebuild`.
// Needed because @react-native-voice/voice pulls legacy com.android.support libs
// that conflict with AndroidX (versionedparcelable). Jetifier rewrites them.
const { withGradleProperties } = require('@expo/config-plugins');

module.exports = function withJetifier(config) {
  return withGradleProperties(config, (cfg) => {
    const props = cfg.modResults;
    const set = (key, value) => {
      const existing = props.find((p) => p.type === 'property' && p.key === key);
      if (existing) existing.value = value;
      else props.push({ type: 'property', key, value });
    };
    set('android.useAndroidX', 'true');
    set('android.enableJetifier', 'true');
    return cfg;
  });
};
