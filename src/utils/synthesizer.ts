import { AstNode, MacroNode, SynthesisMode } from '../types/logic';
import { astToString } from './booleanParser';

export function buildUniversalMacroTree(
  astNode: AstNode,
  mode: SynthesisMode,
  parentOp: 'AND' | 'OR' | 'NOT' | null = null
): MacroNode {
  const exprLabel = astToString(astNode);

  if (astNode.type === 'VAR' || astNode.type === 'CONST') {
    return {
      macroType: 'BUS_TAP',
      varName: String(astNode.val),
      exprLabel,
      gateCount: 0,
      evalFn: (env: Record<string, number>) =>
        astNode.type === 'CONST' ? astNode.val : (env[astNode.val] ? 1 : 0)
    };
  }

  if (astNode.type === 'NOT') {
    // Double negation cancellation if child is also NOT
    if (astNode.child.type === 'NOT') {
      return buildUniversalMacroTree(astNode.child.child, mode, parentOp);
    }
    const childMacro = buildUniversalMacroTree(astNode.child, mode, 'NOT');
    const invGateType = mode === 'nor' ? 'NOR_INV' : mode === 'std' ? 'NOT' : 'NAND_INV';

    return {
      macroType: 'SINGLE_INV',
      gateType: invGateType,
      child: childMacro,
      exprLabel,
      gateCount: childMacro.gateCount + 1,
      stepDesc: `Invert <strong>${childMacro.exprLabel}</strong> using ${
        invGateType === 'NOT' ? 'a standard NOT inverter' : `a tied-input ${invGateType.replace('_INV', '')} inverter`
      } → <code>${exprLabel}</code>`,
      evalFn: (env: Record<string, number>) => {
        const cVal = childMacro.evalFn(env);
        return cVal ? 0 : 1;
      }
    };
  }

  if (astNode.type === 'AND') {
    const leftMacro = buildUniversalMacroTree(astNode.left, mode, 'AND');
    const rightMacro = buildUniversalMacroTree(astNode.right, mode, 'AND');

    if (mode === 'nand') {
      // AND (XY) = 2-input NAND followed in series by 1 tied-NAND inverter: ((XY)')' = XY
      return {
        macroType: 'GATE_PLUS_INV',
        mainGate: 'NAND',
        invGate: 'NAND_INV',
        left: leftMacro,
        right: rightMacro,
        interLabel: `(${leftMacro.exprLabel}·${rightMacro.exprLabel})'`,
        exprLabel,
        gateCount: leftMacro.gateCount + rightMacro.gateCount + 2,
        stepDesc: `AND <strong>${leftMacro.exprLabel}</strong> and <strong>${rightMacro.exprLabel}</strong> via NAND + tied-NAND inverter → <code>${exprLabel}</code>`,
        evalFn: (env: Record<string, number>) => {
          const l = leftMacro.evalFn(env);
          const r = rightMacro.evalFn(env);
          const nandOut = !(l && r) ? 1 : 0;
          return !nandOut ? 1 : 0;
        }
      };
    } else if (mode === 'nor') {
      // AND (XY) = Two tied-NOR inverters on inputs feeding 1 2-input NOR: ((X') + (Y'))' = XY
      return {
        macroType: 'TWO_INV_PLUS_GATE',
        invGate: 'NOR_INV',
        mainGate: 'NOR',
        left: leftMacro,
        right: rightMacro,
        exprLabel,
        gateCount: leftMacro.gateCount + rightMacro.gateCount + 3,
        stepDesc: `AND <strong>${leftMacro.exprLabel}</strong> and <strong>${rightMacro.exprLabel}</strong> via 2 tied-NOR input inverters + NOR gate → <code>${exprLabel}</code>`,
        evalFn: (env: Record<string, number>) => {
          const lInv = !leftMacro.evalFn(env) ? 1 : 0;
          const rInv = !rightMacro.evalFn(env) ? 1 : 0;
          return !(lInv || rInv) ? 1 : 0;
        }
      };
    } else if (mode === 'nand_opt') {
      if (parentOp === 'OR') {
        return {
          macroType: 'SIMPLE_2GATE',
          mainGate: 'NAND',
          left: leftMacro,
          right: rightMacro,
          exprLabel: `(${exprLabel})'`,
          trueExprLabel: exprLabel,
          isBubbleCanceled: true,
          gateCount: leftMacro.gateCount + rightMacro.gateCount + 1,
          stepDesc: `2-Level NAND: Synthesize <strong>(${exprLabel})'</strong> with 1 NAND gate (intermediate inversion cancels at OR stage)`,
          evalFn: (env: Record<string, number>) => {
            const l = leftMacro.evalFn(env);
            const r = rightMacro.evalFn(env);
            return !(l && r) ? 1 : 0;
          }
        };
      } else {
        return {
          macroType: 'GATE_PLUS_INV',
          mainGate: 'NAND',
          invGate: 'NAND_INV',
          left: leftMacro,
          right: rightMacro,
          exprLabel,
          gateCount: leftMacro.gateCount + rightMacro.gateCount + 2,
          stepDesc: `AND <strong>${leftMacro.exprLabel}</strong> and <strong>${rightMacro.exprLabel}</strong> via NAND + tied-NAND inverter → <code>${exprLabel}</code>`,
          evalFn: (env: Record<string, number>) => {
            const l = leftMacro.evalFn(env);
            const r = rightMacro.evalFn(env);
            const nandOut = !(l && r) ? 1 : 0;
            return !nandOut ? 1 : 0;
          }
        };
      }
    } else {
      // Standard Mode
      return {
        macroType: 'SIMPLE_2GATE',
        mainGate: 'AND',
        left: leftMacro,
        right: rightMacro,
        exprLabel,
        gateCount: leftMacro.gateCount + rightMacro.gateCount + 1,
        stepDesc: `AND <strong>${leftMacro.exprLabel}</strong> and <strong>${rightMacro.exprLabel}</strong> using standard AND gate → <code>${exprLabel}</code>`,
        evalFn: (env: Record<string, number>) => (leftMacro.evalFn(env) && rightMacro.evalFn(env) ? 1 : 0)
      };
    }
  }

  if (astNode.type === 'OR') {
    const leftMacro = buildUniversalMacroTree(astNode.left, mode, 'OR');
    const rightMacro = buildUniversalMacroTree(astNode.right, mode, 'OR');

    if (mode === 'nand') {
      // OR (X+Y) = Two tied-NAND inverters on inputs feeding 1 2-input NAND: ((X')·(Y'))' = X + Y
      return {
        macroType: 'TWO_INV_PLUS_GATE',
        invGate: 'NAND_INV',
        mainGate: 'NAND',
        left: leftMacro,
        right: rightMacro,
        exprLabel,
        gateCount: leftMacro.gateCount + rightMacro.gateCount + 3,
        stepDesc: `OR <strong>${leftMacro.exprLabel}</strong> and <strong>${rightMacro.exprLabel}</strong> via 2 tied-NAND input inverters + NAND gate → <code>${exprLabel}</code>`,
        evalFn: (env: Record<string, number>) => {
          const lInv = !leftMacro.evalFn(env) ? 1 : 0;
          const rInv = !rightMacro.evalFn(env) ? 1 : 0;
          return !(lInv && rInv) ? 1 : 0;
        }
      };
    } else if (mode === 'nor') {
      // OR (X+Y) = 2-input NOR followed in series by 1 tied-NOR inverter: ((X+Y)')' = X + Y
      return {
        macroType: 'GATE_PLUS_INV',
        mainGate: 'NOR',
        invGate: 'NOR_INV',
        left: leftMacro,
        right: rightMacro,
        exprLabel,
        gateCount: leftMacro.gateCount + rightMacro.gateCount + 2,
        stepDesc: `OR <strong>${leftMacro.exprLabel}</strong> and <strong>${rightMacro.exprLabel}</strong> via NOR + tied-NOR inverter → <code>${exprLabel}</code>`,
        evalFn: (env: Record<string, number>) => {
          const l = leftMacro.evalFn(env);
          const r = rightMacro.evalFn(env);
          const norOut = !(l || r) ? 1 : 0;
          return !norOut ? 1 : 0;
        }
      };
    } else if (mode === 'nand_opt') {
      const leftPreInverted = leftMacro.isBubbleCanceled === true;
      const rightPreInverted = rightMacro.isBubbleCanceled === true;

      return {
        macroType: 'OPT_OR_NAND',
        left: leftMacro,
        right: rightMacro,
        leftNeedsInv: !leftPreInverted,
        rightNeedsInv: !rightPreInverted,
        exprLabel,
        gateCount:
          leftMacro.gateCount +
          rightMacro.gateCount +
          1 +
          (!leftPreInverted ? 1 : 0) +
          (!rightPreInverted ? 1 : 0),
        stepDesc: `2-Level NAND Stage: Merge terms into <code>${exprLabel}</code> (canceling back-to-back inversions)`,
        evalFn: (env: Record<string, number>) => {
          const lVal = leftPreInverted ? leftMacro.evalFn(env) : (!leftMacro.evalFn(env) ? 1 : 0);
          const rVal = rightPreInverted ? rightMacro.evalFn(env) : (!rightMacro.evalFn(env) ? 1 : 0);
          return !(lVal && rVal) ? 1 : 0;
        }
      };
    } else {
      // Standard Mode
      return {
        macroType: 'SIMPLE_2GATE',
        mainGate: 'OR',
        left: leftMacro,
        right: rightMacro,
        exprLabel,
        gateCount: leftMacro.gateCount + rightMacro.gateCount + 1,
        stepDesc: `OR <strong>${leftMacro.exprLabel}</strong> and <strong>${rightMacro.exprLabel}</strong> using standard OR gate → <code>${exprLabel}</code>`,
        evalFn: (env: Record<string, number>) => (leftMacro.evalFn(env) || rightMacro.evalFn(env) ? 1 : 0)
      };
    }
  }

  throw new Error('Unsupported AST node');
}

