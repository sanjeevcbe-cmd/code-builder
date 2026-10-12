import React, { useState } from 'react';
import {
  Play,
  SkipForward,
  RotateCcw,
  Bug,
  Terminal,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Plus,
  Wrench,
  Sliders,
  Layers,
  FlaskConical,
} from 'lucide-react';
import {
  SoftwareProject,
  VisualBlock,
  RuntimeVariableState,
  ConsoleLogEntry,
  CallStackFrame,
  ExecutionStatus,
  ExecutionStepQueueItem,
  ConsoleLogLevel,
} from '../types/builder';

interface DebuggerModuleProps {
  project: SoftwareProject;
  variables: Record<string, RuntimeVariableState>;
  executionStatus: ExecutionStatus;
  activeBlockId: string | null;
  executionQueue: ExecutionStepQueueItem[];
  callStack: CallStackFrame[];
  consoleLogs: ConsoleLogEntry[];
  breakpointsEnabled: boolean;
  onToggleBreakpointsGlobal: () => void;
  onToggleBlockBreakpoint: (blockId: string) => void;
  onTriggerBlock: (blockId: string, inputOverride?: string | number) => void;
  onStepNext: () => void;
  onContinueExecution: () => void;
  onResetRuntime: () => void;
  onUpdateVariableValue: (varName: string, rawValue: string) => void;
  onAddWatchExpression: (expr: string) => void;
  onRemoveWatchExpression: (expr: string) => void;
  onClearConsole: () => void;
  onSimulateErrorTrap: () => void;
  onAutoFixBlock: (blockId: string) => void;
  onRunTestScenario: (scenarioId: string) => void;
  onRunAllTests: () => void;
}

