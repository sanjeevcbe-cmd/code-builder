import React, { useState } from 'react';
import { X, Sparkles, Sliders, Calculator, Eye, Check } from 'lucide-react';
import { CustomBlockDefinition, BlockCategory } from '../types/builder';

interface CustomBlockModalProps {
  existingVariables: string[];
  onSaveCustomBlock: (definition: CustomBlockDefinition) => void;
  onClose: () => void;
}

export const CustomBlockModal: React.FC<CustomBlockModalProps> = ({
  existingVariables,
  onSaveCustomBlock,
  onClose,
}) => {
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<BlockCategory>('logic');
  const [customUiKind, setCustomUiKind] = useState<'slider' | 'badge' | 'formula' | 'button' | 'metric'>('formula');
  const [variableName, setVariableName] = useState(existingVariables[0] || 'stockCount');
  const [secondaryVariableName, setSecondaryVariableName] = useState(existingVariables[1] || 'unitPrice');
  const [outputVariableName, setOutputVariableName] = useState('customResult');
  const [customFormula, setCustomFormula] = useState('(stockCount * unitPrice) * 0.9');
  const [unit, setUnit] = useState('USD');
  const [sliderMin, setSliderMin] = useState(0);
  const [sliderMax, setSliderMax] = useState(100);
  const [sliderStep, setSliderStep] = useState(5);
  const [previewValue, setPreviewValue] = useState(45);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;

    const id = `custom-${customUiKind}-${Date.now().toString(36).slice(-4)}`;
    const definition: CustomBlockDefinition = {
      id,
      label: label.trim(),
      category,
      description: description.trim() || `User-defined ${customUiKind} block`,
      customUiKind,
      defaultConfig: {
        variableName: variableName.trim(),
        secondaryVariableName: secondaryVariableName.trim() || undefined,
        outputVariableName: outputVariableName.trim() || undefined,
        unit: unit.trim() || undefined,
        customUiKind,
        customFormula: customUiKind === 'formula' ? customFormula.trim() : undefined,
        actionType: customUiKind === 'formula' ? 'custom_formula' : 'set',
        sliderMin,
        sliderMax,
        sliderStep,
        initialValue: previewValue,
      },
      createdAt: new Date().toISOString(),
    };

    onSaveCustomBlock(definition);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0B0F19]/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-xl bg-[#0F172A] border border-slate-800 p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100">Create Custom Block</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Define reusable custom visual widgets, formulas, and state logic for your software
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

        <form onSubmit={handleCreate} className="space-y-5 text-xs">
          {/* Block Name & Description */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Block Title</label>
              <input
                type="text"
                required
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g., Discount Tax Calculator"
                className="w-full bg-[#0B0F19] border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-sky-400"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Block Category</label>
              <div className="flex items-center gap-2">
                {(['ui', 'logic', 'data'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-colors ${
                      category === cat
                        ? 'bg-sky-500/15 border-sky-400 text-sky-300'
                        : 'bg-[#0B0F19] border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {cat.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Description / Tooltip</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Applies 10% wholesale discount to inventory valuation."
              className="w-full bg-[#0B0F19] border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-sky-400"
            />
          </div>

          {/* Widget / Logic Archetype */}
          <div>
            <label className="block text-slate-300 font-medium mb-2">Block Template Archetype</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { id: 'formula', label: 'Formula Transform', icon: Calculator, desc: 'Math expression' },
                { id: 'slider', label: 'Interactive Slider', icon: Sliders, desc: 'Range control' },
                { id: 'badge', label: 'Status Health Badge', icon: Eye, desc: 'Color indicator' },
                { id: 'metric', label: 'Progress Gauge Card', icon: Sparkles, desc: 'Target metric' },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = customUiKind === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setCustomUiKind(item.id as any);
                      if (item.id === 'slider' || item.id === 'badge') setCategory('ui');
                      if (item.id === 'formula') setCategory('logic');
                    }}
                    className={`p-3 rounded-lg border text-left transition-colors flex flex-col justify-between gap-2 ${
                      isSelected
                        ? 'bg-sky-500/10 border-sky-400 text-sky-300'
                        : 'bg-[#0B0F19] border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Icon className="w-4 h-4 text-sky-400" />
                      {isSelected && <Check className="w-3.5 h-3.5 text-sky-400" />}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-100">{item.label}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{item.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Formula Specific Settings */}
          {customUiKind === 'formula' && (
            <div className="p-3.5 rounded-lg bg-[#0B0F19] border border-slate-800 space-y-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Custom JavaScript / Math Formula Expression
                </label>
                <input
                  type="text"
                  value={customFormula}
                  onChange={(e) => setCustomFormula(e.target.value)}
                  placeholder="e.g. (stockCount * unitPrice) * 0.9"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 font-mono text-emerald-300 focus:outline-none focus:border-sky-400"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Variables in scope: {existingVariables.join(', ')}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Input Variable Reference</label>
                  <input
                    type="text"
                    value={variableName}
                    onChange={(e) => setVariableName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 font-mono text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Output Target Variable</label>
                  <input
                    type="text"
                    value={outputVariableName}
                    onChange={(e) => setOutputVariableName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 font-mono text-sky-300"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Slider Specific Settings */}
          {customUiKind === 'slider' && (
            <div className="p-3.5 rounded-lg bg-[#0B0F19] border border-slate-800 space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Bound State Variable</label>
                  <input
                    type="text"
                    value={variableName}
                    onChange={(e) => setVariableName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 font-mono text-sky-300"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Min Value</label>
                  <input
                    type="number"
                    value={sliderMin}
                    onChange={(e) => setSliderMin(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 font-mono text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Max Value</label>
                  <input
                    type="number"
                    value={sliderMax}
                    onChange={(e) => setSliderMax(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 font-mono text-slate-100"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Live Preview Box */}
          <div className="p-4 rounded-lg bg-[#0B0F19] border border-slate-800 space-y-2">
            <div className="text-[11px] font-mono text-slate-400">Live Block Appearance Preview</div>
            <div className="p-3.5 rounded-lg bg-slate-900/90 border border-slate-700/80 flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-semibold text-slate-100">
                  {label || 'Custom Block Label'}
                </div>
                <div className="text-[11px] text-slate-400">
                  {description || 'Bound to ' + variableName}
                </div>
              </div>

              {customUiKind === 'slider' && (
                <div className="w-36 flex items-center gap-2">
                  <input
                    type="range"
                    min={sliderMin}
                    max={sliderMax}
                    step={sliderStep}
                    value={previewValue}
                    onChange={(e) => setPreviewValue(Number(e.target.value))}
                    className="w-full accent-sky-400"
                  />
                  <span className="font-mono text-xs text-sky-300 tabular-nums">{previewValue}</span>
                </div>
              )}

              {customUiKind === 'formula' && (
                <div className="font-mono text-xs text-emerald-400">
                  {outputVariableName} = <span className="text-sky-300">{customFormula}</span>
                </div>
              )}

              {customUiKind === 'badge' && (
                <span className="px-2.5 py-1 rounded text-[11px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Nominal Operational Status
                </span>
              )}

              {customUiKind === 'metric' && (
                <span className="text-lg font-bold font-mono text-sky-300 tabular-nums">
                  1,240 {unit}
                </span>
              )}
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
              Save Custom Block to Library
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
