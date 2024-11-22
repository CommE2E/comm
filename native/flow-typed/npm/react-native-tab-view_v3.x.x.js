// flow-typed signature: a7123e367e1cd3cb25dcd811f56eea57
// flow-typed version: <<STUB>>/react-native-tab-view_v3.3.0/flow_v0.202.1

declare module 'react-native-tab-view' {
  import type { Route } from '@react-navigation/core';

  declare type StyleObj =
  | null
  | void
  | number
  | false
  | ''
  | $ReadOnlyArray<StyleObj>
  | { [name: string]: any, ... };
  declare export type ViewStyle = StyleObj;

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

  declare type Layout = {
    +width: number,
    +height: number,
  };
  declare type SceneRendererProps = {
    +layout: Layout,
    +jumpTo: (key: string) => void,
    ...
  };

  declare export var TabBarItem: React$ComponentType<{
    +position: AnimatedInterpolation,
    +route: Route<>,
    +navigationState: { +index: number, ... },
    +onPress: () => void,
    +onLongPress: () => void,
    +style: ViewStyle,
    +getLabelText?: () => string,
    +getAccessible?: () => void,
    +getAccessibilityLabel?: () => void,
    +renderIcon?: ({ color: string, ... }) => React$Node,
    +getTestID?: () => void,
    +activeColor?: string,
    ...
  }>;

  declare export var TabView: React$ComponentType<{
    +navigationState: { +index: number, ... },
    +renderScene: (props: SceneRendererProps & { +route: Route<>, ... }) => React$Node,
    +onIndexChange: (number) => void,
    +initialLayout: Partial<Layout>,
    +renderTabBar: (TabBarProps) => React$Node,
    ...
  }>;

  declare export function SceneMap(scenes: {
    [key: string]: () => React$Node,
  }): (props: SceneRendererProps & { +route: Route<>, ... }) => React$Node;

  declare export var TabBar: React$ComponentType<{
    +style: ViewStyle,
    +indicatorStyle: ViewStyle,
    ...
  }>;

  declare export type TabBarProps = {
    +style: ViewStyle,
    +indicatorStyle: ViewStyle,
    ...
  }
}
