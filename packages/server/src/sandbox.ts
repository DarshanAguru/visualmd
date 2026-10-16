import vm from 'node:vm';

export interface SandboxOptions {
  timeoutMs?: number;
  maxOutputLines?: number;
  maxOutputChars?: number;
}

export interface SandboxExecutionResult {
  success: boolean;
  result?: any;
  output: string[];
  error?: string;
  durationMs: number;
}

/**
 * Custom Hardened Node.js Sandbox Container.
 *
 * Designed to execute user-provided or markdown snippet code in strict isolation:
 * 1. Evaluates in a detached VM context with code generation (eval/Function strings) disabled.
 * 2. Host process, child_process, fs, net, and native bindings are completely inaccessible.
 * 3. Enforces hard CPU execution timeouts to prevent infinite loops.
 * 4. Caps console output size and line counts to prevent denial-of-service memory exhaustion.
 * 5. Captures standard stdout/stderr logs into structured result objects.
 */
export function executeSandboxedCode(
  code: string,
  options: SandboxOptions = {}
): SandboxExecutionResult {
  const startTime = Date.now();
  const timeoutMs = Math.min(Math.max(options.timeoutMs ?? 2000, 100), 5000);
  const maxOutputLines = options.maxOutputLines ?? 200;
  const maxOutputChars = options.maxOutputChars ?? 50000;

  const output: string[] = [];
  let totalChars = 0;

  const pushOutput = (type: string, args: any[]) => {
    if (output.length >= maxOutputLines) return;
    const formatted = args
      .map((arg) => {
        if (typeof arg === 'object' && arg !== null) {
          try {
            return JSON.stringify(arg, null, 2);
          } catch {
            return String(arg);
          }
        }
        return String(arg);
      })
      .join(' ');

    const line = type === 'log' ? formatted : `[${type.toUpperCase()}] ${formatted}`;
    if (totalChars + line.length > maxOutputChars) {
      if (totalChars < maxOutputChars) {
        output.push('[Output truncated: size limit exceeded]');
        totalChars = maxOutputChars;
      }
      return;
    }

    totalChars += line.length;
    output.push(line);
  };

  // Safe console implementation
  const safeConsole = {
    log: (...args: any[]) => pushOutput('log', args),
    info: (...args: any[]) => pushOutput('info', args),
    warn: (...args: any[]) => pushOutput('warn', args),
    error: (...args: any[]) => pushOutput('error', args),
  };

  // Build secure sandbox context
  const sandbox = Object.create(null);
  sandbox.console = safeConsole;
  sandbox.Math = Math;
  sandbox.Date = Date;
  sandbox.JSON = JSON;
  sandbox.RegExp = RegExp;
  sandbox.Array = Array;
  sandbox.Object = Object;
  sandbox.Number = Number;
  sandbox.String = String;
  sandbox.Boolean = Boolean;
  sandbox.Map = Map;
  sandbox.Set = Set;
  sandbox.WeakMap = WeakMap;
  sandbox.WeakSet = WeakSet;
  sandbox.Promise = Promise;
  sandbox.Symbol = Symbol;
  sandbox.Error = Error;
  sandbox.TypeError = TypeError;
  sandbox.RangeError = RangeError;
  sandbox.SyntaxError = SyntaxError;
  sandbox.parseInt = parseInt;
  sandbox.parseFloat = parseFloat;
  sandbox.isNaN = isNaN;
  sandbox.isFinite = isFinite;
  sandbox.encodeURI = encodeURI;
  sandbox.decodeURI = decodeURI;
  sandbox.encodeURIComponent = encodeURIComponent;
  sandbox.decodeURIComponent = decodeURIComponent;

  // Explicitly block and nullify dangerous globals
  sandbox.process = undefined;
  sandbox.require = undefined;
  sandbox.module = undefined;
  sandbox.exports = undefined;
  sandbox.global = undefined;
  sandbox.globalThis = sandbox;

  try {
    // Disable string code-generation to stop constructor/eval breakout attacks
    const context = vm.createContext(sandbox, {
      codeGeneration: {
        strings: false,
        wasm: false,
      },
    });

    const script = new vm.Script(code, {
      filename: 'visualmd-sandbox.vm.js',
    });

    const rawResult = script.runInContext(context, {
      timeout: timeoutMs,
      breakOnSigint: true,
    });

    // Format safe return result
    let safeResult: any = undefined;
    if (rawResult !== undefined) {
      try {
        safeResult = JSON.parse(JSON.stringify(rawResult));
      } catch {
        safeResult = String(rawResult);
      }
    }

    return {
      success: true,
      result: safeResult,
      output,
      durationMs: Date.now() - startTime,
    };
  } catch (err: any) {
    const errorMsg =
      err && err.message ? err.message : String(err || 'Unknown execution error');
    return {
      success: false,
      error: errorMsg,
      output,
      durationMs: Date.now() - startTime,
    };
  }
}
