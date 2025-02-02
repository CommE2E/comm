// @flow

import invariant from 'invariant';
import * as React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import {
  type PinchGestureEvent,
  type PanGestureEvent,
  type TapGestureEvent,
  GestureDetector,
  Gesture,
} from 'react-native-gesture-handler';
import Orientation from 'react-native-orientation-locker';
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useDerivedValue,
  useSharedValue,
  withTiming,
  Easing,
  withDecay,
  cancelAnimation,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { type Dimensions } from 'lib/types/media-types.js';

import SWMansionIcon from './swmansion-icon.react.js';
import ConnectedStatusBar from '../connected-status-bar.react.js';
import type { AppNavigationProp } from '../navigation/app-navigator.react.js';
import {
  OverlayContext,
  type OverlayContextType,
} from '../navigation/overlay-context.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { useSelector } from '../redux/redux-utils.js';
import {
  type DerivedDimensionsInfo,
  derivedDimensionsInfoSelector,
} from '../selectors/dimensions-selectors.js';
import type { NativeMethods } from '../types/react-native.js';
import type { AnimatedViewStyle, ViewStyle } from '../types/styles.js';
import type { UserProfileBottomSheetNavigationProp } from '../user-profile/user-profile-bottom-sheet-navigator.react.js';
import { clampV2 } from '../utils/animation-utils.js';

const {
  Value,
  Node,
  Extrapolate,
  add,
  sub,
  multiply,
  divide,
  interpolateNode,
} = Animated;

const defaultTimingConfig = {
  duration: 250,
  easing: Easing.out(Easing.ease),
};

const decayConfig = { deceleration: 0.99 };

type TouchableOpacityInstance = React.AbstractComponent<
  React.ElementConfig<typeof TouchableOpacity>,
  NativeMethods,
>;

type ButtonDimensions = {
  +x: number,
  +y: number,
  +width: number,
  +height: number,
};

type BaseProps = {
  +navigation:
    | AppNavigationProp<'ImageModal'>
    | UserProfileBottomSheetNavigationProp<'UserProfileAvatarModal'>,
  +route:
    | NavigationRoute<'ImageModal'>
    | NavigationRoute<'UserProfileAvatarModal'>,
  +children: React.Node,
  +contentDimensions: Dimensions,
  +saveContentCallback?: () => Promise<mixed>,
  +copyContentCallback?: () => mixed,
};
type Props = {
  ...BaseProps,
  // Redux state
  +dimensions: DerivedDimensionsInfo,
  // withOverlayContext
  +overlayContext: ?OverlayContextType,
  +isActive: boolean,
  +closeButtonEnabled: boolean,
  +actionLinksEnabled: boolean,
  +gesture: ExclusiveGesture,
  +closeButtonRef: { current: ?React.ElementRef<TouchableOpacityInstance> },
  +mediaIconsRef: { current: ?React.ElementRef<typeof View> },
  +onCloseButtonLayout: () => void,
  +onMediaIconsLayout: () => void,
  +close: () => void,
};

class FullScreenViewModal extends React.PureComponent<Props> {
  centerX: Value;
  centerY: Value;
  frameWidth: Value;
  frameHeight: Value;
  imageWidth: Value;
  imageHeight: Value;

  scale: Node;
  x: Node;
  y: Node;
  backdropOpacity: Node;
  imageContainerOpacity: Node;
  actionLinksOpacity: Node;
  closeButtonOpacity: Node;

