// @flow

import type { RouteProp } from '@react-navigation/core';
import * as Haptics from 'expo-haptics';
import invariant from 'invariant';
import * as React from 'react';
import {
  View,
  TouchableWithoutFeedback,
  Platform,
  Keyboard,
} from 'react-native';
import Animated from 'react-native-reanimated';

import {
  TooltipContextProvider,
  TooltipContext,
  type TooltipContextType,
} from './tooltip-context.react.js';
import BaseTooltipItem, {
  type TooltipItemBaseProps,
} from './tooltip-item.react.js';
import { ChatContext, type ChatContextType } from '../chat/chat-context.js';
import SWMansionIcon from '../components/swmansion-icon.react.js';
import type { AppNavigationProp } from '../navigation/app-navigator.react.js';
import {
  OverlayContext,
  type OverlayContextType,
} from '../navigation/overlay-context.js';
import type { TooltipModalParamList } from '../navigation/route-names.js';
import { type DimensionsInfo } from '../redux/dimensions-updater.react.js';
import { useSelector } from '../redux/redux-utils.js';
import { useStyles } from '../themes/colors.js';
import {
  type VerticalBounds,
  type LayoutCoordinates,
} from '../types/layout-types.js';
import type { LayoutEvent } from '../types/react-native.js';
import {
  AnimatedView,
  type ViewStyle,
  type AnimatedViewStyle,
  type WritableAnimatedStyleObj,
  type ReanimatedTransform,
} from '../types/styles.js';

const { Value, Node, Extrapolate, add, multiply, interpolateNode } = Animated;

const unboundStyles = {
  backdrop: {
    backgroundColor: 'black',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  icon: {
    color: 'modalForegroundLabel',
  },
  itemContainer: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 10,
  },
  itemContainerFixed: {
    flexDirection: 'column',
  },
  items: {
    backgroundColor: 'tooltipBackground',
    borderRadius: 5,
    overflow: 'hidden',
  },
  itemsFixed: {
    flex: 1,
    flexDirection: 'row',
  },
  triangleDown: {
    borderBottomColor: 'transparent',
    borderBottomWidth: 0,
    borderLeftColor: 'transparent',
    borderLeftWidth: 10,
    borderRightColor: 'transparent',
    borderRightWidth: 10,
    borderStyle: 'solid',
    borderTopColor: 'tooltipBackground',
    borderTopWidth: 10,
    height: 10,
    top: Platform.OS === 'android' ? -1 : 0,
    width: 10,
  },
  triangleUp: {
    borderBottomColor: 'tooltipBackground',
    borderBottomWidth: 10,
    borderLeftColor: 'transparent',
    borderLeftWidth: 10,
    borderRightColor: 'transparent',
    borderRightWidth: 10,
    borderStyle: 'solid',
    borderTopColor: 'transparent',
    borderTopWidth: 0,
    bottom: Platform.OS === 'android' ? -1 : 0,
    height: 10,
    width: 10,
  },
};

export type TooltipParams<CustomProps> = {
  ...CustomProps,
  +presentedFrom: string,
  +initialCoordinates: LayoutCoordinates,
  +verticalBounds: VerticalBounds,
  +tooltipLocation?: 'above' | 'below' | 'fixed',
  +margin?: number,
  +visibleEntryIDs?: $ReadOnlyArray<string>,
  +chatInputBarHeight?: number,
  +hideTooltip?: boolean,
};
export type TooltipRoute<RouteName: $Keys<TooltipModalParamList>> = RouteProp<
  TooltipModalParamList,
  RouteName,
>;

