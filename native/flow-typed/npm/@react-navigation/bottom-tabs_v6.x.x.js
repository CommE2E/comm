// flow-typed signature: 6070a4afddfa183e7c7bda53e69c0044
// flow-typed version: dc2d6a22c7/@react-navigation/bottom-tabs_v5.x.x/flow_>=v0.104.x

declare module '@react-navigation/bottom-tabs' {

  import type {
    CreateNavigator,
    TabNavigationState,
    BottomTabOptions,
    BottomTabNavigationEventMap,
    ExtraBottomTabNavigatorProps,
    BottomTabBarProps,
    BottomTabNavigationConfig,
    BottomTabNavigationBuilderResult,
  } from '@react-navigation/core';

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

  declare export var BottomTabBar: React.ComponentType<BottomTabBarProps>;

  /**
   * BottomTabView
   */

  declare export type BottomTabViewProps = {|
    ...BottomTabNavigationConfig,
    ...BottomTabNavigationBuilderResult,
  |};
  declare export var BottomTabView: React.ComponentType<BottomTabViewProps>;

}
