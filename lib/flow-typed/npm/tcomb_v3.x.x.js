// flow-typed signature: f712ee1961974c799331608650bc7eb2
// flow-typed version: <<STUB>>/tcomb_v3.2.29/flow_v0.137.0

declare module 'tcomb' {
  declare class TBaseType<+T> {
    (val: T): this;
    is(val: mixed): boolean;
    displayName: string;
    +t: T;
  }

  declare export type TType<+T> =
    | TIrreducible<T>
    | TMaybe<T>
    | TList<T>
    | TDict<T>
    | TUnion<T>
    | TEnums
    | TRefinement<T>
    | TInterface<T>;

  declare export class TIrreducible<+T> extends TBaseType<T> {
    meta: {
      +kind: 'irreducible',
      +name: string,
      +identity: boolean,
      +predicate: mixed => boolean,
    };
  }

  declare export class TMaybe<+T> extends TBaseType<T> {
    meta: {
      +kind: 'maybe',
      +name: string,
      +identity: boolean,
      +type: TType<T>,
    };
  }

  declare export class TList<+T> extends TBaseType<T> {
    meta: {
      +kind: 'list',
      +name: string,
      +identity: boolean,
      +type: TType<T>,
    };
  }

  declare export class TDict<+T> extends TBaseType<T> {
    meta: {
      +kind: 'dict',
      +name: string,
      +identity: boolean,
      +domain: TType<string>,
      +codomain: TType<T>,
    };
  }

  declare export class TUnion<+T> extends TBaseType<T> {
    meta: {
      +kind: 'union',
      +name: string,
      +identity: boolean,
      +types: Array<TType<T>>,
    };
  }

  declare export class TEnums extends TBaseType<string> {
    meta: {
      +kind: 'enums',
      +name: string,
      +identity: boolean,
      +map: Object,
    };
  }

  declare export class TRefinement<+T> extends TBaseType<T> {
    meta: {
      +kind: 'subtype',
      +name: string,
      +identity: boolean,
      +type: TType<T>,
      +predicate: mixed => boolean,
    };
  }

  declare type TypeToValidator = <V>(v: V) => TType<V>;

  declare export type TStructProps<+T> = $ObjMap<T, TypeToValidator>;
  declare type TStructOptions = {
    name?: string,
    strict?: boolean,
    defaultProps?: Object,
  };

  declare export class TInterface<+T> extends TBaseType<T> {
    meta: {
      +kind: 'interface',
      +name: string,
      +identity: boolean,
      +props: TStructProps<T>,
      +strict: boolean,
    };
  }

  declare export default {
    +Nil: TIrreducible<void | null>,
    +Bool: TIrreducible<boolean>,
    +Boolean: TIrreducible<boolean>,
    +String: TIrreducible<string>,
    +Number: TIrreducible<number>,
    +Object: TIrreducible<Object>,
    maybe<T>(type: TType<T>, name?: string): TMaybe<void | T>,
    list<T>(type: TType<T>, name?: string): TList<Array<T>>,
    dict<T>(
      domain: TType<string>,
      codomain: TType<T>,
      name?: string,
    ): TDict<{ [key: string]: T }>,
    union<+T>(types: $ReadOnlyArray<TType<T>>, name?: string): TUnion<T>,
    +enums: {
      of(enums: $ReadOnlyArray<string>, name?: string): TEnums,
    },
    irreducible<T>(
      name: string,
      predicate: (mixed) => boolean,
    ): TIrreducible<T>,
    refinement<T>(
      type: TType<T>,
      predicate: (T) => boolean,
      name?: string,
    ): TRefinement<T>,
    interface<T>(
      props: TStructProps<T>,
      options?: string | TStructOptions,
    ): TInterface<T>,
    ...
  };
}
