/**
 * Condition Engine for evaluating skeleton condition strings against wizard state.
 *
 * Supports conditions like:
 * - "printer.awd_enabled" (truthy check)
 * - "printer.awd_enabled == true"
 * - "z_config.motor_count >= 2"
 * - "probe.probe_type in ['beacon', 'cartographer']"
 * - "mcu.toolboard.enabled and extruder.location == 'toolboard'"
 * - "not probe.probe_type"
 */

export type WizardState = Record<string, any>;

/**
 * Token types for the condition parser
 */
type TokenType =
  | 'IDENTIFIER'
  | 'STRING'
  | 'NUMBER'
  | 'BOOLEAN'
  | 'OPERATOR'
  | 'LPAREN'
  | 'RPAREN'
  | 'LBRACKET'
  | 'RBRACKET'
  | 'COMMA'
  | 'AND'
  | 'OR'
  | 'NOT'
  | 'IN'
  | 'EOF';

interface Token {
  type: TokenType;
  value: string | number | boolean;
}

/**
 * Tokenize a condition string
 */
function tokenize(condition: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;

  const keywords: Record<string, TokenType> = {
    'and': 'AND',
    'or': 'OR',
    'not': 'NOT',
    'in': 'IN',
    'true': 'BOOLEAN',
    'false': 'BOOLEAN',
    'True': 'BOOLEAN',
    'False': 'BOOLEAN',
  };

  const operators = ['==', '!=', '<=', '>=', '<', '>', '='];

  while (pos < condition.length) {
    const char = condition[pos];

    // Skip whitespace
    if (/\s/.test(char)) {
      pos++;
      continue;
    }

    // String literals
    if (char === '"' || char === "'") {
      const quote = char;
      pos++;
      let str = '';
      while (pos < condition.length && condition[pos] !== quote) {
        str += condition[pos];
        pos++;
      }
      pos++; // skip closing quote
      tokens.push({ type: 'STRING', value: str });
      continue;
    }

    // Numbers
    if (/[0-9]/.test(char) || (char === '-' && /[0-9]/.test(condition[pos + 1] || ''))) {
      let num = '';
      if (char === '-') {
        num = '-';
        pos++;
      }
      while (pos < condition.length && /[0-9.]/.test(condition[pos])) {
        num += condition[pos];
        pos++;
      }
      tokens.push({ type: 'NUMBER', value: parseFloat(num) });
      continue;
    }

    // Operators
    let foundOp = false;
    for (const op of operators) {
      if (condition.substring(pos, pos + op.length) === op) {
        tokens.push({ type: 'OPERATOR', value: op });
        pos += op.length;
        foundOp = true;
        break;
      }
    }
    if (foundOp) continue;

    // Parentheses and brackets
    if (char === '(') {
      tokens.push({ type: 'LPAREN', value: '(' });
      pos++;
      continue;
    }
    if (char === ')') {
      tokens.push({ type: 'RPAREN', value: ')' });
      pos++;
      continue;
    }
    if (char === '[') {
      tokens.push({ type: 'LBRACKET', value: '[' });
      pos++;
      continue;
    }
    if (char === ']') {
      tokens.push({ type: 'RBRACKET', value: ']' });
      pos++;
      continue;
    }
    if (char === ',') {
      tokens.push({ type: 'COMMA', value: ',' });
      pos++;
      continue;
    }

    // Identifiers and keywords
    if (/[a-zA-Z_]/.test(char)) {
      let id = '';
      while (pos < condition.length && /[a-zA-Z0-9_.]/.test(condition[pos])) {
        id += condition[pos];
        pos++;
      }

      const lower = id.toLowerCase();
      if (keywords[id] || keywords[lower]) {
        const type = keywords[id] || keywords[lower];
        if (type === 'BOOLEAN') {
          tokens.push({ type: 'BOOLEAN', value: lower === 'true' });
        } else {
          tokens.push({ type, value: id });
        }
      } else {
        tokens.push({ type: 'IDENTIFIER', value: id });
      }
      continue;
    }

    // Unknown character, skip it
    pos++;
  }

  tokens.push({ type: 'EOF', value: '' });
  return tokens;
}

/**
 * Simple recursive descent parser for conditions
 */
class ConditionParser {
  private tokens: Token[];
  private pos: number;
  private state: WizardState;

  constructor(tokens: Token[], state: WizardState) {
    this.tokens = tokens;
    this.pos = 0;
    this.state = state;
  }

  private current(): Token {
    return this.tokens[this.pos] || { type: 'EOF', value: '' };
  }

  private advance(): Token {
    const token = this.current();
    this.pos++;
    return token;
  }

  private peek(offset: number = 0): Token {
    return this.tokens[this.pos + offset] || { type: 'EOF', value: '' };
  }

  /**
   * Parse and evaluate the condition
   */
  parse(): boolean {
    const result = this.parseOr();
    return Boolean(result);
  }

