// flow-typed signature: 3742390ed7eeeb6c96844c62149ea639
// flow-typed version: <<STUB>>/react-native-reanimated_v2.2.0/flow_v0.137.0

/**
 * This is an autogenerated libdef stub for:
 *
 *   'react-native-reanimated'
 *
 * Fill this stub out by replacing all the `any` types.
 *
 * Once filled out, we encourage you to share your work with the
 * community by sending a pull request to:
 * https://github.com/flowtype/flow-typed
 */

declare module 'react-native-reanimated' {
  // This was taken from the flow typed library definitions of bottom-tabs_v6
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

  declare type StyleProps = {|
    ...ViewStyleProp,
    ...TextStyleProp,
    +originX?: number,
    +originY?: number,
    +[key: string]: any,
  |};

  declare class NodeImpl { }

  declare class ValueImpl extends NodeImpl {
    constructor(val: number): this;
    setValue(num: number): void;
  }

  declare class ClockImpl extends NodeImpl { }

  declare class ViewImpl extends React$Component<{ ... }> { }
  declare class TextImpl extends React$Component<{ ... }> { }
  declare class ImageImpl extends React$Component<{ ... }> { }
  declare class CodeImpl extends React$Component<{
    +exec: NodeImpl,
    ...
  }> { }

  declare type NodeOrNum = NodeImpl | number;
  declare export type NodeParam = NodeOrNum | $ReadOnlyArray<?NodeParam>;

  declare type NodeOrArrayOfNodes = NodeImpl | $ReadOnlyArray<?NodeOrArrayOfNodes>;
  declare export type Block = (
    nodes: $ReadOnlyArray<?NodeOrArrayOfNodes>,
  ) => NodeImpl;

  declare export type Set = (node: ValueImpl, val: NodeParam) => NodeImpl;

  declare type ToNumber = (val: mixed) => number;
  declare export type Call = <N: $ReadOnlyArray<NodeImpl>>(
    nodes: N,
    callback: (vals: $TupleMap<N, ToNumber>) => mixed,
  ) => NodeImpl;

  declare export type Cond = (
    cond: NodeParam,
    branch1: ?NodeParam,
    branch2?: ?NodeParam,
  ) => NodeImpl;

  declare export type Not = NodeImpl => NodeImpl;
  declare export type And = (...$ReadOnlyArray<NodeParam>) => NodeImpl;
  declare export type Or = (...$ReadOnlyArray<NodeParam>) => NodeImpl;
  declare export type Eq = (NodeParam, NodeParam) => NodeImpl;
  declare export type Neq = (NodeParam, NodeParam) => NodeImpl;
  declare export type LessThan = (NodeParam, NodeParam) => NodeImpl;
  declare export type GreaterThan = (NodeParam, NodeParam) => NodeImpl;
  declare export type LessOrEq = (NodeParam, NodeParam) => NodeImpl;
  declare export type GreaterOrEq = (NodeParam, NodeParam) => NodeImpl;
  declare export type Add = (...$ReadOnlyArray<NodeParam>) => NodeImpl;
  declare export type Sub = (...$ReadOnlyArray<NodeParam>) => NodeImpl;
  declare export type Multiply = (...$ReadOnlyArray<NodeParam>) => NodeImpl;
  declare export type Divide = (...$ReadOnlyArray<NodeParam>) => NodeImpl;
  declare export type Pow = (...$ReadOnlyArray<NodeParam>) => NodeImpl;
  declare export type Max = (NodeParam, NodeParam) => NodeImpl;
  declare export type Min = (NodeParam, NodeParam) => NodeImpl;
  declare export type Abs = (NodeParam) => NodeImpl;
  declare export type Ceil = (NodeParam) => NodeImpl;
  declare export type Floor = (NodeParam) => NodeImpl;
  declare export type Round = (NodeParam) => NodeImpl;

  declare export type StartClock = ClockImpl => NodeImpl;
  declare export type StopClock = ClockImpl => NodeImpl;
  declare export type ClockRunning = ClockImpl => NodeImpl;

  declare export type Debug = (string, NodeParam) => NodeImpl;

  declare type AnimationCallback = (
    finished?: boolean,
    current?: AnimatableValue
  ) => mixed;

  declare type Animatable = number | string | Array<number>;
  declare type AnimatableValueObject = { +[key: string]: Animatable };
  declare export type AnimatableValue = Animatable | AnimatableValueObject;

