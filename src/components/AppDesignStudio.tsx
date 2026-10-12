import React, { useState } from 'react';
import {
  Palette,
  Check,
  Sparkles,
  Sliders,
  Type,
  LayoutGrid,
  Monitor,
  Tablet,
  Smartphone,
  RotateCcw,
  Play,
  Copy,
  Clock,
  ShieldCheck,
  Code2,
} from 'lucide-react';
import { SoftwareProject, AppDesignConfig, VisualBlock } from '../types/builder';
import {
  ACCENT_PALETTES,
  SURFACE_THEMES,
  APP_ICONS,
  DESIGN_PRESETS,
  getResolvedTheme,
} from '../utils/theme';

interface AppDesignStudioProps {
  project: SoftwareProject;
  onSaveDesign: (design: AppDesignConfig) => void;
  onNavigateToApp: () => void;
  onNavigateToBuilder: () => void;
}

export const AppDesignStudio: React.FC<AppDesignStudioProps> = ({
  project,
  onSaveDesign,
  onNavigateToApp,
  onNavigateToBuilder,
}) => {
  const [draftDesign, setDraftDesign] = useState<AppDesignConfig>(() => ({
    accentColor: project.design?.accentColor || 'sky',
    surfaceTheme: project.design?.surfaceTheme || 'midnight',
    cardRadius: project.design?.cardRadius || 'modern',
    cardSurface: project.design?.cardSurface || 'solid',
    fontFamily: project.design?.fontFamily || 'sans',
    layoutDensity: project.design?.layoutDensity || 'standard',
    appIcon: project.design?.appIcon || 'code',
    bannerVisible: project.design?.bannerVisible ?? true,
    gridColumns: project.design?.gridColumns || 3,
    showLiveClock: project.design?.showLiveClock ?? true,
    enableStatusPill: project.design?.enableStatusPill ?? true,
    appTitleCustom: project.design?.appTitleCustom || '',
    appSubtitleCustom: project.design?.appSubtitleCustom || '',
    presetId: project.design?.presetId || 'executive',
  }));

  const [previewViewport, setPreviewViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [simulatedMetricValue, setSimulatedMetricValue] = useState<number>(1420);
  const [copiedCss, setCopiedCss] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const resolved = getResolvedTheme(draftDesign);
  const AppIconComponent = resolved.IconComponent;

  const handleApplyPreset = (presetId: string) => {
    const preset = DESIGN_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setDraftDesign((prev) => ({
      ...prev,
      ...preset.config,
      presetId,
    }));
  };

  const handleSave = () => {
    onSaveDesign(draftDesign);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2200);
  };

  const handleCopyCssSpecs = () => {
    const cssContent = `:root {
  --app-accent-hex: ${resolved.accent.hex};
  --app-surface-bg: ${resolved.surface.hexBg};
  --app-card-radius: ${draftDesign.cardRadius === 'sharp' ? '0px' : draftDesign.cardRadius === 'rounded' ? '16px' : draftDesign.cardRadius === 'pill' ? '24px' : '12px'};
  --app-font-family: ${draftDesign.fontFamily === 'mono' ? "'JetBrains Mono', monospace" : "'Plus Jakarta Sans', sans-serif"};
  --app-density: ${draftDesign.layoutDensity};
  --app-grid-columns: ${draftDesign.gridColumns};
}`;
    navigator.clipboard.writeText(cssContent);
    setCopiedCss(true);
    setTimeout(() => setCopiedCss(false), 2000);
  };

  const previewTitle = draftDesign.appTitleCustom?.trim() || project.name;
  const previewSubtitle = draftDesign.appSubtitleCustom?.trim() || project.description;

  const getViewportWidth = () => {
    if (previewViewport === 'mobile') return 'max-w-[390px]';
    if (previewViewport === 'tablet') return 'max-w-[680px]';
    return 'max-w-full';
  };

  const sampleBlocks: VisualBlock[] = project.blocks.length > 0
    ? project.blocks.slice(0, 5)
    : [
        {
          id: 'demo-1',
          type: 'metric',
          category: 'ui',
          label: 'Primary Metric Node',
          description: 'Live telemetry counter',
          gridCol: 1,
          gridRow: 1,
          hasBreakpoint: false,
          config: { variableName: 'stockCount', unit: 'units' },
        },
        {
          id: 'demo-2',
          type: 'button',
          category: 'ui',
          label: 'Increment Output',
          description: 'Triggers active calculation',
          gridCol: 2,
          gridRow: 1,
          hasBreakpoint: false,
          config: { actionType: 'increment', actionValue: 10 },
        },
      ];

  return (
    <div className="space-y-6">
      {/* Studio Header & Preset Quickbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-sky-400">DESIGN &amp; STYLING ARCHITECTURE</span>
            <span className="text-slate-500 font-mono text-xs">·</span>
            <span className="text-xs text-slate-400 font-mono">Zero-Pill Discipline</span>
          </div>
          <h1 className="text-xl font-bold text-slate-100 mt-1">App Design Studio</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Tailor the brand identity, color palette, card geometry, material surfaces, and responsive layout for your software.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleCopyCssSpecs}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-[#0F172A] border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap"
            title="Copy theme CSS variables"
          >
            {copiedCss ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedCss ? 'Copied Specs' : 'Copy Theme CSS'}</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-slate-950 bg-sky-400 rounded-lg hover:bg-sky-300 transition-colors whitespace-nowrap shadow-sm"
          >
            {savedSuccess ? <Check className="w-3.5 h-3.5" /> : <Palette className="w-3.5 h-3.5" />}
            <span>{savedSuccess ? 'Design Applied!' : 'Apply Design'}</span>
          </button>

          <button
            type="button"
            onClick={onNavigateToApp}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-100 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors whitespace-nowrap"
          >
            <Play className="w-3.5 h-3.5 text-sky-400" />
            <span>Launch Live App</span>
          </button>
        </div>
      </div>

      {/* Instant Design Presets Carousel */}
      <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-semibold text-slate-200">Instant Design Presets</span>
          </div>
          <span className="text-[11px] text-slate-400">One-click cohesive aesthetic blueprints</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {DESIGN_PRESETS.map((p) => {
            const isSelected = draftDesign.presetId === p.id;
            const pAccent = ACCENT_PALETTES.find((a) => a.id === p.config.accentColor);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleApplyPreset(p.id)}
                className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between gap-2 ${
                  isSelected
                    ? 'bg-slate-800/90 border-slate-600 ring-2 ' + (pAccent?.ringClass || 'ring-sky-400')
                    : 'bg-[#0B0F19] border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="w-4 h-4 rounded-full flex items-center justify-center text-[10px]"
                    style={{ backgroundColor: pAccent?.hex }}
                  >
                    {isSelected && <Check className="w-2.5 h-2.5 text-slate-950 stroke-[3]" />}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {p.config.cardRadius}
                  </span>
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-100 truncate">{p.name}</div>
                  <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{p.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Split Interface: Left Controls, Right Live Interactive Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (5 Cols): Deep Design Customization Panels */}
        <div className="lg:col-span-5 space-y-5">
          {/* Panel 1: Accent Brand Color */}
          <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200">1. Brand Accent Color</label>
              <span className="text-[11px] font-mono text-slate-400">
                {resolved.accent.label} · {resolved.accent.hex}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {ACCENT_PALETTES.map((col) => {
                const isSelected = draftDesign.accentColor === col.id;
                return (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => setDraftDesign((prev) => ({ ...prev, accentColor: col.id, presetId: undefined }))}
                    className={`p-2 rounded-lg border text-left transition-all flex flex-col items-center gap-1.5 ${
                      isSelected
                        ? 'bg-slate-800 border-slate-600 ring-2 ' + col.ringClass
                        : 'bg-[#0B0F19] border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center shadow-sm"
                      style={{ backgroundColor: col.hex }}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 text-slate-950 stroke-[3]" />}
                    </span>
                    <span className="text-[10px] font-medium text-slate-300">{col.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Panel 2: Canvas Surface Atmosphere & Card Material */}
          <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200">2. Surface Tone &amp; Card Material</label>
              <span className="text-[11px] font-mono text-slate-400">{resolved.surface.label}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SURFACE_THEMES.map((th) => {
                const isSelected = draftDesign.surfaceTheme === th.id;
                return (
                  <button
                    key={th.id}
                    type="button"
                    onClick={() => setDraftDesign((prev) => ({ ...prev, surfaceTheme: th.id, presetId: undefined }))}
                    className={`p-2.5 rounded-lg border text-left transition-colors ${
                      isSelected
                        ? 'bg-sky-500/15 border-sky-400 text-sky-200'
                        : 'bg-[#0B0F19] border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-semibold text-slate-200">{th.label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{th.desc}</div>
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-800/80">
              <span className="text-[11px] text-slate-400 font-medium block mb-1.5">Card Material Surface:</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px]">
                {[
                  { id: 'solid', label: 'Solid Flat' },
                  { id: 'glass', label: 'Frosted Glass' },
                  { id: 'mesh', label: 'Mesh Gradient' },
                  { id: 'bordered', label: 'Hairline Outline' },
                ].map((mat) => {
                  const isSelected = draftDesign.cardSurface === mat.id;
                  return (
                    <button
                      key={mat.id}
                      type="button"
                      onClick={() => setDraftDesign((prev) => ({ ...prev, cardSurface: mat.id as any, presetId: undefined }))}
                      className={`py-1.5 px-2 rounded-md border text-center transition-colors ${
                        isSelected
                          ? 'bg-sky-500/15 border-sky-400 text-sky-200 font-semibold'
                          : 'bg-[#0B0F19] border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {mat.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Panel 3: Card Geometry, Radius & Typography */}
          <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200">3. Geometry &amp; Typography</label>
              <span className="text-[11px] font-mono text-slate-400">
                {draftDesign.cardRadius} · {draftDesign.fontFamily}
              </span>
            </div>

            <div>
              <span className="text-[11px] text-slate-400 font-medium block mb-1.5">Corner Radius:</span>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'sharp', label: 'Sharp (0px)', desc: 'Industrial' },
                  { id: 'modern', label: 'Modern (12px)', desc: 'Balanced' },
                  { id: 'rounded', label: 'Fluid (16px)', desc: 'Soft' },
                  { id: 'pill', label: 'Pill (24px)', desc: 'Curved' },
                ].map((r) => {
                  const isSelected = draftDesign.cardRadius === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setDraftDesign((prev) => ({ ...prev, cardRadius: r.id as any, presetId: undefined }))}
                      className={`p-2 rounded-lg border text-left transition-colors ${
                        isSelected
                          ? 'bg-sky-500/15 border-sky-400 text-sky-200'
                          : 'bg-[#0B0F19] border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-[11px] font-semibold text-slate-200">{r.label}</div>
                      <div className="text-[10px] text-slate-400">{r.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] text-slate-400 font-medium block mb-1.5">Typeface:</span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDraftDesign((prev) => ({ ...prev, fontFamily: 'sans' }))}
                    className={`py-1.5 text-xs rounded-md border font-sans ${
                      draftDesign.fontFamily === 'sans'
                        ? 'bg-sky-500/15 border-sky-400 text-sky-200 font-semibold'
                        : 'bg-[#0B0F19] border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Sans Serif
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraftDesign((prev) => ({ ...prev, fontFamily: 'mono' }))}
                    className={`py-1.5 text-xs rounded-md border font-mono ${
                      draftDesign.fontFamily === 'mono'
                        ? 'bg-sky-500/15 border-sky-400 text-sky-200 font-semibold'
                        : 'bg-[#0B0F19] border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Monospace
                  </button>
                </div>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 font-medium block mb-1.5">Layout Density:</span>
                <div className="grid grid-cols-3 gap-1">
                  {(['compact', 'standard', 'spacious'] as const).map((den) => (
                    <button
                      key={den}
                      type="button"
                      onClick={() => setDraftDesign((prev) => ({ ...prev, layoutDensity: den }))}
                      className={`py-1.5 text-[11px] rounded-md border capitalize ${
                        draftDesign.layoutDensity === den
                          ? 'bg-sky-500/15 border-sky-400 text-sky-200 font-semibold'
                          : 'bg-[#0B0F19] border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {den}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Panel 4: App Branding, Emblem Icon & Titles */}
          <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200">4. Branding &amp; Presentation</label>
              <span className="text-[11px] font-mono text-slate-400">Emblem &amp; Titles</span>
            </div>

            <div>
              <span className="text-[11px] text-slate-400 font-medium block mb-1.5">App Emblem Icon:</span>
              <div className="grid grid-cols-5 gap-1.5">
                {APP_ICONS.map((ic) => {
                  const Icon = ic.icon;
                  const isSelected = draftDesign.appIcon === ic.id;
                  return (
                    <button
                      key={ic.id}
                      type="button"
                      onClick={() => setDraftDesign((prev) => ({ ...prev, appIcon: ic.id as any }))}
                      className={`p-2 rounded-lg border flex flex-col items-center gap-1 transition-colors ${
                        isSelected
                          ? 'bg-sky-500/20 border-sky-400 text-sky-300'
                          : 'bg-[#0B0F19] border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-[10px] truncate max-w-full">{ic.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Custom App Title Override</label>
                <input
                  type="text"
                  value={draftDesign.appTitleCustom || ''}
                  onChange={(e) => setDraftDesign((prev) => ({ ...prev, appTitleCustom: e.target.value }))}
                  placeholder={project.name}
                  className="w-full bg-[#0B0F19] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-sky-400"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Custom App Subtitle / Tagline</label>
                <input
                  type="text"
                  value={draftDesign.appSubtitleCustom || ''}
                  onChange={(e) => setDraftDesign((prev) => ({ ...prev, appSubtitleCustom: e.target.value }))}
                  placeholder={project.description}
                  className="w-full bg-[#0B0F19] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-sky-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={draftDesign.bannerVisible}
                  onChange={(e) => setDraftDesign((prev) => ({ ...prev, bannerVisible: e.target.checked }))}
                  className="rounded border-slate-700 text-sky-400 focus:ring-0"
                />
                <span>Hero Banner</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={draftDesign.showLiveClock}
                  onChange={(e) => setDraftDesign((prev) => ({ ...prev, showLiveClock: e.target.checked }))}
                  className="rounded border-slate-700 text-sky-400 focus:ring-0"
                />
                <span>Live Clock</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={draftDesign.enableStatusPill}
                  onChange={(e) => setDraftDesign((prev) => ({ ...prev, enableStatusPill: e.target.checked }))}
                  className="rounded border-slate-700 text-sky-400 focus:ring-0"
                />
                <span>Status Pill</span>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column (7 Cols): Real-time Interactive Live App Preview Frame */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between bg-[#0F172A] border border-slate-800 rounded-xl px-4 py-2.5">
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4 text-sky-400" />
              <span className="text-xs font-semibold text-slate-200">Real-Time Interactive Preview</span>
            </div>

            {/* Viewport switchers */}
            <div className="flex items-center gap-1 p-0.5 bg-[#0B0F19] border border-slate-800 rounded-lg">
              <button
                type="button"
                onClick={() => setPreviewViewport('desktop')}
                className={`p-1.5 rounded transition-colors ${
                  previewViewport === 'desktop' ? 'bg-slate-800 text-sky-400' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Desktop View"
              >
                <Monitor className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setPreviewViewport('tablet')}
                className={`p-1.5 rounded transition-colors ${
                  previewViewport === 'tablet' ? 'bg-slate-800 text-sky-400' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Tablet View (680px)"
              >
                <Tablet className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setPreviewViewport('mobile')}
                className={`p-1.5 rounded transition-colors ${
                  previewViewport === 'mobile' ? 'bg-slate-800 text-sky-400' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Mobile View (390px)"
              >
                <Smartphone className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Canvas Wrapper */}
          <div
            className={`w-full min-h-[580px] p-6 rounded-2xl border border-slate-800 flex justify-center transition-all duration-300 overflow-x-hidden ${resolved.surface.canvasClass}`}
          >
            <div className={`w-full ${getViewportWidth()} transition-all duration-300 space-y-5`}>
              {/* App Card Shell */}
              <div
                className={`w-full ${resolved.materialClass} ${resolved.radiusClass} ${resolved.densityPadding} space-y-5 transition-all`}
              >
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
                  <div className="flex items-center gap-3">
                    <span
                      className={`p-2.5 ${resolved.innerRadiusClass} ${resolved.accent.softBg} ${resolved.accent.softBorder} border ${resolved.accent.softText}`}
                    >
                      <AppIconComponent className="w-5 h-5" />
                    </span>

                    <div>
                      <h2 className={`text-base font-bold text-slate-100 ${resolved.fontClass}`}>
                        {previewTitle}
                      </h2>
                      <p className="text-xs text-slate-400 line-clamp-1">{previewSubtitle}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {draftDesign.showLiveClock && (
                      <span className="flex items-center gap-1 text-[11px] font-mono text-slate-400">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>12:00:00 PM</span>
                      </span>
                    )}

                    {draftDesign.enableStatusPill && (
                      <span
                        className={`flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-medium ${resolved.badgeRadiusClass} ${resolved.accent.softBg} ${resolved.accent.softBorder} border ${resolved.accent.softText}`}
                      >
                        <ShieldCheck className="w-3 h-3" />
                        <span>Active Vault</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Optional Hero Banner */}
                {draftDesign.bannerVisible && (
                  <div
                    className={`p-3.5 ${resolved.innerRadiusClass} border ${resolved.accent.softBorder} ${resolved.accent.softBg} flex items-center justify-between gap-3`}
                  >
                    <div>
                      <div className={`text-xs font-semibold ${resolved.accent.softText}`}>
                        {resolved.accent.label} Branded Workspace
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Zero-knowledge E2E synchronization active with paired devices.
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-1 text-xs font-semibold ${resolved.badgeRadiusClass} ${resolved.accent.primaryBg}`}
                    >
                      v{project.version}.0
                    </span>
                  </div>
                )}

                {/* Rendered Live Preview Cards */}
                <div className={`grid ${resolved.gridClass} ${resolved.densityGap}`}>
                  {/* Metric Card 1 */}
                  <div
                    className={`p-4 ${resolved.innerRadiusClass} bg-[#0B0F19]/90 border border-slate-800 space-y-1.5`}
                  >
                    <div className="text-xs text-slate-400 font-medium">Telemetry Readout</div>
                    <div
                      className={`text-2xl font-mono font-bold tabular-nums`}
                      style={{ color: resolved.accent.hex }}
                    >
                      {simulatedMetricValue.toLocaleString()}{' '}
                      <span className="text-xs text-slate-500 font-normal">units</span>
                    </div>
                    <div className="text-[11px] text-slate-500">Live synchronized sensor buffer</div>
                  </div>

                  {/* Metric Card 2 */}
                  <div
                    className={`p-4 ${resolved.innerRadiusClass} bg-[#0B0F19]/90 border border-slate-800 space-y-1.5`}
                  >
                    <div className="text-xs text-slate-400 font-medium">Computed Valuation</div>
                    <div
                      className={`text-2xl font-mono font-bold tabular-nums`}
                      style={{ color: resolved.accent.hex }}
                    >
                      ${(simulatedMetricValue * 1.25).toFixed(2)}
                    </div>
                    <div className="text-[11px] text-slate-500">Automated formula transform</div>
                  </div>

                  {/* Interactive Button Card */}
                  <div
                    className={`p-4 ${resolved.innerRadiusClass} bg-[#0B0F19]/90 border border-slate-800 flex flex-col justify-between gap-3`}
                  >
                    <div>
                      <div className="text-xs font-semibold text-slate-100">Simulate Action</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">Increments telemetry readout</div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSimulatedMetricValue((v) => v + 50)}
                      className={`px-3 py-1.5 text-xs font-semibold ${resolved.badgeRadiusClass} transition-colors self-end ${resolved.accent.primaryBg} ${resolved.accent.hoverBg}`}
                    >
                      Execute +50
                    </button>
                  </div>

                  {/* Slider Control Card */}
                  <div
                    className={`p-4 ${resolved.innerRadiusClass} bg-[#0B0F19]/90 border border-slate-800 sm:col-span-2 space-y-2`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-200">Interactive Range Control</span>
                      <span className="font-mono font-bold text-sky-400 tabular-nums">
                        {simulatedMetricValue}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={100}
                      max={5000}
                      step={50}
                      value={simulatedMetricValue}
                      onChange={(e) => setSimulatedMetricValue(Number(e.target.value))}
                      className="w-full"
                      style={{ accentColor: resolved.accent.hex }}
                    />
                  </div>
                </div>

                {/* Footer Strip */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>Engine: CodeBuilder v{project.version}</span>
                  <span>AES-256 E2E Verified</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