  constructor(props: Props) {
    super(props);

    const { imageWidth, imageHeight } = this;
    const left = sub(this.centerX, divide(imageWidth, 2));
    const top = sub(this.centerY, divide(imageHeight, 2));

    const { initialCoordinates } = props.route.params;
    const initialScale = divide(initialCoordinates.width, imageWidth);
    const initialTranslateX = sub(
      initialCoordinates.x + initialCoordinates.width / 2,
      add(left, divide(imageWidth, 2)),
    );
    const initialTranslateY = sub(
      initialCoordinates.y + initialCoordinates.height / 2,
      add(top, divide(imageHeight, 2)),
    );

    const { overlayContext } = props;
    invariant(overlayContext, 'FullScreenViewModal should have OverlayContext');
    const navigationProgress = overlayContext.position;
    invariant(
      navigationProgress,
      'position should be defined in FullScreenViewModal',
    );

    // The all-important outputs
    const curScale = new Value(1);
    const curX = new Value(0);
    const curY = new Value(0);
    const curBackdropOpacity = new Value(1);
    const curCloseButtonOpacity = new Value(1);
    const curActionLinksOpacity = new Value(1);

    const updates: Array<Node> = [];
    const updatedScale = [updates, curScale];
    const updatedCurX = [updates, curX];
    const updatedCurY = [updates, curY];
    const updatedBackdropOpacity = [updates, curBackdropOpacity];
    const updatedCloseButtonOpacity = [updates, curCloseButtonOpacity];
    const updatedActionLinksOpacity = [updates, curActionLinksOpacity];

    const reverseNavigationProgress = sub(1, navigationProgress);
    this.scale = add(
      multiply(reverseNavigationProgress, initialScale),
      multiply(navigationProgress, updatedScale),
    );
    this.x = add(
      multiply(reverseNavigationProgress, initialTranslateX),
      multiply(navigationProgress, updatedCurX),
    );
    this.y = add(
      multiply(reverseNavigationProgress, initialTranslateY),
      multiply(navigationProgress, updatedCurY),
    );
    this.backdropOpacity = multiply(navigationProgress, updatedBackdropOpacity);
    this.imageContainerOpacity = interpolateNode(navigationProgress, {
      inputRange: [0, 0.1],
      outputRange: [0, 1],
      extrapolate: Extrapolate.CLAMP,
    });
    const buttonOpacity = interpolateNode(updatedBackdropOpacity, {
      inputRange: [0.95, 1],
      outputRange: [0, 1],
      extrapolate: Extrapolate.CLAMP,
    });
    this.closeButtonOpacity = multiply(
      navigationProgress,
      buttonOpacity,
      updatedCloseButtonOpacity,
    );
    this.actionLinksOpacity = multiply(
      navigationProgress,
      buttonOpacity,
      updatedActionLinksOpacity,
    );
  }

  get frame(): Dimensions {
    const { width, safeAreaHeight } = this.props.dimensions;
    return { width, height: safeAreaHeight };
  }

  get contentViewContainerStyle(): AnimatedViewStyle {
    const { height, width } = this.props.contentDimensions;
    const { height: frameHeight, width: frameWidth } = this.frame;
    const top = (frameHeight - height) / 2 + this.props.dimensions.topInset;
    const left = (frameWidth - width) / 2;
    const { verticalBounds } = this.props.route.params;
    return {
      height,
      width,
      marginTop: top - verticalBounds.y,
      marginLeft: left,
      opacity: this.imageContainerOpacity,
      transform: [
        { translateX: this.x },
        { translateY: this.y },
        { scale: this.scale },
      ],
    };
  }

  get contentContainerStyle(): ViewStyle {
    const { verticalBounds } = this.props.route.params;
    const fullScreenHeight = this.props.dimensions.height;
    const top = verticalBounds.y;
    const bottom = fullScreenHeight - verticalBounds.y - verticalBounds.height;

    // margin will clip, but padding won't
    const verticalStyle = this.props.isActive
      ? { paddingTop: top, paddingBottom: bottom }
      : { marginTop: top, marginBottom: bottom };
    return [styles.contentContainer, verticalStyle];
  }

