// flow-typed signature: a69faaac78959be3028019885b5fd6ab
// flow-typed version: <<STUB>>/@react-navigation/native_v5.2.6/flow_v0.105.0

declare module '@react-navigation/native' {

  //---------------------------------------------------------------------------
  // SECTION 1: IDENTICAL TYPE DEFINITIONS
  // This section is identical across all React Navigation libdefs and contains
  // shared definitions. We wish we could make it DRY and import from a shared
  // definition, but that isn't yet possible.
  //---------------------------------------------------------------------------

  /**
   * SECTION 1A
   * We start with some definitions that we have copy-pasted from React Native
   * source files.
   */

  /**
   * SECTION 1B
   * The following are type declarations for core types necessary for every
   * React Navigation libdef.
   */

  declare type ScreenParams = { [key: string]: mixed };

  declare export type BackAction = {|
    +type: 'GO_BACK',
    +source?: string,
    +target?: string,
  |};

  declare export type NavigateAction = {|
    +type: 'NAVIGATE',
    +payload:
      | {| key: string, params?: ScreenParams |}
      | {| name: string, key?: string, params?: ScreenParams |},
    +source?: string,
    +target?: string,
  |};

  declare export type ResetAction = {|
    +type: 'RESET',
    +payload: PartialState<NavigationState>,
    +source?: string,
    +target?: string,
  |};

  declare export type SetParamsAction = {|
    +type: 'SET_PARAMS',
    +payload: {| params?: ScreenParams |},
    +source?: string,
    +target?: string,
  |};

  declare export type CommonAction =
    | BackAction
    | NavigateAction
    | ResetAction
    | SetParamsAction;

  declare export type LeafRoute = {|
    +key: string,
    +name: string,
    +params?: ScreenParams,
  |};
  declare export type StateRoute = {|
    ...LeafRoute,
    +state: NavigationState | StaleNavigationState,
  |};
  declare export type Route =
    | LeafRoute
    | StateRoute;

  declare export type NavigationState = {|
    +key: string,
    +index: number,
    +routeNames: $ReadOnlyArray<string>,
    +history?: $ReadOnlyArray<mixed>,
    +routes: $ReadOnlyArray<Route>,
    +type: string,
    +stale: false,
  |};

  declare export type StaleLeafRoute = {|
    +key?: string,
    +name: string,
    +params?: ScreenParams,
  |};
  declare export type StaleStateRoute = {|
    ...StaleLeafRoute,
    +state: StaleNavigationState,
  |};
  declare export type StaleRoute =
    | StaleLeafRoute
    | StaleStateRoute;
  declare export type StaleNavigationState = {|
    // It's possible to pass React Nav a StaleNavigationState with an undefined
    // index, but React Nav will always return one with the index set. This is
    // the same as for the type property below, but in the case of index we tend
    // to rely on it being set more...
    +index: number,
    +history?: $ReadOnlyArray<mixed>,
    +routes: $ReadOnlyArray<StaleRoute>,
    +type?: string,
    +stale?: true,
  |};

  declare export type PossiblyStaleNavigationState =
    | NavigationState
    | StaleNavigationState;
  declare export type PossiblyStaleRoute =
    | Route
    | StaleRoute;

}
