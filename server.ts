import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import zlib from 'zlib';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';

// Ensure valid PNG icons exist in public/ for PWA installability compliance
function createSolidBlockPng(width: number, height: number, isMaskable = false): Buffer {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function crc32(buf: Buffer): number {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c ^= buf[i];
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type: string, data: Buffer): Buffer {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    const combined = Buffer.concat([typeBuf, data]);
    crcBuf.writeUInt32BE(crc32(combined), 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const rawData = Buffer.alloc(height * (1 + width * 4));
  const margin = isMaskable ? Math.floor(width * 0.22) : Math.floor(width * 0.16);

  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + width * 4);
    rawData[rowStart] = 0; // filter type 0
    for (let x = 0; x < width; x++) {
      const px = rowStart + 1 + x * 4;
      // Background: deep slate #0F172A (15, 23, 42)
      let r = 15, g = 23, b = 42, a = 255;

      // Draw geometric visual block emblem in safe zone
      const inSafeBox = x >= margin && x < width - margin && y >= margin && y < height - margin;
      if (inSafeBox) {
        const relX = (x - margin) / (width - 2 * margin);
        const relY = (y - margin) / (height - 2 * margin);

        // Top block node
        const inTopNode = relX > 0.25 && relX < 0.75 && relY > 0.15 && relY < 0.44;
        // Bottom block node
        const inBottomNode = relX > 0.25 && relX < 0.75 && relY > 0.56 && relY < 0.85;
        // Connector line
        const inConnector = relX > 0.46 && relX < 0.54 && relY >= 0.44 && relY <= 0.56;

        if (inTopNode) {
          r = 2; g = 132; b = 199; // Sky 600 #0284C7
        } else if (inBottomNode) {
          r = 56; g = 189; b = 248; // Sky 400 #38BDF8
        } else if (inConnector) {
          r = 125; g = 211; b = 252; // Sky 300 #7DD3FC
        }
      }

      rawData[px] = r;
      rawData[px + 1] = g;
      rawData[px + 2] = b;
      rawData[px + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const iend = Buffer.alloc(0);

  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', iend),
  ]);
}

function ensurePwaIcons() {
  const publicDir = path.resolve(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  const files: Array<{ name: string; size: number; maskable: boolean }> = [
    { name: 'pwa-192x192.png', size: 192, maskable: false },
    { name: 'pwa-512x512.png', size: 512, maskable: false },
    { name: 'pwa-maskable-512x512.png', size: 512, maskable: true },
    { name: 'apple-touch-icon.png', size: 180, maskable: false },
  ];
  for (const f of files) {
    const filePath = path.join(publicDir, f.name);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, createSolidBlockPng(f.size, f.size, f.maskable));
    }
  }
}

export interface PairedDeviceRecord {
  deviceId: string;
  deviceName: string;
  platform: string;
  publicKeyFingerprint: string;
  pairedAt: string;
  lastSyncAt: string;
}

export interface EncryptedEnvelope {
  ciphertext: string;
  iv: string;
  salt: string;
  version: number;
  updatedAt: string;
  senderDeviceId: string;
  senderDeviceName: string;
  byteSize: number;
  checksum: string;
}

export interface VaultRecord {
  vaultId: string;
  createdAt: string;
  allowedDevices: PairedDeviceRecord[];
  encryptedPayload: EncryptedEnvelope | null;
}

export interface PairingTicket {
  code: string;
  vaultId: string;
  createdByDeviceId: string;
  createdByDeviceName: string;
  expiresAt: number;
}

const DATA_DIR = path.resolve(process.cwd(), '.data');
const VAULT_STORE_FILE = path.join(DATA_DIR, 'encrypted-vaults.json');

function loadVaultStore(): Record<string, VaultRecord> {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(VAULT_STORE_FILE)) {
      const raw = fs.readFileSync(VAULT_STORE_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Failed to read vault store, starting clean:', err);
  }
  return {};
}

function saveVaultStore(store: Record<string, VaultRecord>) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(VAULT_STORE_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save vault store:', err);
  }
}

