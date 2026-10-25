import React from 'react';
import { SynthesisMode } from '../types/logic';
import { Cpu, Play, Wand2 } from 'lucide-react';

interface HeaderProps {
  expression: string;
  onExpressionChange: (val: string) => void;
  onSynthesize: () => void;
  mode: SynthesisMode;
  onModeChange: (m: SynthesisMode) => void;
  preset: string;
  onPresetChange: (val: string) => void;
  onQuickInsert: (tok: string) => void;
}

const PRESETS = [
  { label: "Your Screenshot: AB+ABC'+B'C", value: "AB+ABC'+B'C" },
  { label: "Your PDF Problem: AB'+ABC'+B'C", value: "AB'+ABC'+B'C" },
  { label: "Slide Exercise: A(B+CD)+BC'", value: "A(B+CD)+BC'" },
  { label: "Simplified PDF: AC'+B'C", value: "AC'+B'C" },
  { label: "Simplified Screenshot: AB+B'C", value: "AB+B'C" },
  { label: "POS Form: (A+B')(C+D')", value: "(A+B')(C+D')" },
  { label: "XOR Equivalent: A'B+AB'", value: "A'B+AB'" },
  { label: "Majority Function: AB+BC+AC", value: "AB+BC+AC" },
  { label: "Carry Out: AB+BC+CA", value: "AB+BC+CA" },
];

export const Header: React.FC<HeaderProps> = ({
  expression,
  onExpressionChange,
  onSynthesize,
  mode,
  onModeChange,
  preset,
  onPresetChange,
  onQuickInsert,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      {/* Top Brand & Preset Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Brand Zone */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-xs">
            <Cpu className="w-4 h-4 text-sky-400" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
              Boolean Logic Gate Synthesizer
            </h1>
            <p className="text-[11px] text-slate-500 font-medium">
              Universal Gate Implementation &amp; Lecture Slide Engine
            </p>
          </div>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center space-x-2">
          <label className="text-xs font-semibold text-slate-500">Preset:</label>
          <select
            value={preset}
            onChange={(e) => onPresetChange(e.target.value)}
            className="bg-slate-50 hover:bg-slate-100 border border-slate-300 text-slate-800 text-xs rounded-lg py-1.5 px-2.5 font-medium focus:outline-hidden focus:ring-2 focus:ring-sky-500 transition-colors"
          >
            {PRESETS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Formula Input & Mode Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 bg-slate-50 border-t border-slate-200 flex flex-col lg:flex-row items-center justify-between gap-3">
        {/* Formula Input */}
        <div className="w-full lg:w-7/12 flex items-center space-x-2">
          <span className="text-xs font-extrabold text-slate-700 code-font whitespace-nowrap">
            F =
          </span>
          <div className="relative flex-1">
            <input
              type="text"
              value={expression}
              onChange={(e) => onExpressionChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSynthesize();
              }}
              placeholder="e.g. AB+ABC'+B'C or A(B+CD)+BC'"
              className="w-full pl-3 pr-28 py-1.5 code-font text-sm font-bold bg-white border border-slate-300 rounded-lg shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-sky-500"
            />
            {/* Quick Token Insertion Buttons */}
            <div className="absolute right-1.5 top-1 flex space-x-1">
              <button
                type="button"
                onClick={() => onQuickInsert("'")}
                className="px-2 py-0.5 text-xs bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded font-mono font-bold text-slate-700"
                title="Insert NOT prime (')"
              >
                '
              </button>
              <button
                type="button"
                onClick={() => onQuickInsert('+')}
                className="px-2 py-0.5 text-xs bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded font-mono font-bold text-slate-700"
                title="Insert OR (+)"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => onQuickInsert('(')}
                className="px-1.5 py-0.5 text-xs bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded font-mono font-bold text-slate-700"
                title="Insert open parenthesis ("
              >
                (
              </button>
              <button
                type="button"
                onClick={() => onQuickInsert(')')}
                className="px-1.5 py-0.5 text-xs bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded font-mono font-bold text-slate-700"
                title="Insert close parenthesis )"
              >
                )
              </button>
            </div>
          </div>
          <button
            onClick={onSynthesize}
            className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-lg transition shadow-xs flex items-center space-x-1.5 shrink-0"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Synthesize</span>
          </button>
        </div>

        {/* Universal Mode Tabs */}
        <div className="flex flex-wrap items-center bg-slate-200/80 p-1 rounded-lg gap-1 text-xs font-bold">
          <button
            onClick={() => onModeChange('nand')}
            className={`px-3 py-1 rounded-md transition ${
              mode === 'nand'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            NAND Only (Slide 2)
          </button>
          <button
            onClick={() => onModeChange('nor')}
            className={`px-3 py-1 rounded-md transition ${
              mode === 'nor'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            NOR Only (Slide 1)
          </button>
          <button
            onClick={() => onModeChange('nand_opt')}
            className={`px-3 py-1 rounded-md transition ${
              mode === 'nand_opt'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Double inverters cancel in 2-level SOP"
          >
            2-Level NAND (Optimized)
          </button>
          <button
            onClick={() => onModeChange('std')}
            className={`px-3 py-1 rounded-md transition ${
              mode === 'std'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Standard Gates
          </button>
        </div>
      </div>
    </header>
  );
};
