// flow-typed signature: f712ee1961974c799331608650bc7eb2
// flow-typed version: <<STUB>>/tcomb_v3.2.29/flow_v0.137.0

declare module 'tcomb' {
  declare type TBaseMeta = {
    +kind: string,
    +name: string,
    +identity: boolean,
    ...
  };

  declare export class TType<T, M = TBaseMeta> {
    (val: T): this;
    is(val: mixed): boolean;
    displayName: string;
    meta: M;
    t: T;
  }

  declare export class TIrreducible<T> extends TType<T, {|
    +kind: string,
    +name: string,
    +identity: boolean,
    +predicate: mixed => boolean,
  |}> { }

  declare export class TMaybe<T> extends TType<void | T, {|
    +kind: string,
    +name: string,
    +identity: boolean,
    +type: TType<T>,
  |}> { }

  declare export class TList<T> extends TType<Array<T>, {|
    +kind: string,
    +name: string,
    +identity: boolean,
    +type: TType<T>,
  |}> { }

  declare export class TDict<T> extends TType<{ [key: string]: T }, {|
    +kind: string,
    +name: string,
    +identity: boolean,
    +domain: TType<string>,
    +codomain: T,
  |}> { }

  declare export class TUnion<T> extends TType<T, {|
    +kind: string,
    +name: string,
    +identity: boolean,
    +types: Array<TType<T>>,
  |}> { }

  declare export class TEnums extends TType<string, {|
    +kind: string,
    +name: string,
    +identity: boolean,
    +map: Object,
  |}> { }

  declare export class TRefinement<T> extends TType<T, {|
    +kind: string,
    +name: string,
    +identity: boolean,
    +type: TType<T>,
    +predicate: mixed => boolean,
  |}> { }

  declare export type TStructProps = { [key: string]: TType<any, any> };
  declare type TStructOptions = {|
    name?: string,
    strict?: boolean,
    defaultProps?: Object,
  |};
  declare export class TInterface extends TType<any, {|
    +kind: string,
    +name: string,
    +identity: boolean,
    +props: TStructProps,
    +strict: boolean,
  |}> { }

  declare export default {
    +Bool: TIrreducible<boolean>,
    +Boolean: TIrreducible<boolean>,
    +String: TIrreducible<string>,
    +Number: TIrreducible<number>,
    +Object: TIrreducible<Object>,
    maybe<T, M>(type: TType<T, M>, name?: string): TMaybe<T>,
    list<T, M>(type: TType<T, M>, name?: string): TList<T>,
    dict<T, M1, M2>(
      domain: TType<string, M1>,
      codomain: TType<T, M2>,
      name?: string,
    ): TDict<T>,
    union<T, M>(types: Array<TType<T, M>>, name?: string): TUnion<T>,
    +enums: {|
      of(enums: $ReadOnlyArray<string>, name?: string): TEnums,
    |},
    irreducible<T>(name: string, predicate: mixed => boolean): TIrreducible<T>,
    refinement<T, M>(
      type: TType<T, M>,
      predicate: T => boolean,
      name?: string,
    ): TRefinement<T>,
    interface(
      props: TStructProps,
      options?: string | TStructOptions,
    ): TInterface,
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
