// @flow

declare type SqlValue = number | string | Uint8Array | null;
declare type ParamsObject = { +[key: string]: SqlValue, ... };
declare type ParamsCallback = (obj: ParamsObject) => void;

declare type BindParams = $ReadOnlyArray<SqlValue> | ParamsObject | null;

declare type QueryExecResult = {
  +columns: $ReadOnlyArray<string>,
  +values: $ReadOnlyArray<$ReadOnlyArray<SqlValue>>,
};

declare type StatementIteratorResult = {
  +done: boolean,
  +value: SqliteStatement,
};

declare type SqlJsStatic = {
  +Database: SqliteDatabase,
  +Statement: SqliteStatement,
};

declare type InitSqlJsStatic = {
  (config?: Object): Promise<SqlJsStatic>,
};

declare class SqliteDatabase {
  constructor(data?: Array<number> | Buffer | null): this;
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
  each(sql: string, callback: ParamsCallback, done: () => void): SqliteDatabase;
  exec(sql: string, params?: BindParams): $ReadOnlyArray<QueryExecResult>;
  export(): Uint8Array;
  getRowsModified(): number;
  handleError(): null | empty;
  iterateStatements(sql: string): StatementIterator;
  prepare(sql: string, params?: BindParams): SqliteStatement;
  run(sql: string, params?: BindParams): SqliteDatabase;
}

declare class SqliteStatement {
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

declare class StatementIterator implements Iterable<SqliteStatement> {
  @@iterator: () => Iterator<SqliteStatement>;
  getRemainingSql(): string;
  next(): StatementIteratorResult;
}

declare var initSqlJs: InitSqlJsStatic;