  declare type ExtrapolateType = { ... };
  declare type ExtrapolateModule = {
    +CLAMP: ExtrapolateType,
    ...
  };
  declare export type InterpolationConfig = {
    +inputRange: $ReadOnlyArray<number>,
    +outputRange: $ReadOnlyArray<number>,
    +extrapolate?: ?ExtrapolateType,
    ...
  };
  declare export type InterpolateNode = (
    node: NodeParam,
    interpolationConfig: InterpolationConfig,
  ) => NodeImpl;

  declare export type InterpolateColorsConfig = {
    +inputRange: $ReadOnlyArray<number>,
    +outputColorRange: $ReadOnlyArray<number | string>,
  };
  declare export type InterpolateColors = (
    animationValue: NodeParam,
    interpolationConfig: InterpolateColorsConfig
  ) => NodeImpl;

  declare export type Interpolate = (
    input: number,
    inputRange: $ReadOnlyArray<number>,
    outputRange: $ReadOnlyArray<number>,
    extrapolate?: ?ExtrapolateType,
  ) => number;

  declare export type InterpolateColorConfig = $Shape<{
    +gamma: number,
    +useCorrectedHSVInterpolation: boolean,
  }>;

  declare export type InterpolateColor = <T: string | number> (
    input: number,
    inputRange: $ReadOnlyArray<number>,
    outputRange: $ReadOnlyArray<T>,
    colorSpace?: 'RGB' | 'HSV',
    interpolateColorConfig?: InterpolateColorConfig,
  ) => T;

  declare type EasingType = { ... };
  declare type EasingNodeModule = {
    +ease: EasingType,
    +quad: EasingType,
    +in: EasingType => EasingType,
    +out: EasingType => EasingType,
    +inOut: EasingType => EasingType,
    ...
  };
  declare export var EasingNode: EasingNodeModule;

  declare type EasingFn = (t: number) => number;
  declare type EasingFnFactory = { +factory: () => EasingFn };
  declare type EasingModule = {
    +ease: EasingFn,
    +quad: EasingFn,
    +in: EasingFn => EasingFn,
    +out: EasingFn => EasingFn,
    +inOut: EasingFn => EasingFn,
    ...
  };
  declare export var Easing: EasingModule;

  declare export type TimingState = {
    +finished: ValueImpl,
    +position: ValueImpl,
    +frameTime: ValueImpl,
    +time: ValueImpl,
    ...
  };
  declare export type TimingConfig = {
    +duration: number,
    +toValue: NodeOrNum,
    +easing?: ?EasingType,
    ...
  };
  declare type Animator = {
    +start: () => void,
    ...
  };
  declare type Timing = {|
    (
      value: ValueImpl,
      config: TimingConfig,
    ): Animator,
    (
      clock: ClockImpl,
      state: TimingState,
      config: TimingConfig,
    ): NodeImpl,
  |};

  declare export type SpringConfig = {
    +overshootClamping: boolean,
    +damping: number,
    +mass: number,
    +toValue: NodeOrNum,
    ...
  };
  declare type SpringUtilsModule = {
    +makeDefaultConfig: () => SpringConfig,
    +makeConfigFromBouncinessAndSpeed: ({
      ...SpringConfig,
      +bounciness: ?number,
      +speed: ?number,
      ...
    }) => SpringConfig,
    ...
  };

  declare export type SpringState = {
    +finished: ValueImpl,
    +position: ValueImpl,
    +velocity: ValueImpl,
    +time: ValueImpl,
    ...
  };
  declare type Spring = {|
    (
      value: ValueImpl,
      config: SpringConfig,
    ): Animator,
    (
      clock: ClockImpl,
      state: SpringState,
      config: SpringConfig,
    ): NodeImpl,
  |};

  declare export type DecayConfig = {
    +deceleration: number,
    ...
  };
  declare export type DecayState = {
    +finished: ValueImpl,
    +position: ValueImpl,
    +velocity: ValueImpl,
    +time: ValueImpl,
    ...
  };
  declare type Decay = {|
    (
      value: ValueImpl,
      config: DecayConfig,
    ): Animator,
    (
      clock: ClockImpl,
      state: DecayState,
      config: DecayConfig,
    ): NodeImpl,
  |};

  declare type LayoutAnimation = {|
    +initialValues: StyleProps,
    +animations: StyleProps,
    +callback?: (finished: boolean) => void,
  |};

  declare type AnimationFunction = (a?: any, b?: any, c?: any) => any;

  declare type EntryAnimationsValues = {|
    +targetOriginX: number,
    +targetOriginY: number,
    +targetWidth: number,
    +targetHeight: number,
    +targetGlobalOriginX: number,
    +targetGlobalOriginY: number,
  |};

