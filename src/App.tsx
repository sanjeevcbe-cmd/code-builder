/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Lock,
  Mic,
  MicOff,
  Plus,
  Bug,
  ShieldCheck,
  WifiOff,
  Play,
  Sparkles,
  Code2,
  Palette,
} from 'lucide-react';
import {
  SoftwareProject,
  VisualBlock,
  RuntimeVariableState,
  ConsoleLogEntry,
  CallStackFrame,
  ExecutionStatus,
  ExecutionStepQueueItem,
  PairedDevice,
  EncryptedEnvelope,
  LocalDeviceIdentity,
  CustomBlockDefinition,
  AppDesignConfig,
} from './types/builder';
import {
  STARTER_PROJECTS,
  PALETTE_BLOCK_TEMPLATES,
  PaletteBlockTemplate,
} from './data/starterProjects';
import {
  getOrCreateDeviceIdentity,
  saveDeviceIdentity,
  encryptPayloadE2E,
  decryptPayloadE2E,
  sha256Hex,
} from './utils/crypto';
import { useOnlineStatus } from './hooks/usePWA';
import { PWAInstallButton } from './components/PWAInstallButton';
import { useVoiceSystem } from './hooks/useVoiceSystem';
import { VisualBuilderCanvas } from './components/VisualBuilderCanvas';
import { DebuggerModule } from './components/DebuggerModule';
import { PairedDevicesPanel } from './components/PairedDevicesPanel';
import { VoiceSecurityPanel, VoiceLockOverlay } from './components/VoiceSecurityPanel';
import { CodeExportPanel } from './components/CodeExportPanel';
import { CustomBlockModal } from './components/CustomBlockModal';
import { StandaloneAppRunner } from './components/StandaloneAppRunner';
import { AppDesignModal } from './components/AppDesignModal';
import { AppDesignStudio } from './components/AppDesignStudio';

type ActiveModuleTab = 'builder' | 'app' | 'design' | 'debugger' | 'devices' | 'voice' | 'export';

const LOCAL_PROJECTS_CACHE_KEY = 'codebuilder_encrypted_projects_v1';
const LOCAL_PASSPHRASE_KEY = 'codebuilder_voice_passphrase_v1';

