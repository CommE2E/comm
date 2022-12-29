// flow-typed signature: 6070a4afddfa183e7c7bda53e69c0044
// flow-typed version: dc2d6a22c7/@react-navigation/bottom-tabs_v5.x.x/flow_>=v0.104.x

declare module '@react-navigation/bottom-tabs' {

  //---------------------------------------------------------------------------
  // SECTION 1: IDENTICAL TYPE DEFINITIONS
  // This section is identical across all React Navigation libdefs and contains
  // shared definitions. We wish we could make it DRY and import from a shared
  // definition, but that isn't yet possible.
  //---------------------------------------------------------------------------

  /**
   * We start with some definitions that we have copy-pasted from React Native
   * source files.
   */

  // This is a bastardization of the true StyleObj type located in
  // react-native/Libraries/StyleSheet/StyleSheetTypes. We unfortunately can't
  // import that here, and it's too lengthy (and consequently too brittle) to
  // copy-paste here either.
  declare type StyleObj =
    | null
    | void
    | number
    | false
    | ''
    | $ReadOnlyArray<StyleObj>
    | { [name: string]: any, ... };
  declare type ViewStyleProp = StyleObj;
  declare type TextStyleProp = StyleObj;
  declare type AnimatedViewStyleProp = StyleObj;
  declare type AnimatedTextStyleProp = StyleObj;

  // Vaguely copied from
  // react-native/Libraries/Animated/src/animations/Animation.js
  declare type EndResult = { finished: boolean, ... };
  declare type EndCallback = (result: EndResult) => void;
  declare interface Animation {
    start(
      fromValue: number,
      onUpdate: (value: number) => void,
      onEnd: ?EndCallback,
      previousAnimation: ?Animation,
      animatedValue: AnimatedValue,
    ): void;
    stop(): void;
  }
  declare type AnimationConfig = {
    isInteraction?: boolean,
    useNativeDriver: boolean,
    onComplete?: ?EndCallback,
    iterations?: number,
    ...
  };

  // Vaguely copied from
  // react-native/Libraries/Animated/src/nodes/AnimatedTracking.js
  declare interface AnimatedTracking {
    constructor(
      value: AnimatedValue,
      parent: any,
      animationClass: any,
      animationConfig: Object,
      callback?: ?EndCallback,
    ): void;
    update(): void;
  }

  // Vaguely copied from
  // react-native/Libraries/Animated/src/nodes/AnimatedValue.js
  declare type ValueListenerCallback = (state: { value: number, ... }) => void;
  declare interface AnimatedValue {
    constructor(value: number): void;
    setValue(value: number): void;
    setOffset(offset: number): void;
    flattenOffset(): void;
    extractOffset(): void;
    addListener(callback: ValueListenerCallback): string;
    removeListener(id: string): void;
    removeAllListeners(): void;
    stopAnimation(callback?: ?(value: number) => void): void;
    resetAnimation(callback?: ?(value: number) => void): void;
    interpolate(config: InterpolationConfigType): AnimatedInterpolation;
    animate(animation: Animation, callback: ?EndCallback): void;
    stopTracking(): void;
    track(tracking: AnimatedTracking): void;
  }

  // Copied from
  // react-native/Libraries/Animated/src/animations/TimingAnimation.js
  declare type TimingAnimationConfigSingle = AnimationConfig & {
    toValue: number | AnimatedValue,
    easing?: (value: number) => number,
    duration?: number,
    delay?: number,
    ...
  };

  // Copied from
  // react-native/Libraries/Animated/src/animations/SpringAnimation.js
  declare type SpringAnimationConfigSingle = AnimationConfig & {
    toValue: number | AnimatedValue,
    overshootClamping?: boolean,
    restDisplacementThreshold?: number,
    restSpeedThreshold?: number,
    velocity?: number,
    bounciness?: number,
    speed?: number,
    tension?: number,
    friction?: number,
    stiffness?: number,
    damping?: number,
    mass?: number,
    delay?: number,
    ...
  };

  // Copied from react-native/Libraries/Types/CoreEventTypes.js
  declare type SyntheticEvent<T> = $ReadOnly<{|
    bubbles: ?boolean,
    cancelable: ?boolean,
    currentTarget: number,
    defaultPrevented: ?boolean,
    dispatchConfig: $ReadOnly<{|
      registrationName: string,
    |}>,
    eventPhase: ?number,
    preventDefault: () => void,
    isDefaultPrevented: () => boolean,
    stopPropagation: () => void,
    isPropagationStopped: () => boolean,
    isTrusted: ?boolean,
    nativeEvent: T,
    persist: () => void,
    target: ?number,
    timeStamp: number,
    type: ?string,
  |}>;
  declare type Layout = $ReadOnly<{|
    x: number,
    y: number,
    width: number,
    height: number,
  |}>;
  declare type LayoutEvent = SyntheticEvent<
    $ReadOnly<{|
      layout: Layout,
    |}>,
  >;
  declare type BlurEvent = SyntheticEvent<
    $ReadOnly<{|
      target: number,
    |}>,
  >;
  declare type FocusEvent = SyntheticEvent<
    $ReadOnly<{|
      target: number,
    |}>,
  >;
  declare type ResponderSyntheticEvent<T> = $ReadOnly<{|
    ...SyntheticEvent<T>,
    touchHistory: $ReadOnly<{|
      indexOfSingleActiveTouch: number,
      mostRecentTimeStamp: number,
      numberActiveTouches: number,
      touchBank: $ReadOnlyArray<
        $ReadOnly<{|
          touchActive: boolean,
          startPageX: number,
          startPageY: number,
          startTimeStamp: number,
          currentPageX: number,
          currentPageY: number,
          currentTimeStamp: number,
          previousPageX: number,
          previousPageY: number,
          previousTimeStamp: number,
        |}>,
      >,
    |}>,
  |}>;
  declare type PressEvent = ResponderSyntheticEvent<
    $ReadOnly<{|
      changedTouches: $ReadOnlyArray<$PropertyType<PressEvent, 'nativeEvent'>>,
      force: number,
      identifier: number,
      locationX: number,
      locationY: number,
      pageX: number,
      pageY: number,
      target: ?number,
      timestamp: number,
      touches: $ReadOnlyArray<$PropertyType<PressEvent, 'nativeEvent'>>,
    |}>,
  >;

  // Vaguely copied from
  // react-native/Libraries/Animated/src/nodes/AnimatedInterpolation.js
  declare type ExtrapolateType = 'extend' | 'identity' | 'clamp';
  declare type InterpolationConfigType = {
    inputRange: Array<number>,
    outputRange: Array<number> | Array<string>,
    easing?: (input: number) => number,
    extrapolate?: ExtrapolateType,
    extrapolateLeft?: ExtrapolateType,
    extrapolateRight?: ExtrapolateType,
    ...
  };
  declare interface AnimatedInterpolation {
    interpolate(config: InterpolationConfigType): AnimatedInterpolation;
  }

  // Copied from react-native/Libraries/Components/View/ViewAccessibility.js
  declare type AccessibilityRole =
    | 'none'
    | 'button'
    | 'link'
    | 'search'
    | 'image'
    | 'keyboardkey'
    | 'text'
    | 'adjustable'
    | 'imagebutton'
    | 'header'
    | 'summary'
    | 'alert'
    | 'checkbox'
    | 'combobox'
    | 'menu'
    | 'menubar'
    | 'menuitem'
    | 'progressbar'
    | 'radio'
    | 'radiogroup'
    | 'scrollbar'
    | 'spinbutton'
    | 'switch'
    | 'tab'
    | 'tablist'
    | 'timer'
    | 'toolbar';
  declare type AccessibilityActionInfo = $ReadOnly<{
    name: string,
    label?: string,
    ...
  }>;
  declare type AccessibilityActionEvent = SyntheticEvent<
    $ReadOnly<{actionName: string, ...}>,
  >;
  declare type AccessibilityState = {
    disabled?: boolean,
    selected?: boolean,
    checked?: ?boolean | 'mixed',
    busy?: boolean,
    expanded?: boolean,
    ...
  };
  declare type AccessibilityValue = $ReadOnly<{|
    min?: number,
    max?: number,
    now?: number,
    text?: string,
  |}>;

