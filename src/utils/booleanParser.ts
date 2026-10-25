import { AstNode } from '../types/logic';

interface Token {
  type: 'VAR' | 'CONST' | 'OR' | 'AND' | 'POST_NOT' | 'PRE_NOT' | 'LPAREN' | 'RPAREN';
  val?: string | number;
}

export class BooleanParser {
  private tokens: Token[];
  private pos = 0;

  constructor(str: string) {
    this.tokens = this.tokenize(str);
  }

  private tokenize(str: string): Token[] {
    const tokens: Token[] = [];
    const s = str.replace(/\s+/g, '');
    let i = 0;

    while (i < s.length) {
      const ch = s[i];

      if (/[A-Za-z]/.test(ch)) {
        tokens.push({ type: 'VAR', val: ch.toUpperCase() });
        i++;
      } else if (ch === '0' || ch === '1') {
        tokens.push({ type: 'CONST', val: parseInt(ch, 10) });
        i++;
      } else if (ch === '+' || ch === '|') {
        tokens.push({ type: 'OR', val: '+' });
        i++;
      } else if (ch === '*' || ch === '&' || ch === '·' || ch === '.') {
        tokens.push({ type: 'AND', val: '*' });
        i++;
      } else if (ch === "'" || ch === '’' || ch === '′') {
        tokens.push({ type: 'POST_NOT', val: "'" });
        i++;
      } else if (ch === '!' || ch === '~') {
        tokens.push({ type: 'PRE_NOT', val: '!' });
        i++;
      } else if (ch === '(' || ch === '[' || ch === '{') {
        tokens.push({ type: 'LPAREN', val: '(' });
        i++;
      } else if (ch === ')' || ch === ']' || ch === '}') {
        tokens.push({ type: 'RPAREN', val: ')' });
        i++;
      } else {
        i++;
      }
    }
    return tokens;
  }

  private peek(): Token | null {
    return this.tokens[this.pos] || null;
  }

  private consume(expectedType?: string): Token | null {
    const tok = this.peek();
    if (tok && (!expectedType || tok.type === expectedType)) {
      this.pos++;
      return tok;
    }
    return null;
  }

  public parse(): AstNode {
    if (this.tokens.length === 0) return { type: 'VAR', val: 'A' };
    const res = this.parseOr();
    return res || { type: 'VAR', val: 'A' };
  }

  // OR is left-associative: X + Y + Z -> (X + Y) + Z
  private parseOr(): AstNode {
    let left = this.parseAnd();
    while (this.peek() && this.peek()?.type === 'OR') {
      this.consume('OR');
      const right = this.parseAnd();
      left = { type: 'OR', left, right };
    }
    return left;
  }

  // AND is left-associative: A B C' -> (A · B) · C'
  private parseAnd(): AstNode {
    let left = this.parseUnary();
    while (this.peek()) {
      const next = this.peek()!;
      if (next.type === 'AND') {
        this.consume('AND');
        const right = this.parseUnary();
        left = { type: 'AND', left, right };
      } else if (
        next.type === 'VAR' ||
        next.type === 'CONST' ||
        next.type === 'LPAREN' ||
        next.type === 'PRE_NOT'
      ) {
        const right = this.parseUnary();
        left = { type: 'AND', left, right };
      } else {
        break;
      }
    }
    return left;
  }

  private parseUnary(): AstNode {
    if (this.peek() && this.peek()?.type === 'PRE_NOT') {
      this.consume('PRE_NOT');
      const child = this.parseUnary();
      return { type: 'NOT', child };
    }
    let node = this.parsePrimary();
    while (this.peek() && this.peek()?.type === 'POST_NOT') {
      this.consume('POST_NOT');
      node = { type: 'NOT', child: node };
    }
    return node;
  }

  private parsePrimary(): AstNode {
    const tok = this.peek();
    if (!tok) return { type: 'VAR', val: 'A' };

    if (tok.type === 'VAR') {
      this.consume('VAR');
      return { type: 'VAR', val: String(tok.val) };
    }
    if (tok.type === 'CONST') {
      this.consume('CONST');
      return { type: 'CONST', val: Number(tok.val) };
    }
    if (tok.type === 'LPAREN') {
      this.consume('LPAREN');
      const expr = this.parseOr();
      if (this.peek() && this.peek()?.type === 'RPAREN') {
        this.consume('RPAREN');
      }
      return expr;
    }
    this.consume();
    return { type: 'VAR', val: 'A' };
  }
}

export function astToString(node: AstNode): string {
  if (!node) return '';
  if (node.type === 'VAR') return node.val;
  if (node.type === 'CONST') return String(node.val);
  if (node.type === 'NOT') {
    const inner = astToString(node.child);
    if (node.child.type === 'AND' || node.child.type === 'OR') {
      return `(${inner})'`;
    }
    return `${inner}'`;
  }
  if (node.type === 'AND') {
    const l = node.left.type === 'OR' ? `(${astToString(node.left)})` : astToString(node.left);
    const r = node.right.type === 'OR' ? `(${astToString(node.right)})` : astToString(node.right);
    return `${l}${r}`;
  }
  if (node.type === 'OR') {
    return `${astToString(node.left)}+${astToString(node.right)}`;
  }
  return '';
}

export function evalAst(node: AstNode, env: Record<string, number>): number {
  if (!node) return 0;
  if (node.type === 'VAR') return env[node.val] ? 1 : 0;
  if (node.type === 'CONST') return node.val ? 1 : 0;
  if (node.type === 'NOT') return evalAst(node.child, env) ? 0 : 1;
  if (node.type === 'AND') return evalAst(node.left, env) && evalAst(node.right, env) ? 1 : 0;
  if (node.type === 'OR') return evalAst(node.left, env) || evalAst(node.right, env) ? 1 : 0;
  return 0;
}

export function collectVars(node: AstNode, set: Set<string> = new Set()): Set<string> {
  if (!node) return set;
  if (node.type === 'VAR') set.add(node.val);
  else if (node.type === 'NOT') collectVars(node.child, set);
  else if (node.type === 'AND' || node.type === 'OR') {
    collectVars(node.left, set);
    collectVars(node.right, set);
  }
  return set;
}
