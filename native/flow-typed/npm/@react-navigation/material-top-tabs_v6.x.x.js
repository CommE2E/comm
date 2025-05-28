// flow-typed signature: 2ccdb5706282eb16a225b90e11079dc1
// flow-typed version: dc2d6a22c7/@react-navigation/material-top-tabs_v5.x.x/flow_>=v0.104.x

declare module '@react-navigation/material-top-tabs' {

  import type {
    CreateNavigator,
    TabNavigationState,
    MaterialTopTabOptions,
    MaterialTopTabNavigationEventMap,
    ExtraMaterialTopTabNavigatorProps,
    MaterialTopTabNavigationConfig,
    MaterialTopTabNavigationBuilderResult,
    MaterialTopTabBarProps,
    Route,
  } from '@react-navigation/core';

  /**
   * createMaterialTopTabNavigator
   */

  declare export var createMaterialTopTabNavigator: CreateNavigator<
    TabNavigationState,
    MaterialTopTabOptions,
    MaterialTopTabNavigationEventMap,
    ExtraMaterialTopTabNavigatorProps,
  >;

  /**
   * MaterialTopTabView
   */

  declare export type MaterialTopTabViewProps = {|
    ...MaterialTopTabNavigationConfig,
    ...MaterialTopTabNavigationBuilderResult,
  |};
  declare export var MaterialTopTabView: React.ComponentType<
    MaterialTopTabViewProps,
  >;

  /**
   * MaterialTopTabBar
   */

  declare export var MaterialTopTabBar: React.ComponentType<
    MaterialTopTabBarProps<Route<>>,
  >;

}