  // Copied from
  // react-native/Libraries/Components/Touchable/TouchableWithoutFeedback.js
  declare type Stringish = string;
  declare type EdgeInsetsProp = $ReadOnly<$Partial<EdgeInsets>>;
  declare type TouchableWithoutFeedbackProps = $ReadOnly<{|
    accessibilityActions?: ?$ReadOnlyArray<AccessibilityActionInfo>,
    accessibilityElementsHidden?: ?boolean,
    accessibilityHint?: ?Stringish,
    accessibilityIgnoresInvertColors?: ?boolean,
    accessibilityLabel?: ?Stringish,
    accessibilityLiveRegion?: ?('none' | 'polite' | 'assertive'),
    accessibilityRole?: ?AccessibilityRole,
    accessibilityState?: ?AccessibilityState,
    accessibilityValue?: ?AccessibilityValue,
    accessibilityViewIsModal?: ?boolean,
    accessible?: ?boolean,
    children?: ?React$Node,
    delayLongPress?: ?number,
    delayPressIn?: ?number,
    delayPressOut?: ?number,
    disabled?: ?boolean,
    focusable?: ?boolean,
    hitSlop?: ?EdgeInsetsProp,
    importantForAccessibility?: ?('auto' | 'yes' | 'no' | 'no-hide-descendants'),
    nativeID?: ?string,
    onAccessibilityAction?: ?(event: AccessibilityActionEvent) => mixed,
    onBlur?: ?(event: BlurEvent) => mixed,
    onFocus?: ?(event: FocusEvent) => mixed,
    onLayout?: ?(event: LayoutEvent) => mixed,
    onLongPress?: ?(event: PressEvent) => mixed,
    onPress?: ?(event: PressEvent) => mixed,
    onPressIn?: ?(event: PressEvent) => mixed,
    onPressOut?: ?(event: PressEvent) => mixed,
    pressRetentionOffset?: ?EdgeInsetsProp,
    rejectResponderTermination?: ?boolean,
    testID?: ?string,
    touchSoundDisabled?: ?boolean,
  |}>;

  // Copied from react-native/Libraries/Image/ImageSource.js
  declare type ImageURISource = $ReadOnly<{
    uri?: ?string,
    bundle?: ?string,
    method?: ?string,
    headers?: ?Object,
    body?: ?string,
    cache?: ?('default' | 'reload' | 'force-cache' | 'only-if-cached'),
    width?: ?number,
    height?: ?number,
    scale?: ?number,
    ...
  }>;

  /**
   * The following is copied from react-native-gesture-handler's libdef
   */

  declare type StateUndetermined = 0;
  declare type StateFailed = 1;
  declare type StateBegan = 2;
  declare type StateCancelled = 3;
  declare type StateActive = 4;
  declare type StateEnd = 5;

  declare type GestureHandlerState =
    | StateUndetermined
    | StateFailed
    | StateBegan
    | StateCancelled
    | StateActive
    | StateEnd;

  declare type $SyntheticEvent<T: { ... }> = {
    +nativeEvent: $ReadOnly<$Exact<T>>,
    ...
  };

  declare type $Event<T: { ... }> = $SyntheticEvent<{
    handlerTag: number,
    numberOfPointers: number,
    state: GestureHandlerState,
    oldState: GestureHandlerState,
    ...$Exact<T>,
    ...
  }>;

  declare type $EventHandlers<ExtraProps: {...}> = {|
    onGestureEvent?: ($Event<ExtraProps>) => mixed,
    onHandlerStateChange?: ($Event<ExtraProps>) => mixed,
    onBegan?: ($Event<ExtraProps>) => mixed,
    onFailed?: ($Event<ExtraProps>) => mixed,
    onCancelled?: ($Event<ExtraProps>) => mixed,
    onActivated?: ($Event<ExtraProps>) => mixed,
    onEnded?: ($Event<ExtraProps>) => mixed,
  |};

  declare type HitSlop =
    | number
    | {|
        left?: number,
        top?: number,
        right?: number,
        bottom?: number,
        vertical?: number,
        horizontal?: number,
        width?: number,
        height?: number,
      |}
    | {|
        width: number,
        left: number,
      |}
    | {|
        width: number,
        right: number,
      |}
    | {|
        height: number,
        top: number,
      |}
    | {|
        height: number,
        bottom: number,
      |};

  declare type $GestureHandlerProps<
    AdditionalProps: {...},
    ExtraEventsProps: {...}
  > = $ReadOnly<{|
    ...$Exact<AdditionalProps>,
    ...$EventHandlers<ExtraEventsProps>,
    id?: string,
    enabled?: boolean,
    waitFor?: React$Ref<any> | Array<React$Ref<any>>,
    simultaneousHandlers?: React$Ref<any> | Array<React$Ref<any>>,
    shouldCancelWhenOutside?: boolean,
    minPointers?: number,
    hitSlop?: HitSlop,
    children?: React$Node,
  |}>;

  declare type PanGestureHandlerProps = $GestureHandlerProps<
    {
      activeOffsetY?: number | [number, number],
      activeOffsetX?: number | [number, number],
      failOffsetY?: number | [number, number],
      failOffsetX?: number | [number, number],
      minDist?: number,
      minVelocity?: number,
      minVelocityX?: number,
      minVelocityY?: number,
      minPointers?: number,
      maxPointers?: number,
      avgTouches?: boolean,
      ...
    },
    {
      x: number,
      y: number,
      absoluteX: number,
      absoluteY: number,
      translationX: number,
      translationY: number,
      velocityX: number,
      velocityY: number,
      ...
    }
  >;

  /**
   * MAGIC
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

  declare type $Partial<T> = $ReadOnly<$Rest<T, {...}>>;

  // If { ...T, ... } counts as a T, then we're inexact
  declare type $IsExact<T> = $Call<
    (T => false) & (mixed => true),
    { ...T, ... },
  >;

  /**
   * Actions, state, etc.
   */

  declare export type ScreenParams = { +[key: string]: mixed, ... };

  declare export type BackAction = {|
    +type: 'GO_BACK',
    +source?: string,
    +target?: string,
  |};
  declare export type NavigateAction = {|
    +type: 'NAVIGATE',
    +payload:
      | {| +key: string, +params?: ScreenParams |}
      | {| +name: string, +key?: string, +params?: ScreenParams |},
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
    +payload: {| +params?: ScreenParams |},
    +source?: string,
    +target?: string,
  |};
  declare export type CommonAction =
    | BackAction
    | NavigateAction
    | ResetAction
    | SetParamsAction;

  declare type NavigateActionCreator = {|
    (routeName: string, params?: ScreenParams): NavigateAction,
    (
      | {| +key: string, +params?: ScreenParams |}
      | {| +name: string, +key?: string, +params?: ScreenParams |},
    ): NavigateAction,
  |};
  declare export type CommonActionsType = {|
    +navigate: NavigateActionCreator,
    +goBack: () => BackAction,
    +reset: (state: PossiblyStaleNavigationState) => ResetAction,
    +setParams: (params: ScreenParams) => SetParamsAction,
  |};

