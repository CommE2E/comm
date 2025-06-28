// flow-typed signature: 219fd8b2f5868928e02073db11adb8a5
// flow-typed version: dc2d6a22c7/@react-navigation/native_v5.x.x/flow_>=v0.104.x

declare module '@react-navigation/native' {

  import type {
    CommonActionsType,
    StackActionsType,
    TabActionsType,
    DrawerActionsType,
    RouterFactory,
    NavigationState,
    CommonAction,
    DefaultRouterOptions,
    StackNavigationState,
    StackAction,
    StackRouterOptions,
    TabNavigationState,
    TabAction,
    TabRouterOptions,
    DrawerNavigationState,
    DrawerAction,
    DrawerRouterOptions,
    BaseNavigationContainerProps,
    BaseNavigationContainerInterface,
    CreateNavigatorFactory,
    UseNavigationBuilder,
    NavigationHelpers,
    ParamListBase,
    NavigationProp,
    LeafRoute,
    GetStateFromPath,
    GetPathFromState,
    PossiblyStaleNavigationState,
    NavigateAction,
    GetFocusedRouteNameFromRoute,
    Theme,
    GenericNavigationAction,
    PressEvent,
    ScreenParams,
    NavigationContainerType,
    BaseNavigationContainerInterfaceRef,
    EventMapBase,
    EventMapCore,
  } from '@react-navigation/core';

  /**
   * Actions and routers
   */

  declare export var CommonActions: CommonActionsType;
  declare export var StackActions: StackActionsType;
  declare export var TabActions: TabActionsType;
  declare export var DrawerActions: DrawerActionsType;

  declare export var BaseRouter: RouterFactory<
    NavigationState,
    CommonAction,
    DefaultRouterOptions,
  >;
  declare export var StackRouter: RouterFactory<
    StackNavigationState,
    StackAction,
    StackRouterOptions,
  >;
  declare export var TabRouter: RouterFactory<
    TabNavigationState,
    TabAction,
    TabRouterOptions,
  >;
  declare export var DrawerRouter: RouterFactory<
    DrawerNavigationState,
    DrawerAction,
    DrawerRouterOptions,
  >;

  /**
   * Navigator utils
   */

  declare export var BaseNavigationContainer: React.ComponentType<
    BaseNavigationContainerProps
  >;

  declare export var createNavigatorFactory: CreateNavigatorFactory;

  declare export var useNavigationBuilder: UseNavigationBuilder;

  declare export var NavigationHelpersContext: {
    Provider: <
      ParamList: ParamListBase,
      State: PossiblyStaleNavigationState = PossiblyStaleNavigationState,
      EventMap: EventMapBase = EventMapCore<State>,
      T: ?NavigationHelpers<ParamList, State, EventMap> = ?NavigationHelpers<ParamList, State, EventMap>,
    >(props: {
      +value: T,
      +children?: React.Node,
      ...
    }) => React.Node,
    Consumer: <
      ParamList: ParamListBase,
      State: PossiblyStaleNavigationState = PossiblyStaleNavigationState,
      EventMap: EventMapBase = EventMapCore<State>,
      T: ?NavigationHelpers<ParamList, State, EventMap> = ?NavigationHelpers<ParamList, State, EventMap>,
    >(props: {
      +children: (value: T) => ?React.Node,
      ...
    }) => React.Node,
    displayName?: string,
    ...
  };

  /**
   * Navigation prop / route accessors
   */

  declare export var NavigationContext: React$Context<
    ?NavigationProp<ParamListBase>,
  >;
  declare export function useNavigation(): NavigationProp<ParamListBase>;

  declare export var NavigationRouteContext: React$Context<?LeafRoute<>>;
  declare export function useRoute(): LeafRoute<>;

  declare export function useNavigationState<T>(
    selector: NavigationState => T,
  ): T;

  /**
   * Focus utils
   */

  declare export function useFocusEffect(
    effect: () => ?(() => mixed),
  ): void;
  declare export function useIsFocused(): boolean;

  /**
   * State utils
   */

  declare export var getStateFromPath: GetStateFromPath;

  declare export var getPathFromState: GetPathFromState;

  declare export function getActionFromState(
    state: PossiblyStaleNavigationState,
  ): ?NavigateAction;

  declare export var getFocusedRouteNameFromRoute: GetFocusedRouteNameFromRoute;

  /**
   * useScrollToTop
   */

  declare type ScrollToOptions = { y?: number, animated?: boolean, ... };
  declare type ScrollToOffsetOptions = {
    offset: number,
    animated?: boolean,
    ...
  };
  declare type ScrollableView =
    | { scrollToTop(): void, ... }
    | { scrollTo(options: ScrollToOptions): void, ... }
    | { scrollToOffset(options: ScrollToOffsetOptions): void, ... }
    | { scrollResponderScrollTo(options: ScrollToOptions): void, ... };
  declare type ScrollableWrapper =
    | { getScrollResponder(): React.Node, ... }
    | { getNode(): ScrollableView, ... }
    | ScrollableView;
  declare export function useScrollToTop(
    ref: { +current: ?ScrollableWrapper, ... },
  ): void;

  /**
   * Themes
   */

  declare export var DefaultTheme: {| ...Theme, +dark: false |};
  declare export var DarkTheme: {| ...Theme, +dark: true |};
  declare export function useTheme(): Theme;
  declare export var ThemeProvider: React$ComponentType<{|
    +value: Theme,
    +children: React.Node,
  |}>;

  /**
   * Linking
   */

  declare export type LinkTo<
    ParamList: ParamListBase = ParamListBase,
    RouteName: $Keys<ParamList> = $Keys<ParamList>,
  > =
    | string
    | {| +screen: RouteName, +params?: ParamList[RouteName] |};

  declare export var Link: React$ComponentType<{
    +to: LinkTo<>,
    +action?: GenericNavigationAction,
    +target?: string,
    +children: React.Node,
    ...
  }>;

  declare export function useLinkTo<ParamList: ParamListBase>(
  ): (path: LinkTo<ParamList,>) => void;

  declare export function useLinkProps<
    ParamList: ParamListBase,
    RouteName: $Keys<ParamList>,
  >(props: {|
    +to: LinkTo<ParamList, RouteName>,
    +action?: GenericNavigationAction,
  |}): {|
    +href: string,
    +accessibilityRole: 'link',
    +onPress: (MouseEvent | PressEvent) => void,
  |};

  declare export function useLinkBuilder(): (
    name: string,
    params?: ScreenParams,
  ) => ?string;

  /**
   * NavigationContainer
   */

  declare export var NavigationContainer: NavigationContainerType;

  declare export function createNavigationContainerRef(
  ): BaseNavigationContainerInterfaceRef;

  declare export function useNavigationContainerRef(
  ): BaseNavigationContainerInterfaceRef;

  /**
   * useBackButton
   */

  declare export function useBackButton(
    container: { +current: ?React$ElementRef<NavigationContainerType>, ... },
  ): void;

}
