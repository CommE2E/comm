// flow-typed signature: f712ee1961974c799331608650bc7eb2
// flow-typed version: <<STUB>>/tcomb_v3.2.29/flow_v0.137.0

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

/**
 * We include stubs for each file inside this npm package in case you need to
 * require those files directly. Feel free to delete any files that aren't
 * needed.
 */
declare module 'tcomb/lib/Any' {
  declare module.exports: any;
}

declare module 'tcomb/lib/Array' {
  declare module.exports: any;
}

declare module 'tcomb/lib/assert' {
  declare module.exports: any;
}

declare module 'tcomb/lib/assign' {
  declare module.exports: any;
}

declare module 'tcomb/lib/Boolean' {
  declare module.exports: any;
}

declare module 'tcomb/lib/create' {
  declare module.exports: any;
}

declare module 'tcomb/lib/Date' {
  declare module.exports: any;
}

declare module 'tcomb/lib/declare' {
  declare module.exports: any;
}

declare module 'tcomb/lib/decompose' {
  declare module.exports: any;
}

declare module 'tcomb/lib/dict' {
  declare module.exports: any;
}

declare module 'tcomb/lib/enums' {
  declare module.exports: any;
}

declare module 'tcomb/lib/Error' {
  declare module.exports: any;
}

declare module 'tcomb/lib/extend' {
  declare module.exports: any;
}

declare module 'tcomb/lib/fail' {
  declare module.exports: any;
}

declare module 'tcomb/lib/forbidNewOperator' {
  declare module.exports: any;
}

declare module 'tcomb/lib/fromJSON' {
  declare module.exports: any;
}

declare module 'tcomb/lib/func' {
  declare module.exports: any;
}

declare module 'tcomb/lib/Function' {
  declare module.exports: any;
}

declare module 'tcomb/lib/getDefaultInterfaceName' {
  declare module.exports: any;
}

declare module 'tcomb/lib/getFunctionName' {
  declare module.exports: any;
}

declare module 'tcomb/lib/getTypeName' {
  declare module.exports: any;
}

declare module 'tcomb/lib/installTypeFormatter' {
  declare module.exports: any;
}

declare module 'tcomb/lib/Integer' {
  declare module.exports: any;
}

declare module 'tcomb/lib/interface' {
  declare module.exports: any;
}

declare module 'tcomb/lib/intersection' {
  declare module.exports: any;
}

declare module 'tcomb/lib/irreducible' {
  declare module.exports: any;
}

declare module 'tcomb/lib/is' {
  declare module.exports: any;
}

declare module 'tcomb/lib/isArray' {
  declare module.exports: any;
}

declare module 'tcomb/lib/isBoolean' {
  declare module.exports: any;
}

declare module 'tcomb/lib/isFunction' {
  declare module.exports: any;
}

declare module 'tcomb/lib/isIdentity' {
  declare module.exports: any;
}

declare module 'tcomb/lib/isInterface' {
  declare module.exports: any;
}

declare module 'tcomb/lib/isMaybe' {
  declare module.exports: any;
}

declare module 'tcomb/lib/isNil' {
  declare module.exports: any;
}

declare module 'tcomb/lib/isNumber' {
  declare module.exports: any;
}

declare module 'tcomb/lib/isObject' {
  declare module.exports: any;
}

declare module 'tcomb/lib/isString' {
  declare module.exports: any;
}

declare module 'tcomb/lib/isStruct' {
  declare module.exports: any;
}

declare module 'tcomb/lib/isSubsetOf' {
  declare module.exports: any;
}

declare module 'tcomb/lib/isType' {
  declare module.exports: any;
}

declare module 'tcomb/lib/isTypeName' {
  declare module.exports: any;
}

declare module 'tcomb/lib/isUnion' {
  declare module.exports: any;
}

declare module 'tcomb/lib/list' {
  declare module.exports: any;
}

declare module 'tcomb/lib/match' {
  declare module.exports: any;
}

declare module 'tcomb/lib/maybe' {
  declare module.exports: any;
}

declare module 'tcomb/lib/mixin' {
  declare module.exports: any;
}

declare module 'tcomb/lib/Nil' {
  declare module.exports: any;
}

declare module 'tcomb/lib/Number' {
  declare module.exports: any;
}

declare module 'tcomb/lib/Object' {
  declare module.exports: any;
}

