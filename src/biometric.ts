import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

// Thin wrapper around expo-local-authentication that hides platform quirks and
// turns the raw API into friendly capability/outcome shapes the UI can render.

export interface BioCapability {
  available: boolean; // hardware present AND a biometric is enrolled
  hasHardware: boolean;
  enrolled: boolean;
  label: string; // 'Face ID' | 'Touch ID' | 'Fingerprint' | 'Biometrics' …
  reason?: string; // human-readable explanation when not available
}

export interface AuthOutcome {
  ok: boolean;
  error?: string; // normalized error code from LocalAuthentication
  message?: string; // friendly message to show the user
}

function labelFor(types: LocalAuthentication.AuthenticationType[]): string {
  const T = LocalAuthentication.AuthenticationType;
  if (types.includes(T.FACIAL_RECOGNITION)) return Platform.OS === 'ios' ? 'Face ID' : 'Face Unlock';
  if (types.includes(T.FINGERPRINT)) return Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
  if (types.includes(T.IRIS)) return 'Iris';
  return 'Biometrics';
}

// Inspects hardware + enrollment so callers can decide whether to offer the lock.
export async function getBiometricCapability(): Promise<BioCapability> {
  if (Platform.OS === 'web') {
    return { available: false, hasHardware: false, enrolled: false, label: 'Biometrics', reason: 'Biometric lock is not supported on web.' };
  }
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) {
      return { available: false, hasHardware: false, enrolled: false, label: 'Biometrics', reason: 'This device has no biometric hardware.' };
    }
    const [enrolled, types] = await Promise.all([
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
    ]);
    const label = labelFor(types);
    if (!enrolled) {
      return { available: false, hasHardware: true, enrolled: false, label, reason: `No ${label} is set up. Add it in your device settings, then try again.` };
    }
    return { available: true, hasHardware: true, enrolled: true, label };
  } catch {
    return { available: false, hasHardware: false, enrolled: false, label: 'Biometrics', reason: 'Could not check biometric support on this device.' };
  }
}

function messageFor(error?: string): string {
  switch (error) {
    case 'user_cancel':
    case 'system_cancel':
    case 'app_cancel':
      return 'Authentication cancelled.';
    case 'user_fallback':
      return 'Fallback was selected.';
    case 'not_enrolled':
      return 'No biometrics are enrolled on this device.';
    case 'not_available':
    case 'invalid_context':
      return 'Biometric authentication is not available right now.';
    case 'passcode_not_set':
      return 'Set a device passcode/screen lock to use biometric unlock.';
    case 'lockout':
      return 'Too many attempts. Wait a moment, then try again or use your passcode.';
    case 'authentication_failed':
      return 'Could not verify your identity. Try again.';
    case 'timeout':
      return 'Authentication timed out. Try again.';
    default:
      return 'Authentication failed. Please try again.';
  }
}

// Runs a single authentication prompt. `disableDeviceFallback` is left false so
// the OS offers the passcode/PIN as a fallback (helps avoid hard lockouts).
export async function runAuth(promptMessage: string): Promise<AuthOutcome> {
  if (Platform.OS === 'web') {
    return { ok: false, error: 'not_available', message: 'Biometric lock is not supported on web.' };
  }
  try {
    const res = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Cancel',
      fallbackLabel: 'Use passcode',
      disableDeviceFallback: false,
    });
    if (res.success) return { ok: true };
    return { ok: false, error: res.error, message: messageFor(res.error) };
  } catch {
    return { ok: false, error: 'unknown', message: 'Authentication could not be started.' };
  }
}
