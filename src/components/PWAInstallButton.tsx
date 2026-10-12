import React, { useState } from 'react';
import { Download, X, Check } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWA';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowGuideModal(true);
    }
  };

  return (
    <>
      <button
        onClick={handleInstallClick}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800/80 border border-slate-700 rounded-lg hover:bg-slate-800 hover:border-slate-600 transition-colors whitespace-nowrap shrink-0"
        title="Install CodeBuilder for offline desktop or mobile access"
      >
        <Download className="w-3.5 h-3.5 text-sky-400" />
        <span>{isIOS ? 'Install on iOS' : 'Install App'}</span>
      </button>

      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-xl bg-[#0F172A] border border-slate-800 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-base font-semibold text-slate-100">
                Install CodeBuilder Offline Studio
              </h3>
              <button
                onClick={() => setShowGuideModal(false)}
                className="p-1 text-slate-400 hover:text-slate-200 rounded-md"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm text-slate-300">
              <p className="text-slate-400 text-xs leading-relaxed">
                CodeBuilder is configured with an offline-first Service Worker and encrypted local vault cache so your projects run without an internet connection.
              </p>

              {isIOS ? (
                <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-2 text-xs">
                  <p className="font-medium text-slate-200">iOS / iPadOS Safari Installation:</p>
                  <p>1. Tap the <strong>Share</strong> icon in the Safari toolbar.</p>
                  <p>2. Select <strong>Add to Home Screen</strong> to launch CodeBuilder in standalone mode.</p>
                </div>
              ) : (
                <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-2 text-xs">
                  <p className="font-medium text-slate-200">Desktop & Android Installation:</p>
                  <p>1. Open CodeBuilder in a top-level browser tab.</p>
                  <p>2. Click the <strong>Install CodeBuilder</strong> icon in the address bar (or browser menu &rarr; <strong>Install App</strong>).</p>
                </div>
              )}

              <div className="pt-2 flex items-center gap-2 text-xs text-emerald-400">
                <Check className="w-4 h-4 shrink-0" />
                <span>Service Worker &amp; Local AES-256-GCM Cache Active</span>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowGuideModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-900 bg-sky-400 rounded-lg hover:bg-sky-300 transition-colors whitespace-nowrap shrink-0"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