  declare export type GenericNavigationAction = {|
    +type: string,
    +payload?: { +[key: string]: mixed, ... },
    +source?: string,
    +target?: string,
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

  /**
   * Routers
   */

  declare type ActionCreators<
    State: NavigationState,
    Action: GenericNavigationAction,
  > = {
    +[key: string]: (...args: any) => (Action | State => Action),
    ...
  };

  declare export type DefaultRouterOptions = {
    +initialRouteName?: string,
    ...
  };

  declare export type RouterFactory<
    State: NavigationState,
    Action: GenericNavigationAction,
    RouterOptions: DefaultRouterOptions,
  > = (options: RouterOptions) => Router<State, Action>;

  declare export type ParamListBase = { +[key: string]: ?ScreenParams, ... };

  declare export type RouterConfigOptions = {|
    +routeNames: $ReadOnlyArray<string>,
    +routeParamList: ParamListBase,
  |};

  declare export type Router<
    State: NavigationState,
    Action: GenericNavigationAction,
  > = {|
    +type: $PropertyType<State, 'type'>,
    +getInitialState: (options: RouterConfigOptions) => State,
    +getRehydratedState: (
      partialState: PossiblyStaleNavigationState,
      options: RouterConfigOptions,
    ) => State,
    +getStateForRouteNamesChange: (
      state: State,
      options: RouterConfigOptions,
    ) => State,
    +getStateForRouteFocus: (state: State, key: string) => State,
    +getStateForAction: (
      state: State,
      action: Action,
      options: RouterConfigOptions,
    ) => ?PossiblyStaleNavigationState;
    +shouldActionChangeFocus: (action: GenericNavigationAction) => boolean,
    +actionCreators?: ActionCreators<State, Action>,
  |};

  /**
   * Stack actions and router
   */

  declare export type StackNavigationState = {|
    ...NavigationState,
    +type: 'stack',
  |};

  declare export type ReplaceAction = {|
    +type: 'REPLACE',
    +payload: {| +name: string, +key?: ?string, +params?: ScreenParams |},
    +source?: string,
    +target?: string,
  |};
  declare export type PushAction = {|
    +type: 'PUSH',
    +payload: {| +name: string, +key?: ?string, +params?: ScreenParams |},
    +source?: string,
    +target?: string,
  |};
  declare export type PopAction = {|
    +type: 'POP',
    +payload: {| +count: number |},
    +source?: string,
    +target?: string,
  |};
  declare export type PopToTopAction = {|
    +type: 'POP_TO_TOP',
    +source?: string,
    +target?: string,
  |};
  declare export type StackAction =
    | CommonAction
    | ReplaceAction
    | PushAction
    | PopAction
    | PopToTopAction;

  declare export type StackActionsType = {|
    +replace: (routeName: string, params?: ScreenParams) => ReplaceAction,
    +push: (routeName: string, params?: ScreenParams) => PushAction,
    +pop: (count?: number) => PopAction,
    +popToTop: () => PopToTopAction,
  |};

  declare export type StackRouterOptions = $Exact<DefaultRouterOptions>;

  /**
   * Tab actions and router
   */

  declare export type TabNavigationState = {|
    ...NavigationState,
    +type: 'tab',
    +history: $ReadOnlyArray<{| type: 'route', key: string |}>,
  |};

  declare export type JumpToAction = {|
    +type: 'JUMP_TO',
    +payload: {| +name: string, +params?: ScreenParams |},
    +source?: string,
    +target?: string,
  |};
  declare export type TabAction =
    | CommonAction
    | JumpToAction;

  declare export type TabActionsType = {|
    +jumpTo: string => JumpToAction,
  |};

  declare export type TabRouterOptions = {|
    ...$Exact<DefaultRouterOptions>,
    +backBehavior?: 'initialRoute' | 'order' | 'history' | 'none',
  |};

  /**
   * Drawer actions and router
   */

  declare type DrawerHistoryEntry =
    | {| +type: 'route', +key: string |}
    | {| +type: 'drawer' |};
  declare export type DrawerNavigationState = {|
    ...NavigationState,
    +type: 'drawer',
    +history: $ReadOnlyArray<DrawerHistoryEntry>,
  |};

  declare export type OpenDrawerAction = {|
    +type: 'OPEN_DRAWER',
    +source?: string,
    +target?: string,
  |};
  declare export type CloseDrawerAction = {|
    +type: 'CLOSE_DRAWER',
    +source?: string,
    +target?: string,
  |};
  declare export type ToggleDrawerAction = {|
    +type: 'TOGGLE_DRAWER',
    +source?: string,
    +target?: string,
  |};
  declare export type DrawerAction =
    | TabAction
    | OpenDrawerAction
    | CloseDrawerAction
    | ToggleDrawerAction;

  declare export type DrawerActionsType = {|
    ...TabActionsType,
    +openDrawer: () => OpenDrawerAction,
    +closeDrawer: () => CloseDrawerAction,
    +toggleDrawer: () => ToggleDrawerAction,
  |};

  declare export type DrawerRouterOptions = {|
    ...TabRouterOptions,
    +defaultStatus?: 'open' | 'closed',
  |};

  /**
   * Events
   */

  declare export type EventMapBase = {
    +[name: string]: {|
      +data?: mixed,
      +canPreventDefault?: boolean,
    |},
    ...
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
  declare type GlobalEventMap<State: PossiblyStaleNavigationState> = {|
    +state: {| +data: {| +state: State |}, +canPreventDefault: false |},
  |};
  declare type EventMapCore<State: PossiblyStaleNavigationState> = {|
    ...GlobalEventMap<State>,
    +focus: {| +data: void, +canPreventDefault: false |},
    +blur: {| +data: void, +canPreventDefault: false |},
    +beforeRemove: {|
      +data: {| +action: GenericNavigationAction |},
      +canPreventDefault: true,
    |},
  |};
  declare type EventListenerCallback<
    EventName: string,
    State: PossiblyStaleNavigationState = NavigationState,
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

  /**
   * Navigation prop
   */

  declare type PartialWithMergeProperty<ParamsType> = $If<
    $IsExact<ParamsType>,
    { ...$Partial<ParamsType>, +merge: true },
    { ...$Partial<ParamsType>, +merge: true, ... },
  >;

  declare type EitherExactOrPartialWithMergeProperty<ParamsType> =
    | ParamsType
    | PartialWithMergeProperty<ParamsType>;

  declare export type SimpleNavigate<ParamList> =
    <DestinationRouteName: $Keys<ParamList>>(
      routeName: DestinationRouteName,
      params: EitherExactOrPartialWithMergeProperty<
        $ElementType<ParamList, DestinationRouteName>,
      >,
    ) => void;

  declare export type Navigate<ParamList> =
    & SimpleNavigate<ParamList>
    & <DestinationRouteName: $Keys<ParamList>>(
        route: $If<
          $IsUndefined<$ElementType<ParamList, DestinationRouteName>>,
          | {| +key: string |}
          | {| +name: DestinationRouteName, +key?: string |},
          | {|
              +key: string,
              +params?: EitherExactOrPartialWithMergeProperty<
                $ElementType<ParamList, DestinationRouteName>,
              >,
            |}
          | {|
              +name: DestinationRouteName,
              +key?: string,
              +params?: EitherExactOrPartialWithMergeProperty<
                $ElementType<ParamList, DestinationRouteName>,
              >,
            |},
        >,
      ) => void;

  declare type CoreNavigationHelpers<
    ParamList: ParamListBase,
    State: PossiblyStaleNavigationState = PossiblyStaleNavigationState,
    EventMap: EventMapBase = EventMapCore<State>,
  > = {
    +navigate: Navigate<ParamList>,
    +dispatch: (
      action:
        | GenericNavigationAction
        | (State => GenericNavigationAction),
    ) => void,
    +reset: PossiblyStaleNavigationState => void,
    +goBack: () => void,
    +isFocused: () => boolean,
    +canGoBack: () => boolean,
    +getId: () => string | void,
    +getParent: <Parent: NavigationProp<ParamListBase>>(id?: string) => ?Parent,
    +getState: () => NavigationState,
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

  declare export type NavigationHelpers<
    ParamList: ParamListBase,
    State: PossiblyStaleNavigationState = PossiblyStaleNavigationState,
    EventMap: EventMapBase = EventMapCore<State>,
  > = {
    ...$Exact<CoreNavigationHelpers<
      ParamList,
      State,
      EventMap,
    >>,
    +setParams: (params: ScreenParams) => void,
    ...
  };

  declare type SetParamsInput<
    ParamList: ParamListBase,
    RouteName: $Keys<ParamList> = $Keys<ParamList>,
  > = $If<
    $IsUndefined<$ElementType<ParamList, RouteName>>,
    empty,
    $Partial<$NonMaybeType<$ElementType<ParamList, RouteName>>>,
  >;

  declare export type NavigationProp<
    ParamList: ParamListBase,
    RouteName: $Keys<ParamList> = $Keys<ParamList>,
    State: PossiblyStaleNavigationState = PossiblyStaleNavigationState,
    ScreenOptions: {...} = {...},
    EventMap: EventMapBase = EventMapCore<State>,
  > = {
    ...$Exact<CoreNavigationHelpers<
      ParamList,
      State,
      EventMap,
    >>,
    +setOptions: (options: $Partial<ScreenOptions>) => void,
    +setParams: (params: SetParamsInput<ParamList, RouteName>) => void,
    ...
  };

  /**
   * CreateNavigator
   */

  declare export type RouteProp<
    ParamList: ParamListBase = ParamListBase,
    RouteName: $Keys<ParamList> = $Keys<ParamList>,
  > = {|
    ...LeafRoute<RouteName>,
    +params: $ElementType<ParamList, RouteName>,
    +path?: string,
  |};

  declare type ScreenOptionsProp<
    ScreenOptions: {...},
    RouteParam,
    NavHelpers,
  > =
    | ScreenOptions
    | ({| +route: RouteParam, +navigation: NavHelpers |}) => ScreenOptions;
  declare export type ScreenListeners<
    State: NavigationState = NavigationState,
    EventMap: EventMapBase = EventMapCore<State>,
  > = $ObjMapi<
    {| [name: $Keys<EventMap>]: empty |},
    <K: $Keys<EventMap>>(K, empty) => EventListenerCallback<K, State, EventMap>,
  >;
  declare type ScreenListenersProp<
    ScreenListenersParam: {...},
    RouteParam,
    NavHelpers,
  > =
    | ScreenListenersParam
    | ({| +route: RouteParam, +navigation: NavHelpers |}) => ScreenListenersParam;

  declare type BaseScreenProps<
    ParamList: ParamListBase,
    NavProp,
    RouteName: $Keys<ParamList> = $Keys<ParamList>,
    State: NavigationState = NavigationState,
    ScreenOptions: {...} = {...},
    EventMap: EventMapBase = EventMapCore<State>,
  > = {|
    +name: RouteName,
    +options?: ScreenOptionsProp<
      ScreenOptions,
      RouteProp<ParamList, RouteName>,
      NavProp,
    >,
    +listeners?: ScreenListenersProp<
      ScreenListeners<State, EventMap>,
      RouteProp<ParamList, RouteName>,
      NavProp,
    >,
    +initialParams?: $Partial<$ElementType<ParamList, RouteName>>,
    +getId?: ({
      +params: $ElementType<ParamList, RouteName>,
    }) => string | void,
    +navigationKey?: string,
  |};

  declare export type ScreenProps<
    ParamList: ParamListBase,
    NavProp,
    RouteName: $Keys<ParamList> = $Keys<ParamList>,
    State: NavigationState = NavigationState,
    ScreenOptions: {...} = {...},
    EventMap: EventMapBase = EventMapCore<State>,
  > =
    | {|
        ...BaseScreenProps<
          ParamList,
          NavProp,
          RouteName,
          State,
          ScreenOptions,
          EventMap,
        >,
        +component: React$ComponentType<{|
          +route: RouteProp<ParamList, RouteName>,
          +navigation: NavProp,
        |}>,
      |}
    | {|
        ...BaseScreenProps<
          ParamList,
          NavProp,
          RouteName,
          State,
          ScreenOptions,
          EventMap,
        >,
        +getComponent: () => React$ComponentType<{|
          +route: RouteProp<ParamList, RouteName>,
          +navigation: NavProp,
        |}>,
      |}
    | {|
        ...BaseScreenProps<
          ParamList,
          NavProp,
          RouteName,
          State,
          ScreenOptions,
          EventMap,
        >,
        +children: ({|
          +route: RouteProp<ParamList, RouteName>,
          +navigation: NavProp,
        |}) => React$Node,
      |};

  declare export type ScreenComponent<
    GlobalParamList: ParamListBase,
    ParamList: ParamListBase,
    State: NavigationState = NavigationState,
    ScreenOptions: {...} = {...},
    EventMap: EventMapBase = EventMapCore<State>,
  > = <
    RouteName: $Keys<ParamList>,
    NavProp: NavigationProp<
      GlobalParamList,
      RouteName,
      State,
      ScreenOptions,
      EventMap,
    >,
  >(props: ScreenProps<
    ParamList,
    NavProp,
    RouteName,
    State,
    ScreenOptions,
    EventMap,
  >) => React$Node;

  declare type ScreenOptionsProps<
    ScreenOptions: {...},
    RouteParam,
    NavHelpers,
  > = {|
    +screenOptions?: ScreenOptionsProp<ScreenOptions, RouteParam, NavHelpers>,
  |};
  declare type ScreenListenersProps<
    ScreenListenersParam: {...},
    RouteParam,
    NavHelpers,
  > = {|
    +screenListeners?: ScreenListenersProp<
      ScreenListenersParam,
      RouteParam,
      NavHelpers,
    >,
  |};
  declare export type ExtraNavigatorPropsBase = {
    ...$Exact<DefaultRouterOptions>,
    +id?: string,
    +children?: React$Node,
    ...
  };
  declare export type NavigatorProps<
    ScreenOptions: {...},
    ScreenListenersParam,
    RouteParam,
    NavHelpers,
    ExtraNavigatorProps: ExtraNavigatorPropsBase,
  > = {
    ...$Exact<ExtraNavigatorProps>,
    ...ScreenOptionsProps<ScreenOptions, RouteParam, NavHelpers>,
    ...ScreenListenersProps<ScreenListenersParam, RouteParam, NavHelpers>,
    +defaultScreenOptions?:
      | ScreenOptions
      | ({|
          +route: RouteParam,
          +navigation: NavHelpers,
          +options: ScreenOptions,
        |}) => ScreenOptions,
    ...
  };
  declare export type NavigatorPropsBase<
    ScreenOptions: {...},
    ScreenListenersParam: {...},
    NavHelpers,
  > = NavigatorProps<
    ScreenOptions,
    ScreenListenersParam,
    RouteProp<>,
    NavHelpers,
    ExtraNavigatorPropsBase,
  >;

  declare export type CreateNavigator<
    State: NavigationState,
    ScreenOptions: {...},
    EventMap: EventMapBase,
    ExtraNavigatorProps: ExtraNavigatorPropsBase,
  > = <
    GlobalParamList: ParamListBase,
    ParamList: ParamListBase,
    NavHelpers: NavigationHelpers<
      GlobalParamList,
      State,
      EventMap,
    >,
  >() => {|
    +Screen: ScreenComponent<
      GlobalParamList,
      ParamList,
      State,
      ScreenOptions,
      EventMap,
    >,
    +Navigator: React$ComponentType<$Exact<NavigatorProps<
      ScreenOptions,
      ScreenListeners<State, EventMap>,
      RouteProp<ParamList>,
      NavHelpers,
      ExtraNavigatorProps,
    >>>,
    +Group: React$ComponentType<{|
      ...ScreenOptionsProps<ScreenOptions, RouteProp<ParamList>, NavHelpers>,
      +children: React$Node,
      +navigationKey?: string,
    |}>,
  |};

  declare export type CreateNavigatorFactory = <
    State: NavigationState,
    ScreenOptions: {...},
    EventMap: EventMapBase,
    NavHelpers: NavigationHelpers<
      ParamListBase,
      State,
      EventMap,
    >,
    ExtraNavigatorProps: ExtraNavigatorPropsBase,
  >(
    navigator: React$ComponentType<$Exact<NavigatorProps<
      ScreenOptions,
      ScreenListeners<State, EventMap>,
      RouteProp<>,
      NavHelpers,
      ExtraNavigatorProps,
    >>>,
  ) => CreateNavigator<State, ScreenOptions, EventMap, ExtraNavigatorProps>;


  /**
   * useNavigationBuilder
   */

  declare export type Descriptor<
    NavHelpers,
    ScreenOptions: {...} = {...},
  > = {|
    +render: () => React$Node,
    +options: $ReadOnly<ScreenOptions>,
    +navigation: NavHelpers,
  |};

  declare export type UseNavigationBuilder = <
    State: NavigationState,
    Action: GenericNavigationAction,
    ScreenOptions: {...},
    RouterOptions: DefaultRouterOptions,
    NavHelpers,
    EventMap: EventMapBase,
    ExtraNavigatorProps: ExtraNavigatorPropsBase,
  >(
    routerFactory: RouterFactory<State, Action, RouterOptions>,
    options: $Exact<NavigatorProps<
      ScreenOptions,
      ScreenListeners<State, EventMap>,
      RouteProp<>,
      NavHelpers,
      ExtraNavigatorProps,
    >>,
  ) => {|
    +id?: string,
    +state: State,
    +descriptors: {| +[key: string]: Descriptor<NavHelpers, ScreenOptions> |},
    +navigation: NavHelpers,
  |};

  /**
   * EdgeInsets
   */

  declare type EdgeInsets = {|
    +top: number,
    +right: number,
    +bottom: number,
    +left: number,
  |};

  /**
   * TransitionPreset
   */

  declare export type TransitionSpec =
    | {|
        animation: 'spring',
        config: $Diff<
          SpringAnimationConfigSingle,
          { toValue: number | AnimatedValue, ... },
        >,
      |}
    | {|
        animation: 'timing',
        config: $Diff<
          TimingAnimationConfigSingle,
          { toValue: number | AnimatedValue, ... },
        >,
      |};

  declare export type StackCardInterpolationProps = {|
    +current: {|
      +progress: AnimatedInterpolation,
    |},
    +next?: {|
      +progress: AnimatedInterpolation,
    |},
    +index: number,
    +closing: AnimatedInterpolation,
    +swiping: AnimatedInterpolation,
    +inverted: AnimatedInterpolation,
    +layouts: {|
      +screen: {| +width: number, +height: number |},
    |},
    +insets: EdgeInsets,
  |};
  declare export type StackCardInterpolatedStyle = {|
    containerStyle?: AnimatedViewStyleProp,
    cardStyle?: AnimatedViewStyleProp,
    overlayStyle?: AnimatedViewStyleProp,
    shadowStyle?: AnimatedViewStyleProp,
  |};
  declare export type StackCardStyleInterpolator = (
    props: StackCardInterpolationProps,
  ) => StackCardInterpolatedStyle;

  declare export type StackHeaderInterpolationProps = {|
    +current: {|
      +progress: AnimatedInterpolation,
    |},
    +next?: {|
      +progress: AnimatedInterpolation,
    |},
    +layouts: {|
      +header: {| +width: number, +height: number |},
      +screen: {| +width: number, +height: number |},
      +title?: {| +width: number, +height: number |},
      +leftLabel?: {| +width: number, +height: number |},
    |},
  |};
  declare export type StackHeaderInterpolatedStyle = {|
    leftLabelStyle?: AnimatedViewStyleProp,
    leftButtonStyle?: AnimatedViewStyleProp,
    rightButtonStyle?: AnimatedViewStyleProp,
    titleStyle?: AnimatedViewStyleProp,
    backgroundStyle?: AnimatedViewStyleProp,
  |};
  declare export type StackHeaderStyleInterpolator = (
    props: StackHeaderInterpolationProps,
  ) => StackHeaderInterpolatedStyle;

  declare type GestureDirection =
    | 'horizontal'
    | 'horizontal-inverted'
    | 'vertical'
    | 'vertical-inverted';

  declare export type TransitionPreset = {|
    +gestureDirection: GestureDirection,
    +transitionSpec: {|
      +open: TransitionSpec,
      +close: TransitionSpec,
    |},
    +cardStyleInterpolator: StackCardStyleInterpolator,
    +headerStyleInterpolator: StackHeaderStyleInterpolator,
  |};

  /**
   * Header common options
   */
  
  declare export type SceneProgress = {|
    +current: AnimatedInterpolation,
    +next?: AnimatedInterpolation,
    +previous?: AnimatedInterpolation,
  |};

  declare export type HeaderProps<NavProp, ScreenOptions: {...},> = {|
    +navigation: NavProp,
    +route: RouteProp<>,
    +options: ScreenOptions,
    +layout: {| +width: number, +height: number |},
  |};

  declare export type HeaderButtonProps = $Partial<{|
    +tintColor: string,
    +pressColor: string,
    +pressOpacity: number,
  |}>;

  declare export type HeaderLeftButtonProps = $Partial<{|
    ...HeaderButtonProps,
    +labelVisible: boolean,
  |}>;

  declare type HeaderTitleInputBase = {
    +onLayout: LayoutEvent => void,
    +children: string,
    +allowFontScaling: ?boolean,
    +tintColor: ?string,
    +style: ?AnimatedTextStyleProp,
    ...
  };

  declare export type HeaderTitleInputProps =
    $Exact<HeaderTitleInputBase>;

  declare export type HeaderCommonOptions<
    NavHeaderProps,
    NavHeaderLeftProps,
    NavHeaderRightProps,
  > = $Partial<{|
    +header: NavHeaderProps => React$Node,
    +headerShown: boolean,
    +headerTitle: string | ( HeaderTitleInputProps => React$Node),
    +headerTitleAlign: 'left' | 'center',
    +headerTitleStyle: AnimatedTextStyleProp,
    +headerTitleContainerStyle: AnimatedViewStyleProp,
    +headerTintColor: string,
    +headerTitleAllowFontScaling: boolean,
    +headerLeft: NavHeaderLeftProps => React$Node,
    +headerLeftContainerStyle: AnimatedViewStyleProp,
    +headerRight: NavHeaderRightProps => React$Node,
    +headerRightContainerStyle: AnimatedViewStyleProp,
    +headerBackground: ({| style: AnimatedViewStyleProp |}) => React$Node,
    +headerStyle: AnimatedViewStyleProp,
    +headerTransparent: boolean,
    +headerStatusBarHeight: number,
    +headerShadowVisible: boolean,
    +headerBackgroundContainerStyle: AnimatedViewStyleProp,
    +headerPressColor: string,
    +headerPressOpacity: number,
  |}>;

  /**
   * Stack options
   */

  declare export type StackDescriptor = Descriptor<
    StackNavigationHelpers<>,
    StackOptions,
  >;

  declare type Scene<T> = {|
    +route: T,
    +descriptor: StackDescriptor,
    +progress: SceneProgress,
  |};

  declare export type StackHeaderProps = {|
    ...HeaderProps<StackNavigationProp<>, StackOptions>,
    +progress: SceneProgress,
    +back?: {| +title: string |},
    +styleInterpolator: StackHeaderStyleInterpolator,
  |};

  declare export type StackHeaderButtonProps = $Partial<{|
    ...HeaderButtonProps,
    +canGoBack: boolean,
  |}>;

  declare export type StackHeaderLeftButtonProps = $Partial<{|
    ...StackHeaderButtonProps,
    +onPress: (() => void),
    +backImage: (props: {| tintColor: string |}) => React$Node,
    +label: string,
    +truncatedLabel: string,
    +labelVisible: boolean,
    +labelStyle: AnimatedTextStyleProp,
    +allowFontScaling: boolean,
    +onLabelLayout: LayoutEvent => void,
    +screenLayout: {| +width: number, +height: number |},
    +titleLayout: {| +width: number, +height: number |},
    +disabled: boolean,
    +accessibilityLabel: string,
    +style: ViewStyleProp,
  |}>;

  declare export type StackOptions = $Partial<{|
    +title: string,
    +cardShadowEnabled: boolean,
    +cardOverlayEnabled: boolean,
    +cardOverlay: {| style: ViewStyleProp |} => React$Node,
    +cardStyle: ViewStyleProp,
    +animationEnabled: boolean,
    +animationTypeForReplace: 'push' | 'pop',
    +gestureEnabled: boolean,
    +gestureResponseDistance: number,
    +gestureVelocityImpact: number,
    +safeAreaInsets: $Partial<EdgeInsets>,
    +keyboardHandlingEnabled: boolean,
    +presentation: 'card' | 'modal' | 'transparentModal',
    // Transition
    ...TransitionPreset,
    // Header
    ...HeaderCommonOptions<
      StackHeaderProps,  
      StackHeaderLeftButtonProps,
      StackHeaderButtonProps,
    >,
    +headerMode: 'float' | 'screen',
    +headerBackAllowFontScaling: boolean,
    +headerBackTitle: string | null,
    +headerBackTitleStyle: TextStyleProp,
    +headerBackTitleVisible: boolean,
    +headerTruncatedBackTitle: string,
    +headerBackImage: $PropertyType<StackHeaderLeftButtonProps, 'backImage'>,
    +headerBackAccessibilityLabel: string,
  |}>;

  /**
   * Stack navigation prop
   */

  declare export type StackNavigationEventMap = {|
    ...EventMapCore<StackNavigationState>,
    +transitionStart: {|
      +data: {| +closing: boolean |},
      +canPreventDefault: false,
    |},
    +transitionEnd: {|
      +data: {| +closing: boolean |},
      +canPreventDefault: false,
    |},
    +gestureStart: {| +data: void, +canPreventDefault: false |},
    +gestureEnd: {| +data: void, +canPreventDefault: false |},
    +gestureCancel: {| +data: void, +canPreventDefault: false |},
  |};

  declare type StackExtraNavigationHelpers<
    ParamList: ParamListBase = ParamListBase,
  > = {|
    +replace: SimpleNavigate<ParamList>,
    +push: SimpleNavigate<ParamList>,
    +pop: (count?: number) => void,
    +popToTop: () => void,
  |};

  declare export type StackNavigationHelpers<
    ParamList: ParamListBase = ParamListBase,
    EventMap: EventMapBase = StackNavigationEventMap,
  > = {
    ...$Exact<NavigationHelpers<
      ParamList,
      StackNavigationState,
      EventMap,
    >>,
    ...StackExtraNavigationHelpers<ParamList>,
    ...
  };

  declare export type StackNavigationProp<
    ParamList: ParamListBase = ParamListBase,
    RouteName: $Keys<ParamList> = $Keys<ParamList>,
    Options: {...} = StackOptions,
    EventMap: EventMapBase = StackNavigationEventMap,
  > = {|
    ...$Exact<NavigationProp<
      ParamList,
      RouteName,
      StackNavigationState,
      Options,
      EventMap,
    >>,
    ...StackExtraNavigationHelpers<ParamList>,
  |};

  /**
   * Miscellaneous stack exports
   */

  declare type StackNavigationConfig = {|
    +detachInactiveScreens?: boolean,
  |};

  declare export type ExtraStackNavigatorProps = {|
    ...$Exact<ExtraNavigatorPropsBase>,
    ...StackRouterOptions,
    ...StackNavigationConfig,
  |};

  declare export type StackNavigatorProps<
    NavHelpers: StackNavigationHelpers<> = StackNavigationHelpers<>,
  > = $Exact<NavigatorProps<
    StackOptions,
    ScreenListeners<StackNavigationState, StackNavigationEventMap>,
    RouteProp<>,
    NavHelpers,
    ExtraStackNavigatorProps,
  >>;

  /**
   * Bottom tab options
   */

  declare export type BottomTabBarButtonProps = {|
    ...$Diff<
      TouchableWithoutFeedbackProps,
      {| onPress?: ?(event: PressEvent) => mixed |},
    >,
    +to?: string,
    +children: React$Node,
    +onPress?: (MouseEvent | PressEvent) => void,
  |};

  declare export type TabBarVisibilityAnimationConfig =
    | {|
        +animation: 'spring',
        +config?: $Diff<
          SpringAnimationConfigSingle,
          { toValue: number | AnimatedValue, useNativeDriver: boolean, ... },
        >,
      |}
    | {|
        +animation: 'timing',
        +config?: $Diff<
          TimingAnimationConfigSingle,
          { toValue: number | AnimatedValue, useNativeDriver: boolean, ... },
        >,
      |};

  declare export type BottomTabOptions = $Partial<{|
    +title: string,
    +tabBarLabel:
      | string
      | ({| focused: boolean, color: string |}) => React$Node,
    +tabBarIcon: ({|
      focused: boolean,
      color: string,
      size: number,
    |}) => React$Node,
    +tabBarBadge: number | string,
    +tabBarBadgeStyle: TextStyleProp,
    +tabBarAccessibilityLabel: string,
    +tabBarTestID: string,
    +tabBarVisibilityAnimationConfig: $Partial<{|
      +show: TabBarVisibilityAnimationConfig,
      +hide: TabBarVisibilityAnimationConfig,
    |}>,
    +tabBarButton: BottomTabBarButtonProps => React$Node,
    +tabBarHideOnKeyboard: boolean,
    +tabBarActiveTintColor: string,
    +tabBarInactiveTintColor: string,
    +tabBarActiveBackgroundColor: string,
    +tabBarInactiveBackgroundColor: string,
    +tabBarAllowFontScaling: boolean,
    +tabBarShowLabel: boolean,
    +tabBarLabelStyle: TextStyleProp,
    +tabBarIconStyle: TextStyleProp,
    +tabBarItemStyle: ViewStyleProp,
    +tabBarLabelPosition: 'beside-icon' | 'below-icon',
    +tabBarStyle: ViewStyleProp,
    +unmountOnBlur: boolean,
    +lazy: boolean,
    ...HeaderCommonOptions<
      HeaderProps<BottomTabNavigationProp<>, BottomTabOptions>,
      HeaderLeftButtonProps,
      HeaderButtonProps,
    >,
  |}>;

  /**
   * Bottom tab navigation prop
   */

  declare export type BottomTabNavigationEventMap = {|
    ...EventMapCore<TabNavigationState>,
    +tabPress: {| +data: void, +canPreventDefault: true |},
    +tabLongPress: {| +data: void, +canPreventDefault: false |},
  |};

  declare type TabExtraNavigationHelpers<
    ParamList: ParamListBase = ParamListBase,
  > = {|
    +jumpTo: SimpleNavigate<ParamList>,
  |};

  declare export type BottomTabNavigationHelpers<
    ParamList: ParamListBase = ParamListBase,
    EventMap: EventMapBase = BottomTabNavigationEventMap,
  > = {
    ...$Exact<NavigationHelpers<
      ParamList,
      TabNavigationState,
      EventMap,
    >>,
    ...TabExtraNavigationHelpers<ParamList>,
    ...
  };

  declare export type BottomTabNavigationProp<
    ParamList: ParamListBase = ParamListBase,
    RouteName: $Keys<ParamList> = $Keys<ParamList>,
    Options: {...} = BottomTabOptions,
    EventMap: EventMapBase = BottomTabNavigationEventMap,
  > = {|
    ...$Exact<NavigationProp<
      ParamList,
      RouteName,
      TabNavigationState,
      Options,
      EventMap,
    >>,
    ...TabExtraNavigationHelpers<ParamList>,
  |};

  /**
   * Miscellaneous bottom tab exports
   */

  declare export type BottomTabDescriptor = Descriptor<
    BottomTabNavigationHelpers<>,
    BottomTabOptions,
  >;

  declare type BottomTabNavigationBuilderResult = {|
    +state: TabNavigationState,
    +navigation: BottomTabNavigationHelpers<>,
    +descriptors: {| +[key: string]: BottomTabDescriptor |},
  |};

  declare export type BottomTabBarProps = BottomTabNavigationBuilderResult;

  declare type BottomTabNavigationConfig = {|
    +tabBar?: BottomTabBarProps => React$Node,
    +safeAreaInsets?: $Partial<EdgeInsets>,
    +detachInactiveScreens?: boolean,
  |};

  declare export type ExtraBottomTabNavigatorProps = {|
    ...$Exact<ExtraNavigatorPropsBase>,
    ...TabRouterOptions,
    ...BottomTabNavigationConfig,
  |};

  declare export type BottomTabNavigatorProps<
    NavHelpers: BottomTabNavigationHelpers<> = BottomTabNavigationHelpers<>,
  > = $Exact<NavigatorProps<
    BottomTabOptions,
    ScreenListeners<TabNavigationState, BottomTabNavigationEventMap>,
    RouteProp<>,
    NavHelpers,
    ExtraBottomTabNavigatorProps,
  >>;

  /**
   * Material bottom tab options
   */

  declare export type MaterialBottomTabOptions = $Partial<{|
    +title: string,
    +tabBarColor: string,
    +tabBarLabel: string,
    +tabBarIcon:
      | string
      | ({| +focused: boolean, +color: string |}) => React$Node,
    +tabBarBadge: boolean | number | string,
    +tabBarAccessibilityLabel: string,
    +tabBarTestID: string,
  |}>;

  /**
   * Material bottom tab navigation prop
   */

  declare export type MaterialBottomTabNavigationEventMap = {|
    ...EventMapCore<TabNavigationState>,
    +tabPress: {| +data: void, +canPreventDefault: true |},
  |};

  declare export type MaterialBottomTabNavigationHelpers<
    ParamList: ParamListBase = ParamListBase,
    EventMap: EventMapBase = MaterialBottomTabNavigationEventMap,
  > = {
    ...$Exact<NavigationHelpers<
      ParamList,
      TabNavigationState,
      EventMap,
    >>,
    ...TabExtraNavigationHelpers<ParamList>,
    ...
  };

  declare export type MaterialBottomTabNavigationProp<
    ParamList: ParamListBase = ParamListBase,
    RouteName: $Keys<ParamList> = $Keys<ParamList>,
    Options: {...} = MaterialBottomTabOptions,
    EventMap: EventMapBase = MaterialBottomTabNavigationEventMap,
  > = {|
    ...$Exact<NavigationProp<
      ParamList,
      RouteName,
      TabNavigationState,
      Options,
      EventMap,
    >>,
    ...TabExtraNavigationHelpers<ParamList>,
  |};

  /**
   * Miscellaneous material bottom tab exports
   */

  declare export type PaperFont = {|
    +fontFamily: string,
    +fontWeight?:
      | 'normal'
      | 'bold'
      | '100'
      | '200'
      | '300'
      | '400'
      | '500'
      | '600'
      | '700'
      | '800'
      | '900',
  |};

  declare export type PaperFonts = {|
    +regular: PaperFont,
    +medium: PaperFont,
    +light: PaperFont,
    +thin: PaperFont,
  |};

  declare export type PaperTheme = {|
    +dark: boolean,
    +mode?: 'adaptive' | 'exact',
    +roundness: number,
    +colors: {|
      +primary: string,
      +background: string,
      +surface: string,
      +accent: string,
      +error: string,
      +text: string,
      +onSurface: string,
      +onBackground: string,
      +disabled: string,
      +placeholder: string,
      +backdrop: string,
      +notification: string,
    |},
    +fonts: PaperFonts,
    +animation: {|
      +scale: number,
    |},
  |};

  declare export type PaperRoute = {|
    +key: string,
    +title?: string,
    +icon?: any,
    +badge?: string | number | boolean,
    +color?: string,
    +accessibilityLabel?: string,
    +testID?: string,
  |};

  declare export type PaperTouchableProps = {|
    ...TouchableWithoutFeedbackProps,
    +key: string,
    +route: PaperRoute,
    +children: React$Node,
    +borderless?: boolean,
    +centered?: boolean,
    +rippleColor?: string,
  |};

  declare export type MaterialBottomTabNavigationConfig = {|
    +shifting?: boolean,
    +labeled?: boolean,
    +renderTouchable?: PaperTouchableProps => React$Node,
    +activeColor?: string,
    +inactiveColor?: string,
    +sceneAnimationEnabled?: boolean,
    +keyboardHidesNavigationBar?: boolean,
    +barStyle?: ViewStyleProp,
    +style?: ViewStyleProp,
    +theme?: PaperTheme,
  |};

  declare export type ExtraMaterialBottomTabNavigatorProps = {|
    ...$Exact<ExtraNavigatorPropsBase>,
    ...TabRouterOptions,
    ...MaterialBottomTabNavigationConfig,
  |};

  declare export type MaterialBottomTabNavigatorProps<
    NavHelpers: MaterialBottomTabNavigationHelpers<> =
      MaterialBottomTabNavigationHelpers<>,
  > = $Exact<NavigatorProps<
    MaterialBottomTabOptions,
    ScreenListeners<TabNavigationState, MaterialBottomTabNavigationEventMap>,
    RouteProp<>,
    NavHelpers,
    ExtraMaterialBottomTabNavigatorProps,
  >>;

  /**
   * Material top tab options
   */

  declare export type MaterialTopTabOptions = $Partial<{|
    +title: string,
    +tabBarLabel:
      | string
      | ({| +focused: boolean, +color: string |}) => React$Node,
    +tabBarIcon: ({| +focused: boolean, +color: string |}) => React$Node,
    +tabBarAccessibilityLabel: string,
    +tabBarTestID: string,
    +tabBarActiveTintColor: string,
    +tabBarInactiveTintColor: string,
    +tabBarPressColor: string,
    +tabBarPressOpacity: number,
    +tabBarShowLabel: boolean,
    +tabBarShowIcon: boolean,
    +tabBarAllowFontScaling: boolean,
    +tabBarBounces: boolean,
    +tabBarScrollEnabled: boolean,
    +tabBarIconStyle: ViewStyleProp,
    +tabBarLabelStyle: TextStyleProp,
    +tabBarItemStyle: ViewStyleProp,
    +tabBarIndicatorStyle: ViewStyleProp,
    +tabBarIndicatorContainerStyle: ViewStyleProp,
    +tabBarContentContainerStyle: ViewStyleProp,
    +tabBarStyle: ViewStyleProp,
    +tabBarBadge: () => React$Node,
    +tabBarIndicator: MaterialTopTabBarIndicatorProps => React$Node,
    +lazy: boolean,
    +lazyPlaceholder: ({| +route: Route<> |}) => React$Node,
  |}>;

  /**
   * Material top tab navigation prop
   */

  declare export type MaterialTopTabNavigationEventMap = {|
    ...EventMapCore<TabNavigationState>,
    +tabPress: {| +data: void, +canPreventDefault: true |},
    +tabLongPress: {| +data: void, +canPreventDefault: false |},
    +swipeStart: {| +data: void, +canPreventDefault: false |},
    +swipeEnd: {| +data: void, +canPreventDefault: false |},
  |};

  declare export type MaterialTopTabNavigationHelpers<
    ParamList: ParamListBase = ParamListBase,
    EventMap: EventMapBase = MaterialTopTabNavigationEventMap,
  > = {
    ...$Exact<NavigationHelpers<
      ParamList,
      TabNavigationState,
      EventMap,
    >>,
    ...TabExtraNavigationHelpers<ParamList>,
    ...
  };

  declare export type MaterialTopTabNavigationProp<
    ParamList: ParamListBase = ParamListBase,
    RouteName: $Keys<ParamList> = $Keys<ParamList>,
    Options: {...} = MaterialTopTabOptions,
    EventMap: EventMapBase = MaterialTopTabNavigationEventMap,
  > = {|
    ...$Exact<NavigationProp<
      ParamList,
      RouteName,
      TabNavigationState,
      Options,
      EventMap,
    >>,
    ...TabExtraNavigationHelpers<ParamList>,
  |};

  /**
   * Miscellaneous material top tab exports
   */

  declare type MaterialTopTabPagerCommonProps = {|
    +keyboardDismissMode: 'none' | 'on-drag' | 'auto',
    +swipeEnabled: boolean,
    +swipeVelocityImpact?: number,
    +springVelocityScale?: number,
    +springConfig: $Partial<{|
      +damping: number,
      +mass: number,
      +stiffness: number,
      +restSpeedThreshold: number,
      +restDisplacementThreshold: number,
    |}>,
    +timingConfig: $Partial<{|
      +duration: number,
    |}>,
  |};

  declare export type MaterialTopTabPagerProps = {|
    ...MaterialTopTabPagerCommonProps,
    +onSwipeStart?: () => void,
    +onSwipeEnd?: () => void,
    +onIndexChange: (index: number) => void,
    +navigationState: TabNavigationState,
    +layout: {| +width: number, +height: number |},
    +removeClippedSubviews: boolean,
    +children: ({|
      +addListener: (type: 'enter', listener: number => void) => void,
      +removeListener: (type: 'enter', listener: number => void) => void,
      +position: any, // Reanimated.Node<number>
      +render: React$Node => React$Node,
      +jumpTo: string => void,
    |}) => React$Node,
    +gestureHandlerProps: PanGestureHandlerProps,
  |};

  declare export type MaterialTopTabBarIndicatorProps = {|
    +state: TabNavigationState,
    +width: string,
    +style?: ViewStyleProp,
    +getTabWidth: number => number,
  |};

  declare export type MaterialTopTabDescriptor = Descriptor<
    MaterialBottomTabNavigationHelpers<>,
    MaterialBottomTabOptions,
  >;

  declare type MaterialTopTabNavigationBuilderResult = {|
    +state: TabNavigationState,
    +navigation: MaterialTopTabNavigationHelpers<>,
    +descriptors: {| +[key: string]: MaterialTopTabDescriptor |},
  |};

  declare export type MaterialTopTabBarProps = {|
    ...MaterialTopTabNavigationBuilderResult,
    +layout: {| +width: number, +height: number |},
    +position: any, // Reanimated.Node<number>
    +jumpTo: string => void,
  |};

  declare export type MaterialTopTabNavigationConfig = {|
    ...$Partial<MaterialTopTabPagerCommonProps>,
    +position?: any, // Reanimated.Value<number>
    +tabBarPosition?: 'top' | 'bottom',
    +initialLayout?: $Partial<{| +width: number, +height: number |}>,
    +lazyPreloadDistance?: number,
    +removeClippedSubviews?: boolean,
    +sceneContainerStyle?: ViewStyleProp,
    +style?: ViewStyleProp,
    +gestureHandlerProps?: PanGestureHandlerProps,
    +pager?: MaterialTopTabPagerProps => React$Node,
    +tabBar?: MaterialTopTabBarProps => React$Node,
  |};

  declare export type ExtraMaterialTopTabNavigatorProps = {|
    ...$Exact<ExtraNavigatorPropsBase>,
    ...TabRouterOptions,
    ...MaterialTopTabNavigationConfig,
  |};

  declare export type MaterialTopTabNavigatorProps<
    NavHelpers: MaterialTopTabNavigationHelpers<> =
      MaterialTopTabNavigationHelpers<>,
  > = $Exact<NavigatorProps<
    MaterialTopTabOptions,
    ScreenListeners<TabNavigationState, MaterialTopTabNavigationEventMap>,
    RouteProp<>,
    NavHelpers,
    ExtraMaterialTopTabNavigatorProps,
  >>;

  /**
   * Drawer options
   */

  declare export type DrawerOptions = $Partial<{|
    +title: string,
    +lazy: boolean,
    +drawerLabel:
      | string
      | ({| +color: string, +focused: boolean |}) => React$Node,
    +drawerIcon: ({|
      +color: string,
      +size: number,
      +focused: boolean,
    |}) => React$Node,
    +drawerActiveTintColor: string,
    +drawerActiveBackgroundColor: string,
    +drawerInactiveTintColor: string,
    +drawerInactiveBackgroundColor: string,
    +drawerItemStyle: ViewStyleProp,
    +drawerLabelStyle: TextStyleProp,
    +drawerContentContainerStyle: ViewStyleProp,
    +drawerContentStyle: ViewStyleProp,
    +drawerStyle: ViewStyleProp,
    +drawerPosition: 'left' | 'right',
    +drawerType: 'front' | 'back' | 'slide' | 'permanent',
    +drawerHideStatusBarOnOpen: boolean,
    +drawerStatusBarAnimation: 'slide' | 'none' | 'fade',
    +overlayColor: string,
    +sceneContainerStyle: ViewStyleProp,
    +gestureHandlerProps: PanGestureHandlerProps,
    +swipeEnabled: boolean,
    +swipeEdgeWidth: number,
    +swipeMinDistance: number,
    +keyboardDismissMode: 'on-drag' | 'none',
    +unmountOnBlur: boolean,
    ...HeaderCommonOptions<
      HeaderProps<DrawerNavigationProp<>, DrawerOptions>,
      HeaderLeftButtonProps,
      HeaderButtonProps,
    >,
  |}>;

  /**
   * Drawer navigation prop
   */

  declare export type DrawerNavigationEventMap =
    EventMapCore<DrawerNavigationState>;

  declare type DrawerExtraNavigationHelpers<
    ParamList: ParamListBase = ParamListBase,
  > = {|
    +jumpTo: SimpleNavigate<ParamList>,
    +openDrawer: () => void,
    +closeDrawer: () => void,
    +toggleDrawer: () => void,
  |};

  declare export type DrawerNavigationHelpers<
    ParamList: ParamListBase = ParamListBase,
    EventMap: EventMapBase = DrawerNavigationEventMap,
  > = {
    ...$Exact<NavigationHelpers<
      ParamList,
      DrawerNavigationState,
      EventMap,
    >>,
    ...DrawerExtraNavigationHelpers<ParamList>,
    ...
  };

  declare export type DrawerNavigationProp<
    ParamList: ParamListBase = ParamListBase,
    RouteName: $Keys<ParamList> = $Keys<ParamList>,
    Options: {...} = DrawerOptions,
    EventMap: EventMapBase = DrawerNavigationEventMap,
  > = {|
    ...$Exact<NavigationProp<
      ParamList,
      RouteName,
      DrawerNavigationState,
      Options,
      EventMap,
    >>,
    ...DrawerExtraNavigationHelpers<ParamList>,
  |};

  /**
   * Miscellaneous drawer exports
   */

  declare export type DrawerDescriptor = Descriptor<
    DrawerNavigationHelpers<>,
    DrawerOptions,
  >;

  declare type DrawerNavigationBuilderResult = {|
    +state: DrawerNavigationState,
    +navigation: DrawerNavigationHelpers<>,
    +descriptors: {| +[key: string]: DrawerDescriptor |},
  |};

  declare export type DrawerNavigationConfig = {|
    +drawerContent?: DrawerNavigationBuilderResult => React$Node,
    +detachInactiveScreens?: boolean,
    +useLegacyImplementation?: boolean,
  |};

  declare export type ExtraDrawerNavigatorProps = {|
    ...$Exact<ExtraNavigatorPropsBase>,
    ...DrawerRouterOptions,
    ...DrawerNavigationConfig,
  |};

  declare export type DrawerNavigatorProps<
    NavHelpers: DrawerNavigationHelpers<> = DrawerNavigationHelpers<>,
  > = $Exact<NavigatorProps<
    DrawerOptions,
    ScreenListeners<DrawerNavigationState, DrawerNavigationEventMap>,
    RouteProp<>,
    NavHelpers,
    ExtraDrawerNavigatorProps,
  >>;

  /**
   * BaseNavigationContainer
   */

  declare export type BaseNavigationContainerProps = {|
    +children: React$Node,
    +initialState?: PossiblyStaleNavigationState,
    +onStateChange?: (state: ?PossiblyStaleNavigationState) => void,
    +independent?: boolean,
  |};

  declare export type ContainerEventMap = {|
    ...GlobalEventMap<PossiblyStaleNavigationState>,
    +options: {|
      +data: {| +options: { +[key: string]: mixed, ... } |},
      +canPreventDefault: false,
    |},
    +__unsafe_action__: {|
      +data: {|
        +action: GenericNavigationAction,
        +noop: boolean,
      |},
      +canPreventDefault: false,
    |},
  |};

  declare export type BaseNavigationContainerInterface = {|
    ...$Exact<NavigationHelpers<
      ParamListBase,
      PossiblyStaleNavigationState,
      ContainerEventMap,
    >>,
    +resetRoot: (state?: PossiblyStaleNavigationState) => void,
    +getRootState: () => NavigationState,
    +getCurrentRoute: () => RouteProp<> | void,
    +getCurrentOptions: () => Object | void,
    +isReady: () => boolean,
  |};

  declare type BaseNavigationContainerInterfaceRef = {|
    ...BaseNavigationContainerInterface,
    +current: BaseNavigationContainerInterface | null,
  |};

  /**
   * State utils
   */

  declare export type GetStateFromPath = (
    path: string,
    options?: LinkingConfig,
  ) => PossiblyStaleNavigationState;

  declare export type GetPathFromState = (
    state?: ?PossiblyStaleNavigationState,
    options?: LinkingConfig,
  ) => string;

  declare export type GetFocusedRouteNameFromRoute =
    PossiblyStaleRoute<string> => ?string;

  /**
   * Linking
   */

  declare export type ScreenLinkingConfig = {|
    +path?: string,
    +exact?: boolean,
    +parse?: {| +[param: string]: string => mixed |},
    +stringify?: {| +[param: string]: mixed => string |},
    +screens?: ScreenLinkingConfigMap,
    +initialRouteName?: string,
  |};

  declare export type ScreenLinkingConfigMap = {|
    +[routeName: string]: string | ScreenLinkingConfig,
  |};

  declare export type LinkingConfig = {|
    +initialRouteName?: string,
    +screens: ScreenLinkingConfigMap,
  |};

  declare export type LinkingOptions = {|
    +enabled?: boolean,
    +prefixes: $ReadOnlyArray<string>,
    +config?: LinkingConfig,
    +getStateFromPath?: GetStateFromPath,
    +getPathFromState?: GetPathFromState,
  |};

  /**
   * NavigationContainer
   */

  declare export type Theme = {|
    +dark: boolean,
    +colors: {|
      +primary: string,
      +background: string,
      +card: string,
      +text: string,
      +border: string,
    |},
  |};

  declare export type NavigationContainerType = React$AbstractComponent<
    {|
      ...BaseNavigationContainerProps,
      +theme?: Theme,
      +linking?: LinkingOptions,
      +fallback?: React$Node,
      +onReady?: () => mixed,
    |},
    BaseNavigationContainerInterface,
  >;

  //---------------------------------------------------------------------------
  // SECTION 2: EXPORTED MODULE
  // This section defines the module exports and contains exported types that
  // are not present in any other React Navigation libdef.
  //---------------------------------------------------------------------------

  /**
   * createBottomTabNavigator
   */

  declare export var createBottomTabNavigator: CreateNavigator<
    TabNavigationState,
    BottomTabOptions,
    BottomTabNavigationEventMap,
    ExtraBottomTabNavigatorProps,
  >;

  /**
   * BottomTabBar
   */

  declare export var BottomTabBar: React$ComponentType<BottomTabBarProps>;

  /**
   * BottomTabView
   */

  declare export type BottomTabViewProps = {|
    ...BottomTabNavigationConfig,
    ...BottomTabNavigationBuilderResult,
  |};
  declare export var BottomTabView: React$ComponentType<BottomTabViewProps>;

}
