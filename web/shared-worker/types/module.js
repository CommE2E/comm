// @flow

import type { FS } from './file-system.js';
import type { SQLiteQueryExecutorType } from './sqlite-query-executor.js';

interface WebAssembly$Module {}

type Emscripten$EnvironmentType = 'WEB' | 'NODE' | 'SHELL' | 'WORKER';

type Emscripten$WebAssemblyImports = $ReadOnlyArray<{
  +name: string,
  +kind: string,
}>;

type Emscripten$WebAssemblyExports = $ReadOnlyArray<{
  +module: string,
  +name: string,
  +kind: string,
}>;

declare export class SQLiteBackup {
  static restoreFromMainCompaction(
    mainCompactionPath: string,
    mainCompactionEncryptionKey: string,
    plaintextDatabasePath: string,
    maxVersion: string,
  ): string;
}

export type SQLiteBackupType = typeof SQLiteBackup;

declare export class EmscriptenModule {
  print(str: string): void;
  printErr(str: string): void;
  arguments: string[];
  environment: Emscripten$EnvironmentType;
  preInit: () => void | $ReadOnlyArray<() => void>;
  preRun: $ReadOnlyArray<() => void>;
  postRun: () => void | $ReadOnlyArray<() => void>;
  onAbort: {
    (what: mixed): void,
  };
  onRuntimeInitialized: () => void;
  preinitializedWebGLContext: WebGLRenderingContext;
  noInitialRun: boolean;
  noExitRuntime: boolean;
  logReadFiles: boolean;
  filePackagePrefixURL: string;
  wasmBinary: ArrayBuffer;
  destroy(object: { +[key: string]: mixed }): void;
  getPreloadedPackage(
    remotePackageName: string,
    remotePackageSize: number,
  ): ArrayBuffer;
  instantiateWasm(
    imports: Emscripten$WebAssemblyImports,
    successCallback: (module: WebAssembly$Module) => void,
  ): Emscripten$WebAssemblyExports;
  locateFile(url: string, scriptDirectory?: string): string;
  onCustomMessage(event: MessageEvent): void;
  HEAP: Int32Array;
  IHEAP: Int32Array;
  FHEAP: Float64Array;
  HEAP8: Int8Array;
  HEAP16: Int16Array;
  HEAP32: Int32Array;
  HEAPU8: Uint8Array;
  HEAPU16: Uint16Array;
  HEAPU32: Uint32Array;
  HEAPF32: Float32Array;
  HEAPF64: Float64Array;
  TOTAL_STACK: number;
  TOTAL_MEMORY: number;
  FAST_MEMORY: number;
  _malloc(size: number): number;
  _free(ptr: number): void;

  FS: FS;

  SQLiteQueryExecutor: SQLiteQueryExecutorType;
  SQLiteBackup: SQLiteBackupType;
  getExceptionMessage(exceptionPtr: number): string;
}
