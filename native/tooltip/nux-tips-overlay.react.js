// @flow

import invariant from 'invariant';
import * as React from 'react';
import { View, TouchableWithoutFeedback, Platform, Text } from 'react-native';
import Animated, {
  FadeOut,
  withTiming,
  // eslint-disable-next-line no-unused-vars
  type EntryAnimationsValues,
  // eslint-disable-next-line no-unused-vars
  type ExitAnimationsValues,
} from 'react-native-reanimated';

import type { AppNavigationProp } from '../navigation/app-navigator.react.js';
import { OverlayContext } from '../navigation/overlay-context.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { useSelector } from '../redux/redux-utils.js';
import { useStyles } from '../themes/colors.js';
import type {
  LayoutCoordinates,
  VerticalBounds,
} from '../types/layout-types.js';
import type { LayoutEvent } from '../types/react-native.js';
import { AnimatedView } from '../types/styles.js';

const { Value } = Animated;

const animationDuration = 150;

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
  tipText: {
    color: 'panelForegroundLabel',
    fontSize: 20,
    padding: 15,
  },
};

export type NUXTipsOverlayParams = {
  +initialCoordinates: LayoutCoordinates,
  +verticalBounds: VerticalBounds,
};

export type NUXTipsOverlayProps = {
  +navigation: AppNavigationProp<'NUXTipsOverlay'>,
  +route: NavigationRoute<'NUXTipsOverlay'>,
};

const margin: number = 20;
const tipContainerTranslateY = -80;

function opacityEnteringAnimation() {
  'worklet';

  return {
    animations: {
      opacity: withTiming(0.7, { duration: animationDuration }),
    },
    initialValues: {
      opacity: 0,
    },
  };
}

