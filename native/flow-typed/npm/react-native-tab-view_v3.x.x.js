// flow-typed signature: a7123e367e1cd3cb25dcd811f56eea57
// flow-typed version: <<STUB>>/react-native-tab-view_v3.3.0/flow_v0.202.1

declare module 'react-native-tab-view' {
  import type { Route } from '@react-navigation/core';
  import type {
    AnimatedValue,
    ViewStyle,
  } from 'react-native-gesture-handler/@react-native';

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
    +position: AnimatedValue,
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
