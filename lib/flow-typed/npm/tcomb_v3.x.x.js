declare module 'tcomb' {
  declare export type TPredicate<T> = (x: T) => boolean;
  declare export type TTypeGuardPredicate<T> = (x: any) => boolean;
  declare export type TType<T> = {
    (value: T): T,
    is: TTypeGuardPredicate<T>,
    displayName: string,
    meta: {
      kind: string,
      name: string,
      identity: boolean,
      ...
    },
    t: T,
    ...
  } & Function;
  declare export type TIrreducible<T> = {
    meta: {
      kind: string,
      name: string,
      identity: boolean,
      predicate: TTypeGuardPredicate<T>,
      ...
    },
    ...
  } & TType<T>;


  declare interface ApplyCommand {
    $apply: Function;
  }
  declare interface PushCommand {
    $push: Array<any>;
  }
  declare interface RemoveCommand {
    $remove: Array<string>;
  }
  declare interface SetCommand {
    $set: any;
  }
  declare interface SpliceCommand {
    $splice: Array<Array<any>>;
  }
  declare interface SwapCommand {
    $swap: {
      from: number,
      to: number,
      ...
    };
  }
  declare interface UnshiftCommand {
    $unshift: Array<any>;
  }
  declare interface MergeCommand {
    $merge: Object;
  }
  declare export type TCommand =
    | ApplyCommand
    | PushCommand
    | RemoveCommand
    | SetCommand
    | SpliceCommand
    | SwapCommand
    | UnshiftCommand
    | MergeCommand;
  declare export type TUpdatePatch =
    | TCommand
    | {
        [key: string]: TUpdatePatch,
        ...
      };
  declare export type TUpdate<T> = (instance: T, spec: TUpdatePatch) => T;
  declare export type TConstructor<T> = TType<T> | Function;
  declare export type TRefinement<T> = {
    meta: {
      kind: string,
      name: string,
      identity: boolean,
      type: TConstructor<T>,
      predicate: TTypeGuardPredicate<T>,
      ...
    },
    update: TUpdate<T>,
    ...
  } & TType<T>;
  declare export type TStructProps = {
    [key: string]: TConstructor<any>,
    ...
  };
  declare export type TStructMixin = TStructProps | TStruct<any> | TInterface;
  declare export type TStruct<T> = {
    new(value: T): T,
    meta: {
      kind: string,
      name: string,
      identity: boolean,
      props: TStructProps,
      strict: boolean,
      defaultProps: { [key: string]: any },
      ...
    },
    update: TUpdate<T>,
    extend<E: T>(
      mixins: TStructMixin | Array<TStructMixin>,
      name?: string | TStructOptions
    ): TStruct<E>,
    ...
  } & TType<T>;
  declare export type TStructOptions = {
    name?: string,
    strict?: boolean,
    defaultProps?: { [key: string]: any },
    ...
  };
  declare export type TInterface = {
    meta: {
      kind: string,
      name: string,
      identity: boolean,
      props: TStructProps,
      strict: boolean,
      ...
    },
    update: TUpdate<any>,
    extend<E: any>(
      mixins: TStructMixin | Array<TStructMixin>,
      name?: string | TStructOptions
    ): TStruct<E>,
    ...
  } & TType<T>;
  declare export type TList<T> = {
    meta: {
      kind: string,
      name: string,
      identity: boolean,
      type: TConstructor<T>,
      ...
    },
    update: TUpdate<Array<T>>,
    ...
  } & TType<Array<T>>;
  declare export type TDict<T> = {
    meta: {
      kind: string,
      name: string,
      identity: boolean,
      domain: TConstructor<string>,
      codomain: T,
      ...
    },
    update: TUpdate<{
      [key: string]: T,
      ...
    }>,
    ...
  } & TType<{
    [key: string]: T,
    ...
  }>;
  declare export type TEnums = {
    meta: {
      kind: string,
      name: string,
      identity: boolean,
      map: Object,
      ...
    },
    ...
  } & TType<string>;
  declare export type TEnumsFunction = {
    (map: Object, name?: string): TEnums,
    of(TEnums: string, name?: string): TEnums,
    of(TEnums: Array<string>, name?: string): TEnums,
    ...
  } & Function;
  declare export type TMaybe<T> = {
    meta: {
      kind: string,
      name: string,
      identity: boolean,
      type: TConstructor<T>,
      ...
    },
    update: TUpdate<void | T>,
    ...
  } & TType<void | T>;
  declare export type TTuple<T> = {
    meta: {
      kind: string,
      name: string,
      identity: boolean,
      types: Array<TConstructor<any>>,
      ...
    },
    update: TUpdate<T>,
    ...
  } & TType<T>;
  declare export type TUnion<T> = {
    meta: {
      kind: string,
      name: string,
      identity: boolean,
      types: Array<TConstructor<T>>,
      ...
    },
    update: TUpdate<T>,
    dispatch(x: any): TConstructor<T>,
    ...
  } & TType<T>;
  declare export type TIntersection<T> = {
    meta: {
      kind: string,
      name: string,
      identity: boolean,
      types: Array<TConstructor<any>>,
      ...
    },
    update: TUpdate<T>,
    ...
  } & TType<T>;
  declare export type TDeclare<T> = {
    update: TUpdate<T>,
    define(type: TType<any>): void,
    ...
  } & TType<T>;
  declare export type TLazyMessage = () => string;


  declare export type TClause = TConstructor<any> | (x: any) => any;
  declare export var update: TUpdate<Object>;

  declare export default {
    +Any: TIrreducible<any>,
    +Nil: TIrreducible<void | null>,
    +Bool: TIrreducible<boolean>,
    +Boolean: TIrreducible<boolean>,
    +String: TIrreducible<string>,
    +Number: TIrreducible<number>,
    +Integer: TIrreducible<number>,
    +Array: TIrreducible<Array<any>>,
    +Object: TIrreducible<Object>,
    +Function: TIrreducible<Function>,
    +Error: TIrreducible<Error>,
    +RegExp: TIrreducible<RegExp>,
    +Date: TIrreducible<Date>,
    maybe<T>(type: TConstructor<T>, name?: string): TMaybe<T>,
    list<T>(type: TConstructor<T>, name?: string): TList<T>,
    dict<T>(
      domain: TConstructor<string>,
      codomain: TConstructor<T>,
      name?: string
    ): TDict<T>,
    union<T>(
      types: Array<TConstructor<T>>,
      name?: string,
    ): TUnion<T>;
    +enums: TEnumsFunction,
    irreducible<T>(
      name: string,
      predicate: TPredicate<any>
    ): TIrreducible<T>;
    refinement<T>(
      type: Constructor<T>,
      predicate: TPredicate<T>,
      name?: string
    ): Refinement<T>;
    interface<T>(
      props: TStructProps,
      name?: string | TStructOptions
    ): TInterface,
    struct<T>(
      props: TStructProps,
      name?: string | TStructOptions
    ): TStruct<T>,
    isType<T>(x: TConstructor<T>): boolean,
    getTypeName<T>(x: TConstructor<T>): string,
    mixin<T, S>(
      target: T,
      source: S,
      overwrite?: boolean
    ): { ...T, ...S },
    declare<T>(name?: string): TDeclare<T>,
    is<T>(x: any, type: TConstructor<T>): boolean,
    assert(
      guard: boolean,
      message?: string | TLazyMessage
    ): void,
    match(x: any, ...clauses: Array<TClause>): any,
    tuple<T>(
      types: Array<TConstructor<any>>,
      name?: string
    ): TTuple<T>;
    intersection<T>(
      types: Array<TConstructor<any>>,
      name?: string
    ): TIntersection<T>;
  ...
  };
}