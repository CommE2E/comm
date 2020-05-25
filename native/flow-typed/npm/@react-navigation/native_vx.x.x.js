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

  declare type $If<Test: boolean, Then, Else = empty> = $Call<
    ((true, Then, Else) => Then) & ((false, Then, Else) => Else),
    Test,
    Then,
    Else,
  >;
  declare type $IsA<X, Y> = $Call<
    (Y => true) & (mixed => false),
    X,
  >;
  declare type $IsUndefined<X> = $IsA<X, void>;
  declare type $IsExact<X> = $IsA<X, $Exact<X>>;

  declare export type ScreenParams = { +[key: string]: mixed };

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
    +payload: StaleNavigationState,
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

  declare export type GenericNavigationAction = {|
    type: string,
    payload?: { [key: string]: mixed },
    source?: string,
    target?: string,
  |};

  declare export type LeafRoute<RouteName: string = string> = {|
    +key: string,
    +name: RouteName,
    +params?: ScreenParams,
  |};
  declare export type StateRoute<RouteName: string = string> = {|
    ...LeafRoute<RouteName>,
    +state: NavigationState | StaleNavigationState,
  |};
  declare export type Route<RouteName: string = string> =
    | LeafRoute<RouteName>
    | StateRoute<RouteName>;

  declare export type NavigationState = {|
    +key: string,
    +index: number,
    +routeNames: $ReadOnlyArray<string>,
    +history?: $ReadOnlyArray<mixed>,
    +routes: $ReadOnlyArray<Route<>>,
    +type: string,
    +stale: false,
  |};

  declare export type StaleLeafRoute<RouteName: string = string> = {|
    +key?: string,
    +name: RouteName,
    +params?: ScreenParams,
  |};
  declare export type StaleStateRoute<RouteName: string = string> = {|
    ...StaleLeafRoute<RouteName>,
    +state: StaleNavigationState,
  |};
  declare export type StaleRoute<RouteName: string = string> =
    | StaleLeafRoute<RouteName>
    | StaleStateRoute<RouteName>;
  declare export type StaleNavigationState = {|
    // It's possible to pass React Nav a StaleNavigationState with an undefined
    // index, but React Nav will always return one with the index set. This is
    // the same as for the type property below, but in the case of index we tend
    // to rely on it being set more...
    +index: number,
    +history?: $ReadOnlyArray<mixed>,
    +routes: $ReadOnlyArray<StaleRoute<>>,
    +type?: string,
    +stale?: true,
  |};

  declare export type PossiblyStaleNavigationState =
    | NavigationState
    | StaleNavigationState;
  declare export type PossiblyStaleRoute<RouteName: string = string> =
    | Route<RouteName>
    | StaleRoute<RouteName>;

  declare export type ParamListBase = { +[key: string]: ?ScreenParams };

  declare type EventMapBase = {
    +[name: string]: {|
      +data?: mixed,
      +canPreventDefault?: boolean,
    |},
  };
  declare type EventPreventDefaultProperties<Test: boolean> = $If<
    Test,
    {| +defaultPrevented: boolean, +preventDefault: () => void |},
    {| |},
  >;
  declare type EventDataProperties<Data> = $If<
    $IsUndefined<Data>,
    {| |},
    {| +data: Data |},
  >;
  declare type EventArg<
    EventName: string,
    CanPreventDefault: ?boolean = false,
    Data = void,
  > = {|
    ...EventPreventDefaultProperties<CanPreventDefault>,
    ...EventDataProperties<Data>,
    +type: EventName,
    +target?: string,
  |};
  declare type EventMapCore<State: PossiblyStaleNavigationState> = {|
    +focus: {| +data: void, +canPreventDefault: false |},
    +blur: {| +data: void, +canPreventDefault: false |},
    +state: {| +data: {| state: State |}, +canPreventDefault: false |},
  |};
  declare type EventListenerCallback<
    EventName: string,
    State: NavigationState = NavigationState,
    EventMap: EventMapBase = EventMapCore<State>,
  > = (e: EventArg<
    EventName,
    $PropertyType<
      $ElementType<
        {| ...EventMap, ...EventMapCore<State> |},
        EventName,
      >,
      'canPreventDefault',
    >,
    $PropertyType<
      $ElementType<
        {| ...EventMap, ...EventMapCore<State> |},
        EventName,
      >,
      'data',
    >,
  >) => mixed;

  declare export type SimpleNavigate<ParamList> =
    <DestinationRouteName: $Keys<ParamList>>(
      routeName: DestinationRouteName,
      params: $ElementType<ParamList, DestinationRouteName>,
    ) => void;

  declare export type Navigate<ParamList> =
    & SimpleNavigate<ParamList>
    & <DestinationRouteName: $Keys<ParamList>>(
        route:
          | {|
              key: string,
              params?: $ElementType<ParamList, DestinationRouteName>,
            |}
          | {|
              name: DestinationRouteName,
              key?: string,
              params?: $ElementType<ParamList, DestinationRouteName>,
            |},
      ) => void;

  declare export type NavigationProp<
    ParamList: ParamListBase,
    RouteName: $Keys<ParamList> = string,
    State: NavigationState = NavigationState,
    ScreenOptions: {} = {},
    EventMap: EventMapBase = EventMapCore<State>,
  > = {
    +dispatch: (
      action:
        | GenericNavigationAction
        | (State => GenericNavigationAction),
    ) => void,
    +navigate: Navigate<$If<
      $IsExact<ParamList>,
      ParamList,
      { ...ParamListBase, ...ParamList },
    >>,
    +reset: PossiblyStaleNavigationState => void,
    +goBack: () => void,
    +isFocused: () => boolean,
    +canGoBack: () => boolean,
    +dangerouslyGetParent: <Parent: NavigationProp<ParamListBase>>() => ?Parent,
    +dangerouslyGetState: () => NavigationState,
    +setParams: (
      params: $Shape<$NonMaybeType<$ElementType<
        $If<
          $IsExact<ParamList>,
          ParamList,
          { ...ParamListBase, ...ParamList },
        >,
        RouteName,
      >>>,
    ) => void,
    +setOptions: (options: $Shape<ScreenOptions>) => void,
    +addListener: <EventName: $Keys<
      {| ...EventMap, ...EventMapCore<State> |},
    >>(
      name: EventName,
      callback: EventListenerCallback<EventName, State, EventMap>,
    ) => () => void,
    +removeListener: <EventName: $Keys<
      {| ...EventMap, ...EventMapCore<State> |},
    >>(
      name: EventName,
      callback: EventListenerCallback<EventName, State, EventMap>,
    ) => void,
    ...
  };

  declare export type RouteProp<
    ParamList: ParamListBase,
    RouteName: $Keys<ParamList>,
  > = {|
    ...LeafRoute<RouteName>,
    +params: $ElementType<ParamList, RouteName>,
  |};

  declare export type ScreenListeners<
    EventMap: EventMapBase = EventMapCore<State>,
    State: NavigationState = NavigationState,
  > = $ObjMapi<
    {| [name: $Keys<EventMap>]: empty |},
    <K: $Keys<EventMap>>(K, empty) => EventListenerCallback<K, State, EventMap>,
  >;

  declare type BaseScreenProps<
    GlobalParamList: ParamListBase,
    ParamList: ParamListBase = GlobalParamList,
    RouteName: $Keys<ParamList> = string,
    State: NavigationState = NavigationState,
    ScreenOptions: {} = {},
    EventMap: EventMapBase = EventMapCore<State>,
  > = {|
    name: RouteName,
    options?:
      | ScreenOptions
      | ({|
          route: RouteProp<ParamList, RouteName>,
          navigation: NavigationProp<
            GlobalParamList,
            RouteName,
            State,
            ScreenOptions,
            EventMap,
          >,
        |}) => ScreenOptions,
    listeners?:
      | ScreenListeners<EventMap, State>
      | ({|
          route: RouteProp<ParamList, RouteName>,
          navigation: NavigationProp<
            GlobalParamList,
            RouteName,
            State,
            ScreenOptions,
            EventMap,
          >,
        |}) => ScreenListeners<EventMap, State>,
    initialParams?: $Shape<$ElementType<ParamList, RouteName>>,
  |};

  declare export type ScreenProps<
    GlobalParamList: ParamListBase,
    ParamList: ParamListBase = GlobalParamList,
    RouteName: $Keys<ParamList> = string,
    State: NavigationState = NavigationState,
    ScreenOptions: {} = {},
    EventMap: EventMapBase = EventMapCore<State>,
  > =
    | {|
        ...BaseScreenProps<
          GlobalParamList,
          ParamList,
          RouteName,
          State,
          ScreenOptions,
          EventMap,
        >,
        component: React$ComponentType<{|
          route: RouteProp<ParamList, RouteName>,
          navigation: NavigationProp<
            GlobalParamList,
            RouteName,
            State,
            ScreenOptions,
            EventMap,
          >,
        |}>,
      |}
    | {|
        ...BaseScreenProps<
          GlobalParamList,
          ParamList,
          RouteName,
          State,
          ScreenOptions,
          EventMap,
        >,
        children: ({|
          route: RouteProp<ParamList, RouteName>,
          navigation: NavigationProp<
            GlobalParamList,
            RouteName,
            State,
            ScreenOptions,
            EventMap,
          >,
        |}) => React$Node,
      |};

  declare export type ScreenComponent<
    GlobalParamList: ParamListBase,
    ParamList: ParamListBase = GlobalParamList,
    State: NavigationState = NavigationState,
    ScreenOptions: {} = {},
    EventMap: EventMapBase = EventMapCore<State>,
  > = <RouteName: $Keys<ParamList>>(props: ScreenProps<
    GlobalParamList,
    ParamList,
    RouteName,
    State,
    ScreenOptions,
    EventMap,
  >) => React$Node;

  declare export type NavigatorComponent<
    GlobalParamList: ParamListBase,
    ParamList: ParamListBase = GlobalParamList,
    State: NavigationState = NavigationState,
    ScreenOptions: {} = {},
    EventMap: EventMapBase = EventMapCore<State>,
  > = React$ComponentType<{
    initialRouteName?: $Keys<ParamList>,
    screenOptions?:
      | ScreenOptions
      | ({|
          route: RouteProp<ParamList, $Keys<ParamList>>,
          navigation: NavigationProp<
            GlobalParamList,
            $Keys<ParamList>,
            State,
            ScreenOptions,
            EventMap,
          >,
        |}) => ScreenOptions,
    ...
  }>;

  declare export type CreateNavigator<
    State: NavigationState = NavigationState,
    ScreenOptions: {} = {},
    EventMap: EventMapBase = EventMapCore<State>,
  > = <
    GlobalParamList: ParamListBase,
    ParamList: ParamListBase = GlobalParamList,
  >() => {|
    Screen: ScreenComponent<
      GlobalParamList,
      ParamList,
      State,
      ScreenOptions,
      EventMap,
    >,
    Navigator: NavigatorComponent<
      GlobalParamList,
      ParamList,
      State,
      ScreenOptions,
      EventMap,
    >,
  |};

  //---------------------------------------------------------------------------
  // SECTION 2: SHARED TYPE DEFINITIONS
  // This section too is copy-pasted, but it's not identical across all React
  // Navigation libdefs. We pick out bits and pieces that we need.
  //---------------------------------------------------------------------------

  /**
   * SECTION 2A
   * We start with definitions we have copy-pasted, either from in-package
   * types, other Flow libdefs, or from TypeScript types somewhere.
   */

  /**
   * SECTION 2B
   * The following are the actually useful definitions in Section 2, that are
   * used below in section 3, but also in other libdefs.
   */

  //---------------------------------------------------------------------------
  // SECTION 3: UNIQUE TYPE DEFINITIONS
  // This section normally contains exported types that are not present in any
  // other React Navigation libdef. But the main react-navigation libdef doesn't
  // have any, so it's empty here.
  //---------------------------------------------------------------------------

  //---------------------------------------------------------------------------
  // SECTION 4: EXPORTED MODULE
  // This is the only section that types exports. Other sections export types,
  // but this section types the module's exports.
  //---------------------------------------------------------------------------

  declare type NavigateActionCreator = {|
    (routeName: string, params?: ScreenParams): NavigateAction,
    (
      | {| key: string, params?: ScreenParams |}
      | {| name: string, key?: string, params?: ScreenParams |},
    ): NavigateAction,
  |};

  declare export var CommonActions: {|
    navigate: NavigateActionCreator,
    goBack: () => BackAction,
    reset: (state: PossiblyStaleNavigationState) => ResetAction,
    setParams: (params: ScreenParams) => SetParamsAction,
  |};

}