  declare type ExitAnimationsValues = {|
    +currentOriginX: number,
    +currentOriginY: number,
    +currentWidth: number,
    +currentHeight: number,
    +currentGlobalOriginX: number,
    +currentGlobalOriginY: number,
  |};

  declare export type EntryExitAnimationFunction = (
    targetValues: EntryAnimationsValues | ExitAnimationsValues,
  ) => LayoutAnimation;

  declare type AnimationConfigFunction<T> = (
    targetValues: T,
  ) => LayoutAnimation;

  declare type LayoutAnimationsValues = {|
    +currentOriginX: number,
    +currentOriginY: number,
    +currentWidth: number,
    +currentHeight: number,
    +currentGlobalOriginX: number,
    +currentGlobalOriginY: number,
    +targetOriginX: number,
    +targetOriginY: number,
    +targetWidth: number,
    +targetHeight: number,
    +targetGlobalOriginX: number,
    +argetGlobalOriginY: number,
    +windowWidth: number,
    +windowHeight: number,
  |};

  declare type LayoutAnimationFunction = (
    targetValues: LayoutAnimationsValues,
  ) => LayoutAnimation;

  declare type BaseLayoutAnimationConfig = {|
    +duration?: number,
    +easing?: EasingFn,
    +type?: AnimationFunction,
    +damping?: number,
    +mass?: number,
    +stiffness?: number,
    +overshootClamping?: number,
    +restDisplacementThreshold?: number,
    +restSpeedThreshold?: number,
  |};

  declare type BaseBuilderAnimationConfig = {|
    ...BaseLayoutAnimationConfig,
    rotate?: number | string,
  |};

  declare type LayoutAnimationAndConfig = [
    AnimationFunction,
    BaseBuilderAnimationConfig,
  ];

  declare export class BaseAnimationBuilder {
    static duration(durationMs: number): BaseAnimationBuilder;
    duration(durationMs: number): BaseAnimationBuilder;

    static delay(delayMs: number): BaseAnimationBuilder;
    delay(delayMs: number): BaseAnimationBuilder;

    static withCallback(
      callback: (finished: boolean) => void,
    ): BaseAnimationBuilder;
    withCallback(callback: (finished: boolean) => void): BaseAnimationBuilder;

    static getDuration(): number;
    getDuration(): number;

    static randomDelay(): BaseAnimationBuilder;
    randomDelay(): BaseAnimationBuilder;

    getDelay(): number;
    getDelayFunction(): AnimationFunction;

    static build(): EntryExitAnimationFunction | LayoutAnimationFunction;
  }

  declare export type ReanimatedAnimationBuilder =
    | Class<BaseAnimationBuilder>
    | BaseAnimationBuilder;

  declare export class ComplexAnimationBuilder extends BaseAnimationBuilder {
    static easing(easingFunction: EasingFn): ComplexAnimationBuilder;
    easing(easingFunction: EasingFn): ComplexAnimationBuilder;

    static rotate(degree: string): ComplexAnimationBuilder;
    rotate(degree: string): ComplexAnimationBuilder;

    static springify(): ComplexAnimationBuilder;
    springify(): ComplexAnimationBuilder;

    static damping(damping: number): ComplexAnimationBuilder;
    damping(damping: number): ComplexAnimationBuilder;

    static mass(mass: number): ComplexAnimationBuilder;
    mass(mass: number): ComplexAnimationBuilder;

    static stiffness(stiffness: number): ComplexAnimationBuilder;
    stiffness(stiffness: number): ComplexAnimationBuilder;

    static overshootClamping(
      overshootClamping: number,
    ): ComplexAnimationBuilder;
    overshootClamping(overshootClamping: number): ComplexAnimationBuilder;

    static restDisplacementThreshold(
      restDisplacementThreshold: number,
    ): ComplexAnimationBuilder;
    restDisplacementThreshold(
      restDisplacementThreshold: number,
    ): ComplexAnimationBuilder;

    static restSpeedThreshold(
      restSpeedThreshold: number,
    ): ComplexAnimationBuilder;
    restSpeedThreshold(restSpeedThreshold: number): ComplexAnimationBuilder;

    static withInitialValues(values: StyleProps): BaseAnimationBuilder;
    withInitialValues(values: StyleProps): BaseAnimationBuilder;

    getAnimationAndConfig(): LayoutAnimationAndConfig;
  }

  declare export class SlideInDown extends ComplexAnimationBuilder {
    static createInstance(): SlideInDown;

