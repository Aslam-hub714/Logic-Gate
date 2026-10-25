import { AstNode } from '../types/logic';
import { astToString, evalAst } from './booleanParser';

export function computeMinimalSOP(ast: AstNode, vars: string[]): string {
  if (vars.length === 0 || vars.length > 6) return astToString(ast);
  const n = vars.length;
  const minterms: number[] = [];

  for (let m = 0; m < (1 << n); m++) {
    const env: Record<string, number> = {};
    for (let i = 0; i < n; i++) {
      env[vars[i]] = (m >> (n - 1 - i)) & 1;
    }
    if (evalAst(ast, env) === 1) minterms.push(m);
  }

  if (minterms.length === 0) return '0';
  if (minterms.length === (1 << n)) return '1';

  // Represent implicants as strings of '0', '1', '-'
  let currentGroup = new Set<string>(minterms.map(m => m.toString(2).padStart(n, '0')));
  const primeImplicants = new Set<string>();

  while (currentGroup.size > 0) {
    const nextGroup = new Set<string>();
    const used = new Set<string>();
    const arr = Array.from(currentGroup);

    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        let diffCount = 0;
        let diffIdx = -1;
        for (let k = 0; k < n; k++) {
          if (arr[i][k] !== arr[j][k]) {
            diffCount++;
            diffIdx = k;
          }
        }
        if (diffCount === 1) {
          used.add(arr[i]);
          used.add(arr[j]);
          const combined = arr[i].substring(0, diffIdx) + '-' + arr[i].substring(diffIdx + 1);
          nextGroup.add(combined);
        }
      }
    }
    for (const item of arr) {
      if (!used.has(item)) primeImplicants.add(item);
    }
    currentGroup = nextGroup;
  }

  const pis = Array.from(primeImplicants);

  // Find smallest subset of prime implicants covering all minterms
  let bestCover: string[] = pis;
  let bestLiteralCount = Infinity;

  const countLiterals = (subset: string[]) =>
    subset.reduce((acc, pi) => acc + pi.replace(/-/g, '').length, 0);

  const searchCover = (idx: number, chosen: string[], coveredMask: number) => {
    if (coveredMask === (1 << minterms.length) - 1) {
      const litCount = countLiterals(chosen);
      if (
        chosen.length < bestCover.length ||
        (chosen.length === bestCover.length && litCount < bestLiteralCount)
      ) {
        bestCover = [...chosen];
        bestLiteralCount = litCount;
      }
      return;
    }
    if (idx >= pis.length || chosen.length >= bestCover.length) return;

    // Include pis[idx]
    let newMask = coveredMask;
    for (let mIdx = 0; mIdx < minterms.length; mIdx++) {
      const bin = minterms[mIdx].toString(2).padStart(n, '0');
      let matches = true;
      for (let k = 0; k < n; k++) {
        if (pis[idx][k] !== '-' && pis[idx][k] !== bin[k]) {
          matches = false;
          break;
        }
      }
      if (matches) {
        newMask |= 1 << mIdx;
      }
    }

    if (newMask !== coveredMask) {
      chosen.push(pis[idx]);
      searchCover(idx + 1, chosen, newMask);
      chosen.pop();
    }
    // Exclude pis[idx]
    searchCover(idx + 1, chosen, coveredMask);
  };

  if (minterms.length <= 32) {
    searchCover(0, [], 0);
  }

  // Format chosen prime implicants into algebraic string
  const termStrings = bestCover.map(pi => {
    let s = '';
    for (let i = 0; i < n; i++) {
      if (pi[i] === '1') s += vars[i];
      else if (pi[i] === '0') s += vars[i] + "'";
    }
    return s || '1';
  });

  return termStrings.join('+');
}
