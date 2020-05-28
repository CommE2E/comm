// flow-typed signature: 78209a41671760f5318e734a04c2ae1c
// flow-typed version: <<STUB>>/@react-navigation/bottom-tabs_v5.4.1/flow_v0.105.0

declare module '@react-navigation/bottom-tabs' {

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
    +type: string,
    +payload?: { +[key: string]: mixed },
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

  declare type ActionCreators<+Action: GenericNavigationAction> = {
    +[key: string]: (...args: any) => Action,
  };

  declare type DefaultRouterOptions = {
    initialRouteName?: string,
  };

  declare export type RouterFactory<
    State: NavigationState,
    Action: GenericNavigationAction,
    RouterOptions: DefaultRouterOptions,
  > = (options: RouterOptions) => Router<State, Action>;

  declare export type RouterConfigOptions = {|
    +routeNames: $ReadOnlyArray<string>,
    +routeParamList: ParamListBase,
  |};

  declare export type Router<
    State: NavigationState,
    Action: GenericNavigationAction,
  > = {|
    type: $PropertyType<State, 'type'>,
    getInitialState: (options: RouterConfigOptions) => State,
    getRehydratedState: (
      partialState: PossibleStaleNavigationState,
      options: RouterConfigOptions,
    ) => State,
    getStateForRouteNamesChange: (
      state: State,
      options: RouterConfigOptions,
    ) => State,
    getStateForRouteFocus: (state: State, key: string) => State,
    getStateForAction: (
      state: State,
      action: Action,
      options: RouterConfigOptions,
    ) => ?PossiblyStaleNavigationState;
    shouldActionChangeFocus: (action: GenericNavigationAction) => boolean,
    actionCreators?: ActionCreators<Action>,
  |};

