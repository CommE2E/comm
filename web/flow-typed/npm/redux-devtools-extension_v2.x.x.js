// flow-typed signature: dde9329b5d39c60765e23c080dc5d018
// flow-typed version: 9931c6ffb0/redux-devtools-extension_v2.x.x/flow_>=v0.47.x <=v0.103.x

declare module 'redux-devtools-extension' {
  import type { ActionCreator, StoreEnhancer } from 'redux';
  import typeof { compose } from 'redux';

  declare export type DevToolsOptions = {
    name?: string,
    actionCreators?: Array<ActionCreator<any>> | { [string]: ActionCreator<any> },
    latency?: number,
    maxAge?: number,
    serialize?: boolean | {
      date?: boolean;
      regex?: boolean;
      undefined?: boolean;
      error?: boolean;
      symbol?: boolean;
      map?: boolean;
      set?: boolean;
      function?: boolean | Function;
    },
    actionSanitizer?: <A: { type: string }>(action: A, id: number) => A,
    stateSanitizer?: <S>(state: S, index: number) => S,
    actionsBlacklist?: string | string[],
    actionsWhitelist?: string | string[],
    predicate?: <S, A: { type: string }>(state: S, action: A) => boolean,
    shouldRecordChanges?: boolean,
    pauseActionType?: string,
    autoPause?: boolean,
    shouldStartLocked?: boolean,
    shouldHotReload?: boolean,
    shouldCatchErrors?: boolean,
    features?: {
      pause?: boolean,
      lock?: boolean,
      persist?: boolean,
      export?: boolean | "custom",
      import?: boolean | "custom",
      jump?: boolean,
      skip?: boolean,
      reorder?: boolean,
      dispatch?: boolean,
      test?: boolean
    }
  };

  declare function $npm$ReduxDevtoolsExtension$composeWithDevTools<A, B>(ab: A => B): A => B;
  declare function $npm$ReduxDevtoolsExtension$composeWithDevTools(options: DevToolsOptions): compose;
  declare function $npm$ReduxDevtoolsExtension$composeWithDevTools<A, B, C>(
    bc: B => C,
    ab: A => B
  ): A => C;
  declare function $npm$ReduxDevtoolsExtension$composeWithDevTools<A, B, C, D>(
    cd: C => D,
    bc: B => C,
    ab: A => B
  ): A => D;
  declare function $npm$ReduxDevtoolsExtension$composeWithDevTools<A, B, C, D, E>(
    de: D => E,
    cd: C => D,
    bc: B => C,
    ab: A => B
  ): A => E;
  declare function $npm$ReduxDevtoolsExtension$composeWithDevTools<A, B, C, D, E, F>(
    ef: E => F,
    de: D => E,
    cd: C => D,
    bc: B => C,
    ab: A => B
  ): A => F;
  declare function $npm$ReduxDevtoolsExtension$composeWithDevTools<A, B, C, D, E, F, G>(
    fg: F => G,
    ef: E => F,
    de: D => E,
    cd: C => D,
    bc: B => C,
    ab: A => B
  ): A => G;
  declare function $npm$ReduxDevtoolsExtension$composeWithDevTools<A, B, C, D, E, F, G, H>(
    gh: G => H,
    fg: F => G,
    ef: E => F,
    de: D => E,
    cd: C => D,
    bc: B => C,
    ab: A => B
  ): A => H;
  declare function $npm$ReduxDevtoolsExtension$composeWithDevTools<A, B, C, D, E, F, G, H, I>(
    hi: H => I,
    gh: G => H,
    fg: F => G,
    ef: E => F,
    de: D => E,
    cd: C => D,
    bc: B => C,
    ab: A => B
  ): A => H;

  declare function $npm$ReduxDevtoolsExtension$devToolsEnhancer<S, A>(options?: DevToolsOptions): StoreEnhancer<S, A>;

  // Exports below

  declare export var composeWithDevTools: typeof $npm$ReduxDevtoolsExtension$composeWithDevTools;
  declare export var devToolsEnhancer: typeof $npm$ReduxDevtoolsExtension$devToolsEnhancer;
}

declare module 'redux-devtools-extension/developmentOnly' {
  import type { StoreEnhancer } from 'redux';
  import type { DevToolsOptions as DevToolsOptionsBase } from 'redux-devtools-extension';
  import typeof { composeWithDevTools as ComposeWithDevTools } from 'redux-devtools-extension';

  declare function DevToolsEnhancer<S, A>(options?: DevToolsOptions): StoreEnhancer<S, A>;

  declare export type DevToolsOptions = DevToolsOptionsBase;
  declare export var composeWithDevTools: ComposeWithDevTools;
  declare export var devToolsEnhancer: typeof DevToolsEnhancer;
}

declare module 'redux-devtools-extension/logOnly' {
  import type { StoreEnhancer } from 'redux';
  import type { DevToolsOptions as DevToolsOptionsBase } from 'redux-devtools-extension';
  import typeof { composeWithDevTools as ComposeWithDevTools } from 'redux-devtools-extension';

  declare function DevToolsEnhancer<S, A>(options?: DevToolsOptions): StoreEnhancer<S, A>;

  declare export type DevToolsOptions = DevToolsOptionsBase;
  declare export var composeWithDevTools: ComposeWithDevTools;
  declare export var devToolsEnhancer: typeof DevToolsEnhancer;
}

declare module 'redux-devtools-extension/logOnlyInProduction' {
  import type { StoreEnhancer } from 'redux';
  import type { DevToolsOptions as DevToolsOptionsBase } from 'redux-devtools-extension';
  import typeof { composeWithDevTools as ComposeWithDevTools } from 'redux-devtools-extension';

  declare function DevToolsEnhancer<S, A>(options?: DevToolsOptions): StoreEnhancer<S, A>;

  declare export type DevToolsOptions = DevToolsOptionsBase;
  declare export var composeWithDevTools: ComposeWithDevTools;
  declare export var devToolsEnhancer: typeof DevToolsEnhancer;
}
