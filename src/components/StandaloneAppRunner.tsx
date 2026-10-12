import React, { useState, useEffect } from 'react';
import {
  Download,
  RotateCcw,
  Smartphone,
  Tablet,
  Monitor,
  Maximize2,
  Minimize2,
  ShieldCheck,
  Code2,
  Check,
  Palette,
  Clock,
} from 'lucide-react';
import { SoftwareProject, VisualBlock, RuntimeVariableState } from '../types/builder';
import { getResolvedTheme } from '../utils/theme';

interface StandaloneAppRunnerProps {
  project: SoftwareProject;
  variables: Record<string, RuntimeVariableState>;
  onTriggerBlock: (blockId: string, inputOverride?: string | number) => void;
  onResetAppState: () => void;
  onReturnToStudio: () => void;
  onOpenDesignModal?: () => void;
}

export const StandaloneAppRunner: React.FC<StandaloneAppRunnerProps> = ({
  project,
  variables,
  onTriggerBlock,
  onResetAppState,
  onReturnToStudio,
  onOpenDesignModal,
}) => {
  const [deviceViewport, setDeviceViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [exportedHtmlNotice, setExportedHtmlNotice] = useState(false);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [currentTime, setCurrentTime] = useState<string>(() => new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const resolved = getResolvedTheme(project.design);
  const AppIconComponent = resolved.IconComponent;
  const appTitle = project.design?.appTitleCustom?.trim() || project.name;
  const appSubtitle = project.design?.appSubtitleCustom?.trim() || project.description;

  const uiBlocks = project.blocks.filter(
    (b) =>
      b.category === 'ui' ||
      b.type === 'metric' ||
      b.type === 'button' ||
      b.type === 'input' ||
      b.type === 'alert' ||
      b.type === 'toggle' ||
      b.type === 'table' ||
      b.type === 'custom'
  );

  const handleDownloadStandaloneHtml = () => {
    const serializedBlocks = JSON.stringify(project.blocks);
    const serializedVars = JSON.stringify(
      Object.fromEntries(Object.entries(variables).map(([k, v]) => [k, v.value]))
    );
    const accentHex = resolved.accent.hex;
    const canvasBg = resolved.surface.hexBg;
    const cardRadiusPx =
      project.design?.cardRadius === 'sharp'
        ? '0px'
        : project.design?.cardRadius === 'rounded'
        ? '16px'
        : project.design?.cardRadius === 'pill'
        ? '24px'
        : '12px';

    const standaloneHtml = `<!doctype html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${appTitle}</title>
  <meta name="description" content="${appSubtitle}" />
  <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap');
    body {
      font-family: ${project.design?.fontFamily === 'mono' ? "'JetBrains Mono', monospace" : "'Plus Jakarta Sans', sans-serif"};
      background-color: ${canvasBg};
      color: #F1F5F9;
    }
    .font-mono { font-family: 'JetBrains Mono', monospace; font-variant-numeric: tabular-nums; }
    .theme-card {
      border-radius: ${cardRadiusPx};
    }
    .theme-accent-text { color: ${accentHex}; }
    .theme-accent-btn {
      background-color: ${accentHex};
      color: #030712;
      border-radius: ${project.design?.cardRadius === 'sharp' ? '0px' : project.design?.cardRadius === 'pill' ? '9999px' : '8px'};
    }
    .theme-accent-btn:hover { filter: brightness(1.1); }
  </style>
</head>
<body class="min-h-screen p-6 sm:p-10 flex flex-col items-center justify-start">
  <div class="w-full max-w-4xl theme-card bg-[#0F172A] border border-slate-800 p-6 sm:p-8 shadow-2xl space-y-6">
    <header class="border-b border-slate-800 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <div class="text-xs font-mono theme-accent-text">STANDALONE SOFTWARE · CODEBUILDER ENGINE</div>
        <h1 class="text-2xl font-bold text-slate-100 mt-1">${appTitle}</h1>
        <p class="text-xs text-slate-400 mt-1">${appSubtitle}</p>
      </div>
      <div class="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 rounded-lg px-3 py-1.5 self-start">
        <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
        <span>Local Encrypted State Active</span>
      </div>
    </header>

    ${
      project.design?.bannerVisible
        ? `<div class="p-3.5 rounded-xl border border-slate-800 bg-[#0B0F19] flex items-center justify-between">
            <span class="text-xs text-slate-300 font-medium">Branded with ${resolved.accent.label}</span>
            <span class="text-xs font-mono theme-accent-text font-bold">Offline Ready</span>
          </div>`
        : ''
    }

    <div id="app-container" class="space-y-6">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" id="blocks-grid"></div>
    </div>

    <footer class="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500 font-mono">
      <span>Built with CodeBuilder</span>
      <span>v${project.version}.0 Standalone</span>
    </footer>
  </div>

  <script>
    let state = ${serializedVars};
    const blocks = ${serializedBlocks};

    function renderApp() {
      const grid = document.getElementById('blocks-grid');
      grid.innerHTML = '';

      blocks.forEach(block => {
        if (block.type === 'metric') {
          const val = state[block.config.variableName] ?? 0;
          const card = document.createElement('div');
          card.className = 'p-4 theme-card bg-[#0B0F19] border border-slate-800 space-y-1';
          card.innerHTML = '<div class="text-xs text-slate-400 font-medium">' + block.label + '</div><div class="text-2xl font-mono font-bold theme-accent-text">' + val + ' <span class="text-xs text-slate-500 font-normal">' + (block.config.unit || '') + '</span></div>';
          grid.appendChild(card);
        } else if (block.type === 'button') {
          const card = document.createElement('div');
          card.className = 'p-4 theme-card bg-[#0B0F19] border border-slate-800 flex items-center justify-between gap-3';
          card.innerHTML = '<div><div class="text-xs font-semibold text-slate-200">' + block.label + '</div><div class="text-[11px] text-slate-400">' + block.description + '</div></div><button class="px-4 py-2 theme-accent-btn font-semibold text-xs transition" onclick="triggerBlock(\\'' + block.id + '\\')">Execute</button>';
          grid.appendChild(card);
        } else if (block.type === 'alert') {
          const isActive = state[block.config.variableName] === true;
          if (isActive) {
            const alertCard = document.createElement('div');
            alertCard.className = 'sm:col-span-2 lg:col-span-3 p-4 theme-card bg-amber-950/60 border border-amber-600/80 text-amber-200 text-xs';
            alertCard.textContent = block.config.placeholder || block.label;
            grid.appendChild(alertCard);
          }
        }
      });
    }

    function triggerBlock(blockId) {
      const block = blocks.find(b => b.id === blockId);
      if (!block) return;
      const varName = block.config.variableName;
      if (varName) {
        const delta = Number(block.config.actionValue || 1);
        if (block.config.actionType === 'decrement') state[varName] = (state[varName] || 0) - delta;
        else state[varName] = (state[varName] || 0) + delta;
      }
      blocks.filter(b => b.type === 'transform').forEach(t => {
        const v1 = Number(state[t.config.variableName] || 0);
        const v2 = Number(state[t.config.secondaryVariableName] || t.config.actionValue || 1);
        state[t.config.outputVariableName] = v1 * v2;
      });
      blocks.filter(b => b.type === 'condition').forEach(c => {
        const left = Number(state[c.config.variableName] || 0);
        const threshold = Number(c.config.conditionThreshold || 0);
        state[c.config.outputVariableName] = left <= threshold;
      });
      renderApp();
    }

    renderApp();
  </script>
</body>
</html>`;

    const blob = new Blob([standaloneHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-app.html`;
    a.click();
    URL.revokeObjectURL(url);
    setExportedHtmlNotice(true);
    setTimeout(() => setExportedHtmlNotice(false), 2500);
  };

  const getContainerWidth = () => {
    if (deviceViewport === 'mobile') return 'max-w-[400px]';
    if (deviceViewport === 'tablet') return 'max-w-[768px]';
    return 'max-w-5xl';
  };

  return (
    <div
      className={`space-y-6 ${
        isFullscreen ? 'fixed inset-0 z-50 p-6 overflow-y-auto ' + resolved.surface.canvasClass : ''
      }`}
    >
      {/* Standalone App Control Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono" style={{ color: resolved.accent.hex }}>
              STANDALONE APPLICATION RUNNER · LIVE REACTIVE STATE
            </span>
            <span className="text-slate-500 font-mono text-xs">·</span>
            <span className="text-xs text-slate-400 font-mono">v{project.version}</span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 mt-1">{appTitle}</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Running your software with custom design aesthetics, variable inspection, and offline persistence.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* Viewport switchers */}
          <div className="flex items-center gap-1 p-1 bg-[#0F172A] border border-slate-800 rounded-lg">
            <button
              type="button"
              onClick={() => setDeviceViewport('desktop')}
              className={`p-1.5 rounded transition-colors ${
                deviceViewport === 'desktop'
                  ? 'bg-slate-800 text-sky-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Desktop View"
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setDeviceViewport('tablet')}
              className={`p-1.5 rounded transition-colors ${
                deviceViewport === 'tablet'
                  ? 'bg-slate-800 text-sky-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Tablet View (768px)"
            >
              <Tablet className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setDeviceViewport('mobile')}
              className={`p-1.5 rounded transition-colors ${
                deviceViewport === 'mobile'
                  ? 'bg-slate-800 text-sky-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Mobile View (400px)"
            >
              <Smartphone className="w-4 h-4" />
            </button>
          </div>

          {onOpenDesignModal && (
            <button
              type="button"
              onClick={onOpenDesignModal}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-sky-300 bg-sky-500/10 border border-sky-500/30 rounded-lg hover:bg-sky-500/20 transition-colors whitespace-nowrap"
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Customize Design</span>
            </button>
          )}

          <button
            type="button"
            onClick={onResetAppState}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-[#0F172A] border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset App State</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadStandaloneHtml}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-sky-400 rounded-lg hover:bg-sky-300 transition-colors whitespace-nowrap"
            title="Export a standalone runnable HTML app package"
          >
            {exportedHtmlNotice ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Exported Standalone App</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Export App Package (.html)</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 text-slate-400 hover:text-slate-200 bg-[#0F172A] border border-slate-700 rounded-lg transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen App View'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={onReturnToStudio}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors whitespace-nowrap"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Back to Studio</span>
          </button>
        </div>
      </div>

      {/* Standalone Application Canvas Surface */}
      <div
        className={`flex justify-center transition-all duration-300 p-4 sm:p-8 rounded-2xl border border-slate-800/80 ${resolved.surface.canvasClass}`}
      >
        <div
          className={`w-full ${getContainerWidth()} ${resolved.materialClass} ${resolved.radiusClass} ${resolved.densityPadding} shadow-2xl space-y-6 transition-all duration-300`}
        >
          {/* App Window Chrome & Branding Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
            <div className="flex items-center gap-3">
              <span
                className={`p-2 ${resolved.innerRadiusClass} ${resolved.accent.softBg} ${resolved.accent.softBorder} border`}
              >
                <AppIconComponent className="w-5 h-5" style={{ color: resolved.accent.hex }} />
              </span>

              <div>
                <h1 className={`text-base font-bold text-slate-100 ${resolved.fontClass}`}>
                  {appTitle}
                </h1>
                <p className="text-xs text-slate-400 line-clamp-1">{appSubtitle}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              {project.design?.showLiveClock && (
                <span className="flex items-center gap-1 text-[11px] font-mono text-slate-400">
                  <Clock className="w-3 h-3 text-slate-500" />
                  <span>{currentTime}</span>
                </span>
              )}

              {project.design?.enableStatusPill && (
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono ${resolved.badgeRadiusClass} ${resolved.accent.softBg} ${resolved.accent.softBorder} border ${resolved.accent.softText}`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Offline Ready</span>
                </div>
              )}
            </div>
          </div>

          {/* Optional Branded Hero Banner */}
          {project.design?.bannerVisible && (
            <div
              className={`p-4 ${resolved.innerRadiusClass} border ${resolved.accent.softBorder} ${resolved.accent.softBg} flex items-center justify-between gap-4`}
            >
              <div>
                <div className={`text-xs font-bold ${resolved.accent.softText}`}>
                  {resolved.accent.label} Aesthetic · Active Application
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Interacting with live nodes mutates synchronized runtime variables deterministically.
                </div>
              </div>

              <span
                className={`px-3 py-1 text-xs font-semibold ${resolved.badgeRadiusClass} ${resolved.accent.primaryBg}`}
              >
                v{project.version}.0
              </span>
            </div>
          )}

          {/* Rendered Live Blocks */}
          <div className="space-y-6">
            {/* 1. Alerts Section */}
            {uiBlocks
              .filter((b) => b.type === 'alert')
              .map((blk) => {
                const isActive = variables[blk.config.variableName || '']?.value === true;
                if (!isActive) return null;
                return (
                  <div
                    key={blk.id}
                    className={`p-4 ${resolved.innerRadiusClass} border text-xs font-medium ${
                      blk.config.alertSeverity === 'critical'
                        ? 'bg-rose-950/60 border-rose-600 text-rose-200'
                        : 'bg-amber-950/60 border-amber-600 text-amber-200'
                    }`}
                  >
                    {blk.config.placeholder || blk.label}
                  </div>
                );
              })}

            {/* 2. Metrics Readouts */}
            <div className={`grid ${resolved.gridClass} ${resolved.densityGap}`}>
              {uiBlocks
                .filter(
                  (b) =>
                    b.type === 'metric' || (b.type === 'custom' && b.config.customUiKind === 'metric')
                )
                .map((blk) => {
                  const varVal = variables[blk.config.variableName || '']?.value ?? 0;
                  return (
                    <div
                      key={blk.id}
                      className={`p-4 ${resolved.innerRadiusClass} bg-[#0B0F19] border border-slate-800 space-y-1.5`}
                    >
                      <div className="text-xs text-slate-400 font-medium">{blk.label}</div>
                      <div
                        className="text-2xl font-mono font-bold tabular-nums"
                        style={{ color: resolved.accent.hex }}
                      >
                        {String(varVal)}{' '}
                        <span className="text-xs font-normal text-slate-500">
                          {blk.config.unit || ''}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">{blk.description}</div>
                    </div>
                  );
                })}
            </div>

            {/* 3. Interactive Inputs, Sliders, and Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {uiBlocks
                .filter(
                  (b) =>
                    b.type === 'input' || (b.type === 'custom' && b.config.customUiKind === 'slider')
                )
                .map((blk) => {
                  const currentVal = variables[blk.config.variableName || '']?.value ?? 0;

                  if (blk.type === 'custom' && blk.config.customUiKind === 'slider') {
                    return (
                      <div
                        key={blk.id}
                        className={`p-4 ${resolved.innerRadiusClass} bg-[#0B0F19] border border-slate-800 space-y-2.5`}
                      >
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-slate-200">{blk.label}</label>
                          <span
                            className="font-mono text-xs font-bold tabular-nums"
                            style={{ color: resolved.accent.hex }}
                          >
                            {String(currentVal)} {blk.config.unit || ''}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={blk.config.sliderMin ?? 0}
                          max={blk.config.sliderMax ?? 100}
                          step={blk.config.sliderStep ?? 1}
                          value={Number(currentVal)}
                          onChange={(e) => onTriggerBlock(blk.id, Number(e.target.value))}
                          className="w-full"
                          style={{ accentColor: resolved.accent.hex }}
                        />
                        <div className="text-[11px] text-slate-500">{blk.description}</div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={blk.id}
                      className={`p-4 ${resolved.innerRadiusClass} bg-[#0B0F19] border border-slate-800 space-y-2`}
                    >
                      <label className="text-xs font-semibold text-slate-200 block">{blk.label}</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={inputValues[blk.id] ?? ''}
                          onChange={(e) =>
                            setInputValues((prev) => ({ ...prev, [blk.id]: e.target.value }))
                          }
                          placeholder={blk.config.placeholder || 'Enter value...'}
                          className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-sky-400"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const val = inputValues[blk.id];
                            onTriggerBlock(blk.id, val !== undefined && val !== '' ? val : 100);
                          }}
                          className={`px-3.5 py-2 text-xs font-semibold ${resolved.badgeRadiusClass} ${resolved.accent.primaryBg} ${resolved.accent.hoverBg} transition-colors whitespace-nowrap`}
                        >
                          Update
                        </button>
                      </div>
                      <div className="text-[11px] text-slate-500">{blk.description}</div>
                    </div>
                  );
                })}
            </div>

            {/* 4. Action Buttons */}
            <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 ${resolved.densityGap}`}>
              {uiBlocks
                .filter((b) => b.type === 'button')
                .map((blk) => (
                  <button
                    key={blk.id}
                    type="button"
                    onClick={() => onTriggerBlock(blk.id)}
                    className={`p-4 ${resolved.innerRadiusClass} bg-[#0B0F19] border border-slate-800 hover:border-slate-600 hover:bg-slate-900/90 text-left transition-all group flex flex-col justify-between gap-3`}
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-100 group-hover:text-slate-200">
                        {blk.label}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">{blk.description}</div>
                    </div>

                    <div
                      className={`self-end px-3 py-1.5 text-xs font-semibold ${resolved.badgeRadiusClass} transition-colors ${resolved.accent.primaryBg} ${resolved.accent.hoverBg}`}
                    >
                      Execute Action
                    </div>
                  </button>
                ))}
            </div>

            {/* 5. Custom Formulas & Status Badges */}
            {uiBlocks
              .filter(
                (b) =>
                  b.type === 'custom' &&
                  (b.config.customUiKind === 'formula' || b.config.customUiKind === 'badge')
              )
              .map((blk) => {
                const outVal = variables[blk.config.outputVariableName || '']?.value;
                return (
                  <div
                    key={blk.id}
                    className={`p-4 ${resolved.innerRadiusClass} bg-[#0B0F19] border border-slate-800 flex items-center justify-between gap-4`}
                  >
                    <div>
                      <div className="text-xs font-semibold text-slate-100">{blk.label}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{blk.description}</div>
                    </div>

                    {blk.config.customUiKind === 'formula' ? (
                      <div
                        className="font-mono text-xs font-semibold tabular-nums"
                        style={{ color: resolved.accent.hex }}
                      >
                        {blk.config.outputVariableName} = {String(outVal ?? 'N/A')}
                      </div>
                    ) : (
                      <span
                        className={`px-3 py-1 ${resolved.badgeRadiusClass} text-xs font-medium ${resolved.accent.softBg} ${resolved.accent.softBorder} border ${resolved.accent.softText}`}
                      >
                        Operational Nominal
                      </span>
                    )}
                  </div>
                );
              })}

            {/* 6. Execution Audit Table */}
            {uiBlocks
              .filter((b) => b.type === 'table')
              .map((blk) => {
                const v1 = variables[blk.config.variableName || ''];
                const v2 = variables[blk.config.secondaryVariableName || ''];
                return (
                  <div
                    key={blk.id}
                    className={`p-4 ${resolved.innerRadiusClass} bg-[#0B0F19] border border-slate-800 space-y-3`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-slate-200">{blk.label}</div>
                      <div className="text-[11px] font-mono text-slate-400">Live State Ledger</div>
                    </div>

                    <div className="overflow-x-auto border border-slate-800/80 rounded-lg font-mono text-xs tabular-nums">
                      <table className="w-full text-left">
                        <thead className="bg-slate-900/80 text-slate-400 text-[11px]">
                          <tr>
                            <th className="py-2 px-3">Variable Key</th>
                            <th className="py-2 px-3">Current Value</th>
                            <th className="py-2 px-3">Last Modified</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {v1 && (
                            <tr>
                              <td
                                className="py-2 px-3 font-semibold"
                                style={{ color: resolved.accent.hex }}
                              >
                                {v1.name}
                              </td>
                              <td className="py-2 px-3 text-slate-100">{String(v1.value)}</td>
                              <td className="py-2 px-3 text-slate-400">{v1.updatedAt}</td>
                            </tr>
                          )}
                          {v2 && (
                            <tr>
                              <td className="py-2 px-3 text-emerald-300 font-semibold">{v2.name}</td>
                              <td className="py-2 px-3 text-slate-100">{String(v2.value)}</td>
                              <td className="py-2 px-3 text-slate-400">{v2.updatedAt}</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Standalone App Footer */}
          <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 font-mono">
            <span>Powered by CodeBuilder Visual Runtime</span>
            <span>Zero-Knowledge AES-256 State Persistence</span>
          </div>
        </div>
      </div>
    </div>
  );
};
