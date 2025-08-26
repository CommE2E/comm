declare module '@react-navigation/elements' {

  import type {
    ImageURISource,
    HeaderTitleInputBase,
    StackHeaderLeftButtonProps,
    AnimatedViewStyleProp,
  } from '@react-navigation/core';

  /**
   * Image assets
   */

  declare export var Assets: $ReadOnlyArray<ImageURISource>;

  /**
   * Header components
   */

  declare export type StackHeaderTitleProps = Partial<HeaderTitleInputBase>;
  declare export var HeaderTitle: React.ComponentType<StackHeaderTitleProps>;

  declare export type HeaderBackButtonProps = Partial<{|
    ...StackHeaderLeftButtonProps,
    +disabled: boolean,
    +accessibilityLabel: string,
  |}>;
  declare export var HeaderBackButton: React.ComponentType<
    HeaderBackButtonProps,
  >;

  declare export type HeaderBackgroundProps = Partial<{
    +children: React.Node,
    +style: AnimatedViewStyleProp,
    ...
  }>;
  declare export var HeaderBackground: React.ComponentType<
    HeaderBackgroundProps,
  >;

  /**
   * HeaderHeight accessors
   */

  declare export var HeaderHeightContext: React$Context<?number>;
  declare export function useHeaderHeight(): number;

  type Layout = { +width: number, +height: number };
  declare export function getDefaultHeaderHeight(
    layout: Layout,
    modalPresentation: boolean,
    statusBarHeight: number,
  ): number;
}
