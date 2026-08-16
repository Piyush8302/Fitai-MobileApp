// Shared square profile-photo picker (camera or gallery) → small base64 data URI.
//
// Why not base64:true on the picker itself: encoding the FULL-resolution cropped
// photo to base64 inside the picker spikes native + JS memory (a 3-4MB string
// crosses the bridge). On low-RAM Androids that pressure gets the MainActivity
// killed right when the crop is confirmed — the app appears to "restart".
// So the picker only returns a file URI (cheap); we then downscale to 512px with
// expo-image-manipulator and base64 THAT (~40-80KB).
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Alert } from 'react-native';

// source: 'camera' | 'gallery'. Returns a data URI string, or null if the user
// cancelled / denied permission (permission denial shows its own alert).
export const pickSquarePhoto = async (source) => {
  const perm = source === 'camera'
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('Permission needed', `Allow ${source === 'camera' ? 'camera' : 'photo'} access in Settings.`);
    return null;
  }
  const fn = source === 'camera' ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
  const result = await fn({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8, exif: false });
  const asset = !result.canceled && result.assets?.[0];
  if (!asset?.uri) return null;
  const context = ImageManipulator.manipulate(asset.uri);
  context.resize({ width: 512 });
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.6, base64: true });
  return saved.base64 ? `data:image/jpeg;base64,${saved.base64}` : null;
};

// Meal photo for calorie estimation. Unlike the profile picker this keeps the
// full frame — a square crop cuts off half the plate — and goes a bit wider
// (768px) because the model has to read what's actually on the plate.
export const pickMealPhoto = async (source) => {
  const perm = source === 'camera'
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('Permission needed', `Allow ${source === 'camera' ? 'camera' : 'photo'} access in Settings.`);
    return null;
  }
  const fn = source === 'camera' ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
  const result = await fn({ mediaTypes: ['images'], allowsEditing: false, quality: 0.8, exif: false });
  const asset = !result.canceled && result.assets?.[0];
  if (!asset?.uri) return null;
  const context = ImageManipulator.manipulate(asset.uri);
  context.resize({ width: 768 });
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
  return saved.base64 ? `data:image/jpeg;base64,${saved.base64}` : null;
};