export const DebuggerModule: React.FC<DebuggerModuleProps> = ({
  project,
  variables,
  executionStatus,
  activeBlockId,
  executionQueue,
  callStack,
  consoleLogs,
  breakpointsEnabled,
  onToggleBreakpointsGlobal,
  onToggleBlockBreakpoint,
  onTriggerBlock,
  onStepNext,
  onContinueExecution,
  onResetRuntime,
  onUpdateVariableValue,
  onAddWatchExpression,
  onRemoveWatchExpression,
  onClearConsole,
  onSimulateErrorTrap,
  onAutoFixBlock,
  onRunTestScenario,
  onRunAllTests,
}) => {
  const [logFilter, setLogFilter] = useState<'all' | ConsoleLogLevel>('all');
  const [editingVarName, setEditingVarName] = useState<string | null>(null);
  const [editingVarDraft, setEditingVarDraft] = useState<string>('');
  const [newWatchExpr, setNewWatchExpr] = useState<string>('');
  const [inputDrafts, setInputDrafts] = useState<Record<string, string>>({});
  const [activeBottomTab, setActiveBottomTab] = useState<'console' | 'tests' | 'stack'>('console');

  const evaluateWatch = (expr: string): string => {
    try {
      const varEntries = Object.entries(variables);
      const names = varEntries.map(([k]) => k);
      const vals = varEntries.map(([, v]) => v.value);
      // Safe evaluation with current state variables in scope
      const fn = new Function(...names, `return (${expr});`);
      const res = fn(...vals);
      if (typeof res === 'boolean') return res ? 'true' : 'false';
      if (typeof res === 'number') return Number.isFinite(res) ? res.toLocaleString() : 'NaN';
      return String(res);
    } catch {
      return 'Unbound';
    }
  };

  const handleStartEditVar = (v: RuntimeVariableState) => {
    setEditingVarName(v.name);
    setEditingVarDraft(String(v.value));
  };

  const handleCommitEditVar = (varName: string) => {
    onUpdateVariableValue(varName, editingVarDraft);
    setEditingVarName(null);
  };

  const handleAddWatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWatchExpr.trim()) return;
    onAddWatchExpression(newWatchExpr.trim());
    setNewWatchExpr('');
  };

  const filteredLogs = consoleLogs.filter((entry) =>
    logFilter === 'all' ? true : entry.level === logFilter
  );

  const activeBlock = project.blocks.find((b) => b.id === activeBlockId);

  return (
    <div className="space-y-6">
      {/* Top Debugger Execution Control Bar */}
      <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-medium shrink-0 ${
              executionStatus === 'paused_at_breakpoint'
                ? 'bg-amber-950/60 border-amber-600/60 text-amber-300'
                : executionStatus === 'error_halted'
                ? 'bg-rose-950/60 border-rose-600/60 text-rose-300'
                : 'bg-slate-900 border-slate-700 text-slate-300'
            }`}
          >
            {executionStatus === 'paused_at_breakpoint'
              ? `PAUSED AT BREAKPOINT · ${activeBlock?.label || activeBlockId}`
              : executionStatus === 'error_halted'
              ? `HALTED ON RUNTIME ERROR · ${activeBlock?.label || 'Fault Detected'}`
              : `SIMULATOR READY · ${Object.keys(variables).length} VARIABLES TRACKED`}
          </div>

          <div className="text-xs text-slate-400 truncate hidden sm:block">
            <span>Queue: {executionQueue.length} pending steps</span>
            <span className="mx-2">·</span>
            <span>
              Breakpoints: {project.blocks.filter((b) => b.hasBreakpoint).length} set
            </span>
          </div>
        </div>

        {/* Step / Continue / Simulate Controls */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={onContinueExecution}
            disabled={executionStatus !== 'paused_at_breakpoint'}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              executionStatus === 'paused_at_breakpoint'
                ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                : 'bg-slate-800/60 text-slate-500 border border-slate-800 cursor-not-allowed'
            }`}
            title="Resume execution until next breakpoint"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Continue</span>
          </button>

          <button
            onClick={onStepNext}
            disabled={executionQueue.length === 0}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
              executionQueue.length > 0
                ? 'bg-sky-400 text-slate-950 border-sky-400 hover:bg-sky-300'
                : 'bg-slate-800/60 text-slate-500 border-slate-800 cursor-not-allowed'
            }`}
            title="Execute current block and pause at next connected block"
          >
            <SkipForward className="w-3.5 h-3.5" />
            <span>Step Next Block</span>
          </button>

          <button
            onClick={onToggleBreakpointsGlobal}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
              breakpointsEnabled
                ? 'bg-amber-500/15 border-amber-500/50 text-amber-300'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bug className="w-3.5 h-3.5" />
            <span>{breakpointsEnabled ? 'Breakpoints Active' : 'Breakpoints Muted'}</span>
          </button>

          <button
            onClick={onSimulateErrorTrap}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-rose-300 bg-rose-950/30 border border-rose-800/60 rounded-lg hover:bg-rose-900/40 transition-colors whitespace-nowrap shrink-0"
            title="Inject a fault to test breakpoint halting and diagnostic auto-fix"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Test Fault Trap</span>
          </button>

          <button
            onClick={onResetRuntime}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-200 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset State</span>
          </button>
        </div>
      </div>

      {/* Main 12-Column Workspace Split: Live App Simulator (7 cols) + Variable & Breakpoint Inspector (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left 7 Cols: Interactive Application Behavior Simulator */}
        <div className="lg:col-span-7 rounded-xl bg-[#0F172A] border border-slate-800 p-5 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-100">
                  Interactive Application Behavior Simulator
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Interact with your app controls below to execute visual logic chains and trigger breakpoints
                </p>
              </div>
              <span className="text-xs font-mono text-slate-400 tabular-nums">
                {project.blocks.length} Blocks Wired
              </span>
            </div>

            {/* Rendered Interactive UI Surface */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {project.blocks.map((block: VisualBlock) => {
                const isPausedHere = activeBlockId === block.id;
                const boundVar = block.config.variableName
                  ? variables[block.config.variableName]
                  : undefined;

                return (
                  <div
                    key={block.id}
                    className={`rounded-lg p-3.5 border transition-colors flex flex-col justify-between gap-3 ${
                      isPausedHere
                        ? 'bg-amber-950/30 border-amber-400'
                        : block.config.simulateFault
                        ? 'bg-rose-950/25 border-rose-500/70'
                        : 'bg-[#0B0F19] border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Block Top Bar with Breakpoint Toggle */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[11px] font-mono text-slate-400">
                          {block.category.toUpperCase()} · {block.type.toUpperCase()}
                          {isPausedHere ? ' · PAUSED HERE' : ''}
                        </div>
                        <div className="text-xs font-semibold text-slate-100 truncate mt-0.5">
                          {block.label}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onToggleBlockBreakpoint(block.id)}
                        className={`px-2 py-1 rounded text-[11px] font-mono border transition-colors whitespace-nowrap shrink-0 ${
                          block.hasBreakpoint
                            ? 'bg-rose-500/20 border-rose-500/60 text-rose-300'
                            : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
                        }`}
                        title="Toggle breakpoint on this block"
                      >
                        {block.hasBreakpoint ? 'BP ON' : '+ BP'}
                      </button>
                    </div>

                    {/* Interactive Control per Block Type */}
                    {block.type === 'button' && (
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <span className="text-[11px] font-mono text-slate-400 truncate">
                          {block.config.variableName} ({block.config.actionType}{' '}
                          {block.config.actionValue})
                        </span>
                        <button
                          type="button"
                          onClick={() => onTriggerBlock(block.id)}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-950 bg-sky-400 rounded-md hover:bg-sky-300 transition-colors whitespace-nowrap shrink-0"
                        >
                          Trigger Action
                        </button>
                      </div>
                    )}

                    {block.type === 'input' && (
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="text"
                          value={inputDrafts[block.id] ?? ''}
                          onChange={(e) =>
                            setInputDrafts((prev) => ({ ...prev, [block.id]: e.target.value }))
                          }
                          placeholder={block.config.placeholder || 'Enter value...'}
                          className="flex-1 min-w-0 bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-100 font-mono focus:outline-none focus:border-sky-400"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const val = inputDrafts[block.id];
                            onTriggerBlock(block.id, val !== undefined && val !== '' ? val : 100);
                          }}
                          className="px-2.5 py-1 text-xs font-medium text-slate-100 bg-slate-800 border border-slate-700 rounded hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
                        >
                          Apply
                        </button>
                      </div>
                    )}

                    {block.type === 'metric' && (
                      <div className="pt-1 flex items-baseline justify-between">
                        <span className="text-xs text-slate-400 font-mono">
                          {block.config.variableName}
                        </span>
                        <span className="text-xl font-bold font-mono text-sky-300 tabular-nums">
                          {boundVar !== undefined ? String(boundVar.value) : '0'}{' '}
                          <span className="text-xs font-normal text-slate-400">
                            {block.config.unit || ''}
                          </span>
                        </span>
                      </div>
                    )}

                    {block.type === 'toggle' && (
                      <div className="pt-1 flex items-center justify-between">
                        <span className="text-xs font-mono text-slate-400">
                          {block.config.variableName}:{' '}
                          <strong className="text-slate-200">
                            {boundVar ? String(boundVar.value) : 'false'}
                          </strong>
                        </span>
                        <button
                          type="button"
                          onClick={() => onTriggerBlock(block.id)}
                          className="px-3 py-1 text-xs font-medium text-slate-200 bg-slate-800 border border-slate-700 rounded hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
                        >
                          Flip State
                        </button>
                      </div>
                    )}

                    {block.type === 'alert' && (
                      <div
                        className={`p-2.5 rounded border text-xs ${
                          boundVar?.value === true
                            ? block.config.alertSeverity === 'critical'
                              ? 'bg-rose-950/50 border-rose-700 text-rose-200'
                              : 'bg-amber-950/50 border-amber-700 text-amber-200'
                            : 'bg-slate-900/60 border-slate-800 text-slate-500'
                        }`}
                      >
                        {boundVar?.value === true
                          ? block.config.placeholder || 'Alert Condition Active'
                          : `Standby (${block.config.variableName} is false)`}
                      </div>
                    )}

                    {(block.type === 'condition' ||
                      block.type === 'transform' ||
                      block.type === 'variable' ||
                      block.type === 'table') && (
                      <div className="pt-1 flex items-center justify-between gap-2 text-xs font-mono text-slate-400">
                        <span className="truncate">
                          {block.type === 'condition'
                            ? `If ${block.config.variableName} ${block.config.conditionOperator} ${block.config.conditionThreshold} -> ${block.config.outputVariableName}`
                            : block.type === 'transform'
                            ? `${block.config.outputVariableName} = ${block.config.variableName} ${block.config.actionType} ${block.config.secondaryVariableName || block.config.actionValue}`
                            : `${block.config.variableName} = ${boundVar ? String(boundVar.value) : block.config.initialValue}`}
                        </span>
                        <button
                          type="button"
                          onClick={() => onTriggerBlock(block.id)}
                          className="px-2.5 py-1 text-[11px] text-slate-300 bg-slate-900 border border-slate-700 rounded hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
                        >
                          Run Node
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Breakpoint Quick Legend Footer */}
          <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
            <span>
              Click <strong>+ BP</strong> on any block to pause execution when reached.
            </span>
            <span className="font-mono tabular-nums">
              Active Instruction Pointer: {activeBlock ? activeBlock.label : 'None (Idle)'}
            </span>
          </div>
        </div>

        {/* Right 5 Cols: Live Variable Inspector & Watch Expressions */}
        <div className="lg:col-span-5 rounded-xl bg-[#0F172A] border border-slate-800 p-5 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-100">
                  Live Variable Inspector &amp; State Overrides
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Click any variable value to override it mid-simulation or while paused at a breakpoint
                </p>
              </div>
              <Sliders className="w-4 h-4 text-sky-400 shrink-0" />
            </div>

            {/* High-Density Variable Table */}
            <div className="overflow-x-auto border border-slate-800 rounded-lg">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#0B0F19] border-b border-slate-800 text-slate-400">
                    <th className="py-2.5 px-3 font-medium">Variable</th>
                    <th className="py-2.5 px-3 font-medium">Type</th>
                    <th className="py-2.5 px-3 font-medium text-right">Current Value</th>
                    <th className="py-2.5 px-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 font-mono tabular-nums">
                  {Object.values(variables).map((v: RuntimeVariableState) => (
                    <tr key={v.name} className="hover:bg-slate-900/60 transition-colors">
                      <td className="py-2.5 px-3 text-slate-200 font-medium">
                        <div>{v.name}</div>
                        <div className="text-[10px] text-slate-500 font-sans truncate max-w-[130px]">
                          {v.lastUpdatedByLabel || 'Initial'}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">{v.type}</td>
                      <td className="py-2.5 px-3 text-right">
                        {editingVarName === v.name ? (
                          <input
                            type="text"
                            value={editingVarDraft}
                            onChange={(e) => setEditingVarDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleCommitEditVar(v.name);
                              if (e.key === 'Escape') setEditingVarName(null);
                            }}
                            autoFocus
                            className="w-24 bg-[#0B0F19] border border-sky-400 rounded px-2 py-0.5 text-right text-xs text-sky-200 focus:outline-none"
                          />
                        ) : (
                          <span
                            className={
                              typeof v.value === 'boolean'
                                ? v.value
                                  ? 'text-amber-300 font-semibold'
                                  : 'text-emerald-400'
                                : 'text-sky-300 font-semibold'
                            }
                          >
                            {String(v.value)}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {editingVarName === v.name ? (
                          <button
                            type="button"
                            onClick={() => handleCommitEditVar(v.name)}
                            className="text-xs text-emerald-400 hover:underline font-sans"
                          >
                            Save
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleStartEditVar(v)}
                            className="text-xs text-slate-400 hover:text-sky-300 font-sans"
                          >
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Watch Expressions Section */}
            <div className="space-y-2.5 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200">Watch Expressions</span>
                <span className="text-slate-400 font-mono tabular-nums">
                  {project.watchExpressions.length} active
                </span>
              </div>

              <div className="space-y-1.5">
                {project.watchExpressions.map((expr) => (
                  <div
                    key={expr}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#0B0F19] border border-slate-800 font-mono text-xs tabular-nums"
                  >
                    <span className="text-slate-300 truncate">{expr}</span>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sky-300 font-semibold">= {evaluateWatch(expr)}</span>
                      <button
                        type="button"
                        onClick={() => onRemoveWatchExpression(expr)}
                        className="text-slate-500 hover:text-rose-400 text-[11px] font-sans"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={handleAddWatch} className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={newWatchExpr}
                  onChange={(e) => setNewWatchExpr(e.target.value)}
                  placeholder="Add watch expression (e.g. stockCount * 2)..."
                  className="flex-1 bg-[#0B0F19] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-sky-400"
                />
                <button
                  type="submit"
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Watch</span>
                </button>
              </form>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
            <span>All values update synchronously on step</span>
            <span className="font-mono tabular-nums">tabular-nums enabled</span>
          </div>
        </div>
      </div>

      {/* Bottom Panel: Console Logs, Automated Test Suite & Call Stack */}
      <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          {/* Interactive Segmented Tabs */}
          <div className="flex items-center gap-1 p-1 bg-[#0B0F19] border border-slate-800 rounded-lg self-start">
            <button
              type="button"
              onClick={() => setActiveBottomTab('console')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeBottomTab === 'console'
                  ? 'bg-slate-800 text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Terminal className="w-3.5 h-3.5 text-sky-400" />
              <span>Diagnostic Console ({consoleLogs.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveBottomTab('tests')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeBottomTab === 'tests'
                  ? 'bg-slate-800 text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5 text-emerald-400" />
              <span>Automated Test Suite ({project.testScenarios.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveBottomTab('stack')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeBottomTab === 'stack'
                  ? 'bg-slate-800 text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>Call Stack ({callStack.length})</span>
            </button>
          </div>

          {activeBottomTab === 'console' && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 p-1 bg-[#0B0F19] border border-slate-800 rounded-lg">
                {(['all', 'error', 'breakpoint', 'assert', 'info'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setLogFilter(lvl)}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                      logFilter === lvl
                        ? 'bg-slate-800 text-slate-100'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={onClearConsole}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 bg-[#0B0F19] border border-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                Clear Logs
              </button>
            </div>
          )}

          {activeBottomTab === 'tests' && (
            <button
              type="button"
              onClick={onRunAllTests}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-sky-400 rounded-lg hover:bg-sky-300 transition-colors whitespace-nowrap shrink-0"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Run All Test Scenarios</span>
            </button>
          )}
        </div>

        {/* Tab 1: Diagnostic Console Logs */}
        {activeBottomTab === 'console' && (
          <div className="max-h-64 overflow-y-auto space-y-2 pr-1 font-mono text-xs tabular-nums">
            {filteredLogs.length === 0 ? (
              <div className="py-8 text-center text-slate-500 font-sans">
                No console log entries match the current filter. Trigger a block in the simulator or run a test scenario above.
              </div>
            ) : (
              filteredLogs.map((entry) => (
                <div
                  key={entry.id}
                  className={`p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    entry.level === 'error'
                      ? 'bg-rose-950/30 border-rose-800/70 text-rose-200'
                      : entry.level === 'breakpoint'
                      ? 'bg-amber-950/30 border-amber-800/70 text-amber-200'
                      : entry.level === 'assert'
                      ? 'bg-emerald-950/25 border-emerald-800/60 text-emerald-200'
                      : 'bg-[#0B0F19] border-slate-800/90 text-slate-300'
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span>{entry.timestamp}</span>
                      <span>·</span>
                      <span className="uppercase font-semibold">{entry.level}</span>
                      {entry.blockLabel && (
                        <>
                          <span>·</span>
                          <span className="text-sky-300">{entry.blockLabel}</span>
                        </>
                      )}
                    </div>
                    <div className="text-xs break-words">{entry.message}</div>
                    {entry.details && (
                      <div className="text-[11px] text-slate-400">{entry.details}</div>
                    )}
                  </div>

                  {entry.fixableBlockId && (
                    <button
                      type="button"
                      onClick={() => onAutoFixBlock(entry.fixableBlockId!)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans font-semibold text-slate-950 bg-emerald-400 rounded-md hover:bg-emerald-300 transition-colors whitespace-nowrap shrink-0"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      <span>Auto-Fix Block</span>
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 2: Automated Test Scenarios */}
        {activeBottomTab === 'tests' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {project.testScenarios.map((scenario) => (
              <div
                key={scenario.id}
                className="p-4 rounded-lg bg-[#0B0F19] border border-slate-800 flex flex-col justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-100">{scenario.name}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">{scenario.description}</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-mono shrink-0">
                      {scenario.lastStatus === 'passed' && (
                        <span className="flex items-center gap-1 text-emerald-400">
                          <CheckCircle2 className="w-4 h-4" /> PASS
                        </span>
                      )}
                      {scenario.lastStatus === 'failed' && (
                        <span className="flex items-center gap-1 text-rose-400">
                          <XCircle className="w-4 h-4" /> FAIL
                        </span>
                      )}
                      {(!scenario.lastStatus || scenario.lastStatus === 'untested') && (
                        <span className="text-slate-500">UNTESTED</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1 pt-2 border-t border-slate-800/80 text-xs font-mono text-slate-400">
                    {scenario.steps.map((st, idx) => (
                      <div key={st.id} className="truncate">
                        {idx + 1}. {st.description} &rarr; assert({st.expectedVariable} =={' '}
                        {String(st.expectedValue)})
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                  <span className="text-[11px] font-mono text-slate-500 tabular-nums">
                    {scenario.lastRunAt ? `Last run: ${scenario.lastRunAt}` : 'Ready to execute'}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRunTestScenario(scenario.id)}
                    className="px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 border border-slate-700 rounded-md hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
                  >
                    Run Scenario
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: Execution Call Stack */}
        {activeBottomTab === 'stack' && (
          <div className="space-y-2 font-mono text-xs tabular-nums">
            {callStack.length === 0 ? (
              <div className="py-6 text-center text-slate-500 font-sans">
                Call stack is empty. Trigger an action in the simulator to inspect frame execution history.
              </div>
            ) : (
              callStack.map((frame, index) => (
                <div
                  key={frame.id}
                  className="flex items-center justify-between gap-4 px-3.5 py-2.5 rounded-lg bg-[#0B0F19] border border-slate-800"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-slate-500">Frame #{callStack.length - index}</span>
                    <span className="text-sky-300 font-semibold truncate">{frame.blockLabel}</span>
                    <span className="text-slate-400">({frame.blockType})</span>
                  </div>
                  <div className="text-slate-400 shrink-0">
                    via {frame.triggerSource} · {frame.timestamp}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