    build(): AnimationConfigFunction<EntryAnimationsValues>;
  }

  declare export class SlideOutDown extends ComplexAnimationBuilder {
    static createInstance(): SlideOutDown;

    build(): AnimationConfigFunction<ExitAnimationsValues>;
  }

  declare export class FadeInDown extends ComplexAnimationBuilder {
    static createInstance(): FadeInDown;

    build(): AnimationConfigFunction<EntryAnimationsValues>;
  }

  declare export class FadeOutDown extends ComplexAnimationBuilder {
    static createInstance(): FadeOutDown;

    build(): AnimationConfigFunction<ExitAnimationsValues>;
  }

  declare type $SyntheticEvent<T: { ... }> = {
    +nativeEvent: $ReadOnly<$Exact<T>>,
    ...
  };

  declare type GestureStateUndetermined = 0;
  declare type GestureStateFailed = 1;
  declare type GestureStateBegan = 2;
  declare type GestureStateCancelled = 3;
  declare type GestureStateActive = 4;
  declare type GestureStateEnd = 5;
  declare type GestureState =
    | GestureStateUndetermined
    | GestureStateFailed
    | GestureStateBegan
    | GestureStateCancelled
    | GestureStateActive
    | GestureStateEnd;

  declare export type $Event<T: { ... }> = {
    handlerTag: number,
    numberOfPointers: number,
    state: GestureState,
    oldState: GestureState,
    ...$Exact<T>,
    ...
  };

  declare export type EventResult<T: { ... }, E: $Event<T> = $Event<T>> =
    $SyntheticEvent<E> => void;

  declare type ToValue = (val: mixed) => ValueImpl;
  declare type Event = <T: { ... }, E: $Event<T> = $Event<T>>(
    defs: $ReadOnlyArray<{
      +nativeEvent: $Shape<$ObjMap<E, ToValue>>,
      ...
    }>,
  ) => EventResult<T, E>;

  declare type UseValue = (initialVal: number) => ValueImpl;

  declare type AnimatedGestureHandlerEventCallback<T, E: $Event<T>> = (
    event: $Shape<E>,
    context: {| [name: string]: mixed |},
  ) => mixed;

  declare type UseAnimatedGestureHandler = <T, E: $Event<T> = $Event<T>>(
    callbacks: $Shape<{|
      +onStart: AnimatedGestureHandlerEventCallback<T, E>,
      +onActive: AnimatedGestureHandlerEventCallback<T, E>,
      +onEnd: AnimatedGestureHandlerEventCallback<T, E>,
      +onFail: AnimatedGestureHandlerEventCallback<T, E>,
      +onCancel: AnimatedGestureHandlerEventCallback<T, E>,
      +onFinish: AnimatedGestureHandlerEventCallback<T, E>,
    |}>,
    dependencies?: $ReadOnlyArray<mixed>,
  ) => $SyntheticEvent<E> => mixed;

  declare export type SharedValue<T> = {
    value: T,
    ...
  };

  declare type UseSharedValue = <T>(val: T) => SharedValue<T>;

  declare type UseDerivedValue = <T>(
    updater: () => T,
    dependencies?: $ReadOnlyArray<mixed>,
  ) => SharedValue<T>;

  declare type UseAnimatedStyle = <T>(
    styleSelector: () => T,
    dependencies?: $ReadOnlyArray<mixed>,
  ) => T;

  declare export type WithSpringConfig = $Shape<{|
    +stiffness: number,
    +damping: number,
    +mass: number,
    +overshootClamping: boolean,
    +restDisplacementThreshold: number,
    +restSpeedThreshold: number,
    +velocity: number,
  |}>;

  // Doesn't actually return a number, but sharedValue.value has a differently
  // typed getter vs. setter, and Flow doesn't support that
  declare type WithSpring = (
    toValue: number | string,
    springConfig?: WithSpringConfig,
  ) => number;

  declare type WithTimingConfig = $Shape<{
    +duration: number,
    +easing: EasingFn | EasingFnFactory,
  }>;

  declare type WithTiming = <T: AnimatableValue>(
    toValue: T,
    timingConfig?: WithTimingConfig,
    callback?: AnimationCallback,
  ) => T;

  declare type RunOnJS = <F>(func: F) => F;

  declare type CancelAnimation = (animation: number) => void;

  declare type AnimatedKeyboardInfo = {|
    +height: SharedValue<number>,
    +state: SharedValue<0 | 1 | 2 | 3 | 4>,
  |};
  declare type UseAnimatedKeyboard = (config?: {|
    +isStatusBarTranslucentAndroid?: boolean,
  |}) => AnimatedKeyboardInfo;

