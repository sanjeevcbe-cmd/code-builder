import { LocalDeviceIdentity } from '../types/builder';

const DEVICE_STORAGE_KEY = 'codebuilder_device_identity_v1';

function bufferToBase64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function sha256Hex(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const digest = await window.crypto.subtle.digest('SHA-256', encoded);
  const bytes = Array.from(new Uint8Array(digest));
  return bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function generateMasterKeyBase64(): Promise<string> {
  const key = await window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  const raw = await window.crypto.subtle.exportKey('raw', key);
  return bufferToBase64(raw);
}

async function importMasterKey(base64Key: string): Promise<CryptoKey> {
  const rawBytes = base64ToUint8Array(base64Key);
  return window.crypto.subtle.importKey(
    'raw',
    rawBytes.buffer as ArrayBuffer,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptPayloadE2E(
  plaintextJson: string,
  masterKeyBase64: string
): Promise<{ ciphertext: string; iv: string; salt: string; checksum: string }> {
  const key = await importMasterKey(masterKeyBase64);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintextJson);

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  );

  const checksumFull = await sha256Hex(plaintextJson);
  return {
    ciphertext: bufferToBase64(encryptedBuffer),
    iv: bufferToBase64(iv),
    salt: 'AES-256-GCM-WEBCRYPTO',
    checksum: checksumFull.slice(0, 16).toUpperCase(),
  };
}

export async function decryptPayloadE2E(
  ciphertextBase64: string,
  ivBase64: string,
  masterKeyBase64: string
): Promise<string> {
  const key = await importMasterKey(masterKeyBase64);
  const iv = base64ToUint8Array(ivBase64);
  const cipherBytes = base64ToUint8Array(ciphertextBase64);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    key,
    cipherBytes.buffer as ArrayBuffer
  );

  return new TextDecoder().decode(decryptedBuffer);
}

function detectPlatformLabel(): string {
  const ua = navigator.userAgent;
  if (/Macintosh|Mac OS X/i.test(ua)) return 'macOS Workstation';
  if (/Windows/i.test(ua)) return 'Windows Workstation';
  if (/iPhone|iPad/i.test(ua)) return 'iOS Mobile Client';
  if (/Android/i.test(ua)) return 'Android Client';
  if (/Linux/i.test(ua)) return 'Linux Workstation';
  return 'Web Studio Client';
}

export async function getOrCreateDeviceIdentity(): Promise<LocalDeviceIdentity> {
  try {
    const existingRaw = localStorage.getItem(DEVICE_STORAGE_KEY);
    if (existingRaw) {
      const parsed = JSON.parse(existingRaw) as LocalDeviceIdentity;
      if (parsed.deviceId && parsed.masterKeyBase64 && parsed.vaultId) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Could not read device identity from localStorage:', e);
  }

  const randomBytes = window.crypto.getRandomValues(new Uint8Array(8));
  const hexId = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const deviceId = `dev-${hexId.slice(0, 8)}`;
  const vaultId = `vault-${hexId.slice(8, 16)}`;
  const masterKeyBase64 = await generateMasterKeyBase64();
  const fpHash = await sha256Hex(`${deviceId}:${masterKeyBase64}`);
  const formattedFp = fpHash
    .slice(0, 16)
    .toUpperCase()
    .match(/.{1,4}/g)!
    .join(':');

  const identity: LocalDeviceIdentity = {
    deviceId,
    deviceName: `${detectPlatformLabel()} (${deviceId.slice(4, 8).toUpperCase()})`,
    platform: detectPlatformLabel(),
    publicKeyFingerprint: `SHA256:${formattedFp}`,
    vaultId,
    masterKeyBase64,
  };

  localStorage.setItem(DEVICE_STORAGE_KEY, JSON.stringify(identity));
  return identity;
}

export function saveDeviceIdentity(identity: LocalDeviceIdentity): void {
  localStorage.setItem(DEVICE_STORAGE_KEY, JSON.stringify(identity));
}
