import React, { useState } from 'react';
import {
  X,
  Palette,
  Check,
  Sparkles,
  Copy,
} from 'lucide-react';
import { AppDesignConfig } from '../types/builder';
import {
  ACCENT_PALETTES,
  SURFACE_THEMES,
  APP_ICONS,
  DESIGN_PRESETS,
  getResolvedTheme,
} from '../utils/theme';

interface AppDesignModalProps {
  currentDesign?: AppDesignConfig;
  projectName: string;
  onSaveDesign: (design: AppDesignConfig) => void;
  onClose: () => void;
}

const DEFAULT_DESIGN: AppDesignConfig = {
  accentColor: 'sky',
  surfaceTheme: 'midnight',
  cardRadius: 'modern',
  cardSurface: 'solid',
  fontFamily: 'sans',
  layoutDensity: 'standard',
  appIcon: 'code',
  bannerVisible: true,
  gridColumns: 3,
  showLiveClock: true,
  enableStatusPill: true,
};

export const AppDesignModal: React.FC<AppDesignModalProps> = ({
  currentDesign,
  projectName,
  onSaveDesign,
  onClose,
}) => {
  const [design, setDesign] = useState<AppDesignConfig>(() => ({
    ...DEFAULT_DESIGN,
    ...(currentDesign || {}),
  }));

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveDesign(design);
    onClose();
  };

  const handleApplyPreset = (presetId: string) => {
    const preset = DESIGN_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setDesign((prev) => ({
      ...prev,
      ...preset.config,
      presetId,
    }));
  };

  const resolved = getResolvedTheme(design);
  const IconComponent = resolved.IconComponent;

  return (
    <div className="fixed inset-0 z-50 bg-[#0B0F19]/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl rounded-xl bg-[#0F172A] border border-slate-800 p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100">App Design Quick Studio</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Customize your software app theme, brand colors, geometry, and presentation layout
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Presets Bar */}
        <div>
          <span className="text-[11px] font-semibold text-slate-400 block mb-2">Instant Style Presets:</span>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {DESIGN_PRESETS.map((p) => {
              const isSelected = design.presetId === p.id;
              const pAccent = ACCENT_PALETTES.find((a) => a.id === p.config.accentColor);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleApplyPreset(p.id)}
                  className={`p-2 rounded-lg border text-left transition-colors flex items-center gap-2 ${
                    isSelected
                      ? 'bg-slate-800 border-slate-600 ring-2 ring-sky-400'
                      : 'bg-[#0B0F19] border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0"
                    style={{ backgroundColor: pAccent?.hex }}
                  />
                  <span className="text-[11px] font-medium text-slate-200 truncate">{p.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-5 text-xs">
          {/* 1. Accent Color Palette */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-slate-300 font-medium">Brand Accent Color</label>
              <span className="font-mono text-[11px] text-slate-400">{resolved.accent.hex}</span>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {ACCENT_PALETTES.map((col) => {
                const isSelected = design.accentColor === col.id;
                return (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => setDesign((prev) => ({ ...prev, accentColor: col.id, presetId: undefined }))}
                    className={`p-2 rounded-lg border text-left transition-all flex flex-col items-center gap-1.5 ${
                      isSelected
                        ? 'bg-slate-800 border-slate-600 ring-2 ' + col.ringClass
                        : 'bg-[#0B0F19] border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center shadow-sm"
                      style={{ backgroundColor: col.hex }}
                    >
                      {isSelected && <Check className="w-3 h-3 text-slate-950 stroke-[3]" />}
                    </span>
                    <span className="text-[10px] font-medium text-slate-300 truncate">{col.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Surface Theme Tone & Corner Radius */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-medium mb-1.5">Canvas Surface Atmosphere</label>
              <div className="grid grid-cols-2 gap-2">
                {SURFACE_THEMES.slice(0, 4).map((th) => {
                  const isSelected = design.surfaceTheme === th.id;
                  return (
                    <button
                      key={th.id}
                      type="button"
                      onClick={() => setDesign((prev) => ({ ...prev, surfaceTheme: th.id, presetId: undefined }))}
                      className={`p-2.5 rounded-lg border text-left transition-colors ${
                        isSelected
                          ? 'bg-sky-500/15 border-sky-400 text-sky-200'
                          : 'bg-[#0B0F19] border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-semibold text-slate-200">{th.label}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{th.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1.5">Widget Geometry &amp; Corner Radius</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'sharp', label: 'Sharp (0px)', desc: 'Industrial look' },
                  { id: 'modern', label: 'Modern (12px)', desc: 'Balanced' },
                  { id: 'rounded', label: 'Fluid (16px)', desc: 'Soft & modern' },
                  { id: 'pill', label: 'Pill (24px)', desc: 'Full curvature' },
                ].map((rad) => {
                  const isSelected = design.cardRadius === rad.id;
                  return (
                    <button
                      key={rad.id}
                      type="button"
                      onClick={() => setDesign((prev) => ({ ...prev, cardRadius: rad.id as any, presetId: undefined }))}
                      className={`p-2.5 rounded-lg border text-left transition-colors ${
                        isSelected
                          ? 'bg-sky-500/15 border-sky-400 text-sky-200'
                          : 'bg-[#0B0F19] border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-semibold text-slate-200">{rad.label}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{rad.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 3. Brand Emblem Icon & Surface Material */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-medium mb-1.5">App Brand Emblem</label>
              <div className="grid grid-cols-5 gap-1.5">
                {APP_ICONS.map((ic) => {
                  const Icon = ic.icon;
                  const isSelected = design.appIcon === ic.id;
                  return (
                    <button
                      key={ic.id}
                      type="button"
                      onClick={() => setDesign((prev) => ({ ...prev, appIcon: ic.id as any }))}
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

            <div>
              <label className="block text-slate-300 font-medium mb-1.5">Card Surface Material</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'solid', label: 'Solid Flat', desc: 'Slate opaque' },
                  { id: 'glass', label: 'Frosted Glass', desc: 'Backdrop blur' },
                  { id: 'mesh', label: 'Subtle Mesh', desc: 'Fine gradient' },
                  { id: 'bordered', label: 'Hairline Outline', desc: 'High contrast' },
                ].map((mat) => {
                  const isSelected = design.cardSurface === mat.id;
                  return (
                    <button
                      key={mat.id}
                      type="button"
                      onClick={() => setDesign((prev) => ({ ...prev, cardSurface: mat.id as any, presetId: undefined }))}
                      className={`p-2.5 rounded-lg border text-left transition-colors ${
                        isSelected
                          ? 'bg-sky-500/15 border-sky-400 text-sky-200'
                          : 'bg-[#0B0F19] border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-semibold text-slate-200">{mat.label}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{mat.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 4. Live Design Preview Frame */}
          <div className="p-4 rounded-xl bg-[#0B0F19] border border-slate-800 space-y-2.5">
            <div className="text-[11px] font-mono text-slate-400">Live App Appearance Preview</div>
            <div
              className={`p-4 border transition-all ${resolved.materialClass} ${resolved.radiusClass}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`p-2 ${resolved.innerRadiusClass} ${resolved.accent.softBg} ${resolved.accent.softBorder} border`}
                  >
                    <IconComponent className="w-4 h-4 text-sky-400" />
                  </span>
                  <div>
                    <div className="text-xs font-bold text-slate-100">{projectName}</div>
                    <div className="text-[10px] text-slate-400">Theme: {resolved.accent.label}</div>
                  </div>
                </div>

                <button
                  type="button"
                  className={`px-3 py-1.5 text-xs font-semibold ${resolved.badgeRadiusClass} ${resolved.accent.primaryBg}`}
                >
                  Action Button
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3">
                <div className={`p-2.5 ${resolved.innerRadiusClass} bg-[#0B0F19] border border-slate-800`}>
                  <div className="text-[10px] text-slate-400">Metric Readout</div>
                  <div
                    className="text-lg font-mono font-bold tabular-nums mt-0.5"
                    style={{ color: resolved.accent.hex }}
                  >
                    1,240 units
                  </div>
                </div>

                <div className={`p-2.5 ${resolved.innerRadiusClass} bg-[#0B0F19] border border-slate-800 flex items-center justify-between`}>
                  <div className="text-[10px] text-slate-400">Status State</div>
                  <span
                    className={`px-2 py-0.5 ${resolved.badgeRadiusClass} text-[10px] font-medium ${resolved.accent.softBg} ${resolved.accent.softBorder} border ${resolved.accent.softText}`}
                  >
                    Verified Active
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-slate-950 bg-sky-400 rounded-lg hover:bg-sky-300 transition-colors whitespace-nowrap"
            >
              Apply Design to App
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