async function startServer() {
  ensurePwaIcons();

  const app = express();
  const server = http.createServer(app);
  app.use(express.json({ limit: '5mb' }));

  const vaults: Record<string, VaultRecord> = loadVaultStore();
  const pairingTickets = new Map<string, PairingTicket>();

  // Track active WebSocket connections per vaultId
  const vaultSockets = new Map<string, Set<{ ws: WebSocket; deviceId: string; deviceName: string }>>();

  function broadcastToVault(vaultId: string, event: Record<string, unknown>, excludeDeviceId?: string) {
    const clients = vaultSockets.get(vaultId);
    if (!clients) return;
    const message = JSON.stringify(event);
    for (const client of clients) {
      if (excludeDeviceId && client.deviceId === excludeDeviceId) continue;
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
      }
    }
  }

  function getActiveDeviceIds(vaultId: string): string[] {
    const clients = vaultSockets.get(vaultId);
    if (!clients) return [];
    return Array.from(new Set(Array.from(clients).map((c) => c.deviceId)));
  }

  // Health endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', mode: 'zero-knowledge-e2e-relay' });
  });

  // Initialize or register vault for origin device
  app.post('/api/vault/init', (req, res) => {
    const { vaultId, device } = req.body as {
      vaultId?: string;
      device?: {
        deviceId: string;
        deviceName: string;
        platform: string;
        publicKeyFingerprint: string;
      };
    };

    if (!vaultId || !device || !device.deviceId) {
      res.status(400).json({ error: 'Missing vaultId or device identity' });
      return;
    }

    const now = new Date().toISOString();
    let vault = vaults[vaultId];

    if (!vault) {
      vault = {
        vaultId,
        createdAt: now,
        allowedDevices: [
          {
            deviceId: device.deviceId,
            deviceName: device.deviceName || 'Primary Workstation',
            platform: device.platform || 'Web Browser',
            publicKeyFingerprint: device.publicKeyFingerprint || 'SHA256:0000',
            pairedAt: now,
            lastSyncAt: now,
          },
        ],
        encryptedPayload: null,
      };
      vaults[vaultId] = vault;
      saveVaultStore(vaults);
      res.json({
        vaultId: vault.vaultId,
        allowedDevices: vault.allowedDevices,
        encryptedPayload: vault.encryptedPayload,
        onlineDeviceIds: getActiveDeviceIds(vaultId),
      });
      return;
    }

    // Verify if this device is allowed in this existing vault
    const existingDevice = vault.allowedDevices.find((d) => d.deviceId === device.deviceId);
    if (!existingDevice) {
      res.status(403).json({
        error: 'DEVICE_NOT_PAIRED',
        message: 'This device is not paired with the requested encrypted vault.',
      });
      return;
    }

    existingDevice.lastSyncAt = now;
    existingDevice.deviceName = device.deviceName || existingDevice.deviceName;
    saveVaultStore(vaults);

    res.json({
      vaultId: vault.vaultId,
      allowedDevices: vault.allowedDevices,
      encryptedPayload: vault.encryptedPayload,
      onlineDeviceIds: getActiveDeviceIds(vaultId),
    });
  });

  // Get encrypted snapshot & paired device list (strictly for paired devices)
  app.get('/api/vault/:vaultId', (req, res) => {
    const { vaultId } = req.params;
    const deviceId = req.header('x-device-id');

    const vault = vaults[vaultId];
    if (!vault) {
      res.status(404).json({ error: 'VAULT_NOT_FOUND' });
      return;
    }

    const isAllowed = vault.allowedDevices.some((d) => d.deviceId === deviceId);
    if (!isAllowed) {
      res.status(403).json({
        error: 'DEVICE_NOT_PAIRED',
        message: 'Access denied: only paired devices can read encrypted vault snapshots.',
      });
      return;
    }

    res.json({
      vaultId: vault.vaultId,
      allowedDevices: vault.allowedDevices,
      encryptedPayload: vault.encryptedPayload,
      onlineDeviceIds: getActiveDeviceIds(vaultId),
    });
  });

  // Push E2E encrypted snapshot (server only sees ciphertext + IV, never plaintext)
  app.post('/api/vault/:vaultId/sync', (req, res) => {
    const { vaultId } = req.params;
    const deviceId = req.header('x-device-id');
    const { ciphertext, iv, salt, version, checksum } = req.body as {
      ciphertext?: string;
      iv?: string;
      salt?: string;
      version?: number;
      checksum?: string;
    };

    if (!ciphertext || !iv) {
      res.status(400).json({ error: 'Missing ciphertext or iv' });
      return;
    }

    const vault = vaults[vaultId];
    if (!vault) {
      res.status(404).json({ error: 'VAULT_NOT_FOUND' });
      return;
    }

    const device = vault.allowedDevices.find((d) => d.deviceId === deviceId);
    if (!device) {
      res.status(403).json({
        error: 'DEVICE_NOT_PAIRED',
        message: 'Unpaired or revoked device cannot push to this vault.',
      });
      return;
    }

    const now = new Date().toISOString();
    device.lastSyncAt = now;

    const nextVersion = Math.max((vault.encryptedPayload?.version ?? 0) + 1, version ?? 1);
    const envelope: EncryptedEnvelope = {
      ciphertext,
      iv,
      salt: salt || 'PBKDF2-SHA256',
      version: nextVersion,
      updatedAt: now,
      senderDeviceId: device.deviceId,
      senderDeviceName: device.deviceName,
      byteSize: Buffer.byteLength(ciphertext, 'utf8'),
      checksum: checksum || '',
    };

    vault.encryptedPayload = envelope;
    saveVaultStore(vaults);

    // Broadcast real-time update to all other paired devices connected via WebSocket
    broadcastToVault(
      vaultId,
      {
        type: 'vault:ciphertext_updated',
        vaultId,
        encryptedPayload: envelope,
        allowedDevices: vault.allowedDevices,
      },
      device.deviceId
    );

    res.json({
      ok: true,
      encryptedPayload: envelope,
      allowedDevices: vault.allowedDevices,
    });
  });

  // Create a 6-digit pairing ticket from an already-paired device
  app.post('/api/pairing/create', (req, res) => {
    const { vaultId, deviceId } = req.body as { vaultId?: string; deviceId?: string };
    if (!vaultId || !deviceId) {
      res.status(400).json({ error: 'Missing vaultId or deviceId' });
      return;
    }

    const vault = vaults[vaultId];
    if (!vault) {
      res.status(404).json({ error: 'VAULT_NOT_FOUND' });
      return;
    }

    const creator = vault.allowedDevices.find((d) => d.deviceId === deviceId);
    if (!creator) {
      res.status(403).json({ error: 'DEVICE_NOT_PAIRED' });
      return;
    }

    // Generate 6-digit numeric pairing code formatted as XXX-XXX
    const num = Math.floor(100000 + Math.random() * 900000).toString();
    const code = `${num.slice(0, 3)}-${num.slice(3, 6)}`;
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    pairingTickets.set(code, {
      code,
      vaultId,
      createdByDeviceId: creator.deviceId,
      createdByDeviceName: creator.deviceName,
      expiresAt,
    });

    res.json({
      code,
      vaultId,
      expiresAt: new Date(expiresAt).toISOString(),
    });
  });

  // Claim a pairing code to authorize a second device on the vault
  app.post('/api/pairing/claim', (req, res) => {
    const { code, device } = req.body as {
      code?: string;
      device?: {
        deviceId: string;
        deviceName: string;
        platform: string;
        publicKeyFingerprint: string;
      };
    };

    if (!code || !device || !device.deviceId) {
      res.status(400).json({ error: 'Missing pairing code or device identity' });
      return;
    }

    const normalizedCode = code.trim().toUpperCase();
    const ticket = pairingTickets.get(normalizedCode);

    if (!ticket || ticket.expiresAt < Date.now()) {
      pairingTickets.delete(normalizedCode);
      res.status(404).json({ error: 'INVALID_OR_EXPIRED_CODE', message: 'Pairing code is invalid or expired.' });
      return;
    }

    const vault = vaults[ticket.vaultId];
    if (!vault) {
      res.status(404).json({ error: 'VAULT_NOT_FOUND' });
      return;
    }

    const now = new Date().toISOString();
    const existing = vault.allowedDevices.find((d) => d.deviceId === device.deviceId);
    if (!existing) {
      vault.allowedDevices.push({
        deviceId: device.deviceId,
        deviceName: device.deviceName || 'Paired Companion Device',
        platform: device.platform || 'Web Client',
        publicKeyFingerprint: device.publicKeyFingerprint || 'SHA256:PAIRED',
        pairedAt: now,
        lastSyncAt: now,
      });
    } else {
      existing.lastSyncAt = now;
      existing.deviceName = device.deviceName || existing.deviceName;
    }

    pairingTickets.delete(normalizedCode);
    saveVaultStore(vaults);

    broadcastToVault(vault.vaultId, {
      type: 'device:paired',
      vaultId: vault.vaultId,
      allowedDevices: vault.allowedDevices,
      onlineDeviceIds: getActiveDeviceIds(vault.vaultId),
    });

    res.json({
      vaultId: vault.vaultId,
      allowedDevices: vault.allowedDevices,
      encryptedPayload: vault.encryptedPayload,
      onlineDeviceIds: getActiveDeviceIds(vault.vaultId),
    });
  });

  // Simulate/Register a companion paired device directly for instant multi-device testing or revoke a device
  app.delete('/api/vault/:vaultId/devices/:targetDeviceId', (req, res) => {
    const { vaultId, targetDeviceId } = req.params;
    const callerDeviceId = req.header('x-device-id');

    const vault = vaults[vaultId];
    if (!vault) {
      res.status(404).json({ error: 'VAULT_NOT_FOUND' });
      return;
    }

    const callerAllowed = vault.allowedDevices.some((d) => d.deviceId === callerDeviceId);
    if (!callerAllowed) {
      res.status(403).json({ error: 'DEVICE_NOT_PAIRED' });
      return;
    }

    if (vault.allowedDevices.length <= 1 && targetDeviceId === callerDeviceId) {
      res.status(400).json({ error: 'CANNOT_REVOKE_LAST_DEVICE', message: 'Cannot revoke the only remaining paired device.' });
      return;
    }

    vault.allowedDevices = vault.allowedDevices.filter((d) => d.deviceId !== targetDeviceId);
    saveVaultStore(vaults);

    broadcastToVault(vaultId, {
      type: 'device:revoked',
      vaultId,
      revokedDeviceId: targetDeviceId,
      allowedDevices: vault.allowedDevices,
    });

    res.json({
      vaultId,
      allowedDevices: vault.allowedDevices,
    });
  });

  // WebSocket server for real-time E2E encrypted project sync between paired devices
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    let joinedVaultId: string | null = null;
    let joinedDeviceEntry: { ws: WebSocket; deviceId: string; deviceName: string } | null = null;

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());

        if (msg.type === 'vault:join') {
          const { vaultId, deviceId, deviceName } = msg;
          const vault = vaults[vaultId];
          if (!vault) {
            ws.send(JSON.stringify({ type: 'error', code: 'VAULT_NOT_FOUND' }));
            return;
          }
          const isAllowed = vault.allowedDevices.some((d) => d.deviceId === deviceId);
          if (!isAllowed) {
            ws.send(JSON.stringify({ type: 'error', code: 'DEVICE_NOT_PAIRED' }));
            return;
          }

          joinedVaultId = vaultId;
          joinedDeviceEntry = { ws, deviceId, deviceName: deviceName || 'Paired Device' };

          if (!vaultSockets.has(vaultId)) {
            vaultSockets.set(vaultId, new Set());
          }
          vaultSockets.get(vaultId)!.add(joinedDeviceEntry);

          // Send current authoritative encrypted envelope + presence
          ws.send(
            JSON.stringify({
              type: 'vault:state',
              vaultId,
              allowedDevices: vault.allowedDevices,
              encryptedPayload: vault.encryptedPayload,
              onlineDeviceIds: getActiveDeviceIds(vaultId),
            })
          );

          broadcastToVault(vaultId, {
            type: 'presence:updated',
            vaultId,
            onlineDeviceIds: getActiveDeviceIds(vaultId),
          });
        }
      } catch (e) {
        console.error('WS message parse error:', e);
      }
    });

    ws.on('close', () => {
      if (joinedVaultId && joinedDeviceEntry) {
        const set = vaultSockets.get(joinedVaultId);
        if (set) {
          set.delete(joinedDeviceEntry);
          broadcastToVault(joinedVaultId, {
            type: 'presence:updated',
            vaultId: joinedVaultId,
            onlineDeviceIds: getActiveDeviceIds(joinedVaultId),
          });
        }
      }
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = 3000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`CodeBuilder E2E Relay & Studio Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
