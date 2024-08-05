// @flow

import invariant from 'invariant';
import * as React from 'react';
import { View, TouchableWithoutFeedback, Platform } from 'react-native';
import Animated from 'react-native-reanimated';

import type { AppNavigationProp } from '../navigation/app-navigator.react.js';
import { OverlayContext } from '../navigation/overlay-context.js';
import type { NavigationRoute } from '../navigation/route-names.js';
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

export type NUXTipsOverlayParams = {
  +initialCoordinates: LayoutCoordinates,
  +verticalBounds: VerticalBounds,
};

export type BaseNUXTipsOverlayProps = {
  +navigation: AppNavigationProp<'NUXTipsOverlay'>,
  +route: NavigationRoute<'NUXTipsOverlay'>,
};
type ButtonProps<Base> = {
  ...Base,
  +progress: Node,
};
type NUXTipsOverlayProps<Base> = {
  ...Base,
  // Redux state
  +dimensions: DimensionsInfo,
  +position: Animated.Node,
  +styles: $ReadOnly<typeof unboundStyles>,
  +closeTip: () => mixed,
  +contentContainerStyle: ViewStyle,
  +opacityStyle: AnimatedViewStyle,
};

function createNUXTipsOverlay(
  ButtonComponent: React.ComponentType<ButtonProps<BaseNUXTipsOverlayProps>>,
  MenuComponent: React.ComponentType<BaseNUXTipsOverlayProps>,
): React.ComponentType<BaseNUXTipsOverlayProps> {
  class NUXTipsOverlay extends React.PureComponent<
    NUXTipsOverlayProps<BaseNUXTipsOverlayProps>,
  > {
    tipContainerOpacity: Node;
    tipVerticalAbove: Node;
    tipVerticalBelow: Node;
    tipHorizontalOffset: Value = new Value(0);
    tipHorizontal: Node;
    tipScale: Node;
    fixedTipVertical: Node;
    tipHeight: number = 30;
    margin: number = 20;

    constructor(props: NUXTipsOverlayProps<BaseNUXTipsOverlayProps>) {
      super(props);

      const { position } = props;

      this.tipContainerOpacity = interpolateNode(position, {
        inputRange: [0, 0.1],
        outputRange: [0, 1],
        extrapolate: Extrapolate.CLAMP,
      });

      const { margin } = this;
      this.tipVerticalAbove = interpolateNode(position, {
        inputRange: [0, 1],
        outputRange: [margin + this.tipHeight / 2, 0],
        extrapolate: Extrapolate.CLAMP,
      });
      this.tipVerticalBelow = interpolateNode(position, {
        inputRange: [0, 1],
        outputRange: [-margin - this.tipHeight / 2, 0],
        extrapolate: Extrapolate.CLAMP,
      });

      const invertedPosition = add(1, multiply(-1, position));

      this.tipHorizontal = multiply(invertedPosition, this.tipHorizontalOffset);

      this.tipScale = interpolateNode(position, {
        inputRange: [0, 0.2, 0.8, 1],
        outputRange: [0, 0, 1, 1],
        extrapolate: Extrapolate.CLAMP,
      });

      this.fixedTipVertical = multiply(
        invertedPosition,
        props.dimensions.height,
      );
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

    get tipContainerStyle(): AnimatedViewStyle {
      const { dimensions, route } = this.props;
      const { initialCoordinates, verticalBounds } = route.params;
      const { x, y, width, height } = initialCoordinates;
      const { margin } = this;

      const style: WritableAnimatedStyleObj = {};
      style.position = 'absolute';
      style.alignItems = 'center';
      style.opacity = this.tipContainerOpacity;

      const transform: Array<ReanimatedTransform> = [];

      transform.push({ translateX: this.tipHorizontal });

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
      transform.push({ translateY: this.tipVerticalBelow });
      transform.push({ scale: this.tipScale });
      style.transform = transform;

      return style;
    }

    render(): React.Node {
      const {
        dimensions,
        position,
        styles,
        closeTip,
        contentContainerStyle,
        opacityStyle,
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

      const buttonProps: ButtonProps<BaseNUXTipsOverlayProps> = {
        ...navAndRouteForFlow,
        progress: position,
      };

      let tip = null;

      tip = (
        <AnimatedView
          style={this.tipContainerStyle}
          onLayout={this.onTipContainerLayout}
        >
          {triangleUp}
          <View style={styles.items}>
            <MenuComponent {...navAndRouteForFlow} key="menu" />
          </View>
        </AnimatedView>
      );

      return (
        <TouchableWithoutFeedback onPress={this.props.closeTip}>
          <View style={styles.container}>
            <AnimatedView style={opacityStyle} />
            <View style={this.props.contentContainerStyle}>
              <View style={this.buttonStyle}>
                <ButtonComponent {...buttonProps} />
              </View>
            </View>
            {tip}
          </View>
        </TouchableWithoutFeedback>
      );
    }

    onTipContainerLayout = (event: LayoutEvent) => {
      const { route, dimensions } = this.props;
      const { x, width } = route.params.initialCoordinates;

      const extraLeftSpace = x;
      const extraRightSpace = dimensions.width - width - x;

      const actualWidth = event.nativeEvent.layout.width;
      if (extraLeftSpace < extraRightSpace) {
        const minWidth = width + 2 * extraLeftSpace;
        this.tipHorizontalOffset.setValue((minWidth - actualWidth) / 2);
      } else {
        const minWidth = width + 2 * extraRightSpace;
        this.tipHorizontalOffset.setValue((actualWidth - minWidth) / 2);
      }
    };
  }

  function ConnectedNUXTipsOverlay(props: BaseNUXTipsOverlayProps) {
    const dimensions = useSelector(state => state.dimensions);
    const overlayContext = React.useContext(OverlayContext);
    invariant(overlayContext, 'NUXTipsOverlay should have OverlayContext');
    const { position } = overlayContext;

    const { goBackOnce } = props.navigation;

    const styles = useStyles(unboundStyles);

    const contentContainerStyle = React.useMemo(() => {
      const { verticalBounds } = props.route.params;
      const fullScreenHeight = dimensions.height;
      const top = verticalBounds.y;
      const bottom =
        fullScreenHeight - verticalBounds.y - verticalBounds.height;
      return {
        ...styles.contentContainer,
        marginTop: top,
        marginBottom: bottom,
      };
    }, [dimensions.height, props.route.params, styles.contentContainer]);

    const opacityStyle = React.useMemo(() => {
      const backdropOpacity = interpolateNode(position, {
        inputRange: [0, 1],
        outputRange: [0, 0.7],
        extrapolate: Extrapolate.CLAMP,
      });
      return {
        ...styles.backdrop,
        opacity: backdropOpacity,
      };
    }, [position, styles.backdrop]);

    return (
      <NUXTipsOverlay
        {...props}
        dimensions={dimensions}
        position={position}
        styles={styles}
        closeTip={goBackOnce}
        contentContainerStyle={contentContainerStyle}
        opacityStyle={opacityStyle}
      />
    );
  }
  return React.memo<BaseNUXTipsOverlayProps>(ConnectedNUXTipsOverlay);
}

export { createNUXTipsOverlay };
