/**
 * messages.ts
 *
 * Message protocol between the main thread and the toolchain Web Worker.
 * All messages are discriminated unions keyed on `type`.
 */

// ── Requests (main → worker) ──────────────────────────────────────────────────

export type InitRequest = {
  type: 'init';
  /** Base URL of the deployed toolchain (e.g. '/dist/cpp-wasm-toolchain/0.1.0'). */
  baseUrl: string;
};

export type PingRequest = {
  type: 'ping';
};

export type CompileRequest = {
  type: 'compile';
  source: string;
  filename: string;
  flags?: string[];
  timeoutMs?: number;
};

export type RunRequest = {
  type: 'run';
  /** Fully linked WASM binary. */
  wasmBytes: ArrayBuffer;
  stdin?: string;
  timeoutMs?: number;
};

export type WorkerRequest =
  | InitRequest
  | PingRequest
  | CompileRequest
  | RunRequest;

// ── Responses (worker → main) ─────────────────────────────────────────────────

export type InitResponse = {
  type: 'init:ok';
  version: string;
};

export type PongResponse = {
  type: 'pong';
};

export type CompileOkResponse = {
  type: 'compile:ok';
  /** Linked WASM binary ready to execute. */
  wasmBytes: ArrayBuffer;
  diagnostics: string;
};

export type CompileErrorResponse = {
  type: 'compile:error';
  diagnostics: string;
};

export type RunStdoutResponse = {
  type: 'run:stdout';
  text: string;
};

export type RunStderrResponse = {
  type: 'run:stderr';
  text: string;
};

export type RunDoneResponse = {
  type: 'run:done';
  exitCode: number;
  timedOut: boolean;
  durationMs: number;
};

export type ErrorResponse = {
  type: 'error';
  message: string;
};

export type WorkerResponse =
  | InitResponse
  | PongResponse
  | CompileOkResponse
  | CompileErrorResponse
  | RunStdoutResponse
  | RunStderrResponse
  | RunDoneResponse
  | ErrorResponse;
