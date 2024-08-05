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
  +buttonStyle: ViewStyle,
  +tipHorizontalOffset: Value,
  +onTipContainerLayout: (event: LayoutEvent) => void,
  +tipContainerOpacity: Node,
  +tipVerticalBelow: Node,
  +tipHorizontal: Node,
  +tipScale: Node,
  +tipContainerStyle: AnimatedViewStyle,
};

const tipHeight: number = 30;
const margin: number = 20;

function createNUXTipsOverlay(
  ButtonComponent: React.ComponentType<ButtonProps<BaseNUXTipsOverlayProps>>,
  MenuComponent: React.ComponentType<BaseNUXTipsOverlayProps>,
): React.ComponentType<BaseNUXTipsOverlayProps> {
  class NUXTipsOverlay extends React.PureComponent<
    NUXTipsOverlayProps<BaseNUXTipsOverlayProps>,
  > {
    constructor(props: NUXTipsOverlayProps<BaseNUXTipsOverlayProps>) {
      super(props);
    }

    render(): React.Node {
      const {
        dimensions,
        position,
        styles,
        closeTip,
        contentContainerStyle,
        opacityStyle,
        buttonStyle,
        tipHorizontalOffset,
        onTipContainerLayout,
        tipContainerOpacity,
        tipVerticalBelow,
        tipHorizontal,
        tipScale,
        tipContainerStyle,
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
          style={tipContainerStyle}
          onLayout={this.props.onTipContainerLayout}
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
              <View style={buttonStyle}>
                <ButtonComponent {...buttonProps} />
              </View>
            </View>
            {tip}
          </View>
        </TouchableWithoutFeedback>
      );
    }
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

    const buttonStyle = React.useMemo(() => {
      const { initialCoordinates, verticalBounds } = props.route.params;
      const { x, y, width, height } = initialCoordinates;
      return {
        width: Math.ceil(width),
        height: Math.ceil(height),
        marginTop: y - verticalBounds.y,
        marginLeft: x,
      };
    }, [props.route.params]);

    const tipHorizontalOffset = React.useMemo(() => new Value(0), []);

    const onTipContainerLayout = React.useCallback(
      (event: LayoutEvent) => {
        const { route } = props;
        const { x, width } = route.params.initialCoordinates;

        const extraLeftSpace = x;
        const extraRightSpace = dimensions.width - width - x;

        const actualWidth = event.nativeEvent.layout.width;
        if (extraLeftSpace < extraRightSpace) {
          const minWidth = width + 2 * extraLeftSpace;
          tipHorizontalOffset.setValue((minWidth - actualWidth) / 2);
        } else {
          const minWidth = width + 2 * extraRightSpace;
          tipHorizontalOffset.setValue((actualWidth - minWidth) / 2);
        }
      },
      [dimensions.width, props, tipHorizontalOffset],
    );

    const tipContainerOpacity = React.useMemo(
      () =>
        interpolateNode(position, {
          inputRange: [0, 0.1],
          outputRange: [0, 1],
          extrapolate: Extrapolate.CLAMP,
        }),
      [position],
    );

    const tipVerticalBelow = React.useMemo(
      () =>
        interpolateNode(position, {
          inputRange: [0, 1],
          outputRange: [-margin - tipHeight / 2, 0],
          extrapolate: Extrapolate.CLAMP,
        }),
      [position],
    );

    const tipHorizontal = React.useMemo(() => {
      const invertedPosition = add(1, multiply(-1, position));
      return multiply(invertedPosition, tipHorizontalOffset);
    }, [position, tipHorizontalOffset]);

    const tipScale = React.useMemo(
      () =>
        interpolateNode(position, {
          inputRange: [0, 0.2, 0.8, 1],
          outputRange: [0, 0, 1, 1],
          extrapolate: Extrapolate.CLAMP,
        }),
      [position],
    );

    const tipContainerStyle = React.useMemo(() => {
      const { route } = props;
      const { initialCoordinates, verticalBounds } = route.params;
      const { x, y, width, height } = initialCoordinates;

      const style: WritableAnimatedStyleObj = {};
      style.position = 'absolute';
      style.alignItems = 'center';
      style.opacity = tipContainerOpacity;

      const transform: Array<ReanimatedTransform> = [];

      transform.push({ translateX: tipHorizontal });

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
      transform.push({ translateY: tipVerticalBelow });
      transform.push({ scale: tipScale });
      style.transform = transform;

      return style;
    }, [
      dimensions.width,
      props,
      tipContainerOpacity,
      tipHorizontal,
      tipScale,
      tipVerticalBelow,
    ]);

    return (
      <NUXTipsOverlay
        {...props}
        dimensions={dimensions}
        position={position}
        styles={styles}
        closeTip={goBackOnce}
        contentContainerStyle={contentContainerStyle}
        opacityStyle={opacityStyle}
        buttonStyle={buttonStyle}
        tipHorizontalOffset={tipHorizontalOffset}
        onTipContainerLayout={onTipContainerLayout}
        tipContainerOpacity={tipContainerOpacity}
        tipVerticalBelow={tipVerticalBelow}
        tipHorizontal={tipHorizontal}
        tipScale={tipScale}
        tipContainerStyle={tipContainerStyle}
      />
    );
  }
  return React.memo<BaseNUXTipsOverlayProps>(ConnectedNUXTipsOverlay);
}

export { createNUXTipsOverlay };