function createNUXTipsOverlay(
  ButtonComponent: React.ComponentType<NUXTipsOverlayProps>,
  tipText: string,
): React.ComponentType<NUXTipsOverlayProps> {
  function NUXTipsOverlay(props: NUXTipsOverlayProps) {
    const dimensions = useSelector(state => state.dimensions);
    const overlayContext = React.useContext(OverlayContext);
    invariant(overlayContext, 'NUXTipsOverlay should have OverlayContext');
    const { onExitFinish } = overlayContext;

    const { navigation, route } = props;

    const { goBackOnce } = navigation;

    const styles = useStyles(unboundStyles);

    const contentContainerStyle = React.useMemo(() => {
      const { verticalBounds } = route.params;
      const fullScreenHeight = dimensions.height;
      const top = verticalBounds.y;
      const bottom =
        fullScreenHeight - verticalBounds.y - verticalBounds.height;
      return {
        ...styles.contentContainer,
        marginTop: top,
        marginBottom: bottom,
      };
    }, [dimensions.height, route.params, styles.contentContainer]);

    const { initialCoordinates, verticalBounds } = props.route.params;

    const buttonStyle = React.useMemo(() => {
      const { x, y, width, height } = initialCoordinates;
      return {
        width: Math.ceil(width),
        height: Math.ceil(height),
        marginTop: y - verticalBounds.y,
        marginLeft: x,
      };
    }, [initialCoordinates, verticalBounds]);

    const tipHorizontalOffsetRef = React.useRef(new Value(0));
    const tipHorizontalOffset = tipHorizontalOffsetRef.current;

    const onTipContainerLayout = React.useCallback(
      (event: LayoutEvent) => {
        const { x, width } = initialCoordinates;

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
      [dimensions.width, initialCoordinates, tipHorizontalOffset],
    );

    const baseTipContainerStyle = React.useMemo(() => {
      const { y, x, height, width } = initialCoordinates;

      const top =
        Math.min(y + height, verticalBounds.y + verticalBounds.height) + margin;

      const extraLeftSpace = x;
      const extraRightSpace = dimensions.width - width - x;
      if (extraLeftSpace < extraRightSpace) {
        return {
          top,
          position: 'absolute',
          alignItems: 'center',
          left: 0,
          minWidth: width + 2 * extraLeftSpace,
        };
      } else {
        return {
          top,
          position: 'absolute',
          alignItems: 'center',
          right: 0,
          minWidth: width + 2 * extraRightSpace,
        };
      }
    }, [
      dimensions.width,
      initialCoordinates,
      verticalBounds.height,
      verticalBounds.y,
    ]);

    const triangleStyle = React.useMemo(() => {
      const { x, width } = initialCoordinates;
      const extraLeftSpace = x;
      const extraRightSpace = dimensions.width - width - x;
      if (extraLeftSpace < extraRightSpace) {
        return {
          alignSelf: 'flex-start',
          left: extraLeftSpace + (4 / 10) * width,
        };
      } else {
        return {
          alignSelf: 'flex-end',
          right: extraRightSpace + (4 / 10) * width,
        };
      }
    }, [dimensions.width, initialCoordinates]);

    const opacityExitingAnimation = React.useCallback(() => {
      'worklet';

      return {
        animations: {
          opacity: withTiming(0, { duration: animationDuration }),
        },
        initialValues: {
          opacity: 0.7,
        },
        callback: onExitFinish,
      };
    }, [onExitFinish]);

    // prettier-ignore
    const tipContainerEnteringAnimation = React.useCallback(
      (values/*: EntryAnimationsValues*/) => {
        'worklet';

        const initialX =
          (-values.targetWidth +
            initialCoordinates.width +
            initialCoordinates.x) /
          2;
        const initialY = tipContainerTranslateY;

        return {
          animations: {
            opacity: withTiming(1, { duration: animationDuration }),
            transform: [
              { translateX: withTiming(0, { duration: animationDuration }) },
              { translateY: withTiming(0, { duration: animationDuration }) },
              { scale: withTiming(1, { duration: animationDuration }) },
            ],
          },
          initialValues: {
            opacity: 0,
            transform: [
              { translateX: initialX },
              { translateY: initialY },
              { scale: 0 },
            ],
          },
        };
      },
      [initialCoordinates.width, initialCoordinates.x],
    );

    // prettier-ignore
    const tipContainerExitingAnimation = React.useCallback(
      (values/*: ExitAnimationsValues*/) => {
        'worklet';

        const toValueX =
          (-values.currentWidth +
            initialCoordinates.width +
            initialCoordinates.x) /
          2;
        const toValueY = tipContainerTranslateY;

        return {
          animations: {
            opacity: withTiming(0, { duration: animationDuration }),
            transform: [
              {
                translateX: withTiming(toValueX, {
                  duration: animationDuration,
                }),
              },
              {
                translateY: withTiming(toValueY, {
                  duration: animationDuration,
                }),
              },
              { scale: withTiming(0, { duration: animationDuration }) },
            ],
          },
          initialValues: {
            opacity: 1,
            transform: [{ translateX: 0 }, { translateY: 0 }, { scale: 1 }],
          },
        };
      },
      [initialCoordinates.width, initialCoordinates.x],
    );

    return (
      <TouchableWithoutFeedback onPress={goBackOnce}>
        <View style={styles.container}>
          <AnimatedView
            style={styles.backdrop}
            // $FlowFixMe
            entering={opacityEnteringAnimation}
            exiting={opacityExitingAnimation}
          />
          <View style={contentContainerStyle}>
            <Animated.View
              style={buttonStyle}
              exiting={FadeOut.duration(animationDuration)}
            >
              <ButtonComponent navigation={props.navigation} route={route} />
            </Animated.View>
          </View>
          <AnimatedView
            style={baseTipContainerStyle}
            onLayout={onTipContainerLayout}
            entering={tipContainerEnteringAnimation}
            exiting={tipContainerExitingAnimation}
          >
            <View style={[styles.triangleUp, triangleStyle]} />
            <View style={styles.items}>
              <Text style={styles.tipText}>{tipText}</Text>
            </View>
          </AnimatedView>
        </View>
      </TouchableWithoutFeedback>
    );
  }

  function NUXTipsOverlayWrapper(props: NUXTipsOverlayProps) {
    const overlayContext = React.useContext(OverlayContext);
    invariant(overlayContext, 'NUXTipsOverlay should have OverlayContext');

    const { shouldRenderScreenContent } = overlayContext;

    return shouldRenderScreenContent ? <NUXTipsOverlay {...props} /> : null;
  }

  return React.memo<NUXTipsOverlayProps>(NUXTipsOverlayWrapper);
}

export { createNUXTipsOverlay };
