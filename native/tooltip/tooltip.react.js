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
import {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
  Extrapolate,
} from 'react-native-reanimated';

import {
  TooltipContextProvider,
  TooltipContext,
} from './tooltip-context.react.js';
import BaseTooltipItem, {
  type TooltipItemBaseProps,
} from './tooltip-item.react.js';
import { ChatContext } from '../chat/chat-context.js';
import SWMansionIcon from '../components/swmansion-icon.react.js';
import type { AppNavigationProp } from '../navigation/app-navigator.react.js';
import { OverlayContext } from '../navigation/overlay-context.js';
import type { TooltipModalParamList } from '../navigation/route-names.js';
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
  type WritableAnimatedStyleObj,
  type ReanimatedTransform,
  type AnimatedStyleObj,
} from '../types/styles.js';

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

export type TooltipProps<RouteName> = {
  +navigation: AppNavigationProp<RouteName>,
  +route: TooltipRoute<RouteName>,
};
type ButtonProps<Base> = {
  ...Base,
  +progressV2: SharedValue<number>,
  +isOpeningSidebar: boolean,
};

export type TooltipMenuProps<RouteName> = {
  ...TooltipProps<RouteName>,
  +tooltipItem: React.ComponentType<TooltipItemBaseProps>,
};

function createTooltip<
  RouteName: $Keys<TooltipModalParamList>,
  TooltipPropsType: TooltipProps<RouteName> = TooltipProps<RouteName>,