function buildInitialVariables(project: SoftwareProject): Record<string, RuntimeVariableState> {
  const map: Record<string, RuntimeVariableState> = {};
  const now = new Date().toLocaleTimeString();

  for (const blk of project.blocks) {
    if (blk.type === 'variable' && blk.config.variableName) {
      const val = blk.config.initialValue ?? 0;
      map[blk.config.variableName] = {
        name: blk.config.variableName,
        value: val,
        type:
          typeof val === 'boolean'
            ? 'boolean'
            : typeof val === 'number'
            ? 'number'
            : 'string',
        lastUpdatedByBlockId: blk.id,
        lastUpdatedByLabel: blk.label,
        updatedAt: now,
        history: [{ value: String(val), timestamp: now }],
      };
    }
  }

  // Initialize output variables from transforms and conditions
  for (const blk of project.blocks) {
    if (blk.type === 'transform' && blk.config.outputVariableName) {
      const v1 = Number(map[blk.config.variableName || '']?.value ?? 0);
      const v2 = blk.config.secondaryVariableName
        ? Number(map[blk.config.secondaryVariableName]?.value ?? 1)
        : Number(blk.config.actionValue ?? 1);
      const computed =
        blk.config.actionType === 'divide'
          ? v2 !== 0
            ? v1 / v2
            : 0
          : blk.config.actionType === 'increment'
          ? v1 + v2
          : blk.config.actionType === 'decrement'
          ? v1 - v2
          : v1 * v2;

      map[blk.config.outputVariableName] = {
        name: blk.config.outputVariableName,
        value: computed,
        type: 'number',
        lastUpdatedByBlockId: blk.id,
        lastUpdatedByLabel: blk.label,
        updatedAt: now,
        history: [{ value: String(computed), timestamp: now }],
      };
    }

    if (blk.type === 'condition' && blk.config.outputVariableName) {
      const left = Number(map[blk.config.variableName || '']?.value ?? 0);
      const right = Number(blk.config.conditionThreshold ?? 0);
      const op = blk.config.conditionOperator || '<=';
      let result = false;
      if (op === '<=') result = left <= right;
      else if (op === '<') result = left < right;
      else if (op === '>=') result = left >= right;
      else if (op === '>') result = left > right;
      else if (op === '==') result = left === right;
      else if (op === '!=') result = left !== right;

      map[blk.config.outputVariableName] = {
        name: blk.config.outputVariableName,
        value: result,
        type: 'boolean',
        lastUpdatedByBlockId: blk.id,
        lastUpdatedByLabel: blk.label,
        updatedAt: now,
        history: [{ value: String(result), timestamp: now }],
      };
    }

    if (blk.type === 'custom' && blk.config.outputVariableName) {
      map[blk.config.outputVariableName] = {
        name: blk.config.outputVariableName,
        value: 0,
        type: 'number',
        lastUpdatedByBlockId: blk.id,
        lastUpdatedByLabel: blk.label,
        updatedAt: now,
        history: [{ value: '0', timestamp: now }],
      };
    }
  }

  return map;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveModuleTab>('builder');
  const [showCustomBlockModal, setShowCustomBlockModal] = useState(false);
  const [showAppDesignModal, setShowAppDesignModal] = useState(false);
  const [projects, setProjects] = useState<SoftwareProject[]>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_PROJECTS_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return STARTER_PROJECTS;
  });
  const [activeProjectId, setActiveProjectId] = useState<string>(() => projects[0].id);
  const activeProject =
    projects.find((p) => p.id === activeProjectId) || projects[0];

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(
    () => activeProject.blocks[0]?.id || null
  );

  // Debugger & Runtime Simulation State
  const [variables, setVariables] = useState<Record<string, RuntimeVariableState>>(() =>
    buildInitialVariables(activeProject)
  );
  const [executionStatus, setExecutionStatus] = useState<ExecutionStatus>('idle');
  const [activeDebugBlockId, setActiveDebugBlockId] = useState<string | null>(null);
  const [executionQueue, setExecutionQueue] = useState<ExecutionStepQueueItem[]>([]);
  const [callStack, setCallStack] = useState<CallStackFrame[]>([]);
  const [breakpointsEnabled, setBreakpointsEnabled] = useState<boolean>(true);
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLogEntry[]>([
    {
      id: 'log-boot',
      timestamp: new Date().toLocaleTimeString(),
      level: 'info',
      message: 'CodeBuilder Debugger initialized. Ready to simulate blocks and inspect variables.',
    },
  ]);

  // Device Identity, Paired Devices & E2E Encryption Sync State
  const [identity, setIdentity] = useState<LocalDeviceIdentity | null>(null);
  const [pairedDevices, setPairedDevices] = useState<PairedDevice[]>([]);
  const [onlineDeviceIds, setOnlineDeviceIds] = useState<string[]>([]);
  const [lastEnvelope, setLastEnvelope] = useState<EncryptedEnvelope | null>(null);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline_queued' | 'error'>(
    'synced'
  );
  const [pendingOfflineChanges, setPendingOfflineChanges] = useState<number>(0);

  // Offline / PWA Connectivity State
  const { isOnline, simulateOffline, setSimulateOffline } = useOnlineStatus();

  // Voice Lock & Voice Access State
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [voicePassphrase, setVoicePassphrase] = useState<string>(() => {
    return localStorage.getItem(LOCAL_PASSPHRASE_KEY) || 'unlock code builder';
  });

  const wsRef = useRef<WebSocket | null>(null);
  const isApplyingRemoteUpdate = useRef<boolean>(false);

  const appendConsoleLog = useCallback(
    (
      level: ConsoleLogEntry['level'],
      message: string,
      block?: VisualBlock,
      details?: string,
      fixableBlockId?: string
    ) => {
      const entry: ConsoleLogEntry = {
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toLocaleTimeString(),
        level,
        blockId: block?.id,
        blockLabel: block?.label,
        message,
        details,
        fixableBlockId,
      };
      setConsoleLogs((prev) => [entry, ...prev.slice(0, 99)]);
    },
    []
  );

  // Re-initialize debugger variables when switching projects
  useEffect(() => {
    setVariables(buildInitialVariables(activeProject));
    setExecutionStatus('idle');
    setActiveDebugBlockId(null);
    setExecutionQueue([]);
    setSelectedBlockId(activeProject.blocks[0]?.id || null);
  }, [activeProjectId]);

  // Persist projects locally for offline access
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_PROJECTS_CACHE_KEY, JSON.stringify(projects));
    } catch {}
  }, [projects]);

  const updateActiveProject = useCallback(
    (updater: (proj: SoftwareProject) => SoftwareProject) => {
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== activeProject.id) return p;
          const updated = updater(p);
          return {
            ...updated,
            version: updated.version + 1,
            updatedAt: new Date().toISOString(),
          };
        })
      );
      if (!isOnline) {
        setPendingOfflineChanges((c) => c + 1);
        setSyncStatus('offline_queued');
      }
    },
    [activeProject.id, isOnline]
  );

  // Execute a single visual block and return updated variables + any downstream queued item
  const executeSingleBlockMutation = useCallback(
    (
      block: VisualBlock,
      currentVars: Record<string, RuntimeVariableState>,
      triggerSource: string,
      inputOverride?: string | number
    ): {
      nextVars: Record<string, RuntimeVariableState>;
      nextQueueItem: ExecutionStepQueueItem | null;
      haltedWithError: boolean;
    } => {
      const now = new Date().toLocaleTimeString();
      const nextVars = { ...currentVars };

      // Check if block has simulated fault or division by zero
      if (block.config.simulateFault) {
        setExecutionStatus('error_halted');
        setActiveDebugBlockId(block.id);
        appendConsoleLog(
          'error',
          `Runtime Fault in "${block.label}": Unhandled null/overflow exception during execution.`,
          block,
          `Block ID ${block.id} has fault injection or invalid state binding. Click "Auto-Fix Block" to repair.`,
          block.id
        );
        return { nextVars, nextQueueItem: null, haltedWithError: true };
      }

      if (
        block.config.actionType === 'divide' &&
        Number(
          block.config.secondaryVariableName
            ? nextVars[block.config.secondaryVariableName]?.value
            : block.config.actionValue
        ) === 0
      ) {
        setExecutionStatus('error_halted');
        setActiveDebugBlockId(block.id);
        appendConsoleLog(
          'error',
          `DivisionByZeroError in "${block.label}": Divisor evaluated to 0.`,
          block,
          `Cannot divide variable "${block.config.variableName}" by 0. Click "Auto-Fix Block" to set safe divisor 1.`,
          block.id
        );
        return { nextVars, nextQueueItem: null, haltedWithError: true };
      }

      const varName = block.config.variableName;

      if (block.type === 'button' && varName) {
        const prevVal = Number(nextVars[varName]?.value ?? 0);
        const delta = Number(block.config.actionValue ?? 1);
        let newVal = prevVal;
        if (block.config.actionType === 'increment') newVal = prevVal + delta;
        else if (block.config.actionType === 'decrement') newVal = prevVal - delta;
        else if (block.config.actionType === 'multiply') newVal = prevVal * delta;
        else if (block.config.actionType === 'reset') newVal = 0;
        else if (block.config.actionType === 'set') newVal = delta;

        nextVars[varName] = {
          name: varName,
          value: newVal,
          type: 'number',
          lastUpdatedByBlockId: block.id,
          lastUpdatedByLabel: block.label,
          updatedAt: now,
          history: [
            { value: String(newVal), timestamp: now },
            ...(nextVars[varName]?.history || []).slice(0, 9),
          ],
        };

        appendConsoleLog(
          'info',
          `Executed "${block.label}": ${varName} mutated ${prevVal} -> ${newVal}`,
          block
        );
      } else if (block.type === 'input' && varName) {
        const rawVal = inputOverride !== undefined ? inputOverride : 100;
        const parsedNum = Number(rawVal);
        const finalVal =
          !Number.isNaN(parsedNum) && String(rawVal).trim() !== '' ? parsedNum : String(rawVal);
        const prevVal = nextVars[varName]?.value;

        nextVars[varName] = {
          name: varName,
          value: finalVal,
          type: typeof finalVal === 'number' ? 'number' : 'string',
          lastUpdatedByBlockId: block.id,
          lastUpdatedByLabel: block.label,
          updatedAt: now,
          history: [
            { value: String(finalVal), timestamp: now },
            ...(nextVars[varName]?.history || []).slice(0, 9),
          ],
        };

        appendConsoleLog(
          'info',
          `Input "${block.label}" updated ${varName}: ${String(prevVal)} -> ${String(finalVal)}`,
          block
        );
      } else if (block.type === 'toggle' && varName) {
        const prevBool = Boolean(nextVars[varName]?.value);
        const nextBool = !prevBool;
        nextVars[varName] = {
          name: varName,
          value: nextBool,
          type: 'boolean',
          lastUpdatedByBlockId: block.id,
          lastUpdatedByLabel: block.label,
          updatedAt: now,
          history: [
            { value: String(nextBool), timestamp: now },
            ...(nextVars[varName]?.history || []).slice(0, 9),
          ],
        };
        appendConsoleLog(
          'info',
          `Toggle "${block.label}" flipped ${varName} to ${String(nextBool)}`,
          block
        );
      } else if (block.type === 'transform') {
        const outName = block.config.outputVariableName || 'transformResult';
        const v1 = Number(nextVars[block.config.variableName || '']?.value ?? 0);
        const v2 = block.config.secondaryVariableName
          ? Number(nextVars[block.config.secondaryVariableName]?.value ?? 1)
          : Number(block.config.actionValue ?? 1);

        let result = v1 * v2;
        if (block.config.actionType === 'increment') result = v1 + v2;
        else if (block.config.actionType === 'decrement') result = v1 - v2;
        else if (block.config.actionType === 'divide') result = v2 !== 0 ? v1 / v2 : 0;

        nextVars[outName] = {
          name: outName,
          value: result,
          type: 'number',
          lastUpdatedByBlockId: block.id,
          lastUpdatedByLabel: block.label,
          updatedAt: now,
          history: [
            { value: String(result), timestamp: now },
            ...(nextVars[outName]?.history || []).slice(0, 9),
          ],
        };

        appendConsoleLog(
          'info',
          `Transform "${block.label}" computed ${outName} = ${result}`,
          block,
          `Formula: ${block.config.variableName} (${v1}) ${block.config.actionType || '*'} ${
            block.config.secondaryVariableName || v2
          } (${v2})`
        );
      } else if (block.type === 'condition') {
        const outName = block.config.outputVariableName || 'conditionFlag';
        const left = Number(nextVars[block.config.variableName || '']?.value ?? 0);
        const right = Number(block.config.conditionThreshold ?? 0);
        const op = block.config.conditionOperator || '<=';
        let passed = false;
        if (op === '<=') passed = left <= right;
        else if (op === '<') passed = left < right;
        else if (op === '>=') passed = left >= right;
        else if (op === '>') passed = left > right;
        else if (op === '==') passed = left === right;
        else if (op === '!=') passed = left !== right;

        nextVars[outName] = {
          name: outName,
          value: passed,
          type: 'boolean',
          lastUpdatedByBlockId: block.id,
          lastUpdatedByLabel: block.label,
          updatedAt: now,
          history: [
            { value: String(passed), timestamp: now },
            ...(nextVars[outName]?.history || []).slice(0, 9),
          ],
        };

        appendConsoleLog(
          passed ? 'warn' : 'info',
          `Condition Gate "${block.label}" evaluated (${left} ${op} ${right}) => ${String(passed)}`,
          block
        );
      } else if (block.type === 'custom') {
        const outName = block.config.outputVariableName;
        if (block.config.customUiKind === 'formula' && outName) {
          const varEntries = Object.entries(nextVars);
          const names = varEntries.map(([k]) => k);
          const vals = varEntries.map(([, v]) => v.value);
          let computedVal = 0;
          try {
            const fn = new Function(...names, `return (${block.config.customFormula || '0'});`);
            computedVal = Number(fn(...vals));
          } catch {
            computedVal = 0;
          }

          nextVars[outName] = {
            name: outName,
            value: computedVal,
            type: 'number',
            lastUpdatedByBlockId: block.id,
            lastUpdatedByLabel: block.label,
            updatedAt: now,
            history: [
              { value: String(computedVal), timestamp: now },
              ...(nextVars[outName]?.history || []).slice(0, 9),
            ],
          };

          appendConsoleLog(
            'info',
            `Custom Formula "${block.label}" evaluated ${outName} = ${computedVal}`,
            block,
            `Formula: ${block.config.customFormula}`
          );
        } else if (block.config.customUiKind === 'slider' && varName) {
          const newVal = inputOverride !== undefined ? Number(inputOverride) : Number(block.config.initialValue ?? 50);
          nextVars[varName] = {
            name: varName,
            value: newVal,
            type: 'number',
            lastUpdatedByBlockId: block.id,
            lastUpdatedByLabel: block.label,
            updatedAt: now,
            history: [
              { value: String(newVal), timestamp: now },
              ...(nextVars[varName]?.history || []).slice(0, 9),
            ],
          };
          appendConsoleLog('info', `Custom Slider "${block.label}" updated ${varName} to ${newVal}`, block);
        } else if (varName) {
          const prev = Number(nextVars[varName]?.value ?? 0);
          const next = prev + Number(block.config.actionValue ?? 1);
          nextVars[varName] = {
            name: varName,
            value: next,
            type: 'number',
            lastUpdatedByBlockId: block.id,
            lastUpdatedByLabel: block.label,
            updatedAt: now,
            history: [
              { value: String(next), timestamp: now },
              ...(nextVars[varName]?.history || []).slice(0, 9),
            ],
          };
          appendConsoleLog('info', `Custom Action "${block.label}" updated ${varName} to ${next}`, block);
        }
      } else {
        appendConsoleLog('info', `Inspected node "${block.label}"`, block);
      }

      setCallStack((prev) => [
        {
          id: `frame-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          blockId: block.id,
          blockLabel: block.label,
          blockType: block.type,
          triggerSource,
          timestamp: now,
        },
        ...prev.slice(0, 24),
      ]);

      const nextQueueItem = block.config.targetBlockId
        ? {
            blockId: block.config.targetBlockId,
            triggerSource: block.label,
          }
        : null;

      return { nextVars, nextQueueItem, haltedWithError: false };
    },
    [appendConsoleLog]
  );

  // Trigger a block and follow downstream chain, pausing if a breakpoint is hit
  const handleTriggerBlock = useCallback(
    (startBlockId: string, inputOverride?: string | number) => {
      const startBlock = activeProject.blocks.find((b) => b.id === startBlockId);
      if (!startBlock) return;

      let currentVars = { ...variables };
      const queue: ExecutionStepQueueItem[] = [
        { blockId: startBlockId, triggerSource: 'User Interaction', inputOverride },
      ];

      let stepsRun = 0;
      while (queue.length > 0 && stepsRun < 15) {
        const currentItem = queue[0];
        const blk = activeProject.blocks.find((b) => b.id === currentItem.blockId);
        if (!blk) {
          queue.shift();
          continue;
        }

        // Pause BEFORE executing if breakpoint is enabled on this block (except if we just stepped)
        if (breakpointsEnabled && blk.hasBreakpoint) {
          setVariables(currentVars);
          setExecutionQueue(queue);
          setActiveDebugBlockId(blk.id);
          setExecutionStatus('paused_at_breakpoint');
          appendConsoleLog(
            'breakpoint',
            `Paused at breakpoint on "${blk.label}" before execution. Inspect variables or click Step Next / Continue.`,
            blk
          );
          return;
        }

        queue.shift();
        const { nextVars, nextQueueItem, haltedWithError } = executeSingleBlockMutation(
          blk,
          currentVars,
          currentItem.triggerSource,
          currentItem.inputOverride
        );
        currentVars = nextVars;
        stepsRun++;

        if (haltedWithError) {
          setVariables(currentVars);
          setExecutionQueue([]);
          return;
        }

        if (nextQueueItem) {
          queue.push(nextQueueItem);
        }
      }

      setVariables(currentVars);
      setExecutionQueue([]);
      setActiveDebugBlockId(null);
      setExecutionStatus('idle');
    },
    [
      activeProject.blocks,
      variables,
      breakpointsEnabled,
      executeSingleBlockMutation,
      appendConsoleLog,
    ]
  );

  // Step 1 block forward when paused at a breakpoint
  const handleStepNext = useCallback(() => {
    if (executionQueue.length === 0) return;
    const [currentItem, ...remaining] = executionQueue;
    const blk = activeProject.blocks.find((b) => b.id === currentItem.blockId);
    if (!blk) {
      setExecutionQueue(remaining);
      return;
    }

    const { nextVars, nextQueueItem, haltedWithError } = executeSingleBlockMutation(
      blk,
      variables,
      currentItem.triggerSource,
      currentItem.inputOverride
    );

    setVariables(nextVars);
    if (haltedWithError) {
      setExecutionQueue([]);
      return;
    }

    const updatedQueue = nextQueueItem ? [...remaining, nextQueueItem] : remaining;
    setExecutionQueue(updatedQueue);

    if (updatedQueue.length > 0) {
      const nextBlock = activeProject.blocks.find((b) => b.id === updatedQueue[0].blockId);
      setActiveDebugBlockId(updatedQueue[0].blockId);
      setExecutionStatus('paused_at_breakpoint');
      appendConsoleLog(
        'breakpoint',
        `Stepped to next block: "${nextBlock?.label || updatedQueue[0].blockId}"`,
        nextBlock
      );
    } else {
      setActiveDebugBlockId(null);
      setExecutionStatus('idle');
      appendConsoleLog('info', 'Execution queue completed after step.');
    }
  }, [executionQueue, activeProject.blocks, variables, executeSingleBlockMutation, appendConsoleLog]);

  // Continue execution from breakpoint until next breakpoint or end of queue
  const handleContinueExecution = useCallback(() => {
    if (executionQueue.length === 0) return;

    let currentVars = { ...variables };
    const queue = [...executionQueue];
    let firstItem = true;
    let stepsRun = 0;

    while (queue.length > 0 && stepsRun < 15) {
      const item = queue[0];
      const blk = activeProject.blocks.find((b) => b.id === item.blockId);
      if (!blk) {
        queue.shift();
        continue;
      }

      if (!firstItem && breakpointsEnabled && blk.hasBreakpoint) {
        setVariables(currentVars);
        setExecutionQueue(queue);
        setActiveDebugBlockId(blk.id);
        setExecutionStatus('paused_at_breakpoint');
        appendConsoleLog(
          'breakpoint',
          `Execution paused at downstream breakpoint: "${blk.label}"`,
          blk
        );
        return;
      }

      firstItem = false;
      queue.shift();
      const { nextVars, nextQueueItem, haltedWithError } = executeSingleBlockMutation(
        blk,
        currentVars,
        item.triggerSource,
        item.inputOverride
      );
      currentVars = nextVars;
      stepsRun++;

      if (haltedWithError) {
        setVariables(currentVars);
        setExecutionQueue([]);
        return;
      }

      if (nextQueueItem) {
        queue.push(nextQueueItem);
      }
    }

    setVariables(currentVars);
    setExecutionQueue([]);
    setActiveDebugBlockId(null);
    setExecutionStatus('idle');
    appendConsoleLog('info', 'Execution resumed and completed cleanly.');
  }, [
    executionQueue,
    variables,
    activeProject.blocks,
    breakpointsEnabled,
    executeSingleBlockMutation,
    appendConsoleLog,
  ]);

  const handleResetRuntime = useCallback(() => {
    setVariables(buildInitialVariables(activeProject));
    setExecutionQueue([]);
    setCallStack([]);
    setActiveDebugBlockId(null);
    setExecutionStatus('idle');
    appendConsoleLog('info', 'Runtime state variables and execution queue reset to initial values.');
  }, [activeProject, appendConsoleLog]);

  const handleUpdateVariableValue = useCallback(
    (varName: string, rawValue: string) => {
      const now = new Date().toLocaleTimeString();
      setVariables((prev) => {
        const existing = prev[varName];
        if (!existing) return prev;
        let parsed: string | number | boolean = rawValue;
        if (existing.type === 'number') {
          const num = Number(rawValue);
          parsed = Number.isNaN(num) ? 0 : num;
        } else if (existing.type === 'boolean') {
          parsed = rawValue.trim().toLowerCase() === 'true';
        }
        return {
          ...prev,
          [varName]: {
            ...existing,
            value: parsed,
            lastUpdatedByLabel: 'Debugger Manual Override',
            updatedAt: now,
            history: [
              { value: String(parsed), timestamp: now },
              ...existing.history.slice(0, 9),
            ],
          },
        };
      });
      appendConsoleLog('info', `Variable "${varName}" manually overridden to ${rawValue} in Inspector.`);
    },
    [appendConsoleLog]
  );

  // Fault injection and one-click auto-fix for Debugger error identification workflow
  const handleSimulateErrorTrap = useCallback(() => {
    const targetBlock =
      activeProject.blocks.find((b) => b.type === 'transform' || b.type === 'condition') ||
      activeProject.blocks[0];
    if (!targetBlock) return;

    updateActiveProject((proj) => ({
      ...proj,
      blocks: proj.blocks.map((b) =>
        b.id === targetBlock.id
          ? { ...b, config: { ...b.config, simulateFault: true } }
          : b
      ),
    }));

    setExecutionStatus('error_halted');
    setActiveDebugBlockId(targetBlock.id);
    appendConsoleLog(
      'error',
      `Runtime Exception trapped in block "${targetBlock.label}" (${targetBlock.id}): Invalid state binding or arithmetic overflow.`,
      targetBlock,
      'Use "Auto-Fix Block" in the Diagnostic Console to sanitize the block configuration and resume.',
      targetBlock.id
    );
  }, [activeProject.blocks, updateActiveProject, appendConsoleLog]);

  const handleAutoFixBlock = useCallback(
    (blockId: string) => {
      const targetBlock = activeProject.blocks.find((b) => b.id === blockId);
      updateActiveProject((proj) => ({
        ...proj,
        blocks: proj.blocks.map((b) =>
          b.id === blockId
            ? {
                ...b,
                config: {
                  ...b.config,
                  simulateFault: false,
                  actionValue: b.config.actionValue === 0 ? 1 : b.config.actionValue,
                },
              }
            : b
        ),
      }));
      setExecutionStatus('idle');
      setActiveDebugBlockId(null);
      appendConsoleLog(
        'assert',
        `Auto-fixed block "${targetBlock?.label || blockId}": Cleared fault condition and restored valid variable bindings.`,
        targetBlock
      );
    },
    [activeProject.blocks, updateActiveProject, appendConsoleLog]
  );

  // Run an automated test scenario deterministically
  const handleRunTestScenario = useCallback(
    (scenarioId: string) => {
      const scenario = activeProject.testScenarios.find((s) => s.id === scenarioId);
      if (!scenario) return;

      let simVars = buildInitialVariables(activeProject);
      let allPassed = true;
      let failureDetail = '';

      for (const step of scenario.steps) {
        const queue: ExecutionStepQueueItem[] = [
          {
            blockId: step.triggerBlockId,
            triggerSource: `Test: ${scenario.name}`,
            inputOverride: step.inputOverride,
          },
        ];

        let guard = 0;
        while (queue.length > 0 && guard < 12) {
          const item = queue.shift()!;
          const blk = activeProject.blocks.find((b) => b.id === item.blockId);
          if (!blk) continue;
          const res = executeSingleBlockMutation(
            blk,
            simVars,
            item.triggerSource,
            item.inputOverride
          );
          simVars = res.nextVars;
          if (res.nextQueueItem) queue.push(res.nextQueueItem);
          guard++;
        }

        const actual = simVars[step.expectedVariable]?.value;
        if (actual !== step.expectedValue) {
          allPassed = false;
          failureDetail = `Step "${step.description}" expected ${step.expectedVariable} == ${String(
            step.expectedValue
          )}, got ${String(actual)}`;
          break;
        }
      }

      setVariables(simVars);
      const nowTime = new Date().toLocaleTimeString();

      updateActiveProject((proj) => ({
        ...proj,
        testScenarios: proj.testScenarios.map((s) =>
          s.id === scenarioId
            ? {
                ...s,
                lastStatus: allPassed ? 'passed' : 'failed',
                lastRunAt: nowTime,
                lastError: failureDetail || undefined,
              }
            : s
        ),
      }));

      appendConsoleLog(
        allPassed ? 'assert' : 'error',
        allPassed
          ? `Test Scenario PASSED: "${scenario.name}" (${scenario.steps.length} assertions verified)`
          : `Test Scenario FAILED: "${scenario.name}" — ${failureDetail}`
      );
    },
    [activeProject, executeSingleBlockMutation, updateActiveProject, appendConsoleLog]
  );

  const handleRunAllTests = useCallback(() => {
    for (const sc of activeProject.testScenarios) {
      handleRunTestScenario(sc.id);
    }
  }, [activeProject.testScenarios, handleRunTestScenario]);

  // E2E Encryption & Paired Device Synchronization Setup
  const syncEncryptedVault = useCallback(
    async (projectsToSync: SoftwareProject[], currentIdentity: LocalDeviceIdentity) => {
      if (!isOnline) {
        setSyncStatus('offline_queued');
        return;
      }

      setSyncStatus('syncing');
      try {
        const plaintext = JSON.stringify(projectsToSync);
        const encrypted = await encryptPayloadE2E(plaintext, currentIdentity.masterKeyBase64);

        const res = await fetch(`/api/vault/${currentIdentity.vaultId}/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-device-id': currentIdentity.deviceId,
          },
          body: JSON.stringify({
            ciphertext: encrypted.ciphertext,
            iv: encrypted.iv,
            salt: encrypted.salt,
            checksum: encrypted.checksum,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setLastEnvelope(data.encryptedPayload);
          setPairedDevices(data.allowedDevices || []);
          setPendingOfflineChanges(0);
          setSyncStatus('synced');
        } else {
          setSyncStatus('error');
        }
      } catch {
        setSyncStatus('offline_queued');
      }
    },
    [isOnline]
  );

  // Initialize device identity, register vault, and connect real-time WebSocket
  useEffect(() => {
    let active = true;

    async function initDeviceAndVault() {
      const devIdentity = await getOrCreateDeviceIdentity();
      if (!active) return;
      setIdentity(devIdentity);

      try {
        const res = await fetch('/api/vault/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vaultId: devIdentity.vaultId,
            device: {
              deviceId: devIdentity.deviceId,
              deviceName: devIdentity.deviceName,
              platform: devIdentity.platform,
              publicKeyFingerprint: devIdentity.publicKeyFingerprint,
            },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setPairedDevices(data.allowedDevices || []);
          setOnlineDeviceIds(data.onlineDeviceIds || []);

          if (data.encryptedPayload) {
            setLastEnvelope(data.encryptedPayload);
            try {
              const decrypted = await decryptPayloadE2E(
                data.encryptedPayload.ciphertext,
                data.encryptedPayload.iv,
                devIdentity.masterKeyBase64
              );
              const parsedProjects = JSON.parse(decrypted) as SoftwareProject[];
              if (Array.isArray(parsedProjects) && parsedProjects.length > 0) {
                isApplyingRemoteUpdate.current = true;
                setProjects(parsedProjects);
              }
            } catch {
              // Keep local projects if key differs
            }
          } else {
            // Perform initial encrypted push so vault has initial ciphertext
            await syncEncryptedVault(projects, devIdentity);
          }
        }
      } catch {
        // Offline fallback: populate current device in pairedDevices list
        setPairedDevices([
          {
            deviceId: devIdentity.deviceId,
            deviceName: devIdentity.deviceName,
            platform: devIdentity.platform,
            publicKeyFingerprint: devIdentity.publicKeyFingerprint,
            pairedAt: new Date().toISOString(),
            lastSyncAt: new Date().toISOString(),
          },
        ]);
      }
    }

    initDeviceAndVault();
    return () => {
      active = false;
    };
  }, []);

  // Connect WebSocket when online and identity is ready
  useEffect(() => {
    if (!identity || !isOnline) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${proto}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: 'vault:join',
          vaultId: identity.vaultId,
          deviceId: identity.deviceId,
          deviceName: identity.deviceName,
        })
      );
    };

    ws.onmessage = async (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'vault:ciphertext_updated' && msg.encryptedPayload) {
          setLastEnvelope(msg.encryptedPayload);
          if (msg.allowedDevices) setPairedDevices(msg.allowedDevices);

          const decrypted = await decryptPayloadE2E(
            msg.encryptedPayload.ciphertext,
            msg.encryptedPayload.iv,
            identity.masterKeyBase64
          );
          const remoteProjects = JSON.parse(decrypted) as SoftwareProject[];
          if (Array.isArray(remoteProjects) && remoteProjects.length > 0) {
            isApplyingRemoteUpdate.current = true;
            setProjects(remoteProjects);
            appendConsoleLog(
              'info',
              `Received E2E encrypted sync v${msg.encryptedPayload.version} from paired device "${msg.encryptedPayload.senderDeviceName}".`
            );
          }
        } else if (msg.type === 'device:paired' || msg.type === 'device:revoked') {
          if (msg.allowedDevices) setPairedDevices(msg.allowedDevices);
          if (msg.onlineDeviceIds) setOnlineDeviceIds(msg.onlineDeviceIds);
        } else if (msg.type === 'presence:updated') {
          if (msg.onlineDeviceIds) setOnlineDeviceIds(msg.onlineDeviceIds);
        }
      } catch {}
    };

    return () => {
      ws.close();
    };
  }, [identity, isOnline, appendConsoleLog]);

  // Automatically flush offline queue when coming back online
  useEffect(() => {
    if (isOnline && pendingOfflineChanges > 0 && identity) {
      syncEncryptedVault(projects, identity);
    }
  }, [isOnline, pendingOfflineChanges, identity, projects, syncEncryptedVault]);

  // Block Manipulation Handlers
  const handleAddBlockFromTemplate = useCallback(
    (tmpl: PaletteBlockTemplate) => {
      const newBlock: VisualBlock = {
        id: `blk-${tmpl.type}-${Date.now().toString(36).slice(-4)}`,
        type: tmpl.type,
        category: tmpl.category,
        label: tmpl.label,
        description: tmpl.description,
        gridCol: 1,
        gridRow: activeProject.blocks.length + 1,
        hasBreakpoint: false,
        config: { ...tmpl.defaultConfig },
      };

      updateActiveProject((proj) => ({
        ...proj,
        blocks: [...proj.blocks, newBlock],
      }));
      setSelectedBlockId(newBlock.id);
      appendConsoleLog('info', `Added visual block "${newBlock.label}" (${newBlock.type}) to canvas.`);
    },
    [activeProject.blocks.length, updateActiveProject, appendConsoleLog]
  );

  const handleUpdateBlock = useCallback(
    (blockId: string, updater: (prev: VisualBlock) => VisualBlock) => {
      updateActiveProject((proj) => ({
        ...proj,
        blocks: proj.blocks.map((b) => (b.id === blockId ? updater(b) : b)),
      }));
    },
    [updateActiveProject]
  );

  const handleDeleteBlock = useCallback(
    (blockId: string) => {
      updateActiveProject((proj) => ({
        ...proj,
        blocks: proj.blocks.filter((b) => b.id !== blockId),
      }));
      if (selectedBlockId === blockId) {
        setSelectedBlockId(null);
      }
    },
    [updateActiveProject, selectedBlockId]
  );

  const handleReorderBlocks = useCallback(
    (sourceBlockId: string, targetBlockId: string) => {
      updateActiveProject((proj) => {
        const list = [...proj.blocks];
        const fromIdx = list.findIndex((b) => b.id === sourceBlockId);
        const toIdx = list.findIndex((b) => b.id === targetBlockId);
        if (fromIdx === -1 || toIdx === -1) return proj;
        const [moved] = list.splice(fromIdx, 1);
        list.splice(toIdx, 0, moved);
        return { ...proj, blocks: list };
      });
    },
    [updateActiveProject]
  );

  const handleToggleBlockBreakpoint = useCallback(
    (blockId: string) => {
      const target = activeProject.blocks.find((b) => b.id === blockId);
      updateActiveProject((proj) => ({
        ...proj,
        blocks: proj.blocks.map((b) =>
          b.id === blockId ? { ...b, hasBreakpoint: !b.hasBreakpoint } : b
        ),
      }));
      if (target) {
        appendConsoleLog(
          'breakpoint',
          `${!target.hasBreakpoint ? 'Set' : 'Cleared'} breakpoint on block "${target.label}".`,
          target
        );
      }
    },
    [activeProject.blocks, updateActiveProject, appendConsoleLog]
  );

  // Voice Command Action Router
  const handleVoiceCommandAction = useCallback(
    (commandKey: string) => {
      if (commandKey.startsWith('add_')) {
        const targetType = commandKey.replace('add_', '');
        const tmpl =
          PALETTE_BLOCK_TEMPLATES.find((t) => t.type === targetType) ||
          PALETTE_BLOCK_TEMPLATES[0];
        handleAddBlockFromTemplate(tmpl);
        return;
      }

      switch (commandKey) {
        case 'run_simulation': {
          setActiveTab('debugger');
          const firstButton =
            activeProject.blocks.find((b) => b.type === 'button') || activeProject.blocks[0];
          if (firstButton) handleTriggerBlock(firstButton.id);
          break;
        }
        case 'step_next':
          setActiveTab('debugger');
          handleStepNext();
          break;
        case 'continue_debug':
          setActiveTab('debugger');
          handleContinueExecution();
          break;
        case 'toggle_breakpoint':
          if (selectedBlockId) handleToggleBlockBreakpoint(selectedBlockId);
          break;
        case 'reset_debugger':
          handleResetRuntime();
          break;
        case 'sync_now':
          if (identity) syncEncryptedVault(projects, identity);
          break;
        case 'view_debugger':
          setActiveTab('debugger');
          break;
        case 'view_builder':
          setActiveTab('builder');
          break;
        case 'view_devices':
          setActiveTab('devices');
          break;
        case 'view_code':
          setActiveTab('export');
          break;
        case 'view_app':
        case 'run_app':
          setActiveTab('app');
          break;
        case 'view_design':
        case 'app_design':
        case 'open_design':
          setActiveTab('design');
          break;
        case 'create_custom_block':
          setShowCustomBlockModal(true);
          break;
      }
    },
    [
      activeProject.blocks,
      selectedBlockId,
      identity,
      projects,
      handleAddBlockFromTemplate,
      handleTriggerBlock,
      handleStepNext,
      handleContinueExecution,
      handleToggleBlockBreakpoint,
      handleResetRuntime,
      syncEncryptedVault,
    ]
  );

  const handleSaveCustomBlock = useCallback(
    (def: CustomBlockDefinition) => {
      updateActiveProject((proj) => ({
        ...proj,
        customBlocks: [...(proj.customBlocks || []), def],
      }));
      // Also instantiate on canvas so user sees it right away
      handleAddBlockFromTemplate({
        type: 'custom',
        category: def.category,
        label: def.label,
        description: def.description,
        defaultConfig: def.defaultConfig,
      });
      appendConsoleLog('info', `Saved custom block "${def.label}" to library and placed on canvas.`);
    },
    [updateActiveProject, handleAddBlockFromTemplate, appendConsoleLog]
  );

  const handleSaveAppDesign = useCallback(
    (design: AppDesignConfig) => {
      updateActiveProject((proj) => ({
        ...proj,
        design,
      }));
      appendConsoleLog(
        'info',
        `Updated app design styling: ${design.accentColor} accent, ${design.surfaceTheme} theme, ${design.cardRadius} radius.`
      );
    },
    [updateActiveProject, appendConsoleLog]
  );

  const voiceSystem = useVoiceSystem({
    isLocked,
    voicePassphrase,
    onUnlockSuccess: () => setIsLocked(false),
    onLockRequested: () => setIsLocked(true),
    onVoiceCommand: handleVoiceCommandAction,
  });

  const handleUpdatePassphrase = (newPhrase: string) => {
    setVoicePassphrase(newPhrase);
    localStorage.setItem(LOCAL_PASSPHRASE_KEY, newPhrase);
  };

  // Paired Devices Handshake Actions
  const handleGeneratePairingBundle = async (): Promise<string | null> => {
    if (!identity) return null;
    try {
      const res = await fetch('/api/pairing/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vaultId: identity.vaultId,
          deviceId: identity.deviceId,
        }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return `${data.code}#${identity.masterKeyBase64}`;
    } catch {
      return null;
    }
  };

  const handleClaimPairingBundle = async (
    bundle: string
  ): Promise<{ ok: boolean; message: string }> => {
    if (!identity) return { ok: false, message: 'Device identity not initialized.' };
    const [codePart, keyPart] = bundle.split('#');
    if (!codePart || !keyPart) {
      return {
        ok: false,
        message: 'Format must be XXX-XXX#<base64MasterKey>',
      };
    }

    try {
      const res = await fetch('/api/pairing/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: codePart.trim(),
          device: {
            deviceId: identity.deviceId,
            deviceName: identity.deviceName,
            platform: identity.platform,
            publicKeyFingerprint: identity.publicKeyFingerprint,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        return { ok: false, message: err.message || 'Pairing failed.' };
      }

      const data = await res.json();
      const updatedIdentity: LocalDeviceIdentity = {
        ...identity,
        vaultId: data.vaultId,
        masterKeyBase64: keyPart.trim(),
      };
      setIdentity(updatedIdentity);
      saveDeviceIdentity(updatedIdentity);
      setPairedDevices(data.allowedDevices || []);

      if (data.encryptedPayload) {
        setLastEnvelope(data.encryptedPayload);
        const decrypted = await decryptPayloadE2E(
          data.encryptedPayload.ciphertext,
          data.encryptedPayload.iv,
          updatedIdentity.masterKeyBase64
        );
        const parsed = JSON.parse(decrypted) as SoftwareProject[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setProjects(parsed);
          setActiveProjectId(parsed[0].id);
        }
      }

      return {
        ok: true,
        message: `Successfully paired with vault ${data.vaultId} and decrypted workspace.`,
      };
    } catch {
      return { ok: false, message: 'Network error while claiming pairing ticket.' };
    }
  };

  const handlePairSimulatedCompanion = async () => {
    if (!identity) return;
    const bundle = await handleGeneratePairingBundle();
    if (!bundle) return;
    const [codePart] = bundle.split('#');
    const companionId = `dev-pad-${Math.floor(1000 + Math.random() * 9000)}`;
    const fp = (await sha256Hex(companionId)).slice(0, 12).toUpperCase().match(/.{1,4}/g)!.join(':');

    const res = await fetch('/api/pairing/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: codePart,
        device: {
          deviceId: companionId,
          deviceName: `Paired Field Tablet (${companionId.slice(-4)})`,
          platform: 'iPadOS Mobile Client',
          publicKeyFingerprint: `SHA256:${fp}`,
        },
      }),
    });

    if (res.ok) {
      const data = await res.json();
      setPairedDevices(data.allowedDevices || []);
      appendConsoleLog(
        'info',
        `Paired companion device "Paired Field Tablet (${companionId.slice(-4)})" to E2E vault.`
      );
    }
  };

  const handleRevokeDevice = async (targetDeviceId: string) => {
    if (!identity) return;
    const res = await fetch(`/api/vault/${identity.vaultId}/devices/${targetDeviceId}`, {
      method: 'DELETE',
      headers: { 'x-device-id': identity.deviceId },
    });
    if (res.ok) {
      const data = await res.json();
      setPairedDevices(data.allowedDevices || []);
      appendConsoleLog('warn', `Revoked vault access for device ${targetDeviceId}.`);
    }
  };

  const handleCreateNewProject = () => {
    const id = `proj-custom-${Date.now().toString(36).slice(-4)}`;
    const newProj: SoftwareProject = {
      id,
      name: `Custom Application (${projects.length + 1})`,
      description: 'Drag-and-drop application scoped strictly to paired devices.',
      updatedAt: new Date().toISOString(),
      version: 1,
      watchExpressions: ['counter * 10'],
      blocks: [
        {
          id: `blk-var-${Date.now().toString(36).slice(-3)}`,
          type: 'variable',
          category: 'data',
          label: 'Counter Variable',
          description: 'Primary numeric state counter.',
          gridCol: 1,
          gridRow: 1,
          hasBreakpoint: false,
          config: { variableName: 'counter', initialValue: 10, unit: 'pts' },
        },
        {
          id: `blk-btn-${Date.now().toString(36).slice(-3)}`,
          type: 'button',
          category: 'ui',
          label: 'Increment Counter (+5)',
          description: 'Adds 5 to counter variable on click.',
          gridCol: 2,
          gridRow: 1,
          hasBreakpoint: true,
          config: { variableName: 'counter', actionType: 'increment', actionValue: 5 },
        },
        {
          id: `blk-metric-${Date.now().toString(36).slice(-3)}`,
          type: 'metric',
          category: 'ui',
          label: 'Counter Readout',
          description: 'Live display of counter variable.',
          gridCol: 3,
          gridRow: 1,
          hasBreakpoint: false,
          config: { variableName: 'counter', unit: 'pts' },
        },
      ],
      testScenarios: [
        {
          id: `test-${Date.now().toString(36).slice(-3)}`,
          name: 'Increment Counter Verification',
          description: 'Triggers Increment Counter (+5) from 10 and asserts counter == 15.',
          lastStatus: 'untested',
          steps: [
            {
              id: 'st-1',
              description: 'Click Increment Counter (+5)',
              triggerBlockId: '',
              expectedVariable: 'counter',
              expectedValue: 15,
            },
          ],
        },
      ],
    };
    newProj.testScenarios[0].steps[0].triggerBlockId = newProj.blocks[1].id;

    setProjects((prev) => [...prev, newProj]);
    setActiveProjectId(newProj.id);
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col">
      {/* Voice Lock Security Overlay when Locked */}
      {isLocked && (
        <VoiceLockOverlay
          voicePassphrase={voicePassphrase}
          isListening={voiceSystem.isListening}
          liveTranscript={voiceSystem.liveTranscript}
          audioBands={voiceSystem.audioBands}
          dominantHz={voiceSystem.dominantHz}
          enrolledPitchHz={voiceSystem.enrolledPitchHz}
          onToggleListen={voiceSystem.toggleVoiceAccess}
          onUnlockWithPhrase={(phrase) => {
            voiceSystem.processTranscriptCommand(phrase, 0.99);
            setIsLocked(false);
          }}
        />
      )}

      {/* Strict 3-Zone Top Bar Contract */}
      <header className="flex items-center justify-between gap-8 px-6 py-4 border-b border-slate-800/90 bg-[#0F172A]">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#builder"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('builder');
          }}
          className="text-lg font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0"
        >
          CodeBuilder
        </a>

        {/* Zone 2: 6 concise single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
          <button
            type="button"
            onClick={() => setActiveTab('builder')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'builder'
                ? 'text-slate-100 border-sky-400 font-semibold'
                : 'border-transparent hover:text-slate-200'
            }`}
          >
            Visual Builder
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('app')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'app'
                ? 'text-slate-100 border-sky-400 font-semibold'
                : 'border-transparent hover:text-slate-200'
            }`}
          >
            Live Software App
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('design')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'design'
                ? 'text-slate-100 border-sky-400 font-semibold'
                : 'border-transparent hover:text-slate-200'
            }`}
          >
            App Design
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('debugger')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'debugger'
                ? 'text-slate-100 border-sky-400 font-semibold'
                : 'border-transparent hover:text-slate-200'
            }`}
          >
            Testing &amp; Debugger
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('devices')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'devices'
                ? 'text-slate-100 border-sky-400'
                : 'border-transparent hover:text-slate-200'
            }`}
          >
            Paired Devices
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('voice')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'voice'
                ? 'text-slate-100 border-sky-400'
                : 'border-transparent hover:text-slate-200'
            }`}
          >
            Voice Security
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => setIsLocked(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-950 bg-sky-400 rounded-lg hover:bg-sky-300 transition-colors whitespace-nowrap shrink-0"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Voice Lock Vault</span>
          </button>
        </div>
      </header>

      {/* Secondary Workspace Context & Telemetry Strip */}
      <div className="bg-[#0B0F19] border-b border-slate-800/80 px-6 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Project Selector & Unboxed Metadata */}
        <div className="flex flex-wrap items-center gap-3 min-w-0">
          <div className="flex items-center gap-2">
            <label htmlFor="project-select" className="text-xs text-slate-400 shrink-0">
              Project:
            </label>
            <select
              id="project-select"
              value={activeProject.id}
              onChange={(e) => setActiveProjectId(e.target.value)}
              className="bg-[#0F172A] border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-100 focus:outline-none focus:border-sky-400"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (v{p.version})
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleCreateNewProject}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-300 bg-[#0F172A] border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5 text-sky-400" />
              <span>New App</span>
            </button>
          </div>

          {/* Clean unboxed metadata with typographic separators (Zero-Pill Discipline) */}
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono tabular-nums">
            <span className="flex items-center gap-1 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              AES-256-GCM
            </span>
            <span aria-hidden="true">·</span>
            <span>{pairedDevices.length || 1} Paired Devices</span>
            <span aria-hidden="true">·</span>
            <span>
              {executionStatus === 'paused_at_breakpoint'
                ? 'Debugger Paused'
                : executionStatus === 'error_halted'
                ? 'Fault Trapped'
                : isOnline
                ? 'E2E Relay Synced'
                : `Offline Cache (${pendingOfflineChanges} queued)`}
            </span>
          </div>
        </div>

        {/* Right: Quick App Run, Design Studio, Voice Access Toggle, Debugger Shortcut & PWA Install */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* Mobile Navigation Selector */}
          <div className="flex md:hidden items-center gap-1 bg-[#0F172A] p-1 rounded-lg border border-slate-800">
            {(['builder', 'app', 'design', 'debugger', 'devices', 'voice'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setActiveTab(t)}
                className={`px-2.5 py-1 text-xs font-medium rounded whitespace-nowrap ${
                  activeTab === t ? 'bg-slate-800 text-slate-100 font-semibold' : 'text-slate-400'
                }`}
              >
                {t === 'app' ? 'App' : t === 'design' ? 'Design' : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setActiveTab(activeTab === 'design' ? 'builder' : 'design')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'design'
                ? 'bg-sky-500/15 border-sky-500/50 text-sky-300 font-semibold'
                : 'bg-[#0F172A] border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
            title="Open App Design Studio"
          >
            <Palette className="w-3.5 h-3.5 text-sky-400" />
            <span>App Design</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab(activeTab === 'app' ? 'builder' : 'app')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'app'
                ? 'bg-slate-800 text-slate-100 border border-slate-700'
                : 'bg-sky-400 text-slate-950 hover:bg-sky-300'
            }`}
          >
            {activeTab === 'app' ? (
              <>
                <Code2 className="w-3.5 h-3.5" />
                <span>Edit in Builder</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Run as App</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={voiceSystem.toggleVoiceAccess}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
              voiceSystem.voiceAccessEnabled
                ? 'bg-sky-500/15 border-sky-500/50 text-sky-300'
                : 'bg-[#0F172A] border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
            title="Toggle Hands-Free Voice Access"
          >
            {voiceSystem.isListening ? (
              <Mic className="w-3.5 h-3.5 text-sky-400" />
            ) : (
              <MicOff className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span>
              {voiceSystem.voiceAccessEnabled ? 'Voice Active' : 'Voice Access'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab(activeTab === 'debugger' ? 'builder' : 'debugger')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'debugger'
                ? 'bg-amber-500/15 border-amber-500/50 text-amber-300'
                : 'bg-[#0F172A] border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Bug className="w-3.5 h-3.5 text-amber-400" />
            <span>
              {activeTab === 'debugger' ? 'Back to Canvas' : 'Debugger'}
            </span>
          </button>

          <PWAInstallButton />
        </div>
      </div>

      {/* Main Content Viewport (1440px max-w container with generous spatial padding) */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-6 py-6">
        {activeTab === 'builder' && (
          <VisualBuilderCanvas
            project={activeProject}
            selectedBlockId={selectedBlockId}
            activeDebugBlockId={activeDebugBlockId}
            onSelectBlock={setSelectedBlockId}
            onAddBlockFromTemplate={handleAddBlockFromTemplate}
            onUpdateBlock={handleUpdateBlock}
            onDeleteBlock={handleDeleteBlock}
            onReorderBlocks={handleReorderBlocks}
            onToggleBlockBreakpoint={handleToggleBlockBreakpoint}
            onOpenDebuggerAndRun={() => {
              setActiveTab('debugger');
              const entryBlock =
                activeProject.blocks.find((b) => b.type === 'button') ||
                activeProject.blocks[0];
              if (entryBlock) {
                handleTriggerBlock(entryBlock.id);
              }
            }}
            onOpenCustomBlockModal={() => setShowCustomBlockModal(true)}
            onOpenDesignStudio={() => setActiveTab('design')}
            onOpenAppRunner={() => setActiveTab('app')}
          />
        )}

        {activeTab === 'app' && (
          <StandaloneAppRunner
            project={activeProject}
            variables={variables}
            onTriggerBlock={handleTriggerBlock}
            onResetAppState={handleResetRuntime}
            onReturnToStudio={() => setActiveTab('builder')}
            onOpenDesignModal={() => setShowAppDesignModal(true)}
          />
        )}

        {activeTab === 'design' && (
          <AppDesignStudio
            project={activeProject}
            onSaveDesign={handleSaveAppDesign}
            onNavigateToApp={() => setActiveTab('app')}
            onNavigateToBuilder={() => setActiveTab('builder')}
          />
        )}

        {activeTab === 'debugger' && (
          <DebuggerModule
            project={activeProject}
            variables={variables}
            executionStatus={executionStatus}
            activeBlockId={activeDebugBlockId}
            executionQueue={executionQueue}
            callStack={callStack}
            consoleLogs={consoleLogs}
            breakpointsEnabled={breakpointsEnabled}
            onToggleBreakpointsGlobal={() => setBreakpointsEnabled((b) => !b)}
            onToggleBlockBreakpoint={handleToggleBlockBreakpoint}
            onTriggerBlock={handleTriggerBlock}
            onStepNext={handleStepNext}
            onContinueExecution={handleContinueExecution}
            onResetRuntime={handleResetRuntime}
            onUpdateVariableValue={handleUpdateVariableValue}
            onAddWatchExpression={(expr) =>
              updateActiveProject((proj) => ({
                ...proj,
                watchExpressions: proj.watchExpressions.includes(expr)
                  ? proj.watchExpressions
                  : [...proj.watchExpressions, expr],
              }))
            }
            onRemoveWatchExpression={(expr) =>
              updateActiveProject((proj) => ({
                ...proj,
                watchExpressions: proj.watchExpressions.filter((w) => w !== expr),
              }))
            }
            onClearConsole={() => setConsoleLogs([])}
            onSimulateErrorTrap={handleSimulateErrorTrap}
            onAutoFixBlock={handleAutoFixBlock}
            onRunTestScenario={handleRunTestScenario}
            onRunAllTests={handleRunAllTests}
          />
        )}

        {activeTab === 'devices' && identity && (
          <PairedDevicesPanel
            identity={identity}
            pairedDevices={pairedDevices}
            onlineDeviceIds={onlineDeviceIds}
            lastEnvelope={lastEnvelope}
            isOnline={isOnline}
            simulateOffline={simulateOffline}
            pendingOfflineChanges={pendingOfflineChanges}
            syncStatus={syncStatus}
            onToggleSimulateOffline={() => setSimulateOffline(!simulateOffline)}
            onSyncNow={async () => {
              await syncEncryptedVault(projects, identity);
            }}
            onGeneratePairingBundle={handleGeneratePairingBundle}
            onClaimPairingBundle={handleClaimPairingBundle}
            onPairSimulatedCompanion={handlePairSimulatedCompanion}
            onRevokeDevice={handleRevokeDevice}
          />
        )}

        {activeTab === 'voice' && (
          <VoiceSecurityPanel
            isLocked={isLocked}
            voicePassphrase={voicePassphrase}
            onPassphraseChange={handleUpdatePassphrase}
            voiceAccessEnabled={voiceSystem.voiceAccessEnabled}
            isListening={voiceSystem.isListening}
            liveTranscript={voiceSystem.liveTranscript}
            audioBands={voiceSystem.audioBands}
            dominantHz={voiceSystem.dominantHz}
            rmsLevel={voiceSystem.rmsLevel}
            voiceprintEnrolled={voiceSystem.voiceprintEnrolled}
            enrolledPitchHz={voiceSystem.enrolledPitchHz}
            commandHistory={voiceSystem.commandHistory}
            micError={voiceSystem.micError}
            onToggleVoiceAccess={voiceSystem.toggleVoiceAccess}
            onTriggerVoiceCommand={(phrase) =>
              voiceSystem.processTranscriptCommand(phrase, 0.98)
            }
            onEnrollVoiceprint={voiceSystem.enrollVoiceprintSample}
            onLockWorkspace={() => setIsLocked(true)}
          />
        )}

        {activeTab === 'export' && <CodeExportPanel project={activeProject} />}
      </main>

      {/* Custom Block Creator & App Design Modals */}
      {showCustomBlockModal && (
        <CustomBlockModal
          existingVariables={Object.keys(variables)}
          onSaveCustomBlock={handleSaveCustomBlock}
          onClose={() => setShowCustomBlockModal(false)}
        />
      )}

      {showAppDesignModal && (
        <AppDesignModal
          currentDesign={activeProject.design}
          projectName={activeProject.name}
          onSaveDesign={handleSaveAppDesign}
          onClose={() => setShowAppDesignModal(false)}
        />
      )}

      {/* Non-intrusive Offline Connectivity Toast when offline */}
      {!isOnline && (
        <div className="fixed bottom-4 left-4 z-40 flex items-center gap-2.5 rounded-lg bg-amber-950/95 border border-amber-600/70 px-3.5 py-2 text-xs font-medium text-amber-200 shadow-lg">
          <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            Offline Mode — Changes are encrypted in local storage and will sync to paired devices upon reconnect.
          </span>
        </div>
      )}
    </div>
  );
}
