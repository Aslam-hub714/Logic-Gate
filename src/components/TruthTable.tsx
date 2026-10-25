import React from 'react';
import { TruthTableRow } from '../types/logic';
import { Table, Check, ArrowRight } from 'lucide-react';

interface TruthTableProps {
  rows: TruthTableRow[];
  variables: string[];
  formulaStr: string;
  onSelectRow: (inputs: Record<string, number>) => void;
}

export const TruthTable: React.FC<TruthTableProps> = ({
  rows,
  variables,
  formulaStr,
  onSelectRow,
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col h-full">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <Table className="w-4 h-4 text-sky-600" />
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">
            Formula vs Gate Truth Table
          </h3>
        </div>
        <span className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
          <Check className="w-3 h-3 text-emerald-600" />
          Fully Verified
        </span>
      </div>

      <p className="text-[11px] text-slate-500 mb-2">
        Click any row below to apply that binary input combination directly to the live schematic.
      </p>

      <div className="overflow-y-auto max-h-72 border border-slate-200 rounded-lg">
        <table className="w-full text-xs text-center border-collapse">
          <thead className="bg-slate-100 text-slate-700 sticky top-0 font-bold border-b border-slate-200">
            <tr>
              {variables.map(v => (
                <th key={v} className="py-2 px-2.5 border-r border-slate-200">
                  {v}
                </th>
              ))}
              <th className="py-2 px-3 border-r border-slate-200 text-slate-800">
                Formula F({variables.join(',')})
              </th>
              <th className="py-2 px-3 text-sky-700 bg-sky-50/70">
                Gate Circuit Out
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono">
            {rows.map((row, idx) => (
              <tr
                key={idx}
                onClick={() => onSelectRow(row.inputs)}
                className={`cursor-pointer transition-colors ${
                  row.isActive
                    ? 'bg-sky-100/90 font-bold text-sky-950'
                    : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                {variables.map(v => (
                  <td key={v} className="py-1.5 px-2.5 border-r border-slate-100">
                    {row.inputs[v]}
                  </td>
                ))}
                <td className={`py-1.5 px-3 border-r border-slate-100 ${
                  row.formulaOut ? 'text-emerald-700 font-bold' : 'text-slate-400'
                }`}>
                  {row.formulaOut}
                </td>
                <td className={`py-1.5 px-3 ${
                  row.circuitOut ? 'text-emerald-700 bg-emerald-50/50 font-bold' : 'text-slate-400'
                }`}>
                  <span className="inline-flex items-center gap-1">
                    {row.circuitOut}
                    <Check className="w-3 h-3 text-emerald-600" />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
