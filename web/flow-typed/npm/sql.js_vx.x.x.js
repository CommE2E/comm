// @flow

// flow-typed signature: f355493becad56880bf30832260c5460
// flow-typed version: <<STUB>>/sql.js_v1.8.0/flow_v0.182.0

declare module 'sql.js' {
  declare export type SqlValue = number | string | Uint8Array | null;
  declare export type ParamsObject = { +[key: string]: SqlValue };
  declare export type ParamsCallback = (obj: ParamsObject) => void;

  declare export type BindParams =
    | $ReadOnlyArray<SqlValue>
    | ParamsObject
    | null;

  declare export type QueryExecResult = {
    +columns: string[],
    +values: SqlValue[][],
  };

  declare export type StatementIteratorResult = {
    +done: boolean,
    +value: SqliteStatement,
  };

  declare export type SqlJsStatic = {
    +Database: typeof SqliteDatabase,
    +Statement: typeof SqliteStatement,
  };

  declare type EmscriptenModule = {
    +locateFile: (path: string, prefix?: string) => string,
    ...
  };

  declare type InitSqlJsStatic = {
    (config?: EmscriptenModule): Promise<SqlJsStatic>,
  };

  declare export class SqliteDatabase {
    constructor(data?: Array<number> | Uint8Array | Buffer | null): this;
    close(): void;

    create_function<T, R>(
      name: string,
      func: (...args: $ReadOnlyArray<T>) => R,
    ): SqliteDatabase;
    each(
      sql: string,
      params: BindParams,
      callback: ParamsCallback,
      done: () => void,
    ): SqliteDatabase;
    each(
      sql: string,
      callback: ParamsCallback,
      done: () => void,
    ): SqliteDatabase;
    exec(sql: string, params?: BindParams): QueryExecResult[];
    export(): Uint8Array;
    getRowsModified(): number;
    handleError(): null | empty;
    iterateStatements(sql: string): StatementIterator;
    prepare(sql: string, params?: BindParams): SqliteStatement;
    run(sql: string, params?: BindParams): SqliteDatabase;
  }

  declare export class SqliteStatement {
    bind(values?: BindParams): boolean;
    free(): boolean;
    freemem(): void;
    get(params?: BindParams): $ReadOnlyArray<SqlValue>;
    getAsObject(params?: BindParams): ParamsObject;
    getColumnNames(): $ReadOnlyArray<string>;
    getNormalizedSQL(): string;
    getSQL(): string;
    reset(): void;
    run(values?: BindParams): void;
    step(): boolean;
  }

  declare export class StatementIterator implements Iterable<SqliteStatement> {
    @@iterator: () => Iterator<SqliteStatement>;
    getRemainingSql(): string;
    next(): StatementIteratorResult;
  }

  declare export default InitSqlJsStatic;
}
