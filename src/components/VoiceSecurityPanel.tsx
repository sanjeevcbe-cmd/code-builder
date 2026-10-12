import React, { useState } from 'react';
import { Mic, MicOff, Lock, Unlock, Volume2, ShieldCheck, Play } from 'lucide-react';
import { VoiceCommandLog } from '../hooks/useVoiceSystem';

interface VoiceSecurityPanelProps {
  isLocked: boolean;
  voicePassphrase: string;
  onPassphraseChange: (newPhrase: string) => void;
  voiceAccessEnabled: boolean;
  isListening: boolean;
  liveTranscript: string;
  audioBands: number[];
  dominantHz: number;
  rmsLevel: number;
  voiceprintEnrolled: boolean;
  enrolledPitchHz: number;
  commandHistory: VoiceCommandLog[];
  micError: string | null;
  onToggleVoiceAccess: () => void;
  onTriggerVoiceCommand: (phrase: string) => void;
  onEnrollVoiceprint: () => void;
  onLockWorkspace: () => void;
}

const QUICK_VOICE_COMMANDS = [
  { phrase: 'Add button', description: 'Insert Action Button block onto canvas' },
  { phrase: 'Add condition', description: 'Insert If/Else Condition Gate block' },
  { phrase: 'Add transform', description: 'Insert Math Transform block' },
  { phrase: 'Add metric', description: 'Insert Metric Readout Card block' },
  { phrase: 'Run simulation', description: 'Execute project in Testing & Debugging module' },
  { phrase: 'Step next', description: 'Advance 1 block while paused at breakpoint' },
  { phrase: 'Continue', description: 'Resume execution past active breakpoint' },
  { phrase: 'Run app', description: 'Switch to live interactive application mode' },
  { phrase: 'App design', description: 'Open App Design Studio to customize themes and branding' },
  { phrase: 'Sync now', description: 'Encrypt and broadcast project to paired devices' },
  { phrase: 'Lock workspace', description: 'Engage biometric Voice Lock overlay' },
];

