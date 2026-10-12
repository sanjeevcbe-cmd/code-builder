import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Bug,
  ArrowRight,
  GripVertical,
  Sliders,
  Play,
  Layers,
  Sparkles,
  Palette,
  Eye,
} from 'lucide-react';
import {
  SoftwareProject,
  VisualBlock,
  BlockCategory,
  ActionType,
  ConditionOperator,
} from '../types/builder';
import { PALETTE_BLOCK_TEMPLATES, PaletteBlockTemplate } from '../data/starterProjects';

interface VisualBuilderCanvasProps {
  project: SoftwareProject;
  selectedBlockId: string | null;
  activeDebugBlockId: string | null;
  onSelectBlock: (blockId: string) => void;
  onAddBlockFromTemplate: (template: PaletteBlockTemplate) => void;
  onUpdateBlock: (blockId: string, updater: (prev: VisualBlock) => VisualBlock) => void;
  onDeleteBlock: (blockId: string) => void;
  onReorderBlocks: (sourceBlockId: string, targetBlockId: string) => void;
  onToggleBlockBreakpoint: (blockId: string) => void;
  onOpenDebuggerAndRun: () => void;
  onOpenCustomBlockModal: () => void;
  onOpenDesignStudio?: () => void;
  onOpenAppRunner?: () => void;
}

