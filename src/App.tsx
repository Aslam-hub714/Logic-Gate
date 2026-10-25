import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Header } from './components/Header';
import { CircuitViewer } from './components/CircuitViewer';
import { TruthTable } from './components/TruthTable';
import { SynthesisBreakdown } from './components/SynthesisBreakdown';
import { BooleanParser, astToString, evalAst, collectVars } from './utils/booleanParser';
import { computeMinimalSOP } from './utils/quineMcCluskey';
import { buildUniversalMacroTree, assignCoordinates } from './utils/synthesizer';
import { AstNode, MacroNode, SynthesisMode, TruthTableRow } from './types/logic';
import { Wand2, ArrowRight, Minimize2, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [expression, setExpression] = useState<string>("AB+ABC'+B'C");
  const [activeExpr, setActiveExpr] = useState<string>("AB+ABC'+B'C");
  const [preset, setPreset] = useState<string>("AB+ABC'+B'C");
  const [mode, setMode] = useState<SynthesisMode>('nand');
  const [isMonochrome, setIsMonochrome] = useState<boolean>(true);
  const [inputStates, setInputStates] = useState<Record<string, number>>({
    A: 1,
    B: 0,
    C: 1,
    D: 0,
  });

  // Synthesize circuit whenever activeExpr or mode changes
  const { ast, formattedExpr, variables, minimalExpr, macroRoot, steps, totalGates } = useMemo(() => {
    try {
      const parser = new BooleanParser(activeExpr || "A");
      const parsedAst: AstNode = parser.parse();
      const fmt = astToString(parsedAst);

      const varSet = collectVars(parsedAst);
      let vars = Array.from(varSet).sort();
      if (vars.length === 0) vars = ['A', 'B', 'C'];

      const minSop = computeMinimalSOP(parsedAst, vars);

      // Collect steps
      const stepList: string[] = [];
      const rootMacro: MacroNode = buildUniversalMacroTree(parsedAst, mode, null);

      function gatherSteps(node: MacroNode) {
        if (!node) return;
        if (node.child) gatherSteps(node.child);
        if (node.left) gatherSteps(node.left);
        if (node.right) gatherSteps(node.right);
        if (node.stepDesc) {
          stepList.push(node.stepDesc);
        }
      }
      gatherSteps(rootMacro);

      // Compute coordinates
      const busStartX = 46;
      const busSpacing = 44;
      const busRightX = busStartX + Math.max(0, vars.length - 1) * busSpacing;
      assignCoordinates(rootMacro, busRightX);

      return {
        ast: parsedAst,
        formattedExpr: fmt,
        variables: vars,
        minimalExpr: minSop,
        macroRoot: rootMacro,
        steps: stepList,
        totalGates: rootMacro.gateCount,
      };
    } catch (e) {
      console.error(e);
      const fallbackAst: AstNode = { type: 'VAR', val: 'A' };
      const fallbackMacro = buildUniversalMacroTree(fallbackAst, mode, null);
      assignCoordinates(fallbackMacro, 46);
      return {
        ast: fallbackAst,
        formattedExpr: 'A',
        variables: ['A'],
        minimalExpr: 'A',
        macroRoot: fallbackMacro,
        steps: [],
        totalGates: 0,
      };
    }
  }, [activeExpr, mode]);

  // Ensure inputStates has entries for all active variables
  useEffect(() => {
    setInputStates(prev => {
      const next = { ...prev };
      let changed = false;
      variables.forEach(v => {
        if (next[v] === undefined) {
          next[v] = 0;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [variables]);

  // Compute truth table
  const { truthTableRows, matchPercentage } = useMemo(() => {
    if (!ast || !macroRoot) return { truthTableRows: [], matchPercentage: 100 };

    const n = variables.length;
    const totalRows = 1 << Math.min(n, 6); // Up to 64 rows
    let matchCount = 0;
    const rows: TruthTableRow[] = [];

    for (let r = 0; r < totalRows; r++) {
      const env: Record<string, number> = {};
      let isActiveRow = true;

      variables.forEach((v, idx) => {
        const bit = (r >> (n - 1 - idx)) & 1;
        env[v] = bit;
        if ((inputStates[v] ?? 0) !== bit) {
          isActiveRow = false;
        }
      });

      const formulaOut = evalAst(ast, env);
      const circuitOut = macroRoot.evalFn(env);
      const isMatch = formulaOut === circuitOut;
      if (isMatch) matchCount++;

      rows.push({
        inputs: env,
        formulaOut,
        circuitOut,
        isMatch,
        isActive: isActiveRow,
      });
    }

    const pct = totalRows > 0 ? Math.round((matchCount / totalRows) * 100) : 100;
    return { truthTableRows: rows, matchPercentage: pct };
  }, [ast, macroRoot, variables, inputStates]);

  const handleSynthesize = useCallback(() => {
    setActiveExpr(expression.trim() || 'A');
  }, [expression]);

  const handlePresetChange = useCallback((val: string) => {
    setPreset(val);
    setExpression(val);
    setActiveExpr(val);
  }, []);

  const handleDrawMinimal = useCallback(() => {
    if (minimalExpr) {
      setExpression(minimalExpr);
      setActiveExpr(minimalExpr);
    }
  }, [minimalExpr]);

  const handleQuickInsert = useCallback((tok: string) => {
    setExpression(prev => prev + tok);
  }, []);

  const handleToggleInput = useCallback((v: string) => {
    setInputStates(prev => ({
      ...prev,
      [v]: prev[v] ? 0 : 1,
    }));
  }, []);

  const handleSelectTableRow = useCallback((inputs: Record<string, number>) => {
    setInputStates(prev => ({ ...prev, ...inputs }));
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-800">
      {/* Top Header & Formula Bar */}
      <Header
        expression={expression}
        onExpressionChange={setExpression}
        onSynthesize={handleSynthesize}
        mode={mode}
        onModeChange={setMode}
        preset={preset}
        onPresetChange={handlePresetChange}
        onQuickInsert={handleQuickInsert}
      />

      {/* Main Workspace */}
      <main className="max-w-7xl w-full mx-auto p-4 sm:p-6 flex-1 flex flex-col gap-5">
        {/* Boolean Simplification Analysis Banner */}
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center flex-wrap gap-3 text-xs">
            <span className="font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Wand2 className="w-3.5 h-3.5 text-sky-600" />
              Boolean Analysis:
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Input Formula:</span>
              <code className="code-font font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                F = {formattedExpr}
              </code>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Minimal SOP Form:</span>
              <code className="code-font font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                F = {minimalExpr}
              </code>
            </div>
          </div>
          <button
            onClick={handleDrawMinimal}
            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs flex items-center gap-1.5 shrink-0"
          >
            <Minimize2 className="w-3 h-3" />
            <span>Draw Minimal Circuit</span>
          </button>
        </div>

        {/* Academic Lecture Slide Schematic Viewport */}
        <CircuitViewer
          macroRoot={macroRoot}
          variables={variables}
          inputStates={inputStates}
          onToggleInput={handleToggleInput}
          synthesisMode={mode}
          formulaStr={formattedExpr}
          isMonochrome={isMonochrome}
          onToggleMonochrome={() => setIsMonochrome(prev => !prev)}
          totalGates={totalGates}
          matchPercentage={matchPercentage}
        />

        {/* Bottom Dual Panels: Truth Table & Synthesis Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Truth Table */}
          <div className="lg:col-span-5">
            <TruthTable
              rows={truthTableRows}
              variables={variables}
              formulaStr={formattedExpr}
              onSelectRow={handleSelectTableRow}
            />
          </div>

          {/* Synthesis Breakdown & Educational Rules */}
          <div className="lg:col-span-7">
            <SynthesisBreakdown
              steps={steps}
              mode={mode}
              totalGates={totalGates}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