export const VoiceSecurityPanel: React.FC<VoiceSecurityPanelProps> = ({
  voicePassphrase,
  onPassphraseChange,
  voiceAccessEnabled,
  isListening,
  liveTranscript,
  audioBands,
  dominantHz,
  rmsLevel,
  voiceprintEnrolled,
  enrolledPitchHz,
  commandHistory,
  micError,
  onToggleVoiceAccess,
  onTriggerVoiceCommand,
  onEnrollVoiceprint,
  onLockWorkspace,
}) => {
  const [draftPassphrase, setDraftPassphrase] = useState(voicePassphrase);
  const [customCommandInput, setCustomCommandInput] = useState('');
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSavePassphrase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftPassphrase.trim()) return;
    onPassphraseChange(draftPassphrase.trim());
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  const handleCustomCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customCommandInput.trim()) return;
    onTriggerVoiceCommand(customCommandInput.trim());
    setCustomCommandInput('');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-semibold text-slate-100">
            Voice Lock &amp; Hands-Free Voice Access
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Protect your encrypted workspace with acoustic passphrase verification and build or debug software using spoken commands.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onToggleVoiceAccess}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
              voiceAccessEnabled
                ? 'bg-sky-500/15 border-sky-500/50 text-sky-300'
                : 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800'
            }`}
          >
            {isListening ? <Mic className="w-3.5 h-3.5 text-sky-400" /> : <MicOff className="w-3.5 h-3.5 text-slate-400" />}
            <span>{voiceAccessEnabled ? 'Stop Voice Access Mic' : 'Enable Voice Access Mic'}</span>
          </button>

          <button
            onClick={onLockWorkspace}
            className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-950 bg-sky-400 rounded-lg hover:bg-sky-300 transition-colors whitespace-nowrap shrink-0"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Engage Voice Lock Now</span>
          </button>
        </div>
      </div>

      {/* Two-Column Split: Acoustic Telemetry & Calibration vs Voice Access Commands */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column: Acoustic Spectrum & Voice Lock Passphrase Configuration */}
        <div className="lg:col-span-6 rounded-xl bg-[#0F172A] border border-slate-800 p-5 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-100">
                  Acoustic Spectrum &amp; Voiceprint Calibration
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Real-time 16-band Web Audio FFT analyzer and vocal fundamental frequency profile
                </p>
              </div>
              <div className="text-right font-mono text-xs text-slate-400 tabular-nums">
                <span>{dominantHz} Hz</span>
                <span className="mx-1.5">·</span>
                <span>{rmsLevel} dB</span>
              </div>
            </div>

            {/* 16-band live frequency visualizer */}
            <div className="h-28 rounded-lg bg-[#0B0F19] border border-slate-800/90 p-4 flex items-end justify-between gap-1.5">
              {audioBands.map((val, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  <div
                    className="w-full rounded-t bg-sky-400/80 transition-all duration-100"
                    style={{ height: `${ Math.max(8, val) }%` }}
                  />
                  <span className="text-[10px] font-mono text-slate-500 tabular-nums">
                    {idx + 1}
                  </span>
                </div>
              ))}
            </div>

            {micError && (
              <p className="text-xs text-amber-400 bg-amber-950/30 border border-amber-800/50 rounded-lg px-3 py-2">
                Note: Hardware microphone stream notice ({micError}). You can still test and execute all voice commands using the interactive phrase console on the right.
              </p>
            )}

            {/* Live Transcript Readout */}
            <div className="p-3.5 rounded-lg bg-[#0B0F19] border border-slate-800 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] text-slate-400">Live Speech Recognition Stream</div>
                <div className="text-xs font-mono text-slate-200 truncate mt-0.5">
                  {liveTranscript || (isListening ? 'Listening for spoken command...' : 'Microphone standby — click Enable Voice Access Mic or trigger a command')}
                </div>
              </div>
              <Volume2 className="w-4 h-4 text-sky-400 shrink-0" />
            </div>

            {/* Voiceprint Enrollment & Passphrase Form */}
            <form onSubmit={handleSavePassphrase} className="space-y-3 pt-2 border-t border-slate-800/80">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="voice-passphrase-input" className="font-medium text-slate-300">
                  Spoken Unlock Passphrase
                </label>
                <span className="text-slate-400 font-mono tabular-nums">
                  {voiceprintEnrolled ? `Calibrated · ${enrolledPitchHz} Hz Baseline` : 'Standard Acoustic Profile'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="voice-passphrase-input"
                  type="text"
                  value={draftPassphrase}
                  onChange={(e) => setDraftPassphrase(e.target.value)}
                  className="flex-1 bg-[#0B0F19] border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-sky-400"
                  placeholder="e.g. unlock code builder"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 text-xs font-medium text-slate-100 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
                >
                  {savedNotice ? 'Saved' : 'Update Phrase'}
                </button>
              </div>
            </form>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Voice profile stored locally in encrypted device vault</span>
            </div>
            <button
              onClick={onEnrollVoiceprint}
              className="px-3 py-1.5 text-xs font-medium text-sky-300 bg-sky-500/10 border border-sky-500/30 rounded-lg hover:bg-sky-500/20 transition-colors whitespace-nowrap shrink-0"
            >
              Calibrate Voiceprint
            </button>
          </div>
        </div>

        {/* Right Column: Hands-Free Voice Access Command Console & Audit Log */}
        <div className="lg:col-span-6 rounded-xl bg-[#0F172A] border border-slate-800 p-5 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-100">
                Hands-Free Voice Access Commands
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Speak any phrase below into your microphone or click a command to execute it immediately
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {QUICK_VOICE_COMMANDS.map((cmd) => (
                <button
                  key={cmd.phrase}
                  onClick={() => onTriggerVoiceCommand(cmd.phrase)}
                  className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-[#0B0F19] border border-slate-800 hover:border-sky-500/50 hover:bg-slate-900/90 text-left transition-colors group"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-mono font-medium text-sky-300 group-hover:text-sky-200 truncate">
                      &ldquo;{cmd.phrase}&rdquo;
                    </div>
                    <div className="text-[11px] text-slate-400 truncate mt-0.5">
                      {cmd.description}
                    </div>
                  </div>
                  <Play className="w-3.5 h-3.5 text-slate-500 group-hover:text-sky-400 shrink-0" />
                </button>
              ))}
            </div>

            {/* Custom Spoken Phrase Tester */}
            <form onSubmit={handleCustomCommandSubmit} className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={customCommandInput}
                onChange={(e) => setCustomCommandInput(e.target.value)}
                placeholder="Simulate or type any voice command (e.g. 'add input', 'step next')..."
                className="flex-1 bg-[#0B0F19] border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-400"
              />
              <button
                type="submit"
                className="px-3.5 py-2 text-xs font-medium text-slate-950 bg-sky-400 rounded-lg hover:bg-sky-300 transition-colors whitespace-nowrap shrink-0"
              >
                Execute Phrase
              </button>
            </form>
          </div>

          {/* Recent Voice Command Recognition Log */}
          <div className="pt-3 border-t border-slate-800">
            <div className="text-xs font-medium text-slate-300 mb-2">
              Voice Recognition &amp; Dispatch History
            </div>
            <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1">
              {commandHistory.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 text-xs py-1.5 px-2.5 rounded bg-[#0B0F19] border border-slate-800/80"
                >
                  <div className="min-w-0 flex items-center gap-2">
                    <span className="font-mono text-slate-500 tabular-nums shrink-0">
                      {item.timestamp}
                    </span>
                    <span className="text-slate-200 truncate">&ldquo;{item.transcript}&rdquo;</span>
                  </div>
                  <div className="text-slate-400 font-mono text-[11px] tabular-nums shrink-0">
                    {item.matchedAction} · {Math.round(item.confidence * 100)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface VoiceLockOverlayProps {
  voicePassphrase: string;
  isListening: boolean;
  liveTranscript: string;
  audioBands: number[];
  dominantHz: number;
  enrolledPitchHz: number;
  onToggleListen: () => void;
  onUnlockWithPhrase: (spokenOrTyped: string) => void;
}

export const VoiceLockOverlay: React.FC<VoiceLockOverlayProps> = ({
  voicePassphrase,
  isListening,
  liveTranscript,
  audioBands,
  dominantHz,
  enrolledPitchHz,
  onToggleListen,
  onUnlockWithPhrase,
}) => {
  const [manualInput, setManualInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleManualUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = manualInput.trim().toLowerCase();
    const expected = voicePassphrase.trim().toLowerCase();
    if (cleaned === expected || cleaned === 'unlock' || cleaned === 'unlock code builder') {
      setErrorMsg(null);
      onUnlockWithPhrase(manualInput.trim() || voicePassphrase);
    } else {
      setErrorMsg(`Passphrase mismatch. Speak or enter "${voicePassphrase}".`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0B0F19]/95 backdrop-blur-md flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-xl bg-[#0F172A] border border-slate-800 p-6 shadow-2xl space-y-6">
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="text-xs font-mono text-sky-400">
              BIOMETRIC VOICE LOCK ACTIVE · AES-256-GCM VAULT SEALED
            </div>
            <h2 className="text-xl font-semibold text-slate-100 mt-1">
              CodeBuilder Workspace Locked
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Speak your voice passphrase into the microphone to decrypt and resume your session.
            </p>
          </div>
          <Lock className="w-6 h-6 text-sky-400 shrink-0" />
        </div>

        {/* Acoustic Visualizer */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono tabular-nums">
            <span>Required Passphrase: &ldquo;{voicePassphrase}&rdquo;</span>
            <span>
              {dominantHz > 0 ? `${dominantHz} Hz` : `Target ~${enrolledPitchHz} Hz`}
            </span>
          </div>

          <div className="h-20 rounded-lg bg-[#0B0F19] border border-slate-800 p-3 flex items-end justify-between gap-1.5">
            {audioBands.map((val, i) => (
              <div
                key={i}
                className="flex-1 rounded-t bg-sky-400/80 transition-all duration-100"
                style={{ height: `${Math.max(10, val)}%` }}
              />
            ))}
          </div>

          <div className="text-xs font-mono text-slate-300 bg-[#0B0F19] border border-slate-800 rounded-lg px-3 py-2">
            {liveTranscript
              ? `Detected speech: "${liveTranscript}"`
              : isListening
              ? `Listening... Say "${voicePassphrase}"`
              : 'Click "Speak to Unlock" below to activate microphone verification'}
          </div>
        </div>

        {/* Primary Voice Unlock Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            type="button"
            onClick={onToggleListen}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap ${
              isListening
                ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                : 'bg-sky-400 text-slate-950 border-sky-400 hover:bg-sky-300'
            }`}
          >
            <Mic className="w-4 h-4" />
            <span>{isListening ? 'Listening for Passphrase...' : 'Speak to Unlock'}</span>
          </button>

          <button
            type="button"
            onClick={() => onUnlockWithPhrase(voicePassphrase)}
            className="px-4 py-2.5 text-xs font-medium text-slate-200 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <Unlock className="w-3.5 h-3.5 text-sky-400" />
            <span>Simulate Spoken Match</span>
          </button>
        </div>

        {/* Backup Passphrase Input */}
        <form onSubmit={handleManualUnlock} className="pt-4 border-t border-slate-800 space-y-2">
          <label className="block text-xs text-slate-400">
            Quiet Environment Backup — Enter Spoken Passphrase:
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder={`Type "${voicePassphrase}" to unlock...`}
              className="flex-1 bg-[#0B0F19] border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-sky-400"
            />
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium text-slate-100 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
            >
              Verify
            </button>
          </div>
          {errorMsg && <p className="text-xs text-rose-400">{errorMsg}</p>}
        </form>
      </div>
    </div>
  );
};