export const VisualBuilderCanvas: React.FC<VisualBuilderCanvasProps> = ({
  project,
  selectedBlockId,
  activeDebugBlockId,
  onSelectBlock,
  onAddBlockFromTemplate,
  onUpdateBlock,
  onDeleteBlock,
  onReorderBlocks,
  onToggleBlockBreakpoint,
  onOpenDebuggerAndRun,
  onOpenCustomBlockModal,
  onOpenDesignStudio,
  onOpenAppRunner,
}) => {
  const [paletteFilter, setPaletteFilter] = useState<'all' | BlockCategory | 'custom'>('all');
  const [draggedTemplateIndex, setDraggedTemplateIndex] = useState<number | null>(null);
  const [draggedCanvasBlockId, setDraggedCanvasBlockId] = useState<string | null>(null);
  const [isDropZoneActive, setIsDropZoneActive] = useState(false);

  const customTemplates: PaletteBlockTemplate[] = (project.customBlocks || []).map((cb) => ({
    type: 'custom',
    category: cb.category,
    label: cb.label,
    description: cb.description,
    defaultConfig: cb.defaultConfig,
  }));

  const allTemplates = [...PALETTE_BLOCK_TEMPLATES, ...customTemplates];

  const filteredTemplates = allTemplates.filter((t) => {
    if (paletteFilter === 'all') return true;
    if (paletteFilter === 'custom') return t.type === 'custom';
    return t.category === paletteFilter;
  });

  const selectedBlock =
    project.blocks.find((b) => b.id === selectedBlockId) || project.blocks[0] || null;

  const handleCanvasDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDropZoneActive(true);
  };

  const handleCanvasDragLeave = () => {
    setIsDropZoneActive(false);
  };

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDropZoneActive(false);
    if (draggedTemplateIndex !== null) {
      const tmpl = filteredTemplates[draggedTemplateIndex];
      if (tmpl) {
        onAddBlockFromTemplate(tmpl);
      }
      setDraggedTemplateIndex(null);
    }
  };

  const handleBlockDropOnBlock = (e: React.DragEvent, targetBlockId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDropZoneActive(false);

    if (draggedTemplateIndex !== null) {
      const tmpl = filteredTemplates[draggedTemplateIndex];
      if (tmpl) {
        onAddBlockFromTemplate(tmpl);
      }
      setDraggedTemplateIndex(null);
      return;
    }

    if (draggedCanvasBlockId && draggedCanvasBlockId !== targetBlockId) {
      onReorderBlocks(draggedCanvasBlockId, targetBlockId);
      setDraggedCanvasBlockId(null);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
      {/* Left 3 Cols: Visual Block Palette */}
      <div className="lg:col-span-3 rounded-xl bg-[#0F172A] border border-slate-800 p-4 flex flex-col justify-between space-y-4">
        <div className="space-y-3.5">
          <div className="border-b border-slate-800 pb-3 flex items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Visual Block Library</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Drag blocks onto canvas or create custom nodes
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenCustomBlockModal}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-950 bg-sky-400 rounded-md hover:bg-sky-300 transition-colors whitespace-nowrap shrink-0"
              title="Design and save a custom visual block"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>+ Custom</span>
            </button>
          </div>

          {/* Category Filter Segmented Control */}
          <div className="flex items-center gap-1 p-1 bg-[#0B0F19] border border-slate-800 rounded-lg overflow-x-auto">
            {(['all', 'ui', 'logic', 'data', 'custom'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setPaletteFilter(cat)}
                className={`flex-1 py-1 px-1.5 text-[11px] font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  paletteFilter === cat
                    ? 'bg-slate-800 text-slate-100 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat === 'all' ? 'All' : cat === 'custom' ? 'Custom' : cat.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Draggable Block List */}
          <div className="space-y-2 max-h-[540px] overflow-y-auto pr-1">
            {filteredTemplates.map((tmpl, idx) => (
              <div
                key={`${tmpl.type}-${idx}`}
                draggable
                onDragStart={() => {
                  setDraggedTemplateIndex(idx);
                  setDraggedCanvasBlockId(null);
                }}
                onDragEnd={() => setDraggedTemplateIndex(null)}
                onClick={() => onAddBlockFromTemplate(tmpl)}
                className="p-3 rounded-lg bg-[#0B0F19] border border-slate-800 hover:border-sky-500/50 cursor-grab active:cursor-grabbing transition-colors group"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono text-slate-400">
                    {tmpl.category.toUpperCase()} · {tmpl.type.toUpperCase()}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-sky-400 group-hover:text-sky-300 font-medium">
                    <Plus className="w-3.5 h-3.5" /> Add
                  </span>
                </div>
                <div className="text-xs font-semibold text-slate-100 mt-1">{tmpl.label}</div>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                  {tmpl.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400">
          Voice Access tip: Say &ldquo;Add button&rdquo; or &ldquo;Add condition&rdquo; to insert hands-free.
        </div>
      </div>

      {/* Center 6 Cols: Drag-and-Drop Visual Architecture Canvas */}
      <div
        onDragOver={handleCanvasDragOver}
        onDragLeave={handleCanvasDragLeave}
        onDrop={handleCanvasDrop}
        className={`lg:col-span-6 rounded-xl bg-[#0F172A] border p-5 flex flex-col justify-between space-y-4 transition-colors ${
          isDropZoneActive ? 'border-sky-400 bg-sky-950/10' : 'border-slate-800'
        }`}
      >
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-semibold text-slate-100">
                  {project.name} — Visual Flow Canvas
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Drag cards to reorder execution priority, wire downstream targets, or set debugger breakpoints
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0 self-start sm:self-center">
              {onOpenDesignStudio && (
                <button
                  type="button"
                  onClick={onOpenDesignStudio}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-[#0B0F19] border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap"
                  title="Customize brand colors, themes, radius, and geometry"
                >
                  <Palette className="w-3.5 h-3.5 text-sky-400" />
                  <span>App Design</span>
                </button>
              )}

              {onOpenAppRunner && (
                <button
                  type="button"
                  onClick={onOpenAppRunner}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors whitespace-nowrap"
                  title="Run created software as an interactive app"
                >
                  <Eye className="w-3.5 h-3.5 text-sky-400" />
                  <span>Run as App</span>
                </button>
              )}

              <button
                type="button"
                onClick={onOpenDebuggerAndRun}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-sky-400 rounded-lg hover:bg-sky-300 transition-colors whitespace-nowrap"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Test &amp; Debug</span>
              </button>
            </div>
          </div>

          {project.blocks.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-slate-800 rounded-xl space-y-3">
              <p className="text-sm text-slate-300 font-medium">Canvas is currently empty</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Drag any UI, Logic, or Data block from the left library onto this workspace to start building your software.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {project.blocks.map((block, index) => {
                const isSelected = selectedBlock?.id === block.id;
                const isDebugActive = activeDebugBlockId === block.id;
                const targetBlock = project.blocks.find(
                  (b) => b.id === block.config.targetBlockId
                );

                return (
                  <div
                    key={block.id}
                    draggable
                    onDragStart={() => {
                      setDraggedCanvasBlockId(block.id);
                      setDraggedTemplateIndex(null);
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleBlockDropOnBlock(e, block.id)}
                    onClick={() => onSelectBlock(block.id)}
                    className={`p-3.5 rounded-lg border cursor-pointer transition-colors flex flex-col justify-between gap-3 ${
                      isDebugActive
                        ? 'bg-amber-950/30 border-amber-400'
                        : isSelected
                        ? 'bg-slate-900 border-sky-400'
                        : 'bg-[#0B0F19] border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400 tabular-nums">
                          <GripVertical className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>#{String(index + 1).padStart(2, '0')}</span>
                          <span>·</span>
                          <span>{block.category.toUpperCase()}</span>
                          <span>·</span>
                          <span className="text-sky-300">{block.type.toUpperCase()}</span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleBlockBreakpoint(block.id);
                            }}
                            className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                              block.hasBreakpoint
                                ? 'bg-rose-500/20 border-rose-500/60 text-rose-300'
                                : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
                            }`}
                            title="Toggle debugger breakpoint on this block"
                          >
                            {block.hasBreakpoint ? 'BP ON' : 'BP'}
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteBlock(block.id);
                            }}
                            className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors"
                            title="Delete block"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="text-sm font-semibold text-slate-100 truncate">
                        {block.label}
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-2">{block.description}</p>
                    </div>

                    {/* Block Binding & Wiring Summary */}
                    <div className="pt-2.5 border-t border-slate-800/80 space-y-1 text-[11px] font-mono text-slate-300">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-500">Var:</span>
                        <span className="text-sky-300 truncate">
                          {block.config.variableName || 'unassigned'}
                          {block.config.outputVariableName
                            ? ` -> ${block.config.outputVariableName}`
                            : ''}
                        </span>
                      </div>

                      {targetBlock && (
                        <div className="flex items-center justify-between gap-1 text-emerald-400 truncate">
                          <span className="text-slate-500">Chain:</span>
                          <span className="flex items-center gap-1 truncate">
                            <ArrowRight className="w-3 h-3 shrink-0" />
                            <span className="truncate">{targetBlock.label}</span>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <span>
            {project.blocks.length} visual blocks ·{' '}
            {project.blocks.filter((b) => b.hasBreakpoint).length} active breakpoints
          </span>
          <span className="font-mono">Drag any block card onto another to reorder</span>
        </div>
      </div>

      {/* Right 3 Cols: Block Property & Logic Wiring Inspector */}
      <div className="lg:col-span-3 rounded-xl bg-[#0F172A] border border-slate-800 p-4 flex flex-col justify-between space-y-4">
        {selectedBlock ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-100">Block Inspector</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{selectedBlock.id}</p>
              </div>
              <Sliders className="w-4 h-4 text-sky-400 shrink-0" />
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Block Label</label>
                <input
                  type="text"
                  value={selectedBlock.label}
                  onChange={(e) =>
                    onUpdateBlock(selectedBlock.id, (b) => ({ ...b, label: e.target.value }))
                  }
                  className="w-full bg-[#0B0F19] border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 focus:outline-none focus:border-sky-400"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Bound State Variable</label>
                <input
                  type="text"
                  value={selectedBlock.config.variableName || ''}
                  onChange={(e) =>
                    onUpdateBlock(selectedBlock.id, (b) => ({
                      ...b,
                      config: { ...b.config, variableName: e.target.value },
                    }))
                  }
                  className="w-full bg-[#0B0F19] border border-slate-700 rounded-lg px-3 py-1.5 font-mono text-sky-300 focus:outline-none focus:border-sky-400"
                />
              </div>

              {selectedBlock.type === 'variable' && (
                <div>
                  <label className="block text-slate-400 mb-1">Initial Value</label>
                  <input
                    type="text"
                    value={String(selectedBlock.config.initialValue ?? 0)}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const num = Number(raw);
                      onUpdateBlock(selectedBlock.id, (b) => ({
                        ...b,
                        config: {
                          ...b.config,
                          initialValue: !Number.isNaN(num) && raw.trim() !== '' ? num : raw,
                        },
                      }));
                    }}
                    className="w-full bg-[#0B0F19] border border-slate-700 rounded-lg px-3 py-1.5 font-mono text-slate-100 focus:outline-none focus:border-sky-400"
                  />
                </div>
              )}

              {(selectedBlock.type === 'button' || selectedBlock.type === 'transform') && (
                <>
                  <div>
                    <label className="block text-slate-400 mb-1">Operation / Action Type</label>
                    <select
                      value={selectedBlock.config.actionType || 'increment'}
                      onChange={(e) =>
                        onUpdateBlock(selectedBlock.id, (b) => ({
                          ...b,
                          config: { ...b.config, actionType: e.target.value as ActionType },
                        }))
                      }
                      className="w-full bg-[#0B0F19] border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 focus:outline-none focus:border-sky-400"
                    >
                      <option value="increment">Increment (+)</option>
                      <option value="decrement">Decrement (-)</option>
                      <option value="multiply">Multiply (*)</option>
                      <option value="divide">Divide (/)</option>
                      <option value="set">Set Value (=)</option>
                      <option value="reset">Reset to 0</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">
                      {selectedBlock.type === 'transform'
                        ? 'Secondary Variable (or Multiplier)'
                        : 'Action Delta / Value'}
                    </label>
                    {selectedBlock.type === 'transform' ? (
                      <input
                        type="text"
                        value={selectedBlock.config.secondaryVariableName || ''}
                        onChange={(e) =>
                          onUpdateBlock(selectedBlock.id, (b) => ({
                            ...b,
                            config: { ...b.config, secondaryVariableName: e.target.value },
                          }))
                        }
                        placeholder="e.g. unitPrice"
                        className="w-full bg-[#0B0F19] border border-slate-700 rounded-lg px-3 py-1.5 font-mono text-slate-100 focus:outline-none focus:border-sky-400"
                      />
                    ) : (
                      <input
                        type="number"
                        value={Number(selectedBlock.config.actionValue ?? 1)}
                        onChange={(e) =>
                          onUpdateBlock(selectedBlock.id, (b) => ({
                            ...b,
                            config: { ...b.config, actionValue: Number(e.target.value) },
                          }))
                        }
                        className="w-full bg-[#0B0F19] border border-slate-700 rounded-lg px-3 py-1.5 font-mono text-slate-100 focus:outline-none focus:border-sky-400"
                      />
                    )}
                  </div>
                </>
              )}

              {selectedBlock.type === 'condition' && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-400 mb-1">Operator</label>
                      <select
                        value={selectedBlock.config.conditionOperator || '<='}
                        onChange={(e) =>
                          onUpdateBlock(selectedBlock.id, (b) => ({
                            ...b,
                            config: {
                              ...b.config,
                              conditionOperator: e.target.value as ConditionOperator,
                            },
                          }))
                        }
                        className="w-full bg-[#0B0F19] border border-slate-700 rounded-lg px-2.5 py-1.5 font-mono text-slate-100"
                      >
                        <option value="<=">&lt;=</option>
                        <option value="<">&lt;</option>
                        <option value=">=">&gt;=</option>
                        <option value=">">&gt;</option>
                        <option value="==">==</option>
                        <option value="!=">!=</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Threshold</label>
                      <input
                        type="number"
                        value={Number(selectedBlock.config.conditionThreshold ?? 15)}
                        onChange={(e) =>
                          onUpdateBlock(selectedBlock.id, (b) => ({
                            ...b,
                            config: {
                              ...b.config,
                              conditionThreshold: Number(e.target.value),
                            },
                          }))
                        }
                        className="w-full bg-[#0B0F19] border border-slate-700 rounded-lg px-2.5 py-1.5 font-mono text-slate-100"
                      />
                    </div>
                  </div>
                </>
              )}

              {(selectedBlock.type === 'condition' || selectedBlock.type === 'transform' || (selectedBlock.type === 'custom' && selectedBlock.config.outputVariableName)) && (
                <div>
                  <label className="block text-slate-400 mb-1">Output Target Variable</label>
                  <input
                    type="text"
                    value={selectedBlock.config.outputVariableName || ''}
                    onChange={(e) =>
                      onUpdateBlock(selectedBlock.id, (b) => ({
                        ...b,
                        config: { ...b.config, outputVariableName: e.target.value },
                      }))
                    }
                    className="w-full bg-[#0B0F19] border border-slate-700 rounded-lg px-3 py-1.5 font-mono text-emerald-300 focus:outline-none focus:border-sky-400"
                  />
                </div>
              )}

              {selectedBlock.type === 'custom' && selectedBlock.config.customUiKind === 'formula' && (
                <div>
                  <label className="block text-slate-400 mb-1">Custom JavaScript / Math Formula</label>
                  <input
                    type="text"
                    value={selectedBlock.config.customFormula || ''}
                    onChange={(e) =>
                      onUpdateBlock(selectedBlock.id, (b) => ({
                        ...b,
                        config: { ...b.config, customFormula: e.target.value },
                      }))
                    }
                    className="w-full bg-[#0B0F19] border border-slate-700 rounded-lg px-3 py-1.5 font-mono text-emerald-300 focus:outline-none focus:border-sky-400"
                  />
                </div>
              )}

              {selectedBlock.type === 'custom' && selectedBlock.config.customUiKind === 'slider' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 mb-1">Min Value</label>
                    <input
                      type="number"
                      value={selectedBlock.config.sliderMin ?? 0}
                      onChange={(e) =>
                        onUpdateBlock(selectedBlock.id, (b) => ({
                          ...b,
                          config: { ...b.config, sliderMin: Number(e.target.value) },
                        }))
                      }
                      className="w-full bg-[#0B0F19] border border-slate-700 rounded-lg px-2.5 py-1.5 font-mono text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Max Value</label>
                    <input
                      type="number"
                      value={selectedBlock.config.sliderMax ?? 100}
                      onChange={(e) =>
                        onUpdateBlock(selectedBlock.id, (b) => ({
                          ...b,
                          config: { ...b.config, sliderMax: Number(e.target.value) },
                        }))
                      }
                      className="w-full bg-[#0B0F19] border border-slate-700 rounded-lg px-2.5 py-1.5 font-mono text-slate-100"
                    />
                  </div>
                </div>
              )}

              {/* Downstream Chained Block Selector */}
              <div>
                <label className="block text-slate-400 mb-1">
                  Chain Next Execution Block
                </label>
                <select
                  value={selectedBlock.config.targetBlockId || ''}
                  onChange={(e) =>
                    onUpdateBlock(selectedBlock.id, (b) => ({
                      ...b,
                      config: {
                        ...b.config,
                        targetBlockId: e.target.value || undefined,
                      },
                    }))
                  }
                  className="w-full bg-[#0B0F19] border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 focus:outline-none focus:border-sky-400"
                >
                  <option value="">None (End of chain)</option>
                  {project.blocks
                    .filter((b) => b.id !== selectedBlock.id)
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.label} ({b.type})
                      </option>
                    ))}
                </select>
              </div>

              {/* Debugger Breakpoint & Fault Simulation Toggles */}
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <label className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-[#0B0F19] border border-slate-800 cursor-pointer">
                  <span className="flex items-center gap-2 text-slate-200 font-medium">
                    <Bug className="w-3.5 h-3.5 text-rose-400" />
                    <span>Pause at Breakpoint</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={selectedBlock.hasBreakpoint}
                    onChange={() => onToggleBlockBreakpoint(selectedBlock.id)}
                    className="accent-sky-400"
                  />
                </label>

                <label className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-[#0B0F19] border border-slate-800 cursor-pointer">
                  <span className="text-slate-300">Inject Fault on Execute</span>
                  <input
                    type="checkbox"
                    checked={!!selectedBlock.config.simulateFault}
                    onChange={(e) =>
                      onUpdateBlock(selectedBlock.id, (b) => ({
                        ...b,
                        config: { ...b.config, simulateFault: e.target.checked },
                      }))
                    }
                    className="accent-rose-400"
                  />
                </label>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-slate-500">
            Select any block on the canvas to configure its properties, variable bindings, and breakpoints.
          </div>
        )}

        <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400">
          Changes auto-save locally and queue for E2E encrypted sync.
        </div>
      </div>
    </div>
  );
};