export type BaseTooltipProps<RouteName> = {
  +navigation: AppNavigationProp<RouteName>,
  +route: TooltipRoute<RouteName>,
};
type ButtonProps<Base> = {
  ...Base,
  +progress: Node,
  +isOpeningSidebar: boolean,
};
type TooltipProps<Base> = {
  ...Base,
  // Redux state
  +dimensions: DimensionsInfo,
  +overlayContext: ?OverlayContextType,
  +chatContext: ?ChatContextType,
  +styles: $ReadOnly<typeof unboundStyles>,
  +tooltipContext: TooltipContextType,
  +closeTooltip: () => mixed,
  +boundTooltipItem: React.ComponentType<TooltipItemBaseProps>,
  +getMargin: () => number,
  +getTooltipHeight: () => number,
  +getTooltipLocation: () => 'above' | 'below' | 'fixed',
  +backdropOpacity: Node,
  +tooltipContainerOpacity: Node,
  +tooltipVerticalAbove: Node,
  +tooltipVerticalBelow: Node,
  +tooltipHorizontalOffset: Value,
  +tooltipHorizontal: Node,
  +tooltipScale: Node,
  +fixedTooltipVertical: Node,
};

export type TooltipMenuProps<RouteName> = {
  ...BaseTooltipProps<RouteName>,
  +tooltipItem: React.ComponentType<TooltipItemBaseProps>,
};

function createTooltip<
  RouteName: $Keys<TooltipModalParamList>,
  BaseTooltipPropsType: BaseTooltipProps<RouteName> = BaseTooltipProps<RouteName>,