  declare export type StackNavigationState = {|
    ...NavigationState,
    +type: 'stack',
  |};
  declare export type ReplaceAction = {|
    +type: 'REPLACE',
    +payload: {| name: string, key?: ?string, params?: ScreenParams |},
    +source?: string,
    +target?: string,
  |};
  declare export type PushAction = {|
    +type: 'PUSH',
    +payload: {| name: string, key?: ?string, params?: ScreenParams |},
    +source?: string,
    +target?: string,
  |};
  declare export type PopAction = {|
    +type: 'POP',
    +payload: {| count: number |},
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
  declare export type StackRouterOptions = $Exact<DefaultRouterOptions>;

  declare export type TabNavigationState = {|
    ...NavigationState,
    +type: 'tab',
    +history: $ReadOnlyArray<{| type: 'route', key: string |}>,
  |};
  declare export type JumpToAction = {|
    +type: 'JUMP_TO',
    +payload: {| name: string, params?: ScreenParams |},
    +source?: string,
    +target?: string,
  |};
  declare export type TabAction =
    | CommonAction
    | JumpToAction;
  declare export type TabRouterOptions = {|
    ...$Exact<DefaultRouterOptions>,
    backBehavior?: 'initialRoute' | 'order' | 'history' | 'none',
  |};

  declare export type ParamListBase = { +[key: string]: ?ScreenParams };

  declare export type EventMapBase = {
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
  declare type GlobalEventMap<State: PossiblyStaleNavigationState> = {|
    +state: {| +data: {| +state: State |}, +canPreventDefault: false |},
  |};
  declare type EventMapCore<State: PossiblyStaleNavigationState> = {|
    ...GlobalEventMap<State>,
    +focus: {| +data: void, +canPreventDefault: false |},
    +blur: {| +data: void, +canPreventDefault: false |},
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

  declare type NavigationHelpers<
    ParamList: ParamListBase,
    RouteName: $Keys<ParamList> = string,
    State: PossiblyStaleNavigationState = PossiblyStaleNavigationState,
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

  declare export type NavigationProp<
    ParamList: ParamListBase,
    RouteName: $Keys<ParamList> = string,
    State: PossiblyStaleNavigationState = PossiblyStaleNavigationState,
    ScreenOptions: {} = {},
    EventMap: EventMapBase = EventMapCore<State>,
  > = {
    ...$Exact<NavigationHelpers<
      ParamList,
      RouteName,
      State,
      EventMap,
    >>,
    +setOptions: (options: $Shape<ScreenOptions>) => void,
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
    ParamList: ParamListBase,
    NavProp,
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
          navigation: NavProp,
        |}) => ScreenOptions,
    listeners?:
      | ScreenListeners<EventMap, State>
      | ({|
          route: RouteProp<ParamList, RouteName>,
          navigation: NavProp,
        |}) => ScreenListeners<EventMap, State>,
    initialParams?: $Shape<$ElementType<ParamList, RouteName>>,
  |};

  declare export type ScreenProps<
    ParamList: ParamListBase,
    NavProp,
    RouteName: $Keys<ParamList> = string,
    State: NavigationState = NavigationState,
    ScreenOptions: {} = {},
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
        component: React$ComponentType<{|
          route: RouteProp<ParamList, RouteName>,
          navigation: NavProp,
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
        children: ({|
          route: RouteProp<ParamList, RouteName>,
          navigation: NavProp,
        |}) => React$Node,
      |};

  declare export type ScreenComponent<
    ParamList: ParamListBase,
    State: NavigationState = NavigationState,
    ScreenOptions: {} = {},
    EventMap: EventMapBase = EventMapCore<State>,
  > = <RouteName: $Keys<ParamList>, NavProp>(props: ScreenProps<
    ParamList,
    NavProp,
    RouteName,
    State,
    ScreenOptions,
    EventMap,
  >) => React$Node;

  declare type BaseNonRouterNavigatorProps<ScreenOptions: {}, NavProp> = {
    children?: React.Node,
    screenOptions?:
      | ScreenOptions
      | ({| route: LeafRoute<>, navigation: NavProp |}) => ScreenOptions,
    ...
  };
  declare export type BaseNavigatorProps<ScreenOptions: {}, NavProp> = {
    ...DefaultRouterOptions,
    ...BaseNonRouterNavigatorProps<ScreenOptions, NavProp>,
    ...
  };

  declare export type CreateNavigator<
    State: NavigationState,
    ScreenOptions: {},
    EventMap: EventMapBase,
    NavProp,
    NavigatorProps: BaseNavigatorProps<ScreenOptions, NavProp>,
  > = <ParamList: ParamListBase>() => {|
    Screen: ScreenComponent<
      ParamList,
      State,
      ScreenOptions,
      EventMap,
    >,
    Navigator: React$ComponentType<NavigatorProps>,
  |};

  declare export type Descriptor<
    NavProp,
    ScreenOptions: {} = {},
  > = {|
    +render: () => React$Node,
    +options: $ReadOnly<ScreenOptions>,
    +navigation: NavProp,
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
    | { [name: string]: any };
  declare type ViewStyleProp = StyleObj;
  declare type TextStyleProp = StyleObj;
  declare type AnimatedViewStyleProp = StyleObj;
  declare type AnimatedTextStyleProp = StyleObj;

  // Copied from react-native/Libraries/Animated/src/animations/Animation.js
  declare type EndResult = { finished: boolean };
  declare type EndCallback = (result: EndResult) => void;
  declare class Animation {
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
  };

  // This is vaguely copied from
  // react-native/Libraries/Animated/src/nodes/AnimatedTracking.js
  declare class AnimatedTracking {
    constructor(
      value: AnimatedValue,
      parent: any,
      animationClass: any,
      animationConfig: Object,
      callback?: ?EndCallback,
    ): void;
    update(): void;
  }

  // This is vaguely copied from
  // react-native/Libraries/Animated/src/nodes/AnimatedValue.js
  declare type ValueListenerCallback = (state: { value: number }) => void;
  declare class AnimatedValue {
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

  // Copied from react-native/Libraries/Animated/src/animations/TimingAnimation.js
  declare type TimingAnimationConfigSingle = AnimationConfig & {
    toValue: number | AnimatedValue,
    easing?: (value: number) => number,
    duration?: number,
    delay?: number,
  };

  // Copied from react-native/Libraries/Animated/src/animations/SpringAnimation.js
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

  // Copied from
  // react-native/Libraries/Animated/src/nodes/AnimatedInterpolation.js
  declare type ExtrapolateType = 'extend' | 'identity' | 'clamp';
  declare type InterpolationConfigType = {
    inputRange: Array<number>,
    outputRange: Array<number> | Array<string>,
    easing?: (input: number) => number,
    extrapolate?: ExtrapolateType,
    extrapolateLeft?: ExtrapolateType,
    extrapolateRight?: ExtrapolateType,
  };
  declare class AnimatedInterpolation {
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
  declare type EdgeInsetsProp = $ReadOnly<$Shape<EdgeInsets>>;
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

  /**
   * SECTION 2B
   * The following are the actually useful definitions in Section 2, that are
   * used below in section 3, but also in other libdefs.
   */

  declare type EdgeInsets = {|
    top: number,
    right: number,
    bottom: number,
    left: number,
  |};

  //---------------------------------------------------------------------------
  // SECTION 3: UNIQUE TYPE DEFINITIONS
  // This section contains exported types that are not present in any other
  // React Navigation libdef.
  //---------------------------------------------------------------------------

  declare export type BottomTabOptions = $Shape<{|
    title: string,
    tabBarLabel:
      | string
      | ({| focused: boolean, color: string |}) => React$Node,
    tabBarIcon: ({|
      focused: boolean,
      color: string,
      size: number,
    |}) => React$Node,
    tabBarAccessibilityLabel: string,
    tabBarTestID: string,
    tabBarVisible: boolean,
    tabBarButton: BottomTabBarButtonProps => React$Node,
    unmountOnBlur: boolean,
  |}>;

  declare export type BottomTabNavigationEventMap = {|
    ...EventMapCore<TabNavigationState>,
    +tabPress: {| +data: void, +canPreventDefault: true |},
    +tabLongPress: {| +data: void, +canPreventDefault: false |},
  |};

  declare export type BottomTabNavigationProp<
    ParamList: ParamListBase = ParamListBase,
    RouteName: $Keys<ParamList> = string,
    Options: {} = BottomTabOptions,
    EventMap: EventMapBase = BottomTabNavigationEventMap,
  > = {|
    ...$Exact<NavigationProp<
      ParamList,
      RouteName,
      TabNavigationState,
      Options,
      EventMap,
    >>,
    +jumpTo: SimpleNavigate<$If<
      $IsExact<ParamList>,
      ParamList,
      { ...ParamListBase, ...ParamList },
    >>,
  |};

  declare export type BottomTabDescriptor = Descriptor<
    BottomTabNavigationProp<ParamListBase, string>,
    BottomTabOptions,
  >;

  declare export type BottomTabBarOptions = $Shape<{|
    keyboardHidesTabBar: boolean,
    activeTintColor: string,
    inactiveTintColor: string,
    activeBackgroundColor: string,
    inactiveBackgroundColor: string,
    allowFontScaling: boolean,
    showLabel: boolean,
    showIcon: boolean,
    labelStyle: TextStyleProp,
    tabStyle: ViewStyleProp,
    labelPosition: 'beside-icon' | 'below-icon',
    adaptive: boolean,
    safeAreaInsets: $Shape<EdgeInsets>,
    style: ViewStyleProp,
  |}>;

  declare export type BottomTabBarButtonProps = {|
    ...$Diff<
      TouchableWithoutFeedbackProps,
      {| onPress?: ?(event: PressEvent) => mixed |},
    >,
    to?: string,
    children: React$Node,
    onPress?: (MouseEvent | PressEvent) => void,
  |};

  declare export type BottomTabBarProps = {|
    state: TabNavigationState,
    navigation: BottomTabNavigationProp<>,
    descriptors: {| +[key: string]: BottomTabDescriptor |},
    ...BottomTabBarOptions,
  |}

  declare export type TabNavigatorProps<NavProp> = {|
    ...$Exact<BaseNavigatorProps<BottomTabOptions, NavProp>>,
    ...TabRouterOptions,
    lazy?: boolean,
    tabBar?: BottomTabBarProps => React$Node,
    tabBarOptions?: BottomTabBarOptions,
  |};

  //---------------------------------------------------------------------------
  // SECTION 4: EXPORTED MODULE
  // This is the only section that types exports. Other sections export types,
  // but this section types the module's exports.
  //---------------------------------------------------------------------------

  declare export var createBottomTabNavigator: CreateNavigator<
    TabNavigationState,
    BottomTabOptions,
    BottomTabNavigationEventMap,
    BottomTabNavigationProp<>,
    TabNavigatorProps<BottomTabNavigationProp<>>,
  >;

  declare export var BottomTabBar: React$ComponentType<BottomTabBarProps>;

}