declare module 'tcomb/lib/refinement' {
  declare module.exports: any;
}

declare module 'tcomb/lib/RegExp' {
  declare module.exports: any;
}

declare module 'tcomb/lib/String' {
  declare module.exports: any;
}

declare module 'tcomb/lib/stringify' {
  declare module.exports: any;
}

declare module 'tcomb/lib/struct' {
  declare module.exports: any;
}

declare module 'tcomb/lib/tuple' {
  declare module.exports: any;
}

declare module 'tcomb/lib/Type' {
  declare module.exports: any;
}

declare module 'tcomb/lib/union' {
  declare module.exports: any;
}

declare module 'tcomb/lib/update' {
  declare module.exports: any;
}

// Filename aliases
declare module 'tcomb/index' {
  declare module.exports: $Exports<'tcomb'>;
}
declare module 'tcomb/index.js' {
  declare module.exports: $Exports<'tcomb'>;
}
declare module 'tcomb/lib/Any.js' {
  declare module.exports: $Exports<'tcomb/lib/Any'>;
}
declare module 'tcomb/lib/Array.js' {
  declare module.exports: $Exports<'tcomb/lib/Array'>;
}
declare module 'tcomb/lib/assert.js' {
  declare module.exports: $Exports<'tcomb/lib/assert'>;
}
declare module 'tcomb/lib/assign.js' {
  declare module.exports: $Exports<'tcomb/lib/assign'>;
}
declare module 'tcomb/lib/Boolean.js' {
  declare module.exports: $Exports<'tcomb/lib/Boolean'>;
}
declare module 'tcomb/lib/create.js' {
  declare module.exports: $Exports<'tcomb/lib/create'>;
}
declare module 'tcomb/lib/Date.js' {
  declare module.exports: $Exports<'tcomb/lib/Date'>;
}
declare module 'tcomb/lib/declare.js' {
  declare module.exports: $Exports<'tcomb/lib/declare'>;
}
declare module 'tcomb/lib/decompose.js' {
  declare module.exports: $Exports<'tcomb/lib/decompose'>;
}
declare module 'tcomb/lib/dict.js' {
  declare module.exports: $Exports<'tcomb/lib/dict'>;
}
declare module 'tcomb/lib/enums.js' {
  declare module.exports: $Exports<'tcomb/lib/enums'>;
}
declare module 'tcomb/lib/Error.js' {
  declare module.exports: $Exports<'tcomb/lib/Error'>;
}
declare module 'tcomb/lib/extend.js' {
  declare module.exports: $Exports<'tcomb/lib/extend'>;
}
declare module 'tcomb/lib/fail.js' {
  declare module.exports: $Exports<'tcomb/lib/fail'>;
}
declare module 'tcomb/lib/forbidNewOperator.js' {
  declare module.exports: $Exports<'tcomb/lib/forbidNewOperator'>;
}
declare module 'tcomb/lib/fromJSON.js' {
  declare module.exports: $Exports<'tcomb/lib/fromJSON'>;
}
declare module 'tcomb/lib/func.js' {
  declare module.exports: $Exports<'tcomb/lib/func'>;
}
declare module 'tcomb/lib/Function.js' {
  declare module.exports: $Exports<'tcomb/lib/Function'>;
}
declare module 'tcomb/lib/getDefaultInterfaceName.js' {
  declare module.exports: $Exports<'tcomb/lib/getDefaultInterfaceName'>;
}
declare module 'tcomb/lib/getFunctionName.js' {
  declare module.exports: $Exports<'tcomb/lib/getFunctionName'>;
}
declare module 'tcomb/lib/getTypeName.js' {
  declare module.exports: $Exports<'tcomb/lib/getTypeName'>;
}
declare module 'tcomb/lib/installTypeFormatter.js' {
  declare module.exports: $Exports<'tcomb/lib/installTypeFormatter'>;
}
declare module 'tcomb/lib/Integer.js' {
  declare module.exports: $Exports<'tcomb/lib/Integer'>;
}
declare module 'tcomb/lib/interface.js' {
  declare module.exports: $Exports<'tcomb/lib/interface'>;
}
declare module 'tcomb/lib/intersection.js' {
  declare module.exports: $Exports<'tcomb/lib/intersection'>;
}
declare module 'tcomb/lib/irreducible.js' {
  declare module.exports: $Exports<'tcomb/lib/irreducible'>;
}
declare module 'tcomb/lib/is.js' {
  declare module.exports: $Exports<'tcomb/lib/is'>;
}
declare module 'tcomb/lib/isArray.js' {
  declare module.exports: $Exports<'tcomb/lib/isArray'>;
}
declare module 'tcomb/lib/isBoolean.js' {
  declare module.exports: $Exports<'tcomb/lib/isBoolean'>;
}
declare module 'tcomb/lib/isFunction.js' {
  declare module.exports: $Exports<'tcomb/lib/isFunction'>;
}
declare module 'tcomb/lib/isIdentity.js' {
  declare module.exports: $Exports<'tcomb/lib/isIdentity'>;
}
declare module 'tcomb/lib/isInterface.js' {
  declare module.exports: $Exports<'tcomb/lib/isInterface'>;
}
declare module 'tcomb/lib/isMaybe.js' {
  declare module.exports: $Exports<'tcomb/lib/isMaybe'>;
}
declare module 'tcomb/lib/isNil.js' {
  declare module.exports: $Exports<'tcomb/lib/isNil'>;
}
declare module 'tcomb/lib/isNumber.js' {
  declare module.exports: $Exports<'tcomb/lib/isNumber'>;
}
declare module 'tcomb/lib/isObject.js' {
  declare module.exports: $Exports<'tcomb/lib/isObject'>;
}
declare module 'tcomb/lib/isString.js' {
  declare module.exports: $Exports<'tcomb/lib/isString'>;
}
declare module 'tcomb/lib/isStruct.js' {
  declare module.exports: $Exports<'tcomb/lib/isStruct'>;
}
declare module 'tcomb/lib/isSubsetOf.js' {
  declare module.exports: $Exports<'tcomb/lib/isSubsetOf'>;
}
declare module 'tcomb/lib/isType.js' {
  declare module.exports: $Exports<'tcomb/lib/isType'>;
}
declare module 'tcomb/lib/isTypeName.js' {
  declare module.exports: $Exports<'tcomb/lib/isTypeName'>;
}
declare module 'tcomb/lib/isUnion.js' {
  declare module.exports: $Exports<'tcomb/lib/isUnion'>;
}
declare module 'tcomb/lib/list.js' {
  declare module.exports: $Exports<'tcomb/lib/list'>;
}
declare module 'tcomb/lib/match.js' {
  declare module.exports: $Exports<'tcomb/lib/match'>;
}
declare module 'tcomb/lib/maybe.js' {
  declare module.exports: $Exports<'tcomb/lib/maybe'>;
}
declare module 'tcomb/lib/mixin.js' {
  declare module.exports: $Exports<'tcomb/lib/mixin'>;
}
declare module 'tcomb/lib/Nil.js' {
  declare module.exports: $Exports<'tcomb/lib/Nil'>;
}
declare module 'tcomb/lib/Number.js' {
  declare module.exports: $Exports<'tcomb/lib/Number'>;
}
declare module 'tcomb/lib/Object.js' {
  declare module.exports: $Exports<'tcomb/lib/Object'>;
}
declare module 'tcomb/lib/refinement.js' {
  declare module.exports: $Exports<'tcomb/lib/refinement'>;
}
declare module 'tcomb/lib/RegExp.js' {
  declare module.exports: $Exports<'tcomb/lib/RegExp'>;
}
declare module 'tcomb/lib/String.js' {
  declare module.exports: $Exports<'tcomb/lib/String'>;
}
declare module 'tcomb/lib/stringify.js' {
  declare module.exports: $Exports<'tcomb/lib/stringify'>;
}
declare module 'tcomb/lib/struct.js' {
  declare module.exports: $Exports<'tcomb/lib/struct'>;
}
declare module 'tcomb/lib/tuple.js' {
  declare module.exports: $Exports<'tcomb/lib/tuple'>;
}
declare module 'tcomb/lib/Type.js' {
  declare module.exports: $Exports<'tcomb/lib/Type'>;
}
declare module 'tcomb/lib/union.js' {
  declare module.exports: $Exports<'tcomb/lib/union'>;
}
declare module 'tcomb/lib/update.js' {
  declare module.exports: $Exports<'tcomb/lib/update'>;
}
