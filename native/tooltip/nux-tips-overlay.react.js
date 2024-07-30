// @flow

import type { RouteProp } from '@react-navigation/core';
import invariant from 'invariant';
import * as React from 'react';
import { View, TouchableWithoutFeedback, Platform } from 'react-native';
import Animated from 'react-native-reanimated';

import type { AppNavigationProp } from '../navigation/app-navigator.react.js';
import {
  OverlayContext,
  type OverlayContextType,
} from '../navigation/overlay-context.js';
import type { TooltipModalParamList } from '../navigation/route-names.js';
import { type DimensionsInfo } from '../redux/dimensions-updater.react.js';
import { useSelector } from '../redux/redux-utils.js';
import { useStyles } from '../themes/colors.js';
import type {
  LayoutCoordinates,
  VerticalBounds,
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
  items: {
    backgroundColor: 'tooltipBackground',
    borderRadius: 5,
    overflow: 'hidden',
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
  +initialCoordinates: LayoutCoordinates,
  +verticalBounds: VerticalBounds,
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
};
type TooltipProps<Base> = {
  ...Base,
  // Redux state
  +dimensions: DimensionsInfo,
  +overlayContext: ?OverlayContextType,
  +styles: $ReadOnly<typeof unboundStyles>,
  +closeTooltip: () => mixed,
};

export type TooltipMenuProps<RouteName> = {
  ...BaseTooltipProps<RouteName>,
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
    backdropOpacity: Node;
    tooltipContainerOpacity: Node;
    tooltipVerticalAbove: Node;
    tooltipVerticalBelow: Node;
    tooltipHorizontalOffset: Value = new Value(0);
    tooltipHorizontal: Node;
    tooltipScale: Node;
    fixedTooltipVertical: Node;
    tooltipHeight: number = 30;
    margin: number = 20;

    constructor(props: TooltipProps<BaseTooltipPropsType>) {
      super(props);

      const { overlayContext } = props;
      invariant(overlayContext, 'Tooltip should have OverlayContext');
      const { position } = overlayContext;

      this.backdropOpacity = interpolateNode(position, {
        inputRange: [0, 1],
        outputRange: [0, 0.7],
        extrapolate: Extrapolate.CLAMP,
      });
      this.tooltipContainerOpacity = interpolateNode(position, {
        inputRange: [0, 0.1],
        outputRange: [0, 1],
        extrapolate: Extrapolate.CLAMP,
      });

      const { margin } = this;
      this.tooltipVerticalAbove = interpolateNode(position, {
        inputRange: [0, 1],
        outputRange: [margin + this.tooltipHeight / 2, 0],
        extrapolate: Extrapolate.CLAMP,
      });
      this.tooltipVerticalBelow = interpolateNode(position, {
        inputRange: [0, 1],
        outputRange: [-margin - this.tooltipHeight / 2, 0],
        extrapolate: Extrapolate.CLAMP,
      });

      const invertedPosition = add(1, multiply(-1, position));

      this.tooltipHorizontal = multiply(
        invertedPosition,
        this.tooltipHorizontalOffset,
      );

      this.tooltipScale = interpolateNode(position, {
        inputRange: [0, 0.2, 0.8, 1],
        outputRange: [0, 0, 1, 1],
        extrapolate: Extrapolate.CLAMP,
      });

      this.fixedTooltipVertical = multiply(
        invertedPosition,
        props.dimensions.height,
      );
    }

    get opacityStyle(): AnimatedViewStyle {
      return {
        ...this.props.styles.backdrop,
        opacity: this.backdropOpacity,
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
      const { dimensions, route } = this.props;
      const { initialCoordinates, verticalBounds } = route.params;
      const { x, y, width, height } = initialCoordinates;
      const { margin } = this;

      const style: WritableAnimatedStyleObj = {};
      style.position = 'absolute';
      style.alignItems = 'center';
      style.opacity = this.tooltipContainerOpacity;

      const transform: Array<ReanimatedTransform> = [];

      transform.push({ translateX: this.tooltipHorizontal });

      const extraLeftSpace = x;
      const extraRightSpace = dimensions.width - width - x;
      if (extraLeftSpace < extraRightSpace) {
        style.left = 0;
        style.minWidth = width + 2 * extraLeftSpace;
      } else {
        style.right = 0;
        style.minWidth = width + 2 * extraRightSpace;
      }

      style.top =
        Math.min(y + height, verticalBounds.y + verticalBounds.height) + margin;
      transform.push({ translateY: this.tooltipVerticalBelow });
      transform.push({ scale: this.tooltipScale });
      style.transform = transform;

      return style;
    }

    render(): React.Node {
      const {
        dimensions,
        overlayContext,
        styles,
        closeTooltip,
        ...navAndRouteForFlow
      } = this.props;

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

      const triangleUp = <View style={[styles.triangleUp, triangleStyle]} />;

      invariant(overlayContext, 'Tooltip should have OverlayContext');
      const { position } = overlayContext;

      const buttonProps: ButtonProps<BaseTooltipPropsType> = {
        ...navAndRouteForFlow,
        progress: position,
      };

      let tooltip = null;

      tooltip = (
        <AnimatedView
          style={this.tooltipContainerStyle}
          onLayout={this.onTooltipContainerLayout}
        >
          {triangleUp}
          <View style={styles.items}>
            <MenuComponent {...navAndRouteForFlow} key="menu" />
          </View>
        </AnimatedView>
      );

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

    onTooltipContainerLayout = (event: LayoutEvent) => {
      const { route, dimensions } = this.props;
      const { x, width } = route.params.initialCoordinates;

      const extraLeftSpace = x;
      const extraRightSpace = dimensions.width - width - x;

      const actualWidth = event.nativeEvent.layout.width;
      if (extraLeftSpace < extraRightSpace) {
        const minWidth = width + 2 * extraLeftSpace;
        this.tooltipHorizontalOffset.setValue((minWidth - actualWidth) / 2);
      } else {
        const minWidth = width + 2 * extraRightSpace;
        this.tooltipHorizontalOffset.setValue((actualWidth - minWidth) / 2);
      }
    };
  }

  function ConnectedTooltip(
    props: $ReadOnly<{
      ...BaseTooltipPropsType,
    }>,
  ) {
    const dimensions = useSelector(state => state.dimensions);
    const overlayContext = React.useContext(OverlayContext);

    const { goBackOnce } = props.navigation;

    const styles = useStyles(unboundStyles);

    return (
      <Tooltip
        {...props}
        dimensions={dimensions}
        overlayContext={overlayContext}
        styles={styles}
        closeTooltip={goBackOnce}
      />
    );
  }
  function MemoizedTooltip(props: BaseTooltipPropsType) {
    return <ConnectedTooltip {...props} />;
  }
  return React.memo<BaseTooltipPropsType>(MemoizedTooltip);
}

export { createTooltip };
