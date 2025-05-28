// flow-typed signature: 5b28e0fdf284df0de63f1b8f132e6f5c
// flow-typed version: dc2d6a22c7/@react-navigation/stack_v5.x.x/flow_>=v0.104.x

declare module '@react-navigation/stack' {

  import type {
    StackNavigationConfig,
    StackNavigationState,
    StackNavigationHelpers,
    StackDescriptor,
    CreateNavigator,
    StackOptions,
    StackNavigationEventMap,
    ExtraStackNavigatorProps,
    StackHeaderProps,
    StackCardStyleInterpolator,
    StackHeaderStyleInterpolator,
    TransitionSpec,
    TransitionPreset,
    StackCardInterpolationProps,
    PanGestureHandlerProps,
  } from '@react-navigation/core';

  /**
   * StackView
   */

  declare export function StackView<
    Helpers = StackNavigationHelpers<>,
  >(props: {|
    ...StackNavigationConfig,
    +state: StackNavigationState,
    +navigation: Helpers,
    +descriptors: {| +[key: string]: StackDescriptor<Helpers> |},
  |}): React$Node;

  /**
   * createStackNavigator
   */

  declare export var createStackNavigator: CreateNavigator<
    StackNavigationState,
    StackOptions,
    StackNavigationEventMap,
    ExtraStackNavigatorProps,
  >;

  /**
   * Header components
   */

  declare export var Header: React$ComponentType<
    StackHeaderProps
  >;

  /**
   * Style/animation options
   */

  declare export var CardStyleInterpolators: {|
    +forHorizontalIOS: StackCardStyleInterpolator,
    +forVerticalIOS: StackCardStyleInterpolator,
    +forModalPresentationIOS: StackCardStyleInterpolator,
    +forFadeFromBottomAndroid: StackCardStyleInterpolator,
    +forRevealFromBottomAndroid: StackCardStyleInterpolator,
    +forScaleFromCenterAndroid: StackCardStyleInterpolator,
    +forNoAnimation: StackCardStyleInterpolator,
  |};
  declare export var HeaderStyleInterpolators: {|
    +forUIKit: StackHeaderStyleInterpolator,
    +forFade: StackHeaderStyleInterpolator,
    +forSlideLeft: StackHeaderStyleInterpolator,
    +forSlideRight: StackHeaderStyleInterpolator,
    +forSlideUp: StackHeaderStyleInterpolator,
    +forNoAnimation: StackHeaderStyleInterpolator,
  |};
  declare export var TransitionSpecs: {|
    +TransitionIOSSpec: TransitionSpec,
    +FadeInFromBottomAndroidSpec: TransitionSpec,
    +FadeOutToBottomAndroidSpec: TransitionSpec,
    +RevealFromBottomAndroidSpec: TransitionSpec,
    +ScaleFromCenterAndroidSpec: TransitionSpec,
  |};
  declare export var TransitionPresets: {|
    +SlideFromRightIOS: TransitionPreset,
    +ModalSlideFromBottomIOS: TransitionPreset,
    +ModalPresentationIOS: TransitionPreset,
    +FadeFromBottomAndroid: TransitionPreset,
    +RevealFromBottomAndroid: TransitionPreset,
    +ScaleFromCenterAndroid: TransitionPreset,
    +DefaultTransition: TransitionPreset,
    +ModalTransition: TransitionPreset,
  |};

  /**
   * CardAnimation accessors
   */

  declare export var CardAnimationContext: React$Context<
    ?StackCardInterpolationProps,
  >;
  declare export function useCardAnimation(): StackCardInterpolationProps;

  /**
   * GestureHandler accessors
   */

  declare type GestureHandlerRef = React.RefObject<
    React$ComponentType<PanGestureHandlerProps>,
  >;
  declare export var GestureHandlerRefContext: React$Context<
    ?GestureHandlerRef,
  >;
  declare export function useGestureHandlerRef(): GestureHandlerRef;

}