export function assignCoordinates(rootMacro: MacroNode, busRightX: number): { maxX: number; maxY: number } {
  let currentLeafY = 64;
  const leafRowSpacing = 48; // Generous vertical space between leaf tap lines

  function layoutNode(node: MacroNode) {
    if (node.macroType === 'BUS_TAP') {
      node.outY = currentLeafY;
      node.outX = busRightX;
      currentLeafY += leafRowSpacing;
      return;
    }

    if (node.macroType === 'SINGLE_INV') {
      if (node.child) layoutNode(node.child);
      const childY = node.child?.outY ?? 64;
      const childX = node.child?.outX ?? busRightX;
      node.inY = childY;
      node.outY = childY;
      node.x = Math.max(busRightX + 48, childX + 54);
      node.width = 50;
      node.outX = node.x + node.width;
      return;
    }

    if (node.macroType === 'SIMPLE_2GATE') {
      if (node.left) layoutNode(node.left);
      if (node.right) layoutNode(node.right);
      const leftY = node.left?.outY ?? 64;
      const rightY = node.right?.outY ?? 64;
      const leftX = node.left?.outX ?? busRightX;
      const rightX = node.right?.outX ?? busRightX;

      node.outY = (leftY + rightY) / 2;
      node.x = Math.max(busRightX + 58, Math.max(leftX, rightX) + 68);
      node.width = 48;
      node.outX = node.x + node.width;
      return;
    }

    if (node.macroType === 'GATE_PLUS_INV') {
      if (node.left) layoutNode(node.left);
      if (node.right) layoutNode(node.right);
      const leftY = node.left?.outY ?? 64;
      const rightY = node.right?.outY ?? 64;
      const leftX = node.left?.outX ?? busRightX;
      const rightX = node.right?.outX ?? busRightX;

      node.outY = (leftY + rightY) / 2;
      node.x = Math.max(busRightX + 58, Math.max(leftX, rightX) + 68);
      node.width = 118; // 2-input gate (46px) + wire (22px) + tied inverter (50px)
      node.outX = node.x + node.width;
      return;
    }

    if (node.macroType === 'TWO_INV_PLUS_GATE' || node.macroType === 'OPT_OR_NAND') {
      if (node.left) layoutNode(node.left);
      if (node.right) layoutNode(node.right);
      const leftY = node.left?.outY ?? 64;
      const rightY = node.right?.outY ?? 64;
      const leftX = node.left?.outX ?? busRightX;
      const rightX = node.right?.outX ?? busRightX;

      const midY = (leftY + rightY) / 2;
      node.outY = midY;
      node.x = Math.max(busRightX + 58, Math.max(leftX, rightX) + 68);
      node.width = 126;
      node.outX = node.x + node.width;
      return;
    }
  }

  layoutNode(rootMacro);
  return {
    maxX: (rootMacro.outX ?? 600) + 210,
    maxY: Math.max(currentLeafY + 40, 360)
  };
}
