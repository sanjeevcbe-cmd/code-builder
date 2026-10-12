export type BlockCategory = 'ui' | 'logic' | 'data';

export type BlockType =
  | 'button'
  | 'input'
  | 'metric'
  | 'toggle'
  | 'table'
  | 'trigger'
  | 'variable'
  | 'condition'
  | 'transform'
  | 'alert'
  | 'custom';

export type ActionType =
  | 'increment'
  | 'decrement'
  | 'set'
  | 'multiply'
  | 'append_row'
  | 'reset'
  | 'evaluate_condition'
  | 'divide'
  | 'custom_formula';

export type ConditionOperator = '>' | '<' | '==' | '!=' | '>=' | '<=';

export interface BlockConfig {
  variableName?: string;
  secondaryVariableName?: string;
  outputVariableName?: string;
  initialValue?: string | number | boolean;
  actionType?: ActionType;
  actionValue?: string | number;
  conditionOperator?: ConditionOperator;
  conditionThreshold?: number | string;
  targetBlockId?: string;
  elseTargetBlockId?: string;
  unit?: string;
  placeholder?: string;
  alertSeverity?: 'normal' | 'warning' | 'critical';
  simulateFault?: boolean;
  customUiKind?: 'slider' | 'badge' | 'formula' | 'button' | 'metric';
  customFormula?: string;
  sliderMin?: number;
  sliderMax?: number;
  sliderStep?: number;
}

export interface CustomBlockDefinition {
  id: string;
  label: string;
  category: BlockCategory;
  description: string;
  customUiKind: 'slider' | 'badge' | 'formula' | 'button' | 'metric';
  defaultConfig: BlockConfig;
  createdAt: string;
}

export interface VisualBlock {
  id: string;
  type: BlockType;
  category: BlockCategory;
  label: string;
  description: string;
  gridCol: number;
  gridRow: number;
  hasBreakpoint: boolean;
  config: BlockConfig;
}

export interface TestStep {
  id: string;
  description: string;
  triggerBlockId: string;
  inputOverride?: number | string;
  expectedVariable: string;
  expectedValue: number | string | boolean;
}

export interface TestScenario {
  id: string;
  name: string;
  description: string;
  steps: TestStep[];
  lastStatus?: 'untested' | 'passed' | 'failed';
  lastRunAt?: string;
  lastError?: string;
}

export interface AppDesignConfig {
  accentColor: 'sky' | 'emerald' | 'indigo' | 'amber' | 'rose' | 'cyan' | 'violet' | 'teal';
  surfaceTheme: 'midnight' | 'obsidian' | 'charcoal' | 'slate' | 'pure_dark';
  cardRadius: 'sharp' | 'modern' | 'rounded' | 'pill';
  cardSurface: 'solid' | 'glass' | 'mesh' | 'bordered';
  fontFamily: 'sans' | 'mono';
  layoutDensity: 'compact' | 'standard' | 'spacious';
  appIcon: 'code' | 'terminal' | 'bolt' | 'database' | 'shield' | 'activity' | 'sparkles' | 'cpu' | 'layers' | 'layout';
  bannerVisible: boolean;
  appTitleCustom?: string;
  appSubtitleCustom?: string;
  gridColumns?: 1 | 2 | 3;
  showLiveClock?: boolean;
  enableStatusPill?: boolean;
  presetId?: string;
}

export interface SoftwareProject {
  id: string;
  name: string;
  description: string;
  updatedAt: string;
  version: number;
  blocks: VisualBlock[];
  watchExpressions: string[];
  testScenarios: TestScenario[];
  customBlocks?: CustomBlockDefinition[];
  design?: AppDesignConfig;
}

export type ConsoleLogLevel = 'info' | 'warn' | 'error' | 'breakpoint' | 'assert';

export interface ConsoleLogEntry {
  id: string;
  timestamp: string;
  level: ConsoleLogLevel;
  blockId?: string;
  blockLabel?: string;
  message: string;
  details?: string;
  fixableBlockId?: string;
}

export interface CallStackFrame {
  id: string;
  blockId: string;
  blockLabel: string;
  blockType: BlockType;
  triggerSource: string;
  timestamp: string;
}

export interface RuntimeVariableState {
  name: string;
  value: string | number | boolean | Array<Record<string, string | number>>;
  type: 'number' | 'string' | 'boolean' | 'list';
  lastUpdatedByBlockId?: string;
  lastUpdatedByLabel?: string;
  updatedAt: string;
  history: Array<{ value: string; timestamp: string }>;
}

export type ExecutionStatus = 'idle' | 'running' | 'paused_at_breakpoint' | 'error_halted';

export interface ExecutionStepQueueItem {
  blockId: string;
  triggerSource: string;
  inputOverride?: string | number;
}

export interface PairedDevice {
  deviceId: string;
  deviceName: string;
  platform: string;
  publicKeyFingerprint: string;
  pairedAt: string;
  lastSyncAt: string;
}

export interface EncryptedEnvelope {
  ciphertext: string;
  iv: string;
  salt: string;
  version: number;
  updatedAt: string;
  senderDeviceId: string;
  senderDeviceName: string;
  byteSize: number;
  checksum: string;
}

export interface LocalDeviceIdentity {
  deviceId: string;
  deviceName: string;
  platform: string;
  publicKeyFingerprint: string;
  vaultId: string;
  masterKeyBase64: string;
}
