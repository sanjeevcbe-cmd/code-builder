import React, { useState } from 'react';
import {
  Shield,
  Smartphone,
  Laptop,
  RefreshCw,
  Copy,
  Check,
  Trash2,
  Wifi,
  WifiOff,
  KeyRound,
  Lock,
  Plus,
} from 'lucide-react';
import {
  LocalDeviceIdentity,
  PairedDevice,
  EncryptedEnvelope,
} from '../types/builder';

interface PairedDevicesPanelProps {
  identity: LocalDeviceIdentity;
  pairedDevices: PairedDevice[];
  onlineDeviceIds: string[];
  lastEnvelope: EncryptedEnvelope | null;
  isOnline: boolean;
  simulateOffline: boolean;
  pendingOfflineChanges: number;
  syncStatus: 'synced' | 'syncing' | 'offline_queued' | 'error';
  onToggleSimulateOffline: () => void;
  onSyncNow: () => Promise<void>;
  onGeneratePairingBundle: () => Promise<string | null>;
  onClaimPairingBundle: (bundle: string) => Promise<{ ok: boolean; message: string }>;
  onPairSimulatedCompanion: () => Promise<void>;
  onRevokeDevice: (targetDeviceId: string) => Promise<void>;
}

export const PairedDevicesPanel: React.FC<PairedDevicesPanelProps> = ({
  identity,
  pairedDevices,
  onlineDeviceIds,
  lastEnvelope,
  isOnline,
  simulateOffline,
  pendingOfflineChanges,
  syncStatus,
  onToggleSimulateOffline,
  onSyncNow,
  onGeneratePairingBundle,
  onClaimPairingBundle,
  onPairSimulatedCompanion,
  onRevokeDevice,
}) => {
  const [generatedBundle, setGeneratedBundle] = useState<string | null>(null);
  const [copiedBundle, setCopiedBundle] = useState(false);
  const [joinBundleInput, setJoinBundleInput] = useState('');
  const [joinStatusMessage, setJoinStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleCreateBundle = async () => {
    setIsGenerating(true);
    try {
      const bundle = await onGeneratePairingBundle();
      if (bundle) {
        setGeneratedBundle(bundle);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyBundle = () => {
    if (!generatedBundle) return;
    navigator.clipboard.writeText(generatedBundle);
    setCopiedBundle(true);
    setTimeout(() => setCopiedBundle(false), 2000);
  };

  const handleJoinVault = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinBundleInput.trim()) return;
    const res = await onClaimPairingBundle(joinBundleInput.trim());
    setJoinStatusMessage({
      type: res.ok ? 'success' : 'error',
      text: res.message,
    });
    if (res.ok) {
      setJoinBundleInput('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Offline / Sync Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-semibold text-slate-100">
            Paired Devices &amp; End-to-End Encrypted Synchronization
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Projects are encrypted client-side with AES-256-GCM before leaving this device. Only allowlisted paired devices can decrypt or push snapshots.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onToggleSimulateOffline}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
              !isOnline
                ? 'bg-amber-950/50 border-amber-600/60 text-amber-300'
                : 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800'
            }`}
          >
            {isOnline ? (
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>
              {simulateOffline
                ? 'Offline Mode Active (Click to Reconnect)'
                : 'Simulate Offline Mode'}
            </span>
          </button>

          <button
            type="button"
            onClick={onSyncNow}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-950 bg-sky-400 rounded-lg hover:bg-sky-300 transition-colors whitespace-nowrap shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
            <span>
              {isOnline
                ? 'Encrypt & Sync Now'
                : `Queue Offline Snapshot (${pendingOfflineChanges} pending)`}
            </span>
          </button>
        </div>
      </div>

      {/* 12-Col Grid: Paired Device Allowlist (7 cols) + Pairing Handshake (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left 7 Cols: Paired Device Registry */}
        <div className="lg:col-span-7 rounded-xl bg-[#0F172A] border border-slate-800 p-5 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-100">
                  Authorized Paired Devices ({pairedDevices.length})
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Vault ID: <span className="font-mono text-slate-300">{identity.vaultId}</span> · Unlisted devices receive HTTP 403
                </p>
              </div>

              <button
                type="button"
                onClick={onPairSimulatedCompanion}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-sky-300 bg-sky-500/10 border border-sky-500/30 rounded-lg hover:bg-sky-500/20 transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Pair Companion Device</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {pairedDevices.map((dev) => {
                const isThisDevice = dev.deviceId === identity.deviceId;
                const isConnected = onlineDeviceIds.includes(dev.deviceId) || (isThisDevice && isOnline);

                return (
                  <div
                    key={dev.deviceId}
                    className="p-3.5 rounded-lg bg-[#0B0F19] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-sky-400 shrink-0 mt-0.5">
                        {dev.platform.toLowerCase().includes('mobile') ||
                        dev.platform.toLowerCase().includes('ios') ||
                        dev.platform.toLowerCase().includes('ipad') ? (
                          <Smartphone className="w-4 h-4" />
                        ) : (
                          <Laptop className="w-4 h-4" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-100">
                          <span className="truncate">{dev.deviceName}</span>
                          {isThisDevice && (
                            <span className="text-sky-400 font-mono text-[11px]">
                              · This Device
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] font-mono text-slate-400 mt-1 tabular-nums truncate">
                          {dev.deviceId} · {dev.publicKeyFingerprint}
                        </div>

                        <div className="text-[11px] text-slate-500 mt-0.5 font-mono tabular-nums">
                          {isConnected ? 'Relay Connected' : 'Offline Standby'} · Last Sync:{' '}
                          {new Date(dev.lastSyncAt).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>

                    {!isThisDevice && (
                      <button
                        type="button"
                        onClick={() => onRevokeDevice(dev.deviceId)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-300 bg-rose-950/30 border border-rose-800/50 rounded-lg hover:bg-rose-900/40 transition-colors whitespace-nowrap shrink-0 self-end sm:self-center"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Revoke Access</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-emerald-400" />
              Strict Device Allowlist Enforcement Active
            </span>
            <span className="font-mono tabular-nums">
              Pending Offline Queue: {pendingOfflineChanges}
            </span>
          </div>
        </div>

        {/* Right 5 Cols: Cryptographic Device Pairing Handshake */}
        <div className="lg:col-span-5 rounded-xl bg-[#0F172A] border border-slate-800 p-5 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-sm font-semibold text-slate-100">
                Pair a New Device via E2E Key Bundle
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Generate a one-time pairing code &amp; AES-256 key token to authorize another browser or workstation
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-[#0B0F19] border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-300">
                  1. Generate Outgoing Pairing Token
                </span>
                <KeyRound className="w-4 h-4 text-sky-400" />
              </div>

              <button
                type="button"
                onClick={handleCreateBundle}
                disabled={isGenerating || !isOnline}
                className="w-full py-2 px-3 text-xs font-semibold text-slate-950 bg-sky-400 rounded-lg hover:bg-sky-300 disabled:opacity-50 transition-colors"
              >
                {isGenerating
                  ? 'Generating Ticket...'
                  : isOnline
                  ? 'Generate 6-Digit Pairing Code & Key Bundle'
                  : 'Reconnect to Generate Server Ticket'}
              </button>

              {generatedBundle && (
                <div className="p-2.5 rounded bg-slate-900 border border-slate-700 space-y-2">
                  <div className="text-[11px] text-slate-400">
                    Paste this token on your second device (valid 10 mins):
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <code className="text-xs font-mono text-sky-300 truncate">
                      {generatedBundle}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopyBundle}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-200 bg-slate-800 rounded hover:bg-slate-700 shrink-0"
                    >
                      {copiedBundle ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <form
              onSubmit={handleJoinVault}
              className="p-3.5 rounded-lg bg-[#0B0F19] border border-slate-800 space-y-3"
            >
              <div className="text-xs font-medium text-slate-300">
                2. Pair This Device to Another Vault
              </div>
              <input
                type="text"
                value={joinBundleInput}
                onChange={(e) => setJoinBundleInput(e.target.value)}
                placeholder="Paste XXX-XXX#<base64Key> pairing bundle..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-sky-400"
              />
              <button
                type="submit"
                disabled={!isOnline}
                className="w-full py-2 px-3 text-xs font-medium text-slate-100 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 disabled:opacity-50 transition-colors"
              >
                Claim Pairing Code &amp; Decrypt Vault
              </button>
              {joinStatusMessage && (
                <p
                  className={`text-xs ${
                    joinStatusMessage.type === 'success' ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {joinStatusMessage.text}
                </p>
              )}
            </form>
          </div>

          <div className="pt-3 border-t border-slate-800 text-xs text-slate-400">
            Master key fingerprint:{' '}
            <span className="font-mono text-slate-300">{identity.publicKeyFingerprint}</span>
          </div>
        </div>
      </div>

      {/* Zero-Knowledge Ciphertext Inspector */}
      <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-sky-400 shrink-0" />
            <h3 className="text-sm font-semibold text-slate-100">
              Zero-Knowledge Wire Payload Inspector (AES-256-GCM)
            </h3>
          </div>
          {lastEnvelope && (
            <div className="text-xs font-mono text-slate-400 tabular-nums">
              Version v{lastEnvelope.version} · {lastEnvelope.byteSize} bytes · SHA256 Checksum:{' '}
              {lastEnvelope.checksum}
            </div>
          )}
        </div>

        {lastEnvelope ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs tabular-nums">
            <div className="p-3 rounded-lg bg-[#0B0F19] border border-slate-800">
              <div className="text-slate-500 text-[11px]">Initialization Vector (96-bit IV)</div>
              <div className="text-sky-300 mt-1 break-all">{lastEnvelope.iv}</div>
            </div>
            <div className="p-3 rounded-lg bg-[#0B0F19] border border-slate-800">
              <div className="text-slate-500 text-[11px]">Cipher Suite &amp; Origin Device</div>
              <div className="text-slate-200 mt-1 truncate">
                {lastEnvelope.salt} · {lastEnvelope.senderDeviceName}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-[#0B0F19] border border-slate-800">
              <div className="text-slate-500 text-[11px]">Encrypted Ciphertext Preview</div>
              <div className="text-emerald-300 mt-1 truncate">
                {lastEnvelope.ciphertext.slice(0, 68)}...
              </div>
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-400 py-3">
            No encrypted payload transmitted yet. Click &ldquo;Encrypt &amp; Sync Now&rdquo; to generate and broadcast your AES-256-GCM snapshot.
          </div>
        )}
      </div>
    </div>
  );
};
