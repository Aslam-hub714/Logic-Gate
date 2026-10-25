import React from 'react';
import { SynthesisMode } from '../types/logic';
import { ListOrdered, HelpCircle, Zap, ShieldCheck } from 'lucide-react';

interface SynthesisBreakdownProps {
  steps: string[];
  mode: SynthesisMode;
  totalGates: number;
}

export const SynthesisBreakdown: React.FC<SynthesisBreakdownProps> = ({
  steps,
  mode,
  totalGates,
}) => {
  const modeExplanation = {
    nand: {
      title: 'NAND Universal Synthesis Rules (Slide 2)',
      notRule: 'NOT(A) = (A · A)\' using 1 tied-input NAND gate.',
      andRule: 'AND(A, B) = ((A · B)\')\' using 1 2-input NAND followed in series by 1 tied-NAND inverter (2 gates).',
      orRule: 'OR(A, B) = ((A\') · (B\'))\' using 2 tied-NAND inverters on inputs feeding 1 2-input NAND gate (3 gates).',
    },
    nor: {
      title: 'NOR Universal Synthesis Rules (Slide 1)',
      notRule: 'NOT(A) = (A + A)\' using 1 tied-input NOR gate.',
      andRule: 'AND(A, B) = ((A\') + (B\'))\' using 2 tied-NOR inverters on inputs feeding 1 2-input NOR gate (3 gates).',
      orRule: 'OR(A, B) = ((A + B)\')\' using 1 2-input NOR followed in series by 1 tied-NOR inverter (2 gates).',
    },
    nand_opt: {
      title: '2-Level Optimized NAND (Involution / Bubble Cancellation)',
      notRule: 'Direct tied-input NAND for primary input complements.',
      andRule: 'AND terms produce (AB)\' via 1 NAND gate.',
      orRule: 'OR output combines the inverted AND terms; intermediate bubbles cancel out without extra inverters!',
    },
    std: {
      title: 'Standard Canonical Gates (AND / OR / NOT)',
      notRule: 'Inverters directly implement unary negation.',
      andRule: 'Standard 2-input AND gates.',
      orRule: 'Standard 2-input OR gates.',
    },
  }[mode];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <ListOrdered className="w-4 h-4 text-sky-600" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">
              Synthesis Steps &amp; Universal Derivation
            </h3>
          </div>
          <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            {totalGates} Gates Total
          </span>
        </div>

        {/* Step list */}
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {steps.length === 0 ? (
            <p className="text-xs text-slate-500 italic">
              Direct rail connection (no intermediate gates required).
            </p>
          ) : (
            steps.map((step, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-50 border border-slate-200/80 text-xs text-slate-700"
              >
                <span className="w-5 h-5 rounded-full bg-sky-700 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <div
                  className="leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: step }}
                />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Educational Note */}
      <div className="mt-4 pt-3 border-t border-slate-100 bg-slate-50/70 -mx-4 -mb-4 p-4 rounded-b-xl">
        <div className="flex items-start gap-2 text-xs text-slate-600">
          <HelpCircle className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold text-slate-800">{modeExplanation.title}</div>
            <div className="text-[11px] text-slate-500">
              <span className="font-medium text-slate-700">Rules Applied:</span>{' '}
              {modeExplanation.notRule} {modeExplanation.andRule} {modeExplanation.orRule}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
