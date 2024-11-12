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

import Button from '../components/button.react.js';
import {
  getNUXTipParams,
  NUXTipsContext,
  type NUXTip,
} from '../components/nux-tips-context.react.js';
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 18,
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
    fontSize: 18,
    marginBottom: 10,
  },
  buttonContainer: {
    alignSelf: 'flex-end',
  },
  okButtonText: {
    fontSize: 18,
    color: 'panelForegroundLabel',
    textAlign: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  okButton: {
    backgroundColor: 'purpleButton',
    borderRadius: 8,
  },
};

export type NUXTipsOverlayParams = {
  +orderedTips: $ReadOnlyArray<NUXTip>,
  +orderedTipsIndex: number,
};

export type NUXTipsOverlayProps<Route: NUXTipRouteNames> = {
  +navigation: AppNavigationProp<Route>,
  +route: NavigationRoute<Route>,
};

const marginVertical: number = 20;
const marginHorizontal: number = 10;

function createNUXTipsOverlay<Route: NUXTipRouteNames>(
  ButtonComponent: ?React.ComponentType<void | NUXTipsOverlayProps<Route>>,
  tipText: string,
): React.ComponentType<NUXTipsOverlayProps<Route>> {
  function NUXTipsOverlay(props: NUXTipsOverlayProps<Route>) {
    const nuxTipContext = React.useContext(NUXTipsContext);
    const { navigation, route } = props;

    const dimensions = useSelector(state => state.dimensions);

    const [coordinates, setCoordinates] = React.useState<?{
      +initialCoordinates: {
        +height: number,
        +width: number,
        +x: number,
        +y: number,
      },
      +verticalBounds: {
        +height: number,
        +y: number,
      },
    }>(null);

    React.useEffect(() => {
      if (!ButtonComponent) {
        const yInitial = (dimensions.height * 2) / 5;
        const xInitial = dimensions.width / 2;
        setCoordinates({
          initialCoordinates: { height: 0, width: 0, x: xInitial, y: yInitial },
          verticalBounds: { height: 0, y: yInitial },
        });
        return;
      }
      const currentTipKey =
        route.params.orderedTips[route.params.orderedTipsIndex];
      const measure = nuxTipContext?.tipsProps?.[currentTipKey];
      invariant(measure, 'button should be registered with nuxTipContext');

      measure((x, y, width, height, pageX, pageY) =>
        setCoordinates({
          initialCoordinates: { height, width, x: pageX, y: pageY },
          verticalBounds: { height, y: pageY },
        }),
      );
    }, [
      dimensions,
      nuxTipContext?.tipsProps,
      route.params.orderedTips,
      route.params.orderedTipsIndex,
    ]);

    const overlayContext = React.useContext(OverlayContext);
    invariant(overlayContext, 'NUXTipsOverlay should have OverlayContext');
    const { onExitFinish } = overlayContext;

    const { goBackOnce } = navigation;

    const styles = useStyles(unboundStyles);

    const contentContainerStyle = React.useMemo(() => {
      if (!coordinates) {
        return {};
      }
      const fullScreenHeight = dimensions.height;
      const top = coordinates.verticalBounds.y;
      const bottom =
        fullScreenHeight -
        coordinates.verticalBounds.y -
        coordinates.verticalBounds.height;
      return {
        ...styles.contentContainer,
        marginTop: top,
        marginBottom: bottom,
      };
    }, [dimensions.height, styles.contentContainer, coordinates]);

    const buttonStyle = React.useMemo(() => {
      if (!coordinates) {
        return {};
      }
      const { x, y, width, height } = coordinates.initialCoordinates;
      return {
        width: Math.ceil(width),
        height: Math.ceil(height),
        marginTop: y - coordinates.verticalBounds.y,
        marginLeft: x,
      };
    }, [coordinates]);

    const tipHorizontalOffsetRef = React.useRef(new Value(0));
    const tipHorizontalOffset = tipHorizontalOffsetRef.current;

    const onTipContainerLayout = React.useCallback(
      (event: LayoutEvent) => {
        if (!coordinates) {
          return;
        }
        const { x, width } = coordinates.initialCoordinates;

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
      [coordinates, dimensions.width, tipHorizontalOffset],
    );

    const currentTipKey =
      route.params.orderedTips[route.params.orderedTipsIndex];
    const tipParams = getNUXTipParams(currentTipKey);
    const { tooltipLocation } = tipParams;

    const baseTipContainerStyle = React.useMemo(() => {
      if (!coordinates) {
        return {};
      }
      const { initialCoordinates, verticalBounds } = coordinates;
      const { y, x, height, width } = initialCoordinates;

      const style: WritableAnimatedStyleObj = {
        position: 'absolute',
        alignItems: 'center',
      };

      if (tooltipLocation === 'below') {
        style.top =
          Math.min(y + height, verticalBounds.y + verticalBounds.height) +
          marginVertical;
      } else {
        style.bottom =
          dimensions.height - Math.max(y, verticalBounds.y) + marginVertical;
      }

      const extraLeftSpace = x;
      const extraRightSpace = dimensions.width - width - x;
      if (tooltipLocation === 'absolute') {
        style.left = marginHorizontal;
        style.right = marginHorizontal;
      } else if (extraLeftSpace < extraRightSpace) {
        style.left = marginHorizontal;
        style.minWidth = width + 2 * extraLeftSpace;
        style.marginRight = 2 * marginHorizontal;
      } else {
        style.right = marginHorizontal;
        style.minWidth = width + 2 * extraRightSpace;
        style.marginLeft = 2 * marginHorizontal;
      }

      return style;
    }, [coordinates, dimensions.height, dimensions.width, tooltipLocation]);

    const triangleStyle = React.useMemo(() => {
      if (!coordinates) {
        return {};
      }
      const { x, width } = coordinates.initialCoordinates;
      const extraLeftSpace = x;
      const extraRightSpace = dimensions.width - width - x;
      if (extraLeftSpace < extraRightSpace) {
        return {
          alignSelf: 'flex-start',
          left: extraLeftSpace + (4 / 10) * width - marginHorizontal,
        };
      } else {
        return {
          alignSelf: 'flex-end',
          right: extraRightSpace + (4 / 10) * width - marginHorizontal,
        };
      }
    }, [coordinates, dimensions.width]);

    // prettier-ignore
    const tipContainerEnteringAnimation = React.useCallback(
      (values/*: EntryAnimationsValues*/) => {
        'worklet';

        if (!coordinates) {
          return {
            animations: {},
            initialValues:{},
          };
        }

        if(tooltipLocation === 'absolute'){
          return {
            animations: {
              opacity: withTiming(1, { duration: animationDuration }),
              transform: [     
                { scale: withTiming(1, { duration: animationDuration }) },
              ],
            },
            initialValues: {
              opacity: 0,
              transform: [
                { scale: 0 },
              ],
            },
          };
        }

        const initialX =
          (-values.targetWidth +
            coordinates.initialCoordinates.width +
            coordinates.initialCoordinates.x) /
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
      [coordinates, tooltipLocation],
    );

    // prettier-ignore
    const tipContainerExitingAnimation = React.useCallback(
      (values/*: ExitAnimationsValues*/) => {
        'worklet';

        if (!coordinates) {
          return {
            animations: {},
            initialValues:{},
          };
        }

        if (tooltipLocation === 'absolute') {
          return {
            animations: {
              opacity: withTiming(0, { duration: animationDuration }),
              transform: [
                { scale: withTiming(0, { duration: animationDuration }) },
              ],
            },
            initialValues: {
              opacity: 1,
              transform: [{ scale: 1 }],
            },
            callback: onExitFinish,
          };
        }

        const toValueX =
          (-values.currentWidth +
            coordinates.initialCoordinates.width +
            coordinates.initialCoordinates.x) /
          2;
        const toValueY =
          tooltipLocation === 'below'
            ? -values.currentHeight / 2
            : values.currentHeight / 2;

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
          callback: onExitFinish,
        };
      },
      [coordinates, onExitFinish, tooltipLocation],
    );

    let triangleDown = null;
    let triangleUp = null;
    if (tooltipLocation === 'above') {
      triangleDown = <View style={[styles.triangleDown, triangleStyle]} />;
    } else if (tooltipLocation === 'below') {
      triangleUp = <View style={[styles.triangleUp, triangleStyle]} />;
    }

    const onPressOk = React.useCallback(() => {
      const { orderedTips, orderedTipsIndex } = route.params;
      goBackOnce();

      const nextOrderedTipsIndex = orderedTipsIndex + 1;
      if (nextOrderedTipsIndex >= orderedTips.length) {
        navigation.goBack();
        return;
      }

      const nextTip = orderedTips[nextOrderedTipsIndex];
      const { routeName } = getNUXTipParams(nextTip);

      navigation.navigate<NUXTipRouteNames>({
        name: routeName,
        params: {
          orderedTips,
          orderedTipsIndex: nextOrderedTipsIndex,
        },
      });
    }, [goBackOnce, navigation, route.params]);

    const button = React.useMemo(
      () =>
        ButtonComponent ? (
          <View style={contentContainerStyle}>
            <Animated.View
              style={buttonStyle}
              exiting={FadeOut.duration(animationDuration)}
            >
              <ButtonComponent navigation={props.navigation} route={route} />
            </Animated.View>
          </View>
        ) : undefined,
      [buttonStyle, contentContainerStyle, props.navigation, route],
    );

    if (!coordinates) {
      return null;
    }

    return (
      <TouchableWithoutFeedback onPress={onPressOk}>
        <View style={styles.container}>
          {button}
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
                <Button
                  onPress={onPressOk}
                  iosActiveOpacity={0.6}
                  style={styles.okButton}
                >
                  <Text style={styles.okButtonText}>Next</Text>
                </Button>
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

export { createNUXTipsOverlay, animationDuration };
