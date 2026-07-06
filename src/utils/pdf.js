// Generate a PDF from HTML, SAVE it to the device (a real download), and open
// the share sheet — both, in one call.
//
// Android: uses the Storage Access Framework. The first time, the user picks a
// folder (e.g. Downloads); that grant is cached, so later saves are silent.
// iOS: the share sheet already offers "Save to Files", so we just share.
import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DIR_KEY = 'pdfSaveDirUri';

const cleanName = (s) => String(s || 'file').replace(/[^a-z0-9\-_. ]/gi, '').replace(/\s+/g, '-').slice(0, 60) || 'file';

async function saveToAndroid(tempUri, filename) {
  const SAF = FileSystem.StorageAccessFramework;
  const base64 = await FileSystem.readAsStringAsync(tempUri, { encoding: FileSystem.EncodingType.Base64 });

  const grantDir = async () => {
    const perm = await SAF.requestDirectoryPermissionsAsync();
    if (!perm.granted) return null;
    await AsyncStorage.setItem(DIR_KEY, perm.directoryUri);
    return perm.directoryUri;
  };

  let dirUri = await AsyncStorage.getItem(DIR_KEY);
  if (!dirUri) dirUri = await grantDir();
  if (!dirUri) return null;

  const writeInto = async (dir) => {
    const dest = await SAF.createFileAsync(dir, filename, 'application/pdf');
    await FileSystem.writeAsStringAsync(dest, base64, { encoding: FileSystem.EncodingType.Base64 });
    return dest;
  };

  try {
    return await writeInto(dirUri);
  } catch (e) {
    // Cached folder no longer valid → ask once more.
    await AsyncStorage.removeItem(DIR_KEY);
    const fresh = await grantDir();
    if (!fresh) return null;
    try { return await writeInto(fresh); } catch (e2) { return null; }
  }
}

// html: full HTML string • name: base filename (no extension) • dialogTitle: share title
// Returns { uri, savedTo } — savedTo is the on-device path when the save succeeded.
export async function downloadAndSharePdf(html, name, dialogTitle) {
  const filename = `${cleanName(name)}.pdf`;
  const { uri } = await Print.printToFileAsync({ html });

  let savedTo = null;
  if (Platform.OS === 'android') {
    try { savedTo = await saveToAndroid(uri, filename); } catch (e) { savedTo = null; }
  }

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: dialogTitle || filename, UTI: 'com.adobe.pdf' });
  }
  return { uri, savedTo };
}