  private parseOr(): any {
    let left = this.parseAnd();

    while (this.current().type === 'OR') {
      this.advance();
      const right = this.parseAnd();
      left = left || right;
    }

    return left;
  }

  private parseAnd(): any {
    let left = this.parseNot();

    while (this.current().type === 'AND') {
      this.advance();
      const right = this.parseNot();
      left = left && right;
    }

    return left;
  }

  private parseNot(): any {
    if (this.current().type === 'NOT') {
      this.advance();
      return !this.parseNot();
    }
    return this.parseComparison();
  }

  private parseComparison(): any {
    const left = this.parsePrimary();

    // Check for 'in' operator
    if (this.current().type === 'IN') {
      this.advance();
      const right = this.parseArray();
      if (Array.isArray(right)) {
        return right.includes(left);
      }
      return false;
    }

    // Check for 'not in' (NOT followed by IN)
    if (this.current().type === 'NOT' && this.peek(1).type === 'IN') {
      this.advance(); // skip NOT
      this.advance(); // skip IN
      const right = this.parseArray();
      if (Array.isArray(right)) {
        return !right.includes(left);
      }
      return true;
    }

    // Check for comparison operators
    if (this.current().type === 'OPERATOR') {
      const op = this.advance().value as string;
      const right = this.parsePrimary();

      switch (op) {
        case '==':
        case '=':
          return left === right;
        case '!=':
          return left !== right;
        case '<':
          return left < right;
        case '<=':
          return left <= right;
        case '>':
          return left > right;
        case '>=':
          return left >= right;
        default:
          return false;
      }
    }

    // No operator, just return the value (truthy check)
    return left;
  }

  private parseArray(): any[] {
    if (this.current().type !== 'LBRACKET') {
      return [];
    }

    this.advance(); // skip [
    const items: any[] = [];

    while (this.current().type !== 'RBRACKET' && this.current().type !== 'EOF') {
      items.push(this.parsePrimary());

      if (this.current().type === 'COMMA') {
        this.advance();
      }
    }

    if (this.current().type === 'RBRACKET') {
      this.advance(); // skip ]
    }

    return items;
  }

  private parsePrimary(): any {
    const token = this.current();

    switch (token.type) {
      case 'STRING':
        this.advance();
        return token.value;

      case 'NUMBER':
        this.advance();
        return token.value;

      case 'BOOLEAN':
        this.advance();
        return token.value;

      case 'IDENTIFIER':
        this.advance();
        // Look up the identifier in state
        return this.state[token.value as string];

      case 'LPAREN':
        this.advance(); // skip (
        const result = this.parseOr();
        if (this.current().type === 'RPAREN') {
          this.advance(); // skip )
        }
        return result;

      case 'LBRACKET':
        return this.parseArray();

      default:
        this.advance();
        return undefined;
    }
  }
}

/**
 * Evaluate a condition string against the wizard state.
 * Returns true if the condition is met, false otherwise.
 *
 * @param condition - The condition string to evaluate
 * @param state - The wizard state to evaluate against
 * @returns boolean - Whether the condition is satisfied
 *
 * @example
 * evaluateCondition("printer.awd_enabled", state)
 * evaluateCondition("z_config.motor_count >= 2", state)
 * evaluateCondition("probe.probe_type in ['beacon', 'tap']", state)
 */
export function evaluateCondition(condition: string | undefined | null, state: WizardState): boolean {
  // Empty or undefined condition is always true
  if (!condition || condition.trim() === '') {
    return true;
  }

  try {
    const tokens = tokenize(condition);
    const parser = new ConditionParser(tokens, state);
    return parser.parse();
  } catch (error) {
    console.warn(`Failed to evaluate condition "${condition}":`, error);
    return false;
  }
}

/**
 * Evaluate multiple conditions with AND logic.
 * All conditions must be true for the result to be true.
 */
export function evaluateConditions(conditions: (string | undefined | null)[], state: WizardState): boolean {
  return conditions.every(c => evaluateCondition(c, state));
}

/**
 * Evaluate multiple conditions with OR logic.
 * At least one condition must be true for the result to be true.
 */
export function evaluateAnyCondition(conditions: (string | undefined | null)[], state: WizardState): boolean {
  if (conditions.length === 0) return true;
  return conditions.some(c => evaluateCondition(c, state));
}

/**
 * Get all state keys referenced in a condition string.
 * Useful for determining dependencies.
 */
export function getConditionDependencies(condition: string | undefined | null): string[] {
  if (!condition) return [];

  const deps: string[] = [];
  const tokens = tokenize(condition);

  for (const token of tokens) {
    if (token.type === 'IDENTIFIER' && typeof token.value === 'string') {
      deps.push(token.value);
    }
  }

  return [...new Set(deps)];
}

export default evaluateCondition;
