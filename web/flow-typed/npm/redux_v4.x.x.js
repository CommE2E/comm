// flow-typed signature: f42950aebee3189b48dae0d4697c6776
// flow-typed version: 0e28de5e8a/redux_v4.x.x/flow_>=v0.201.x

declare module 'redux' {
  /*

    S = State
    A = Action
    D = Dispatch

  */

  declare export type Action<T> = { type: T, ... }

  declare export type DispatchAPI<A> = (action: A) => A;

  declare export type Dispatch<A: $ReadOnly<{ type: any, ... }>> = DispatchAPI<A>;

  declare export type MiddlewareAPI<S, A, D = Dispatch<A>> = {
    dispatch: D,
    getState(): S,
    ...
  };

  declare export type Store<S, A, D = Dispatch<A>> = {
    // rewrite MiddlewareAPI members in order to get nicer error messages (intersections produce long messages)
    dispatch: D,
    getState(): S,
    subscribe(listener: () => void): () => void,
    replaceReducer(nextReducer: Reducer<S, A>): void,
    ...
  };

  declare export type Reducer<S, A> = (state: S, action: A) => S;

  declare export type Middleware<S, A, D = Dispatch<A>> = (
    api: MiddlewareAPI<S, A, D>
  ) => (next: D) => D;

  declare export type StoreCreator<S, A, D = Dispatch<A>> = {
    (reducer: Reducer<S, A>, enhancer?: StoreEnhancer<S, A, D>): Store<S, A, D>,
    (
      reducer: Reducer<S, A>,
      preloadedState: S,
      enhancer?: StoreEnhancer<S, A, D>
    ): Store<S, A, D>,
    ...
  };

  declare export type StoreEnhancer<S, A, D = Dispatch<A>> = (
    next: StoreCreator<S, A, D>
  ) => StoreCreator<S, A, D>;

  declare export function createStore<S, A, D>(
    reducer: Reducer<S, A>,
    enhancer?: StoreEnhancer<S, A, D>
  ): Store<S, A, D>;
  declare export function createStore<S, A, D>(
    reducer: Reducer<S, A>,
    preloadedState?: S,
    enhancer?: StoreEnhancer<S, A, D>
  ): Store<S, A, D>;

  declare export function legacy_createStore<S, A, D>(
    reducer: Reducer<S, A>,
    enhancer?: StoreEnhancer<S, A, D>
  ): Store<S, A, D>;
  declare export function legacy_createStore<S, A, D>(
    reducer: Reducer<S, A>,
    preloadedState?: S,
    enhancer?: StoreEnhancer<S, A, D>
  ): Store<S, A, D>;

  declare export function applyMiddleware<S, A, D>(
    ...middlewares: Array<Middleware<S, A, D>>
  ): StoreEnhancer<S, A, D>;

  declare export type ActionCreator<A, B> = (...args: Array<B>) => A;
  declare export type ActionCreators<K, A> = { [key: K]: ActionCreator<A, any>, ... };

  declare export function bindActionCreators<
    A,
    C: ActionCreator<A, any>,
    D: DispatchAPI<A>
  >(
    actionCreator: C,
    dispatch: D
  ): C;
  declare export function bindActionCreators<
    A,
    K,
    C: ActionCreators<K, A>,
    D: DispatchAPI<A>
  >(
    actionCreators: C,
    dispatch: D
  ): C;

  declare export function combineReducers<RootState: {...}, A>(
    reducers: {[K in keyof RootState]: Reducer<RootState[K], A>}
  ): Reducer<RootState, A>;

  declare function _compose(): <T>(a: T) => T;
  declare function _compose<F: (...$ReadOnlyArray<empty>) => mixed>(
    f: F,
  ): F;
  declare function _compose<A, T: $ReadOnlyArray<any>, R>(
    f1: (a: A) => R,
    f2: (...T) => A,
  ): (...T) => R;
  declare function _compose<A, B, T: $ReadOnlyArray<any>, R>(
    f1: (b: B) => R,
    f2: (a: A) => B,
    f3: (...T) => A,
  ): (...T) => R;
  declare function _compose<A, B, C, T: $ReadOnlyArray<any>, R>(
    f1: (c: C) => R,
    f2: (b: B) => C,
    f3: (a: A) => B,
    f4: (...T) => A,
  ): (...T) => R;
  declare function _compose<R>(
    f1: (b: any) => R,
    ...funcs: $ReadOnlyArray<(...$ReadOnlyArray<empty>) => mixed>
  ): (...$ReadOnlyArray<any>) => R;
  declare function _compose<R>(
    ...funcs: $ReadOnlyArray<(...$ReadOnlyArray<empty>) => mixed>
  ): (...$ReadOnlyArray<any>) => R;

  declare export var compose: typeof _compose;
}