>(
  ButtonComponent: React.ComponentType<ButtonProps<TooltipPropsType>>,
  MenuComponent: React.ComponentType<TooltipMenuProps<RouteName>>,
): React.ComponentType<TooltipPropsType> {
  function Tooltip(
    props: $ReadOnly<{
      ...TooltipPropsType,
      +hideTooltip: () => mixed,
    }>,
  ) {
    const dimensions = useSelector(state => state.dimensions);
    const overlayContext = React.useContext(OverlayContext);
    const chatContext = React.useContext(ChatContext);

    const { params } = props.route;
    const { tooltipLocation } = params;
    const isFixed = tooltipLocation === 'fixed';

    const { hideTooltip, ...navAndRouteForFlow } = props;

    React.useEffect(() => {
      Haptics.impactAsync();
    }, []);

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

    const margin = React.useMemo(() => {
      const customMargin = params.margin;
      return customMargin !== null && customMargin !== undefined
        ? customMargin
        : 20;
    }, [params.margin]);

    const tooltipHeight = React.useMemo(() => {
      if (tooltipLocation === 'fixed') {
        return fixedTooltipHeight;
      } else {
        return getTooltipHeight(tooltipContext.getNumVisibleEntries());
      }
    }, [tooltipLocation, tooltipContext]);

    const computedTooltipLocation = React.useMemo(() => {
      if (tooltipLocation) {
        return tooltipLocation;
      }

      const { initialCoordinates, verticalBounds } = params;
      const { y, height } = initialCoordinates;
      const contentTop = y;
      const contentBottom = y + height;
      const boundsTop = verticalBounds.y;
      const boundsBottom = verticalBounds.y + verticalBounds.height;

      const fullHeight = tooltipHeight + margin;
      if (
        contentBottom + fullHeight > boundsBottom &&
        contentTop - fullHeight > boundsTop
      ) {
        return 'above';
      }

      return 'below';
    }, [margin, tooltipHeight, params, tooltipLocation]);

    invariant(overlayContext, 'Tooltip should have OverlayContext');
    const { position } = overlayContext;
    invariant(position, 'position should be defined in tooltip');

    const tooltipHorizontalOffset = useSharedValue(0);

    const opacityStyle: AnimatedStyleObj = useAnimatedStyle(() => {
      const backdropOpacity = interpolate(
        position.value,
        [0, 1],
        [0, 0.7],
        Extrapolate.CLAMP,
      );
      return {
        opacity: backdropOpacity,
      };
    });

    const contentContainerStyle: ViewStyle = React.useMemo(() => {
      const { verticalBounds } = params;
      const fullScreenHeight = dimensions.height;
      const top = verticalBounds.y;
      const bottom =
        fullScreenHeight - verticalBounds.y - verticalBounds.height;
      return {
        ...styles.contentContainer,
        marginTop: top,
        marginBottom: bottom,
      };
    }, [dimensions.height, params, styles.contentContainer]);

    const buttonStyle: ViewStyle = React.useMemo(() => {
      const { initialCoordinates, verticalBounds } = params;
      const { x, y, width, height } = initialCoordinates;
      return {
        width: Math.ceil(width),
        height: Math.ceil(height),
        marginTop: y - verticalBounds.y,
        marginLeft: x,
      };
    }, [params]);

    const tooltipContainerStyle: AnimatedStyleObj = useAnimatedStyle(() => {
      const { initialCoordinates, verticalBounds, chatInputBarHeight } = params;
      const { x, y, width, height } = initialCoordinates;

      const style: WritableAnimatedStyleObj = {};
      style.position = 'absolute';
      style.alignItems = 'center';
      const tooltipContainerOpacity = interpolate(
        position.value,
        [0, 0.1],
        [0, 1],
        Extrapolate.CLAMP,
      );
      style.opacity = tooltipContainerOpacity;

      const invertedPosition = 1 - position.value;

      const transform: Array<ReanimatedTransform> = [];

      if (computedTooltipLocation !== 'fixed') {
        const tooltipHorizontal =
          invertedPosition * tooltipHorizontalOffset.value;
        transform.push({ translateX: tooltipHorizontal });
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

      if (computedTooltipLocation === 'fixed') {
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
        const fixedTooltipVertical = invertedPosition * dimensions.height;
        transform.push({ translateY: fixedTooltipVertical });
      } else if (computedTooltipLocation === 'above') {
        style.bottom =
          dimensions.height - Math.max(y, verticalBounds.y) + margin;
        const tooltipVerticalAbove = interpolate(
          position.value,
          [0, 1],
          [margin + tooltipHeight / 2, 0],
          Extrapolate.CLAMP,
        );
        transform.push({ translateY: tooltipVerticalAbove });
      } else {
        style.top =
          Math.min(y + height, verticalBounds.y + verticalBounds.height) +
          margin;
        const tooltipVerticalBelow = interpolate(
          position.value,
          [0, 1],
          [-margin - tooltipHeight / 2, 0],
          Extrapolate.CLAMP,
        );
        transform.push({ translateY: tooltipVerticalBelow });
      }

      if (computedTooltipLocation !== 'fixed') {
        const tooltipScale = interpolate(
          position.value,
          [0, 0.2, 0.8, 1],
          [0, 0, 1, 1],
          Extrapolate.CLAMP,
        );
        transform.push({ scale: tooltipScale });
      }

      style.transform = transform;

      return style;
    }, [
      dimensions.height,
      dimensions.width,
      params,
      computedTooltipLocation,
      margin,
      tooltipHeight,
    ]);

    const onPressMore = React.useCallback(() => {
      Keyboard.dismiss();
      tooltipContext.showActionSheet();
    }, [tooltipContext]);

    const renderMoreIcon = React.useCallback((): React.Node => {
      return (
        <SWMansionIcon name="menu-vertical" style={styles.icon} size={16} />
      );
    }, [styles.icon]);

    const onTooltipContainerLayout = React.useCallback(
      (event: LayoutEvent) => {
        const { x, width } = params.initialCoordinates;

        const extraLeftSpace = x;
        const extraRightSpace = dimensions.width - width - x;

        const actualWidth = event.nativeEvent.layout.width;
        if (extraLeftSpace < extraRightSpace) {
          const minWidth = width + 2 * extraLeftSpace;
          tooltipHorizontalOffset.value = (minWidth - actualWidth) / 2;
        } else {
          const minWidth = width + 2 * extraRightSpace;
          tooltipHorizontalOffset.value = (actualWidth - minWidth) / 2;
        }
      },
      [dimensions.width, params.initialCoordinates, tooltipHorizontalOffset],
    );

    const backdropStyle = React.useMemo(
      () => [opacityStyle, styles.backdrop],
      [opacityStyle, styles.backdrop],
    );

    const tooltipItemContainerStyle: Array<ViewStyle> = [styles.itemContainer];

    if (computedTooltipLocation === 'fixed') {
      tooltipItemContainerStyle.push(styles.itemContainerFixed);
    }

    const items: Array<React.Node> = [
      <MenuComponent
        {...navAndRouteForFlow}
        tooltipItem={boundTooltipItem}
        key="menu"
      />,
    ];

    if (tooltipContext.shouldShowMore()) {
      items.push(
        <BaseTooltipItem
          id="more"
          text="More"
          onPress={onPressMore}
          renderIcon={renderMoreIcon}
          containerStyle={tooltipItemContainerStyle}
          key="more"
        />,
      );
    }

    let triangleStyle;
    const { initialCoordinates } = params;
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
    if (computedTooltipLocation === 'above') {
      triangleDown = <View style={[styles.triangleDown, triangleStyle]} />;
    } else if (computedTooltipLocation === 'below') {
      triangleUp = <View style={[styles.triangleUp, triangleStyle]} />;
    }

    const isOpeningSidebar = !!chatContext?.currentTransitionSidebarSourceID;

    const buttonProps: ButtonProps<TooltipPropsType> = {
      ...navAndRouteForFlow,
      progressV2: position,
      isOpeningSidebar,
    };

    const itemsStyles = [styles.items, styles.itemsFixed];

    let tooltip = null;

    if (computedTooltipLocation !== 'fixed') {
      tooltip = (
        <AnimatedView
          style={tooltipContainerStyle}
          onLayout={onTooltipContainerLayout}
        >
          {triangleUp}
          <View style={styles.items}>{items}</View>
          {triangleDown}
        </AnimatedView>
      );
    } else if (computedTooltipLocation === 'fixed' && !params.hideTooltip) {
      tooltip = (
        <AnimatedView style={tooltipContainerStyle}>
          <View style={itemsStyles}>{items}</View>
        </AnimatedView>
      );
    }

    return (
      <TouchableWithoutFeedback onPress={closeTooltip}>
        <View style={styles.container}>
          <AnimatedView style={backdropStyle} />
          <View style={contentContainerStyle}>
            <View style={buttonStyle}>
              <ButtonComponent {...buttonProps} />
            </View>
          </View>
          {tooltip}
        </View>
      </TouchableWithoutFeedback>
    );
  }
  function MemoizedTooltip(props: TooltipPropsType) {
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
        <Tooltip {...props} hideTooltip={hideTooltip} />
      </TooltipContextProvider>
    );
  }
  return React.memo<TooltipPropsType>(MemoizedTooltip);
}

function getTooltipHeight(numEntries: number): number {
  // 10 (triangle) + 37 * numEntries (entries) + numEntries - 1 (padding)
  return 9 + 38 * numEntries;
}

const fixedTooltipHeight: number = 53;

export { createTooltip, fixedTooltipHeight };
