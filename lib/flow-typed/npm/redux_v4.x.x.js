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

  declare export type Dispatch<A: { type: any, ... }> = DispatchAPI<A>;

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
    reducers: $ObjMap<RootState, <V>(V) => Reducer<V, A>>,
  ): Reducer<RootState, A>;

  declare export var compose: (<A, B>(f1: (a: A) => B) => (a: A) => B) & (<A, B, C>(f1: (b: B) => C, f2: (a: A) => B) => (a: A) => C) & (<A, B, C, D>(f1: (c: C) => D, f2: (b: B) => C, f3: (a: A) => B) => (a: A) => D) & (<A, B, C, D, E>(f1: (d: D) => E, f2: (c: C) => D, f3: (b: B) => C, f4: (a: A) => B) => (a: A) => E) & ((...funcs: Array<Function>) => Function);
}