  render(): React.Node {
    const { children, saveContentCallback, copyContentCallback } = this.props;

    const statusBar = this.props.isActive ? (
      <ConnectedStatusBar hidden />
    ) : null;
    const backdropStyle = { opacity: this.backdropOpacity };
    const closeButtonStyle = {
      opacity: this.closeButtonOpacity,
    };
    const mediaIconsButtonStyle = {
      opacity: this.actionLinksOpacity,
    };

    let saveButton;
    if (saveContentCallback) {
      saveButton = (
        <TouchableOpacity
          onPress={saveContentCallback}
          disabled={!this.props.actionLinksEnabled}
          style={styles.mediaIconButtons}
        >
          <SWMansionIcon name="save" style={styles.mediaIcon} />
          <Text style={styles.mediaIconText}>Save</Text>
        </TouchableOpacity>
      );
    }

    let copyButton;
    if (Platform.OS === 'ios' && copyContentCallback) {
      copyButton = (
        <TouchableOpacity
          onPress={copyContentCallback}
          disabled={!this.props.actionLinksEnabled}
          style={styles.mediaIconButtons}
        >
          <SWMansionIcon name="copy" style={styles.mediaIcon} />
          <Text style={styles.mediaIconText}>Copy</Text>
        </TouchableOpacity>
      );
    }

    let mediaActionButtons;
    if (saveContentCallback || copyContentCallback) {
      mediaActionButtons = (
        <Animated.View
          style={[styles.mediaIconsContainer, mediaIconsButtonStyle]}
        >
          <View
            style={styles.mediaIconsRow}
            onLayout={this.props.onMediaIconsLayout}
            ref={this.props.mediaIconsRef}
          >
            {saveButton}
            {copyButton}
          </View>
        </Animated.View>
      );
    }

    const view = (
      <Animated.View style={styles.container}>
        {statusBar}
        <Animated.View style={[styles.backdrop, backdropStyle]} />
        <View style={this.contentContainerStyle}>
          <Animated.View style={this.contentViewContainerStyle}>
            {children}
          </Animated.View>
        </View>
        <SafeAreaView style={styles.buttonsOverlay}>
          <View style={styles.fill}>
            <Animated.View
              style={[styles.closeButtonContainer, closeButtonStyle]}
            >
              <TouchableOpacity
                onPress={this.props.close}
                disabled={!this.props.closeButtonEnabled}
                onLayout={this.props.onCloseButtonLayout}
                ref={this.props.closeButtonRef}
              >
                <Text style={styles.closeButton}>×</Text>
              </TouchableOpacity>
            </Animated.View>
            {mediaActionButtons}
          </View>
        </SafeAreaView>
      </Animated.View>
    );
    return (
      <GestureDetector gesture={this.props.gesture}>{view}</GestureDetector>
    );
  }
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'black',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  buttonsOverlay: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  closeButton: {
    color: 'white',
    fontSize: 36,
    paddingHorizontal: 8,
    paddingVertical: 2,
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  closeButtonContainer: {
    position: 'absolute',
    right: 4,
    top: 4,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  fill: {
    flex: 1,
  },
  mediaIcon: {
    color: '#D7D7DC',
    fontSize: 36,
    textShadowColor: '#1C1C1E',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  mediaIconButtons: {
    alignItems: 'center',
    paddingBottom: 2,
    paddingLeft: 8,
    paddingRight: 8,
    paddingTop: 2,
  },
  mediaIconText: {
    color: '#D7D7DC',
    fontSize: 14,
    textShadowColor: '#1C1C1E',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  mediaIconsContainer: {
    bottom: 8,
    left: 16,
    position: 'absolute',
  },
  mediaIconsRow: {
    flexDirection: 'row',
  },
});

const ConnectedFullScreenViewModal: React.ComponentType<BaseProps> =
  React.memo<BaseProps>(function ConnectedFullScreenViewModal(
    props: BaseProps,
  ) {
    const dimensions = useSelector(derivedDimensionsInfoSelector);
    const overlayContext = React.useContext(OverlayContext);

    invariant(overlayContext, 'FullScreenViewModal should have OverlayContext');

    const isActive = !overlayContext.isDismissing;

    React.useEffect(() => {
      if (isActive) {
        Orientation.unlockAllOrientations();
      } else {
        Orientation.lockToPortrait();
      }
    }, [isActive]);

    React.useEffect(() => {
      return () => {
        Orientation.lockToPortrait();
      };
    }, []);

    const close = React.useCallback(() => {
      props.navigation.goBackOnce();
    }, [props.navigation]);

    const [closeButtonEnabled, setCloseButtonEnabled] = React.useState(true);
    const [actionLinksEnabled, setActionLinksEnabled] = React.useState(true);

    const updateCloseButtonEnabled = React.useCallback(
      (enabledNum: number) => {
        const enabled = !!enabledNum;
        if (closeButtonEnabled !== enabled) {
          setCloseButtonEnabled(enabled);
        }
      },
      [closeButtonEnabled],
    );

    const updateActionLinksEnabled = React.useCallback(
      (enabledNum: number) => {
        const enabled = !!enabledNum;
        if (actionLinksEnabled !== enabled) {
          setActionLinksEnabled(enabled);
        }
      },
      [actionLinksEnabled],
    );

    const closeButtonRef =
      React.useRef<?React.ElementRef<TouchableOpacityInstance>>();
    const mediaIconsRef = React.useRef<?React.ElementRef<typeof View>>();

    const closeButtonDimensions = useSharedValue({
      x: -1,
      y: -1,
      width: 0,
      height: 0,
    });

    const mediaIconsDimensions = useSharedValue({
      x: -1,
      y: -1,
      width: 0,
      height: 0,
    });

    const closeButtonLastState = useSharedValue<boolean>(true);
    const actionLinksLastState = useSharedValue<boolean>(true);

    const onCloseButtonLayout = React.useCallback(() => {
      const closeButton = closeButtonRef.current;
      if (!closeButton) {
        return;
      }
      closeButton.measure((x, y, width, height, pageX, pageY) => {
        closeButtonDimensions.value = { x: pageX, y: pageY, width, height };
      });
    }, [closeButtonDimensions]);

    const onMediaIconsLayout = React.useCallback(() => {
      const mediaIconsContainer = mediaIconsRef.current;
      if (!mediaIconsContainer) {
        return;
      }

      mediaIconsContainer.measure((x, y, width, height, pageX, pageY) => {
        mediaIconsDimensions.value = { x: pageX, y: pageY, width, height };
      });
    }, [mediaIconsDimensions]);

    const outsideButtons = React.useCallback(
      (x: number, y: number): boolean => {
        'worklet';
        const isOutsideButton = (dim: ButtonDimensions) => {
          return (
            x < dim.x ||
            x > dim.x + dim.width ||
            y < dim.y ||
            y > dim.y + dim.height
          );
        };

        const isOutsideCloseButton = isOutsideButton(
          closeButtonDimensions.value,
        );
        const isOutsideMediaIcons = isOutsideButton(mediaIconsDimensions.value);

        return (
          (closeButtonLastState.value === false || isOutsideCloseButton) &&
          (actionLinksLastState.value === false || isOutsideMediaIcons)
        );
      },
      [
        actionLinksLastState,
        closeButtonDimensions,
        closeButtonLastState,
        mediaIconsDimensions,
      ],
    );

    const curX = useSharedValue(0);
    const curY = useSharedValue(0);
    const curScale = useSharedValue(1);

    const roundedCurScale = useDerivedValue(() => {
      return Math.round(curScale.value * 1000) / 1000;
    });

    const centerX = useSharedValue(dimensions.width / 2);
    const centerY = useSharedValue(dimensions.safeAreaHeight / 2);
    const frameWidth = useSharedValue(dimensions.width);
    const frameHeight = useSharedValue(dimensions.safeAreaHeight);
    const imageWidth = useSharedValue(props.contentDimensions.width);
    const imageHeight = useSharedValue(props.contentDimensions.height);

    React.useEffect(() => {
      const {
        topInset,
        width: newFrameWidth,
        safeAreaHeight: newFrameHeight,
      } = dimensions;
      frameWidth.value = newFrameWidth;
      frameHeight.value = newFrameHeight;
      centerX.value = newFrameWidth / 2;
      centerY.value = newFrameHeight / 2 + topInset;
      const { width, height } = props.contentDimensions;
      imageWidth.value = width;
      imageHeight.value = height;
    }, [
      centerX,
      centerY,
      dimensions,
      frameHeight,
      frameWidth,
      imageHeight,
      imageWidth,
      props.contentDimensions,
    ]);

    // How much space do we have to pan the image horizontally?
    const getHorizontalPanSpace = React.useCallback(
      (scale: number): number => {
        'worklet';
        const apparentWidth = imageWidth.value * scale;
        const horizPop = (apparentWidth - frameWidth.value) / 2;
        return Math.max(horizPop, 0);
      },
      [frameWidth, imageWidth],
    );

    // How much space do we have to pan the image vertically?
    const getVerticalPanSpace = React.useCallback(
      (scale: number): number => {
        'worklet';
        const apparentHeight = imageHeight.value * scale;
        const vertPop = (apparentHeight - frameHeight.value) / 2;
        return Math.max(vertPop, 0);
      },
      [frameHeight, imageHeight],
    );

    const lastPinchScale = useSharedValue(1);
    const pinchActive = useSharedValue(false);

    const pinchStart = React.useCallback(() => {
      'worklet';
      lastPinchScale.value = 1;
      pinchActive.value = true;
      cancelAnimation(curX);
      cancelAnimation(curY);
      cancelAnimation(curScale);
    }, [curScale, curX, curY, lastPinchScale, pinchActive]);

    const pinchUpdate = React.useCallback(
      ({ scale, focalX, focalY }: PinchGestureEvent) => {
        'worklet';
        const deltaScale = scale / lastPinchScale.value;
        const deltaPinchX =
          (1 - deltaScale) * (focalX - curX.value - centerX.value);
        const deltaPinchY =
          (1 - deltaScale) * (focalY - curY.value - centerY.value);

        curX.value += deltaPinchX;
        curY.value += deltaPinchY;
        curScale.value *= deltaScale;

        lastPinchScale.value = scale;
      },
      [centerX, centerY, curScale, curX, curY, lastPinchScale],
    );

    const pinchEnd = React.useCallback(() => {
      'worklet';
      pinchActive.value = false;
    }, [pinchActive]);

    const panActive = useSharedValue(false);

    const lastPanTranslationX = useSharedValue(0);
    const lastPanTranslationY = useSharedValue(0);

    const panStart = React.useCallback(
      ({
        absoluteX,
        absoluteY,
        translationX,
        translationY,
      }: PanGestureEvent) => {
        'worklet';
        lastPanTranslationX.value = 0;
        lastPanTranslationY.value = 0;
        panActive.value = outsideButtons(
          absoluteX - translationX,
          absoluteY - translationY,
        );
        if (panActive.value) {
          cancelAnimation(curX);
          cancelAnimation(curY);
          cancelAnimation(curScale);
        }
      },
      [
        lastPanTranslationX,
        lastPanTranslationY,
        outsideButtons,
        panActive,
        curX,
        curY,
        curScale,
      ],
    );

    const panUpdate = React.useCallback(
      ({ translationX, translationY }: PanGestureEvent) => {
        'worklet';
        if (!panActive.value) {
          return;
        }
        curX.value += translationX - lastPanTranslationX.value;
        curY.value += translationY - lastPanTranslationY.value;
        lastPanTranslationX.value = translationX;
        lastPanTranslationY.value = translationY;
      },
      [curX, curY, lastPanTranslationX, lastPanTranslationY, panActive],
    );

    const progressiveOpacity = useDerivedValue(() => {
      return Math.max(
        Math.min(
          1 - Math.abs(curX.value / frameWidth.value),
          1 - Math.abs(curY.value / frameHeight.value),
        ),
        0,
      );
    });

    const isRunningDismissAnimation = useSharedValue(false);

    const panEnd = React.useCallback(
      ({ velocityX, velocityY }: PanGestureEvent) => {
        'worklet';
        if (!panActive.value) {
          return;
        }
        panActive.value = false;
        const velocity = Math.pow(
          Math.pow(velocityX, 2) + Math.pow(velocityY, 2),
          0.5,
        );
        const shouldGoBack = velocity > 50 || 0.7 > progressiveOpacity.value;
        if (shouldGoBack && !pinchActive.value && roundedCurScale.value <= 1) {
          isRunningDismissAnimation.value = true;
          curX.value = withDecay({ velocity: velocityX, ...decayConfig });
          curY.value = withDecay({ velocity: velocityY, ...decayConfig });
          cancelAnimation(curScale);
          runOnJS(close)();
        } else {
          const recenteredScale = Math.max(curScale.value, 1);
          const horizontalPanSpace = getHorizontalPanSpace(recenteredScale);
          const verticalPanSpace = getVerticalPanSpace(recenteredScale);
          curX.value = withDecay({
            velocity: velocityX,
            clamp: [-horizontalPanSpace, horizontalPanSpace],
            ...decayConfig,
          });
          curY.value = withDecay({
            velocity: velocityY,
            clamp: [-verticalPanSpace, verticalPanSpace],
            ...decayConfig,
          });
        }
      },
      [
        panActive,
        progressiveOpacity,
        pinchActive,
        roundedCurScale,
        curScale,
        isRunningDismissAnimation,
        curX,
        curY,
        close,
        getHorizontalPanSpace,
        getVerticalPanSpace,
      ],
    );

    const curCloseButtonOpacity = useSharedValue(1);
    const curActionLinksOpacity = useSharedValue(1);
    const targetCloseButtonOpacity = useSharedValue<0 | 1>(1);
    const targetActionLinksOpacity = useSharedValue<0 | 1>(1);

    const toggleCloseButton = React.useCallback(() => {
      'worklet';
      targetCloseButtonOpacity.value =
        targetCloseButtonOpacity.value === 0 ? 1 : 0;
      curCloseButtonOpacity.value = withTiming(
        targetCloseButtonOpacity.value,
        defaultTimingConfig,
        isFinished => {
          if (isFinished) {
            runOnJS(updateCloseButtonEnabled)(targetCloseButtonOpacity.value);
          }
        },
      );
    }, [
      curCloseButtonOpacity,
      targetCloseButtonOpacity,
      updateCloseButtonEnabled,
    ]);

    const toggleActionLinks = React.useCallback(() => {
      'worklet';
      targetActionLinksOpacity.value =
        targetActionLinksOpacity.value === 0 ? 1 : 0;
      curActionLinksOpacity.value = withTiming(
        targetActionLinksOpacity.value,
        defaultTimingConfig,
        isFinished => {
          if (isFinished) {
            runOnJS(updateActionLinksEnabled)(targetActionLinksOpacity.value);
          }
        },
      );
    }, [
      curActionLinksOpacity,
      targetActionLinksOpacity,
      updateActionLinksEnabled,
    ]);

    useAnimatedReaction(
      () => roundedCurScale.value > 1,
      (isZoomed, wasZoomed) => {
        // when image is zoomed in then assure action target links are hidden
        if (isZoomed && targetActionLinksOpacity.value === 1) {
          toggleActionLinks();
        }
        // when image becomes unzoomed then toggle buttons opacity accordingly
        if (wasZoomed && !isZoomed) {
          if (targetCloseButtonOpacity.value === 0) {
            toggleCloseButton();
          }
          toggleActionLinks();
        }
      },
    );

    const singleTapUpdate = React.useCallback(
      ({ x, y }: TapGestureEvent) => {
        'worklet';
        if (!outsideButtons(x, y)) {
          return;
        }
        toggleCloseButton();
        if (roundedCurScale.value <= 1) {
          toggleActionLinks();
        }
      },
      [outsideButtons, toggleActionLinks, toggleCloseButton, roundedCurScale],
    );

    const isRunningDoubleTapZoomAnimation = useSharedValue(false);

    const doubleTapUpdate = React.useCallback(
      ({ x, y }: TapGestureEvent) => {
        'worklet';
        if (!outsideButtons(x, y)) {
          return;
        }
        const targetScale = roundedCurScale.value > 1 ? 1 : 3;

        const tapXDiff = x - centerX.value - curX.value;
        const tapYDiff = y - centerY.value - curY.value;
        const tapXPercent = tapXDiff / imageWidth.value / curScale.value;
        const tapYPercent = tapYDiff / imageHeight.value / curScale.value;

        const horizPanSpace = getHorizontalPanSpace(targetScale);
        const vertPanSpace = getVerticalPanSpace(targetScale);
        const horizPanPercent = horizPanSpace / imageWidth.value / targetScale;
        const vertPanPercent = vertPanSpace / imageHeight.value / targetScale;

        const tapXPercentClamped = clampV2(
          tapXPercent,
          -horizPanPercent,
          horizPanPercent,
        );
        const tapYPercentClamped = clampV2(
          tapYPercent,
          -vertPanPercent,
          vertPanPercent,
        );

        const targetX = tapXPercentClamped * imageWidth.value * targetScale;
        const targetY = tapYPercentClamped * imageHeight.value * targetScale;

        isRunningDoubleTapZoomAnimation.value = true;
        curScale.value = withTiming(
          targetScale,
          defaultTimingConfig,
          () => (isRunningDoubleTapZoomAnimation.value = false),
        );
        curX.value = withTiming(targetX, defaultTimingConfig);
        curY.value = withTiming(targetY, defaultTimingConfig);
      },
      [
        centerX,
        centerY,
        curScale,
        curX,
        curY,
        getHorizontalPanSpace,
        imageHeight,
        imageWidth,
        outsideButtons,
        roundedCurScale,
        getVerticalPanSpace,
        isRunningDoubleTapZoomAnimation,
      ],
    );

    const backdropReset = useSharedValue(1);

    useAnimatedReaction(
      () => pinchActive.value || roundedCurScale.value > 1,
      (isReset, wasReset) => {
        if (isReset && !wasReset) {
          backdropReset.value = progressiveOpacity.value;
          backdropReset.value = withTiming(1, defaultTimingConfig);
        }
      },
    );

    // TODO: use it later
    // eslint-disable-next-line no-unused-vars
    const curBackdropOpacity = useDerivedValue(() => {
      if (pinchActive.value || roundedCurScale.value > 1) {
        return backdropReset.value;
      }
      return progressiveOpacity.value;
    });

    useAnimatedReaction(
      () =>
        pinchActive.value ||
        panActive.value ||
        isRunningDismissAnimation.value ||
        isRunningDoubleTapZoomAnimation.value,
      activeInteraction => {
        if (activeInteraction) {
          return;
        }
        const recenteredScale = Math.max(curScale.value, 1);
        const horizontalPanSpace = getHorizontalPanSpace(recenteredScale);
        const verticalPanSpace = getVerticalPanSpace(recenteredScale);
        const recenteredX = clampV2(
          curX.value,
          -horizontalPanSpace,
          horizontalPanSpace,
        );
        const recenteredY = clampV2(
          curY.value,
          -verticalPanSpace,
          verticalPanSpace,
        );
        if (curScale.value !== recenteredScale) {
          curScale.value = withTiming(recenteredScale, defaultTimingConfig);
        }
        if (curX.value !== recenteredX) {
          curX.value = withTiming(recenteredX, defaultTimingConfig);
        }
        if (curY.value !== recenteredY) {
          curY.value = withTiming(recenteredY, defaultTimingConfig);
        }
      },
    );

    const gesture = React.useMemo(() => {
      const pinchGesture = Gesture.Pinch()
        .onStart(pinchStart)
        .onUpdate(pinchUpdate)
        .onEnd(pinchEnd);
      const panGesture = Gesture.Pan()
        .averageTouches(true)
        .onStart(panStart)
        .onUpdate(panUpdate)
        .onEnd(panEnd);
      const doubleTapGesture = Gesture.Tap()
        .numberOfTaps(2)
        .onEnd(doubleTapUpdate);
      const singleTapGesture = Gesture.Tap()
        .numberOfTaps(1)
        .onEnd(singleTapUpdate);

      return Gesture.Exclusive(
        Gesture.Simultaneous(pinchGesture, panGesture),
        doubleTapGesture,
        singleTapGesture,
      );
    }, [
      doubleTapUpdate,
      panEnd,
      panStart,
      panUpdate,
      pinchStart,
      pinchEnd,
      pinchUpdate,
      singleTapUpdate,
    ]);

    return (
      <FullScreenViewModal
        {...props}
        dimensions={dimensions}
        overlayContext={overlayContext}
        isActive={isActive}
        closeButtonEnabled={closeButtonEnabled}
        actionLinksEnabled={actionLinksEnabled}
        gesture={gesture}
        closeButtonRef={closeButtonRef}
        mediaIconsRef={mediaIconsRef}
        onCloseButtonLayout={onCloseButtonLayout}
        onMediaIconsLayout={onMediaIconsLayout}
        close={close}
      />
    );
  });

export default ConnectedFullScreenViewModal;
