// flow-typed signature: f4fe081e4162c0c8065878c02a1d3687
// flow-typed version: dc2d6a22c7/@react-navigation/drawer_v5.x.x/flow_>=v0.104.x

declare module '@react-navigation/drawer' {

  import type {
    CreateNavigator,
    DrawerNavigationState,
    DrawerOptions,
    DrawerNavigationEventMap,
    ExtraDrawerNavigatorProps,
    DrawerNavigationConfig,
    DrawerNavigationBuilderResult,
    TextStyleProp,
    ViewStyleProp,
    PanGestureHandlerProps,
  } from '@react-navigation/core';

  /**
   * createDrawerNavigator
   */

  declare export var createDrawerNavigator: CreateNavigator<
    DrawerNavigationState,
    DrawerOptions,
    DrawerNavigationEventMap,
    ExtraDrawerNavigatorProps,
  >;

  /**
   * DrawerView
   */

  declare export type DrawerViewProps = {|
    ...DrawerNavigationConfig,
    ...DrawerNavigationBuilderResult,
  |};
  declare export var DrawerView: React.ComponentType<DrawerViewProps>;

  /**
   * DrawerItem
   */

  declare export type DrawerItemProps = {|
    +label:
      | string
      | ({| +color: string, +focused: boolean |}) => React$Node,
    +onPress: () => mixed,
    +icon?: ({|
      +color: string,
      +size: number,
      +focused: boolean,
    |}) => React$Node,
    +to?: string,
    +focused?: boolean,
    +activeTintColor?: string,
    +inactiveTintColor?: string,
    +activeBackgroundColor?: string,
    +inactiveBackgroundColor?: string,
    +labelStyle?: TextStyleProp,
    +style?: ViewStyleProp,
  |};
  declare export var DrawerItem: React.ComponentType<DrawerItemProps>;

  /**
   * DrawerItemList
   */

  declare export var DrawerItemList: React.ComponentType<
    DrawerNavigationBuilderResult,
  >;

  /**
   * DrawerContent
   */

  declare export var DrawerContent: React.ComponentType<
    DrawerNavigationBuilderResult,
  >;

  /**
   * DrawerContentScrollView
   */

  declare export var DrawerContentScrollView: React.ComponentType<{
    +children: React$Node,
    ...
  }>;

  /**
   * DrawerGestureContext
   */

  declare type GestureHandlerRef = React.ElementRef<
    React.ComponentType<PanGestureHandlerProps>,
  >;
  declare export var DrawerGestureContext: React$Context<?GestureHandlerRef>;

  /**
   * useIsDrawerOpen
   */

  declare export function useDrawerStatus(): 'open' | 'closed';

}