>(
  ButtonComponent: React.ComponentType<ButtonProps<BaseTooltipPropsType>>,
  MenuComponent: React.ComponentType<TooltipMenuProps<RouteName>>,
): React.ComponentType<BaseTooltipPropsType> {
  class Tooltip extends React.PureComponent<
    TooltipProps<BaseTooltipPropsType>,
  > {
    componentDidMount() {
      Haptics.impactAsync();
    }

    get opacityStyle(): AnimatedViewStyle {
      return {
        ...this.props.styles.backdrop,
        opacity: this.props.backdropOpacity,
      };
    }

    get contentContainerStyle(): ViewStyle {
      const { verticalBounds } = this.props.route.params;
      const fullScreenHeight = this.props.dimensions.height;
      const top = verticalBounds.y;
      const bottom =
        fullScreenHeight - verticalBounds.y - verticalBounds.height;
      return {
        ...this.props.styles.contentContainer,
        marginTop: top,
        marginBottom: bottom,
      };
    }

    get buttonStyle(): ViewStyle {
      const { params } = this.props.route;
      const { initialCoordinates, verticalBounds } = params;
      const { x, y, width, height } = initialCoordinates;
      return {
        width: Math.ceil(width),
        height: Math.ceil(height),
        marginTop: y - verticalBounds.y,
        marginLeft: x,
      };
    }

    get tooltipContainerStyle(): AnimatedViewStyle {
      const { dimensions, route, getMargin } = this.props;
      const { initialCoordinates, verticalBounds, chatInputBarHeight } =
        route.params;
      const { x, y, width, height } = initialCoordinates;
      const tooltipLocation = this.props.getTooltipLocation();

      const style: WritableAnimatedStyleObj = {};
      style.position = 'absolute';
      style.alignItems = 'center';
      style.opacity = this.props.tooltipContainerOpacity;

      const transform: Array<ReanimatedTransform> = [];

      if (tooltipLocation !== 'fixed') {
        transform.push({ translateX: this.props.tooltipHorizontal });
      }

      const extraLeftSpace = x;
      const extraRightSpace = dimensions.width - width - x;
      if (extraLeftSpace < extraRightSpace) {
        style.left = 0;
        style.minWidth = width + 2 * extraLeftSpace;
      } else {
        style.right = 0;
        style.minWidth = width + 2 * extraRightSpace;
      }

      const inputBarHeight = chatInputBarHeight ?? 0;

      if (tooltipLocation === 'fixed') {
        const padding = 8;

        style.minWidth = dimensions.width - 16;
        style.left = 8;
        style.right = 8;
        style.bottom =
          dimensions.height -
          verticalBounds.height -
          verticalBounds.y -
          inputBarHeight +
          padding;
        transform.push({ translateY: this.props.fixedTooltipVertical });
      } else if (tooltipLocation === 'above') {
        style.bottom =
          dimensions.height - Math.max(y, verticalBounds.y) + getMargin();
        transform.push({ translateY: this.props.tooltipVerticalAbove });
      } else {
        style.top =
          Math.min(y + height, verticalBounds.y + verticalBounds.height) +
          getMargin();
        transform.push({ translateY: this.props.tooltipVerticalBelow });
      }

      if (tooltipLocation !== 'fixed') {
        transform.push({ scale: this.props.tooltipScale });
      }

      style.transform = transform;

      return style;
    }

    render(): React.Node {
      const {
        dimensions,
        overlayContext,
        chatContext,
        styles,
        tooltipContext,
        closeTooltip,
        boundTooltipItem,
        getMargin,
        getTooltipHeight,
        getTooltipLocation,
        backdropOpacity,
        tooltipContainerOpacity,
        tooltipVerticalAbove,
        tooltipVerticalBelow,
        tooltipHorizontalOffset,
        tooltipHorizontal,
        tooltipScale,
        fixedTooltipVertical,
        ...navAndRouteForFlow
      } = this.props;

      const tooltipContainerStyle: Array<ViewStyle> = [styles.itemContainer];
      const tooltipLocation = getTooltipLocation();

      if (tooltipLocation === 'fixed') {
        tooltipContainerStyle.push(styles.itemContainerFixed);
      }

      const items: Array<React.Node> = [
        <MenuComponent
          {...navAndRouteForFlow}
          tooltipItem={this.getTooltipItem()}
          key="menu"
        />,
      ];

      if (this.props.tooltipContext.shouldShowMore()) {
        items.push(
          <BaseTooltipItem
            id="more"
            text="More"
            onPress={this.onPressMore}
            renderIcon={this.renderMoreIcon}
            containerStyle={tooltipContainerStyle}
            key="more"
          />,
        );
      }

      let triangleStyle;
      const { route } = this.props;
      const { initialCoordinates } = route.params;
      const { x, width } = initialCoordinates;
      const extraLeftSpace = x;
      const extraRightSpace = dimensions.width - width - x;
      if (extraLeftSpace < extraRightSpace) {
        triangleStyle = {
          alignSelf: 'flex-start',
          left: extraLeftSpace + (width - 20) / 2,
        };
      } else {
        triangleStyle = {
          alignSelf: 'flex-end',
          right: extraRightSpace + (width - 20) / 2,
        };
      }

      let triangleDown = null;
      let triangleUp = null;
      if (tooltipLocation === 'above') {
        triangleDown = <View style={[styles.triangleDown, triangleStyle]} />;
      } else if (tooltipLocation === 'below') {
        triangleUp = <View style={[styles.triangleUp, triangleStyle]} />;
      }

      invariant(overlayContext, 'Tooltip should have OverlayContext');
      const { position } = overlayContext;
      invariant(position, 'position should be defined in tooltip');

      const isOpeningSidebar = !!chatContext?.currentTransitionSidebarSourceID;

      const buttonProps: ButtonProps<BaseTooltipPropsType> = {
        ...navAndRouteForFlow,
        progress: position,
        isOpeningSidebar,
      };

      const itemsStyles = [styles.items, styles.itemsFixed];

      let tooltip = null;

      if (tooltipLocation !== 'fixed') {
        tooltip = (
          <AnimatedView
            style={this.tooltipContainerStyle}
            onLayout={this.onTooltipContainerLayout}
          >
            {triangleUp}
            <View style={styles.items}>{items}</View>
            {triangleDown}
          </AnimatedView>
        );
      } else if (
        tooltipLocation === 'fixed' &&
        !this.props.route.params.hideTooltip
      ) {
        tooltip = (
          <AnimatedView style={this.tooltipContainerStyle}>
            <View style={itemsStyles}>{items}</View>
          </AnimatedView>
        );
      }

      return (
        <TouchableWithoutFeedback onPress={this.props.closeTooltip}>
          <View style={styles.container}>
            <AnimatedView style={this.opacityStyle} />
            <View style={this.contentContainerStyle}>
              <View style={this.buttonStyle}>
                <ButtonComponent {...buttonProps} />
              </View>
            </View>
            {tooltip}
          </View>
        </TouchableWithoutFeedback>
      );
    }

    getTooltipItem(): React.ComponentType<TooltipItemBaseProps> {
      const BoundTooltipItem = this.props.boundTooltipItem;
      return BoundTooltipItem;
    }

    onPressMore = () => {
      Keyboard.dismiss();
      this.props.tooltipContext.showActionSheet();
    };

    renderMoreIcon = (): React.Node => {
      const { styles } = this.props;
      return (
        <SWMansionIcon name="menu-vertical" style={styles.icon} size={16} />
      );
    };

    onTooltipContainerLayout = (event: LayoutEvent) => {
      const { route, dimensions } = this.props;
      const { x, width } = route.params.initialCoordinates;

      const extraLeftSpace = x;
      const extraRightSpace = dimensions.width - width - x;

      const actualWidth = event.nativeEvent.layout.width;
      if (extraLeftSpace < extraRightSpace) {
        const minWidth = width + 2 * extraLeftSpace;
        this.props.tooltipHorizontalOffset.setValue(
          (minWidth - actualWidth) / 2,
        );
      } else {
        const minWidth = width + 2 * extraRightSpace;
        this.props.tooltipHorizontalOffset.setValue(
          (actualWidth - minWidth) / 2,
        );
      }
    };
  }
  function ConnectedTooltip(
    props: $ReadOnly<{
      ...BaseTooltipPropsType,
      +hideTooltip: () => mixed,
    }>,
  ) {
    const dimensions = useSelector(state => state.dimensions);
    const overlayContext = React.useContext(OverlayContext);
    const chatContext = React.useContext(ChatContext);

    const { params } = props.route;
    const { tooltipLocation } = params;
    const isFixed = tooltipLocation === 'fixed';

    const { hideTooltip, ...rest } = props;

    const { goBackOnce } = props.navigation;
    const closeTooltip = React.useCallback(() => {
      goBackOnce();
      if (isFixed) {
        hideTooltip();
      }
    }, [isFixed, hideTooltip, goBackOnce]);

    const styles = useStyles(unboundStyles);
    const boundTooltipItem = React.useCallback(
      (innerProps: TooltipItemBaseProps) => {
        const containerStyle = isFixed
          ? [styles.itemContainer, styles.itemContainerFixed]
          : styles.itemContainer;
        return (
          <BaseTooltipItem
            {...innerProps}
            containerStyle={containerStyle}
            closeTooltip={closeTooltip}
          />
        );
      },
      [isFixed, styles, closeTooltip],
    );

    const tooltipContext = React.useContext(TooltipContext);
    invariant(tooltipContext, 'TooltipContext should be set in Tooltip');

    const getMargin = React.useCallback(() => {
      const customMargin = params.margin;
      return customMargin !== null && customMargin !== undefined
        ? customMargin
        : 20;
    }, [params.margin]);

    const getTooltipHeight = React.useCallback(() => {
      if (params.tooltipLocation === 'fixed') {
        return fixedTooltipHeight;
      } else {
        return tooltipHeight(tooltipContext.getNumVisibleEntries());
      }
    }, [params.tooltipLocation, tooltipContext]);

    const getTooltipLocation = React.useCallback(() => {
      if (tooltipLocation) {
        return tooltipLocation;
      }

      const { initialCoordinates, verticalBounds } = params;
      const { y, height } = initialCoordinates;
      const contentTop = y;
      const contentBottom = y + height;
      const boundsTop = verticalBounds.y;
      const boundsBottom = verticalBounds.y + verticalBounds.height;

      const fullHeight = getTooltipHeight() + getMargin();
      if (
        contentBottom + fullHeight > boundsBottom &&
        contentTop - fullHeight > boundsTop
      ) {
        return 'above';
      }

      return 'below';
    }, [getMargin, getTooltipHeight, params, tooltipLocation]);

    invariant(overlayContext, 'Tooltip should have OverlayContext');
    const { position } = overlayContext;
    invariant(position, 'position should be defined in tooltip');

    const backdropOpacity = React.useMemo(
      () =>
        interpolateNode(position, {
          inputRange: [0, 1],
          outputRange: [0, 0.7],
          extrapolate: Extrapolate.CLAMP,
        }),
      [position],
    );
    const tooltipContainerOpacity = React.useMemo(
      () =>
        interpolateNode(position, {
          inputRange: [0, 0.1],
          outputRange: [0, 1],
          extrapolate: Extrapolate.CLAMP,
        }),
      [position],
    );

    const tooltipVerticalAbove = React.useMemo(
      () =>
        interpolateNode(position, {
          inputRange: [0, 1],
          outputRange: [getMargin() + getTooltipHeight() / 2, 0],
          extrapolate: Extrapolate.CLAMP,
        }),
      [getMargin, getTooltipHeight, position],
    );
    const tooltipVerticalBelow = React.useMemo(
      () =>
        interpolateNode(position, {
          inputRange: [0, 1],
          outputRange: [-getMargin() - getTooltipHeight() / 2, 0],
          extrapolate: Extrapolate.CLAMP,
        }),
      [getMargin, getTooltipHeight, position],
    );

    const invertedPosition = React.useMemo(
      () => add(1, multiply(-1, position)),
      [position],
    );
    const tooltipHorizontalOffset = React.useRef(new Value(0));

    const tooltipHorizontal = React.useMemo(
      () => multiply(invertedPosition, tooltipHorizontalOffset.current),
      [invertedPosition],
    );

    const tooltipScale = React.useMemo(
      () =>
        interpolateNode(position, {
          inputRange: [0, 0.2, 0.8, 1],
          outputRange: [0, 0, 1, 1],
          extrapolate: Extrapolate.CLAMP,
        }),
      [position],
    );

    const fixedTooltipVertical = React.useMemo(
      () => multiply(invertedPosition, dimensions.height),
      [dimensions.height, invertedPosition],
    );

    return (
      <Tooltip
        {...rest}
        dimensions={dimensions}
        overlayContext={overlayContext}
        chatContext={chatContext}
        styles={styles}
        tooltipContext={tooltipContext}
        closeTooltip={closeTooltip}
        boundTooltipItem={boundTooltipItem}
        getMargin={getMargin}
        getTooltipHeight={getTooltipHeight}
        getTooltipLocation={getTooltipLocation}
        backdropOpacity={backdropOpacity}
        tooltipContainerOpacity={tooltipContainerOpacity}
        tooltipVerticalAbove={tooltipVerticalAbove}
        tooltipVerticalBelow={tooltipVerticalBelow}
        tooltipHorizontalOffset={tooltipHorizontalOffset.current}
        tooltipHorizontal={tooltipHorizontal}
        tooltipScale={tooltipScale}
        fixedTooltipVertical={fixedTooltipVertical}
      />
    );
  }
  function MemoizedTooltip(props: BaseTooltipPropsType) {
    const { visibleEntryIDs } = props.route.params;
    const { goBackOnce } = props.navigation;

    const { setParams } = props.navigation;
    const hideTooltip = React.useCallback(() => {
      const paramsUpdate: any = { hideTooltip: true };
      setParams(paramsUpdate);
    }, [setParams]);

    return (
      <TooltipContextProvider
        maxOptionsToDisplay={4}
        visibleEntryIDs={visibleEntryIDs}
        cancel={goBackOnce}
        hideTooltip={hideTooltip}
      >
        <ConnectedTooltip {...props} hideTooltip={hideTooltip} />
      </TooltipContextProvider>
    );
  }
  return React.memo<BaseTooltipPropsType>(MemoizedTooltip);
}

function tooltipHeight(numEntries: number): number {
  // 10 (triangle) + 37 * numEntries (entries) + numEntries - 1 (padding)
  return 9 + 38 * numEntries;
}

const fixedTooltipHeight: number = 53;

export { createTooltip, fixedTooltipHeight };
