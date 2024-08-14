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

import {
  getNUXTipParams,
  NUXTipsContext,
  type NUXTip,
} from '../components/nux-tips-context.react.js';
import PrimaryButton from '../components/primary-button.react.js';
import type { AppNavigationProp } from '../navigation/app-navigator.react.js';
import { OverlayContext } from '../navigation/overlay-context.js';
import type {
  NavigationRoute,
  NUXTipRouteNames,
} from '../navigation/route-names.js';
import { useSelector } from '../redux/redux-utils.js';
import { useStyles } from '../themes/colors.js';
import type { LayoutEvent } from '../types/react-native.js';
import { AnimatedView } from '../types/styles.js';
import type { WritableAnimatedStyleObj } from '../types/styles.js';

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
    padding: 20,
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
  tipText: {
    color: 'panelForegroundLabel',
    fontSize: 20,
    marginBottom: 10,
  },
  buttonContainer: {
    width: 100,
    alignSelf: 'flex-end',
  },
};

export type NUXTipsOverlayParams = {
  +tipKey: NUXTip,
  +tooltipLocation: 'above' | 'below',
};

export type NUXTipsOverlayProps<Route: NUXTipRouteNames> = {
  +navigation: AppNavigationProp<Route>,
  +route: NavigationRoute<Route>,
};

const margin: number = 20;

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

function createNUXTipsOverlay<Route: NUXTipRouteNames>(
  ButtonComponent: React.ComponentType<void | NUXTipsOverlayProps<Route>>,
  tipText: string,
): React.ComponentType<NUXTipsOverlayProps<Route>> {
  function NUXTipsOverlay(props: NUXTipsOverlayProps<Route>) {
    const nuxTipContext = React.useContext(NUXTipsContext);
    const { navigation, route } = props;

    const { initialCoordinates, verticalBounds } = React.useMemo(() => {
      const tipsProps = nuxTipContext?.tipsProps;
      invariant(tipsProps, 'tips props should be defined in nux tips overlay');
      const { pageX, pageY, width, height } = tipsProps[route.params.tipKey];

      return {
        initialCoordinates: { height, width, x: pageX, y: pageY },
        verticalBounds: { height, y: pageY },
      };
    }, [nuxTipContext, route.params.tipKey]);

    const dimensions = useSelector(state => state.dimensions);
    const overlayContext = React.useContext(OverlayContext);
    invariant(overlayContext, 'NUXTipsOverlay should have OverlayContext');
    const { onExitFinish } = overlayContext;

    const { goBackOnce } = navigation;

    const styles = useStyles(unboundStyles);

    const contentContainerStyle = React.useMemo(() => {
      const fullScreenHeight = dimensions.height;
      const top = verticalBounds.y;
      const bottom =
        fullScreenHeight - verticalBounds.y - verticalBounds.height;
      return {
        ...styles.contentContainer,
        marginTop: top,
        marginBottom: bottom,
      };
    }, [
      dimensions.height,
      styles.contentContainer,
      verticalBounds.height,
      verticalBounds.y,
    ]);

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

    const { tooltipLocation } = route.params;

    const baseTipContainerStyle = React.useMemo(() => {
      const { y, x, height, width } = initialCoordinates;

      const style: WritableAnimatedStyleObj = {
        position: 'absolute',
        alignItems: 'center',
      };

      if (tooltipLocation === 'below') {
        style.top =
          Math.min(y + height, verticalBounds.y + verticalBounds.height) +
          margin;
      } else {
        style.bottom =
          dimensions.height - Math.max(y, verticalBounds.y) + margin;
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

      return style;
    }, [
      dimensions.height,
      dimensions.width,
      initialCoordinates,
      tooltipLocation,
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
        const initialY =
          tooltipLocation === 'below'
            ? -values.targetHeight / 2
            : values.targetHeight / 2;

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
      [initialCoordinates.width, initialCoordinates.x, tooltipLocation],
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
        const toValueY =
        tooltipLocation === 'below'
          ? -values.currentHeight / 2
          : values.currentHeight / 2;;

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
      [initialCoordinates.width, initialCoordinates.x, tooltipLocation],
    );

    let triangleDown = null;
    let triangleUp = null;
    if (tooltipLocation === 'above') {
      triangleDown = <View style={[styles.triangleDown, triangleStyle]} />;
    } else if (tooltipLocation === 'below') {
      triangleUp = <View style={[styles.triangleUp, triangleStyle]} />;
    }

    const callbackParams = getNUXTipParams(route.params.tipKey);

    const onPressOk = React.useCallback(() => {
      const {
        nextTip,
        tooltipLocation: nextLocation,
        nextRouteName,
      } = callbackParams;
      goBackOnce();

      if (!nextTip || !nextRouteName) {
        return;
      }
      navigation.navigate<NUXTipRouteNames>({
        name: nextRouteName,
        params: {
          tipKey: nextTip,
          tooltipLocation: nextLocation,
        },
      });
    }, [callbackParams, goBackOnce, navigation]);

    return (
      <TouchableWithoutFeedback onPress={goBackOnce}>
        <View style={styles.container}>
          <AnimatedView
            style={styles.backdrop}
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
            {triangleUp}
            <View style={styles.items}>
              <Text style={styles.tipText}>{tipText}</Text>
              <View style={styles.buttonContainer}>
                <PrimaryButton
                  onPress={onPressOk}
                  label="Next"
                  variant="enabled"
                />
              </View>
            </View>
            {triangleDown}
          </AnimatedView>
        </View>
      </TouchableWithoutFeedback>
    );
  }

  function NUXTipsOverlayWrapper(props: NUXTipsOverlayProps<Route>) {
    const overlayContext = React.useContext(OverlayContext);
    invariant(overlayContext, 'NUXTipsOverlay should have OverlayContext');
    const { shouldRenderScreenContent } = overlayContext;

    return shouldRenderScreenContent ? <NUXTipsOverlay {...props} /> : null;
  }

  return React.memo<NUXTipsOverlayProps<Route>>(NUXTipsOverlayWrapper);
}

export { createNUXTipsOverlay };
