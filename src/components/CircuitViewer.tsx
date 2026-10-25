import React, { useRef, useState } from 'react';
import { MacroNode, SynthesisMode } from '../types/logic';
import { ZoomIn, ZoomOut, RotateCcw, Download, FileCode, CheckCircle2 } from 'lucide-react';

interface CircuitViewerProps {
  macroRoot: MacroNode | null;
  variables: string[];
  inputStates: Record<string, number>;
  onToggleInput: (v: string) => void;
  synthesisMode: SynthesisMode;
  formulaStr: string;
  isMonochrome: boolean;
  onToggleMonochrome: () => void;
  totalGates: number;
  matchPercentage: number;
}

export const CircuitViewer: React.FC<CircuitViewerProps> = ({
  macroRoot,
  variables,
  inputStates,
  onToggleInput,
  synthesisMode,
  formulaStr,
  isMonochrome,
  onToggleMonochrome,
  totalGates,
  matchPercentage,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  const getWireColor = (val: number | undefined) => {
    if (isMonochrome) return '#0f172a';
    return val ? '#059669' : '#64748b';
  };

  const busStartX = 46;
  const busSpacing = 44;
  const busRightX = busStartX + Math.max(0, variables.length - 1) * busSpacing;

  const legendWidth = 250;
  const contentMaxX = (macroRoot?.outX ?? 650) + 190;
  const totalSvgWidth = Math.max(920, contentMaxX + legendWidth + 40);
  const totalSvgHeight = Math.max(400, (macroRoot?.outY ?? 200) + 200);

  const busMap: Record<string, number> = {};
  variables.forEach((v, idx) => {
    busMap[v] = busStartX + idx * busSpacing;
  });

  const exportSvg = () => {
    if (!svgRef.current) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgRef.current);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logic-circuit-${synthesisMode}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPng = () => {
    if (!svgRef.current) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgRef.current);
    const img = new Image();
    const svgBlob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = 2; // High-DPI export
      canvas.width = totalSvgWidth * scale;
      canvas.height = totalSvgHeight * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);

      const pngUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = `logic-circuit-${synthesisMode}.png`;
      a.click();
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  // Helper rendering for IEEE gate primitives
  const renderGate = (
    type: 'AND' | 'OR' | 'NAND' | 'NOR' | 'NOT',
    x: number,
    centerY: number,
    signalVal = 0,
    scale = 1
  ) => {
    const w = 36 * scale;
    const h = 28 * scale;
    const topY = centerY - h / 2;
    const stroke = getWireColor(signalVal);

    if (type === 'AND' || type === 'NAND') {
      const d = `M 0,0 L ${w * 0.52},0 A ${h / 2},${h / 2} 0 0,1 ${w * 0.52},${h} L 0,${h} Z`;
      let outTipX = w * 0.52 + h / 2;
      const r = 3.3 * scale;

      return {
        element: (
          <g key={`gate-${x}-${centerY}-${type}`} transform={`translate(${x}, ${topY})`}>
            <path
              d={d}
              fill="#ffffff"
              stroke={stroke}
              strokeWidth={1.95}
              strokeLinejoin="round"
            />
            {type === 'NAND' && (
              <circle
                cx={outTipX + r}
                cy={h / 2}
                r={r}
                fill="#ffffff"
                stroke={stroke}
                strokeWidth={1.95}
              />
            )}
          </g>
        ),
        pins: {
          inX: x,
          inTopY: centerY - 6 * scale,
          inBotY: centerY + 6 * scale,
          inY: centerY,
          outX: x + outTipX + (type === 'NAND' ? r * 2 : 0),
          outY: centerY,
        },
      };
    }

    if (type === 'OR' || type === 'NOR') {
      const d = `M 0,0 Q ${w * 0.26},${h * 0.5} 0,${h} Q ${w * 0.62},${h} ${w * 0.88},${h * 0.5} Q ${w * 0.62},0 0,0 Z`;
      let outTipX = w * 0.88;
      const r = 3.3 * scale;

      return {
        element: (
          <g key={`gate-${x}-${centerY}-${type}`} transform={`translate(${x}, ${topY})`}>
            <path
              d={d}
              fill="#ffffff"
              stroke={stroke}
              strokeWidth={1.95}
              strokeLinejoin="round"
            />
            {type === 'NOR' && (
              <circle
                cx={outTipX + r}
                cy={h / 2}
                r={r}
                fill="#ffffff"
                stroke={stroke}
                strokeWidth={1.95}
              />
            )}
          </g>
        ),
        pins: {
          inX: x + 3 * scale,
          inTopY: centerY - 6 * scale,
          inBotY: centerY + 6 * scale,
          inY: centerY,
          outX: x + outTipX + (type === 'NOR' ? r * 2 : 0),
          outY: centerY,
        },
      };
    }

    // Standard NOT gate
    const d = `M 0,0 L ${w * 0.72},${h * 0.5} L 0,${h} Z`;
    const r = 3.3 * scale;
    return {
      element: (
        <g key={`gate-${x}-${centerY}-NOT`} transform={`translate(${x}, ${topY})`}>
          <path d={d} fill="#ffffff" stroke={stroke} strokeWidth={1.95} strokeLinejoin="round" />
          <circle
            cx={w * 0.72 + r}
            cy={h / 2}
            r={r}
            fill="#ffffff"
            stroke={stroke}
            strokeWidth={1.95}
          />
        </g>
      ),
      pins: {
        inX: x,
        inTopY: centerY,
        inBotY: centerY,
        inY: centerY,
        outX: x + w * 0.72 + r * 2,
        outY: centerY,
      },
    };
  };

  // Tied-input Inverter with standard U-bracket tying the two input pins together
  const renderTiedInverter = (
    invType: string,
    x: number,
    centerY: number,
    signalVal = 0,
    scale = 1
  ) => {
    if (invType === 'NOT') {
      return renderGate('NOT', x, centerY, signalVal, scale);
    }
    const baseGate: 'NAND' | 'NOR' = invType === 'NOR_INV' ? 'NOR' : 'NAND';
    const bracketWidth = 8 * scale;
    const gateRes = renderGate(baseGate, x + bracketWidth, centerY, signalVal, scale);
    const stroke = getWireColor(signalVal);

    const bracketPath = `M ${gateRes.pins.inX},${gateRes.pins.inTopY} L ${x},${gateRes.pins.inTopY} L ${x},${gateRes.pins.inBotY} L ${gateRes.pins.inX},${gateRes.pins.inBotY}`;

    const element = (
      <g key={`tied-${x}-${centerY}-${invType}`}>
        {gateRes.element}
        <path
          d={bracketPath}
          fill="none"
          stroke={stroke}
          strokeWidth={1.85}
          strokeLinejoin="miter"
        />
      </g>
    );

    return {
      element,
      pins: {
        inX: x,
        inY: centerY,
        inTopY: centerY,
        inBotY: centerY,
        outX: gateRes.pins.outX,
        outY: centerY,
      },
    };
  };

  // Orthogonal Manhattan Wire
  const renderWire = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    jogX?: number,
    signalVal = 0,
    key = ''
  ) => {
    const stroke = getWireColor(signalVal);
    let d = '';
    if (Math.abs(y1 - y2) < 0.5) {
      d = `M ${x1},${y1} L ${x2},${y2}`;
    } else {
      const midX = jogX !== undefined ? jogX : (x1 + x2) / 2;
      d = `M ${x1},${y1} L ${midX},${y1} L ${midX},${y2} L ${x2},${y2}`;
    }

    return (
      <path
        key={key || `wire-${x1}-${y1}-${x2}-${y2}`}
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth={1.9}
        strokeLinejoin="miter"
        strokeLinecap="square"
      />
    );
  };

  // Expression label above wire with crisp halo
  const renderWireLabel = (
    text: string,
    x: number,
    wireY: number,
    isFinal = false,
    key = ''
  ) => {
    return (
      <text
        key={key || `lbl-${x}-${wireY}-${text}`}
        x={x}
        y={isFinal ? wireY + 5 : wireY - 8}
        fill="#0f172a"
        fontSize={isFinal ? '15.5' : '13'}
        fontWeight="700"
        fontFamily="'Plus Jakarta Sans', sans-serif"
        className="wire-label"
      >
        {text}
      </text>
    );
  };

  // Recursive macro renderer
  const elementsList: React.ReactNode[] = [];

  const traverseMacroTree = (node: MacroNode, isRoot = false) => {
    if (node.macroType === 'BUS_TAP') {
      const railX = busMap[node.varName || 'A'] ?? 40;
      const val = node.evalFn(inputStates);
      node.actualOutX = railX;
      node.actualOutY = node.outY;
      node.val = val;

      // Solder junction dot on vertical variable rail
      elementsList.push(
        <circle
          key={`dot-${railX}-${node.outY}`}
          cx={railX}
          cy={node.outY}
          r={3.4}
          fill={getWireColor(val)}
        />
      );
      return;
    }

    if (node.macroType === 'SINGLE_INV') {
      if (node.child) traverseMacroTree(node.child, false);
      const inVal = node.child?.val ?? 0;
      const outVal = node.evalFn(inputStates);

      const invRes = renderTiedInverter(
        node.gateType || 'NAND_INV',
        node.x ?? 100,
        node.outY ?? 100,
        outVal
      );
      elementsList.push(invRes.element);

      // Wire from child out to inverter input
      elementsList.push(
        renderWire(
          node.child?.actualOutX ?? 0,
          node.child?.actualOutY ?? 0,
          invRes.pins.inX,
          invRes.pins.inY,
          invRes.pins.inX - 14,
          inVal,
          `wire-to-inv-${node.x}-${node.outY}`
        )
      );

      // Output stub wire
      const stubEndX = invRes.pins.outX + (isRoot ? 40 : 26);
      elementsList.push(
        renderWire(
          invRes.pins.outX,
          invRes.pins.outY,
          stubEndX,
          invRes.pins.outY,
          stubEndX,
          outVal,
          `wire-stub-inv-${node.x}-${node.outY}`
        )
      );

      elementsList.push(
        renderWireLabel(
          isRoot ? `F = ${node.exprLabel}` : node.exprLabel,
          isRoot ? stubEndX + 10 : invRes.pins.outX + 5,
          invRes.pins.outY,
          isRoot,
          `label-inv-${node.x}-${node.outY}`
        )
      );

      node.actualOutX = stubEndX;
      node.actualOutY = invRes.pins.outY;
      node.val = outVal;
      return;
    }

    if (node.macroType === 'SIMPLE_2GATE') {
      if (node.left) traverseMacroTree(node.left, false);
      if (node.right) traverseMacroTree(node.right, false);
      const outVal = node.evalFn(inputStates);

      const gateRes = renderGate(
        node.mainGate || 'AND',
        node.x ?? 150,
        node.outY ?? 100,
        outVal
      );
      elementsList.push(gateRes.element);

      const jogTopX = gateRes.pins.inX - 24;
      const jogBotX = gateRes.pins.inX - 12;

      elementsList.push(
        renderWire(
          node.left?.actualOutX ?? 0,
          node.left?.actualOutY ?? 0,
          gateRes.pins.inX,
          gateRes.pins.inTopY,
          jogTopX,
          node.left?.val ?? 0,
          `wire-left-simple-${node.x}-${node.outY}`
        )
      );

      elementsList.push(
        renderWire(
          node.right?.actualOutX ?? 0,
          node.right?.actualOutY ?? 0,
          gateRes.pins.inX,
          gateRes.pins.inBotY,
          jogBotX,
          node.right?.val ?? 0,
          `wire-right-simple-${node.x}-${node.outY}`
        )
      );

      const stubEndX = gateRes.pins.outX + (isRoot ? 40 : 28);
      elementsList.push(
        renderWire(
          gateRes.pins.outX,
          gateRes.pins.outY,
          stubEndX,
          gateRes.pins.outY,
          stubEndX,
          outVal,
          `wire-stub-simple-${node.x}-${node.outY}`
        )
      );

      elementsList.push(
        renderWireLabel(
          isRoot ? `F = ${node.exprLabel}` : node.exprLabel,
          isRoot ? stubEndX + 10 : gateRes.pins.outX + 5,
          gateRes.pins.outY,
          isRoot,
          `label-simple-${node.x}-${node.outY}`
        )
      );

      node.actualOutX = stubEndX;
      node.actualOutY = gateRes.pins.outY;
      node.val = outVal;
      return;
    }

    if (node.macroType === 'GATE_PLUS_INV') {
      if (node.left) traverseMacroTree(node.left, false);
      if (node.right) traverseMacroTree(node.right, false);
      const outVal = node.evalFn(inputStates);
      const midVal = outVal ? 0 : 1;

      const firstGate = renderGate(
        node.mainGate || 'NAND',
        node.x ?? 150,
        node.outY ?? 100,
        midVal
      );
      elementsList.push(firstGate.element);

      const jogTopX = firstGate.pins.inX - 24;
      const jogBotX = firstGate.pins.inX - 12;

      elementsList.push(
        renderWire(
          node.left?.actualOutX ?? 0,
          node.left?.actualOutY ?? 0,
          firstGate.pins.inX,
          firstGate.pins.inTopY,
          jogTopX,
          node.left?.val ?? 0,
          `wire-left-gpi-${node.x}-${node.outY}`
        )
      );

      elementsList.push(
        renderWire(
          node.right?.actualOutX ?? 0,
          node.right?.actualOutY ?? 0,
          firstGate.pins.inX,
          firstGate.pins.inBotY,
          jogBotX,
          node.right?.val ?? 0,
          `wire-right-gpi-${node.x}-${node.outY}`
        )
      );

      const invX = firstGate.pins.outX + 18;
      const secondInv = renderTiedInverter(
        node.invGate || 'NAND_INV',
        invX,
        node.outY ?? 100,
        outVal
      );
      elementsList.push(secondInv.element);

      elementsList.push(
        renderWire(
          firstGate.pins.outX,
          firstGate.pins.outY,
          secondInv.pins.inX,
          secondInv.pins.inY,
          secondInv.pins.inX,
          midVal,
          `wire-mid-gpi-${node.x}-${node.outY}`
        )
      );

      const stubEndX = secondInv.pins.outX + (isRoot ? 40 : 28);
      elementsList.push(
        renderWire(
          secondInv.pins.outX,
          secondInv.pins.outY,
          stubEndX,
          secondInv.pins.outY,
          stubEndX,
          outVal,
          `wire-stub-gpi-${node.x}-${node.outY}`
        )
      );

      elementsList.push(
        renderWireLabel(
          isRoot ? `F = ${node.exprLabel}` : node.exprLabel,
          isRoot ? stubEndX + 10 : secondInv.pins.outX + 5,
          secondInv.pins.outY,
          isRoot,
          `label-gpi-${node.x}-${node.outY}`
        )
      );

      node.actualOutX = stubEndX;
      node.actualOutY = secondInv.pins.outY;
      node.val = outVal;
      return;
    }

    if (node.macroType === 'TWO_INV_PLUS_GATE') {
      if (node.left) traverseMacroTree(node.left, false);
      if (node.right) traverseMacroTree(node.right, false);
      const outVal = node.evalFn(inputStates);

      const leftY = node.left?.actualOutY ?? (node.outY ?? 100);
      const rightY = node.right?.actualOutY ?? (node.outY ?? 100);
      const rawDiff = Math.abs(rightY - leftY);
      const topInvY = rawDiff >= 36 ? Math.min(leftY, (node.outY ?? 100) - 18) : (node.outY ?? 100) - 19;
      const botInvY = rawDiff >= 36 ? Math.max(rightY, (node.outY ?? 100) + 18) : (node.outY ?? 100) + 19;

      const topInvVal = (node.left?.val ?? 0) ? 0 : 1;
      const botInvVal = (node.right?.val ?? 0) ? 0 : 1;

      const topInv = renderTiedInverter(node.invGate || 'NAND_INV', node.x ?? 150, topInvY, topInvVal);
      const botInv = renderTiedInverter(node.invGate || 'NAND_INV', node.x ?? 150, botInvY, botInvVal);
      elementsList.push(topInv.element);
      elementsList.push(botInv.element);

      elementsList.push(
        renderWire(
          node.left?.actualOutX ?? 0,
          node.left?.actualOutY ?? 0,
          topInv.pins.inX,
          topInv.pins.inY,
          topInv.pins.inX - 22,
          node.left?.val ?? 0,
          `wire-top-tipg-${node.x}-${topInvY}`
        )
      );

      elementsList.push(
        renderWire(
          node.right?.actualOutX ?? 0,
          node.right?.actualOutY ?? 0,
          botInv.pins.inX,
          botInv.pins.inY,
          botInv.pins.inX - 11,
          node.right?.val ?? 0,
          `wire-bot-tipg-${node.x}-${botInvY}`
        )
      );

      const mainGateX = Math.max(topInv.pins.outX, botInv.pins.outX) + 24;
      const mainGate = renderGate(node.mainGate || 'NAND', mainGateX, node.outY ?? 100, outVal);
      elementsList.push(mainGate.element);

      elementsList.push(
        renderWire(
          topInv.pins.outX,
          topInv.pins.outY,
          mainGate.pins.inX,
          mainGate.pins.inTopY,
          mainGate.pins.inX - 12,
          topInvVal,
          `wire-top-to-main-${node.x}-${topInvY}`
        )
      );

      elementsList.push(
        renderWire(
          botInv.pins.outX,
          botInv.pins.outY,
          mainGate.pins.inX,
          mainGate.pins.inBotY,
          mainGate.pins.inX - 12,
          botInvVal,
          `wire-bot-to-main-${node.x}-${botInvY}`
        )
      );

      const stubEndX = mainGate.pins.outX + (isRoot ? 40 : 28);
      elementsList.push(
        renderWire(
          mainGate.pins.outX,
          mainGate.pins.outY,
          stubEndX,
          mainGate.pins.outY,
          stubEndX,
          outVal,
          `wire-stub-tipg-${node.x}-${node.outY}`
        )
      );

      elementsList.push(
        renderWireLabel(
          isRoot ? `F = ${node.exprLabel}` : node.exprLabel,
          isRoot ? stubEndX + 10 : mainGate.pins.outX + 5,
          mainGate.pins.outY,
          isRoot,
          `label-tipg-${node.x}-${node.outY}`
        )
      );

      node.actualOutX = stubEndX;
      node.actualOutY = mainGate.pins.outY;
      node.val = outVal;
      return;
    }

    if (node.macroType === 'OPT_OR_NAND') {
      if (node.left) traverseMacroTree(node.left, false);
      if (node.right) traverseMacroTree(node.right, false);
      const outVal = node.evalFn(inputStates);

      let leftOutX = node.left?.actualOutX ?? 0;
      const leftOutY = node.left?.actualOutY ?? 0;
      let leftSignal = node.left?.val ?? 0;

      let rightOutX = node.right?.actualOutX ?? 0;
      const rightOutY = node.right?.actualOutY ?? 0;
      let rightSignal = node.right?.val ?? 0;

      if (node.leftNeedsInv) {
        const topInv = renderTiedInverter('NAND_INV', node.x ?? 150, leftOutY, !leftSignal ? 1 : 0);
        elementsList.push(topInv.element);
        elementsList.push(
          renderWire(
            leftOutX,
            leftOutY,
            topInv.pins.inX,
            topInv.pins.inY,
            topInv.pins.inX - 14,
            leftSignal,
            `opt-top-inv-wire-${node.x}-${leftOutY}`
          )
        );
        leftOutX = topInv.pins.outX;
        leftSignal = !leftSignal ? 1 : 0;
      }

      if (node.rightNeedsInv) {
        const botInv = renderTiedInverter('NAND_INV', node.x ?? 150, rightOutY, !rightSignal ? 1 : 0);
        elementsList.push(botInv.element);
        elementsList.push(
          renderWire(
            rightOutX,
            rightOutY,
            botInv.pins.inX,
            botInv.pins.inY,
            botInv.pins.inX - 14,
            rightSignal,
            `opt-bot-inv-wire-${node.x}-${rightOutY}`
          )
        );
        rightOutX = botInv.pins.outX;
        rightSignal = !rightSignal ? 1 : 0;
      }

      const mainGateX = Math.max(leftOutX, rightOutX) + 28;
      const mainGate = renderGate('NAND', mainGateX, node.outY ?? 100, outVal);
      elementsList.push(mainGate.element);

      elementsList.push(
        renderWire(
          leftOutX,
          leftOutY,
          mainGate.pins.inX,
          mainGate.pins.inTopY,
          mainGate.pins.inX - 20,
          leftSignal,
          `opt-left-wire-${node.x}-${leftOutY}`
        )
      );

      elementsList.push(
        renderWire(
          rightOutX,
          rightOutY,
          mainGate.pins.inX,
          mainGate.pins.inBotY,
          mainGate.pins.inX - 10,
          rightSignal,
          `opt-right-wire-${node.x}-${rightOutY}`
        )
      );

      const stubEndX = mainGate.pins.outX + (isRoot ? 40 : 28);
      elementsList.push(
        renderWire(
          mainGate.pins.outX,
          mainGate.pins.outY,
          stubEndX,
          mainGate.pins.outY,
          stubEndX,
          outVal,
          `opt-stub-wire-${node.x}-${node.outY}`
        )
      );

      elementsList.push(
        renderWireLabel(
          isRoot ? `F = ${node.exprLabel}` : node.exprLabel,
          isRoot ? stubEndX + 10 : mainGate.pins.outX + 5,
          mainGate.pins.outY,
          isRoot,
          `opt-label-${node.x}-${node.outY}`
        )
      );

      node.actualOutX = stubEndX;
      node.actualOutY = mainGate.pins.outY;
      node.val = outVal;
    }
  };

  if (macroRoot) {
    traverseMacroTree(macroRoot, true);
  }

  // Slide reference rules card (Slide 1 for NOR, Slide 2 for NAND)
  const renderSlideReferenceCard = () => {
    const xOffset = totalSvgWidth - legendWidth;
    const uType = synthesisMode === 'nor' ? 'NOR' : 'NAND';
    const uInv = synthesisMode === 'nor' ? 'NOR_INV' : 'NAND_INV';

    const y1 = 38;
    const inv1 = renderTiedInverter(uInv, xOffset + 44, y1, 0, 0.76);

    const y2 = 92;
    const g2 = renderGate(uType, xOffset + 44, y2, 0, 0.76);
    const inv2 = renderTiedInverter(uInv, g2.pins.outX + 14, y2, 0, 0.76);

    const y3 = 152;
    const inv3Top = renderTiedInverter(uInv, xOffset + 40, y3 - 15, 0, 0.72);
    const inv3Bot = renderTiedInverter(uInv, xOffset + 40, y3 + 15, 0, 0.72);
    const g3 = renderGate(uType, inv3Top.pins.outX + 16, y3, 0, 0.76);

    return (
      <g key="legend-card" transform={`translate(0, 24)`}>
        {/* Frame */}
        <rect
          x={xOffset - 12}
          y={-10}
          width={legendWidth - 10}
          height={198}
          rx={8}
          fill="#f8fafc"
          stroke="#e2e8f0"
          strokeWidth={1.2}
        />
        <text
          x={xOffset}
          y={8}
          fill="#475569"
          fontSize="10.5"
          fontWeight="800"
          fontFamily="'Plus Jakarta Sans', sans-serif"
        >
          {synthesisMode === 'nor' ? 'NOR UNIVERSAL RULES (SLIDE 1)' : 'NAND UNIVERSAL RULES (SLIDE 2)'}
        </text>

        {/* Rule 1: NOT */}
        {inv1.element}
        {renderWire(xOffset + 20, y1, inv1.pins.inX, y1, xOffset + 20, 0, 'leg-w1-in')}
        {renderWire(inv1.pins.outX, y1, xOffset + 104, y1, xOffset + 104, 0, 'leg-w1-out')}
        <text x={xOffset + 6} y={y1 + 4} fill="#0f172a" fontSize="12" fontWeight="700">A</text>
        <text x={xOffset + 110} y={y1 + 4} fill="#0f172a" fontSize="12" fontWeight="700">A' (NOT)</text>

        {/* Rule 2: AND / OR via series inverter */}
        {g2.element}
        {inv2.element}
        {renderWire(xOffset + 20, g2.pins.inTopY, g2.pins.inX, g2.pins.inTopY, xOffset + 20, 0, 'leg-w2-top')}
        {renderWire(xOffset + 20, g2.pins.inBotY, g2.pins.inX, g2.pins.inBotY, xOffset + 20, 0, 'leg-w2-bot')}
        {renderWire(g2.pins.outX, y2, inv2.pins.inX, y2, inv2.pins.inX, 0, 'leg-w2-mid')}
        {renderWire(inv2.pins.outX, y2, xOffset + 152, y2, xOffset + 152, 0, 'leg-w2-out')}
        <text x={xOffset + 6} y={g2.pins.inTopY + 3} fill="#0f172a" fontSize="11" fontWeight="700">A</text>
        <text x={xOffset + 6} y={g2.pins.inBotY + 4} fill="#0f172a" fontSize="11" fontWeight="700">B</text>
        <text x={xOffset + 158} y={y2 + 4} fill="#0f172a" fontSize="12" fontWeight="700">
          {synthesisMode === 'nor' ? 'A+B' : 'AB'}
        </text>

        {/* Rule 3: 2 Inverters + Gate */}
        {inv3Top.element}
        {inv3Bot.element}
        {g3.element}
        {renderWire(xOffset + 20, y3 - 15, inv3Top.pins.inX, y3 - 15, xOffset + 20, 0, 'leg-w3-top')}
        {renderWire(xOffset + 20, y3 + 15, inv3Bot.pins.inX, y3 + 15, xOffset + 20, 0, 'leg-w3-bot')}
        {renderWire(inv3Top.pins.outX, y3 - 15, g3.pins.inX, g3.pins.inTopY, g3.pins.inX - 7, 0, 'leg-w3-t-mid')}
        {renderWire(inv3Bot.pins.outX, y3 + 15, g3.pins.inX, g3.pins.inBotY, g3.pins.inX - 7, 0, 'leg-w3-b-mid')}
        {renderWire(g3.pins.outX, y3, xOffset + 152, y3, xOffset + 152, 0, 'leg-w3-out')}
        <text x={xOffset + 6} y={y3 - 11} fill="#0f172a" fontSize="11" fontWeight="700">A</text>
        <text x={xOffset + 6} y={y3 + 19} fill="#0f172a" fontSize="11" fontWeight="700">B</text>
        <text x={xOffset + 158} y={y3 + 4} fill="#0f172a" fontSize="12" fontWeight="700">
          {synthesisMode === 'nor' ? 'AB' : 'A+B'}
        </text>
      </g>
    );
  };

  const modeDisplayName = {
    nand: 'NAND',
    nor: 'NOR',
    nand_opt: '2-Level NAND (Optimized)',
    std: 'Standard Gates (AND/OR/NOT)',
  }[synthesisMode];

  const slidePage = synthesisMode === 'nor' ? 29 : 27;

  return (
    <div className="slide-paper rounded-xl border border-slate-200 overflow-hidden relative flex flex-col">
      {/* Slide Header */}
      <div className="px-6 py-4 flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 bg-white">
        <div>
          <div className="flex items-center space-x-1.5 mb-1.5">
            <span className="w-3 h-3 rounded-full bg-[#ff5f56] inline-block border border-black/10"></span>
            <span className="w-3 h-3 rounded-full bg-[#ffbd2e] inline-block border border-black/10"></span>
            <span className="w-3 h-3 rounded-full bg-[#27c93f] inline-block border border-black/10"></span>
            <span className="text-[11px] text-slate-400 font-mono pl-2">
              University Digital Logic Schematic
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Exercise
          </h2>
          <p className="text-sm sm:text-base font-medium text-slate-800 mt-0.5">
            Use <span className="font-bold text-sky-700">{modeDisplayName}</span> to represent{' '}
            <span className="font-bold code-font">F = {formulaStr}</span>
          </p>
        </div>

        {/* Action Controls & Interactive Bit Switches */}
        <div className="flex flex-col items-end gap-2">
          {/* Zoom & Export bar */}
          <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setZoomLevel(prev => Math.min(prev + 0.15, 2))}
              className="p-1.5 hover:bg-white text-slate-700 rounded transition border border-transparent hover:border-slate-200"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(prev => Math.max(prev - 0.15, 0.6))}
              className="p-1.5 hover:bg-white text-slate-700 rounded transition border border-transparent hover:border-slate-200"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              className="p-1.5 hover:bg-white text-slate-700 rounded transition border border-transparent hover:border-slate-200"
              title="Reset View"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <div className="h-4 w-px bg-slate-300 mx-1"></div>
            <button
              onClick={onToggleMonochrome}
              className={`px-2 py-1 text-xs font-semibold rounded transition border ${
                isMonochrome
                  ? 'bg-slate-200 text-slate-800 border-slate-300'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-300'
              }`}
            >
              {isMonochrome ? 'Monochrome' : 'Live Voltage Colors'}
            </button>
            <div className="h-4 w-px bg-slate-300 mx-1"></div>
            <button
              onClick={exportSvg}
              className="p-1.5 hover:bg-white text-slate-700 rounded transition border border-transparent hover:border-slate-200 flex items-center gap-1 text-xs font-medium"
              title="Download Vector SVG"
            >
              <FileCode className="w-3.5 h-3.5" /> SVG
            </button>
            <button
              onClick={exportPng}
              className="p-1.5 hover:bg-white text-slate-700 rounded transition border border-transparent hover:border-slate-200 flex items-center gap-1 text-xs font-medium"
              title="Export PNG"
            >
              <Download className="w-3.5 h-3.5" /> PNG
            </button>
          </div>

          {/* Live Variable Bit Toggles */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500 mr-1">
              Toggle Inputs:
            </span>
            {variables.map(v => {
              const val = inputStates[v] ?? 0;
              return (
                <button
                  key={`switch-${v}`}
                  onClick={() => onToggleInput(v)}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition border ${
                    val
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                  title={`Click to set ${v} to ${val ? 0 : 1}`}
                >
                  {v} = {val}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main SVG Schematic Canvas */}
      <div className="w-full overflow-x-auto bg-white p-4 sm:p-6 flex justify-center items-start min-h-[440px]">
        <div style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center' }} className="transition-transform duration-150">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${totalSvgWidth} ${totalSvgHeight}`}
            width={totalSvgWidth}
            height={totalSvgHeight}
            className="select-none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Variable Bus Rails */}
            <g id="busRails">
              {variables.map(v => {
                const x = busMap[v];
                const val = inputStates[v] ?? 0;
                return (
                  <g key={`bus-${v}`}>
                    <text
                      x={x}
                      y={26}
                      textAnchor="middle"
                      fill="#0f172a"
                      fontSize="19"
                      fontWeight="800"
                      fontFamily="'Plus Jakarta Sans', sans-serif"
                    >
                      {v}
                    </text>
                    <line
                      x1={x}
                      y1={36}
                      x2={x}
                      y2={totalSvgHeight - 20}
                      stroke={getWireColor(val)}
                      strokeWidth={2.1}
                      strokeLinecap="square"
                    />
                  </g>
                );
              })}
            </g>

            {/* Circuit Elements & Wires */}
            <g id="circuitElements">{elementsList}</g>

            {/* Slide Reference Rules Box */}
            {renderSlideReferenceCard()}
          </svg>
        </div>
      </div>

      {/* Slide Footer */}
      <div className="px-6 py-3 bg-slate-50/70 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 font-mono">
        <div className="flex items-center gap-4">
          <span className="font-semibold text-slate-700">Total Gates Used: {totalGates}</span>
          <span>•</span>
          <span className="text-emerald-700 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 inline text-emerald-600" />
            Truth Table Match: {matchPercentage}%
          </span>
        </div>
        <span className="font-bold text-slate-400">Slide {slidePage}</span>
      </div>
    </div>
  );
};
