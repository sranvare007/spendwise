import { File, Directory, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

// Receipt photos live in the app's document directory, which the OS never purges. The DB
// stores only the file name: on iOS the container path changes across app updates, so an
// absolute URI saved today would point nowhere after the next install.
//
// A draft's `receipt` is either such a saved file name, or the URI of a freshly picked image
// still sitting in the picker's cache — it is copied into place only when the expense saves.

export const receiptsDir = () => new Directory(Paths.document, 'receipts');
const isSavedName = (v: string) => !v.includes('/');

// Displayable URI for a draft or expense receipt value.
export function receiptUri(value: string): string {
  return isSavedName(value) ? new File(receiptsDir(), value).uri : value;
}

export type PickResult = { uri: string } | { canceled: true } | { denied: true };

// Opens the camera or photo library. The library uses the system photo picker, which needs
// no permission; the camera asks the first time.
export async function pickReceipt(source: 'camera' | 'library'): Promise<PickResult> {
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.6 };
  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return { denied: true };
  }
  const res = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (res.canceled || !res.assets?.length) return { canceled: true };
  return { uri: res.assets[0].uri };
}

// Copies a picked image into the receipts directory and returns its saved file name. Values
// that are already saved pass straight through. Throws if the copy fails.
export function persistReceipt(value: string): string {
  if (isSavedName(value)) return value;
  const dir = receiptsDir();
  dir.create({ idempotent: true, intermediates: true });
  const ext = value.match(/\.(\w{2,5})(?:\?.*)?$/)?.[1]?.toLowerCase() ?? 'jpg';
  const name = `r${Date.now()}.${ext}`;
  new File(value).copy(new File(dir, name));
  return name;
}

export function deleteReceiptFile(name: string) {
  try {
    const f = new File(receiptsDir(), name);
    if (f.exists) f.delete();
  } catch {
    // a leftover file is harmless
  }
}

export function deleteAllReceiptFiles() {
  try {
    const dir = receiptsDir();
    if (dir.exists) dir.delete();
  } catch {
    // ignore
  }
}