  declare type UseAnimatedReaction = <T: AnimatableValue>(
    () => T,
    (currentValue: T, previousValue: T) => mixed,
  ) => void;

  declare export var Node: typeof NodeImpl;
  declare export var Value: typeof ValueImpl;
  declare export var Clock: typeof ClockImpl;
  declare export var View: typeof ViewImpl;
  declare export var Text: typeof TextImpl;
  declare export var Image: typeof ImageImpl;
  declare export var Code: typeof CodeImpl;
  declare export var block: Block;
  declare export var set: Set;
  declare export var call: Call;
  declare export var cond: Cond;
  declare export var not: Not;
  declare export var and: And;
  declare export var or: Or;
  declare export var eq: Eq;
  declare export var neq: Neq;
  declare export var lessThan: LessThan;
  declare export var greaterThan: GreaterThan;
  declare export var lessOrEq: LessOrEq;
  declare export var greaterOrEq: GreaterOrEq;
  declare export var add: Add;
  declare export var sub: Sub;
  declare export var multiply: Multiply;
  declare export var divide: Divide;
  declare export var pow: Pow;
  declare export var max: Max;
  declare export var min: Min;
  declare export var abs: Abs;
  declare export var ceil: Ceil;
  declare export var floor: Floor;
  declare export var round: Round;
  declare export var startClock: StartClock;
  declare export var stopClock: StopClock;
  declare export var clockRunning: ClockRunning;
  declare export var debug: Debug;
  declare export var interpolateNode: InterpolateNode;
  declare export var interpolateColors: InterpolateColors;
  declare export var interpolate: Interpolate;
  declare export var interpolateColor: InterpolateColor;
  declare export var Extrapolate: ExtrapolateModule;
  declare export var timing: Timing;
  declare export var SpringUtils: SpringUtilsModule;
  declare export var spring: Spring;
  declare export var decay: Decay;
  declare export var event: Event;
  declare export var useValue: UseValue;
  declare export var useAnimatedGestureHandler: UseAnimatedGestureHandler;
  declare export var useSharedValue: UseSharedValue;
  declare export var useDerivedValue: UseDerivedValue;
  declare export var useAnimatedStyle: UseAnimatedStyle;
  declare export var withSpring: WithSpring;
  declare export var withTiming: WithTiming;
  declare export var runOnJS: RunOnJS;
  declare export var cancelAnimation: CancelAnimation;
  declare export var useAnimatedKeyboard: UseAnimatedKeyboard;
  declare export var useAnimatedReaction: UseAnimatedReaction;

  declare export default {
    +Node: typeof NodeImpl,
    +Value: typeof ValueImpl,
    +Clock: typeof ClockImpl,
    +View: typeof ViewImpl,
    +Text: typeof TextImpl,
    +Image: typeof ImageImpl,
    +Code: typeof CodeImpl,
    +block: Block,
    +set: Set,
    +call: Call,
    +cond: Cond,
    +not: Not,
    +and: And,
    +or: Or,
    +eq: Eq,
    +neq: Neq,
    +lessThan: LessThan,
    +greaterThan: GreaterThan,
    +lessOrEq: LessOrEq,
    +greaterOrEq: GreaterOrEq,
    +add: Add,
    +sub: Sub,
    +multiply: Multiply,
    +divide: Divide,
    +pow: Pow,
    +max: Max,
    +min: Min,
    +abs: Abs,
    +ceil: Ceil,
    +floor: Floor,
    +round: Round,
    +startClock: StartClock,
    +stopClock: StopClock,
    +clockRunning: ClockRunning,
    +debug: Debug,
    +interpolateNode: InterpolateNode,
    +interpolateColors: InterpolateColors,
    +interpolate: Interpolate,
    +interpolateColor: InterpolateColor,
    +Extrapolate: ExtrapolateModule,
    +timing: Timing,
    +spring: Spring,
    +decay: Decay,
    +SpringUtils: SpringUtilsModule,
    +event: Event,
    +useValue: UseValue,
    +useAnimatedGestureHandler: UseAnimatedGestureHandler,
    +useSharedValue: UseSharedValue,
    +useDerivedValue: UseDerivedValue,
    +useAnimatedStyle: UseAnimatedStyle,
    +withSpring: WithSpring,
    +withTiming: WithTiming,
    +runOnJS: RunOnJS,
    +cancelAnimation: CancelAnimation,
    ...
  };

}
