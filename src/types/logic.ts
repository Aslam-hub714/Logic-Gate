export type SynthesisMode = 'nand' | 'nor' | 'nand_opt' | 'std';

export type AstNode =
  | { type: 'VAR'; val: string }
  | { type: 'CONST'; val: number }
  | { type: 'NOT'; child: AstNode }
  | { type: 'AND'; left: AstNode; right: AstNode }
  | { type: 'OR'; left: AstNode; right: AstNode };

export type MacroType =
  | 'BUS_TAP'
  | 'SINGLE_INV'
  | 'SIMPLE_2GATE'
  | 'GATE_PLUS_INV'
  | 'TWO_INV_PLUS_GATE'
  | 'OPT_OR_NAND';

export interface MacroNode {
  macroType: MacroType;
  varName?: string;
  gateType?: string; // 'NOT' | 'NAND_INV' | 'NOR_INV'
  mainGate?: 'AND' | 'OR' | 'NAND' | 'NOR';
  invGate?: 'NOT' | 'NAND_INV' | 'NOR_INV';
  child?: MacroNode;
  left?: MacroNode;
  right?: MacroNode;
  leftNeedsInv?: boolean;
  rightNeedsInv?: boolean;
  isBubbleCanceled?: boolean;
  exprLabel: string;
  trueExprLabel?: string;
  interLabel?: string;
  gateCount: number;
  stepDesc?: string;
  evalFn: (env: Record<string, number>) => number;
  
  // Layout coordinates
  x?: number;
  width?: number;
  inY?: number;
  outX?: number;
  outY?: number;
  actualOutX?: number;
  actualOutY?: number;
  val?: number;
}

export interface TruthTableRow {
  inputs: Record<string, number>;
  formulaOut: number;
  circuitOut: number;
  isMatch: boolean;
  isActive: boolean;
}
