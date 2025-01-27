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
  PinchGestureHandler,
  PanGestureHandler,
  TapGestureHandler,
  State as GestureState,
  type PinchGestureEvent,
  type PanGestureEvent,
  type TapGestureEvent,
  GestureDetector,
  Gesture,
} from 'react-native-gesture-handler';
import Orientation from 'react-native-orientation-locker';
import Animated, { useSharedValue } from 'react-native-reanimated';
import type { EventResult } from 'react-native-reanimated';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { type Dimensions } from 'lib/types/media-types.js';
import type { ReactRef } from 'lib/types/react-types.js';

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
import {
  clamp,
  gestureJustStarted,
  gestureJustEnded,
  runTiming,
} from '../utils/animation-utils.js';

const {
  Value,
  Node,
  Clock,
  event,
  Extrapolate,
  block,
  set,
  call,
  cond,
  not,
  and,
  or,
  eq,
  neq,
  greaterThan,
  add,
  sub,
  multiply,
  divide,
  pow,
  max,
  min,
  round,
  abs,
  interpolateNode,
  startClock,
  stopClock,
  clockRunning,
  decay,
} = Animated;

function scaleDelta(value: Node, gestureActive: Node): Node {
  const diffThisFrame = new Value(1);
  const prevValue = new Value(1);
  return cond(
    gestureActive,
    [
      set(diffThisFrame, divide(value, prevValue)),
      set(prevValue, value),
      diffThisFrame,
    ],
    set(prevValue, 1),
  );
}

function panDelta(value: Node, gestureActive: Node): Node {
  const diffThisFrame = new Value(0);
  const prevValue = new Value(0);
  return cond(
    gestureActive,
    [
      set(diffThisFrame, sub(value, prevValue)),
      set(prevValue, value),
      diffThisFrame,
    ],
    set(prevValue, 0),
  );
}

function runDecay(
  clock: Clock,
  velocity: Node,
  initialPosition: Node,
  startStopClock: boolean = true,
): Node {
  const state = {
    finished: new Value(0),
    velocity: new Value(0),
    position: new Value(0),
    time: new Value(0),
  };
  const config = { deceleration: 0.99 };
  return block([
    cond(not(clockRunning(clock)), [
      set(state.finished, 0),
      set(state.velocity, velocity),
      set(state.position, initialPosition),
      set(state.time, 0),
      startStopClock ? startClock(clock) : undefined,
    ]),
    decay(clock, state, config),
    cond(state.finished, startStopClock ? stopClock(clock) : undefined),
    state.position,
  ]);
}

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
  +updateCloseButtonEnabled: ([number]) => void,
  +updateActionLinksEnabled: ([number]) => void,
  +gesture: ExclusiveGesture,
  +closeButtonRef: { current: ?React.ElementRef<TouchableOpacityInstance> },
  +mediaIconsRef: { current: ?React.ElementRef<typeof View> },
  +onCloseButtonLayout: () => void,
  +onMediaIconsLayout: () => void,
};

class FullScreenViewModal extends React.PureComponent<Props> {
  closeButtonLastState: Value = new Value(1);
  actionLinksLastState: Value = new Value(1);

  centerX: Value;
  centerY: Value;
  frameWidth: Value;
  frameHeight: Value;
  imageWidth: Value;
  imageHeight: Value;

  pinchHandler: ReactRef<PinchGestureHandler> = React.createRef();
  panHandler: ReactRef<PanGestureHandler> = React.createRef();
  singleTapHandler: ReactRef<TapGestureHandler> = React.createRef();
  doubleTapHandler: ReactRef<TapGestureHandler> = React.createRef();
  handlerRefs: $ReadOnlyArray<
    | ReactRef<PinchGestureHandler>
    | ReactRef<PanGestureHandler>
    | ReactRef<TapGestureHandler>,
  > = [
    this.pinchHandler,
    this.panHandler,
    this.singleTapHandler,
    this.doubleTapHandler,
  ];
  beforeDoubleTapRefs: $ReadOnlyArray<
    | ReactRef<PinchGestureHandler>
    | ReactRef<PanGestureHandler>
    | ReactRef<TapGestureHandler>,
  >;
  beforeSingleTapRefs: $ReadOnlyArray<
    | ReactRef<PinchGestureHandler>
    | ReactRef<PanGestureHandler>
    | ReactRef<TapGestureHandler>,
  >;

  pinchEvent: EventResult<PinchGestureEvent>;
  panEvent: EventResult<PanGestureEvent>;
  singleTapEvent: EventResult<TapGestureEvent>;
  doubleTapEvent: EventResult<TapGestureEvent>;

  scale: Node;
  x: Node;
  y: Node;
  backdropOpacity: Node;
  imageContainerOpacity: Node;
  actionLinksOpacity: Node;
  closeButtonOpacity: Node;

  constructor(props: Props) {
    super(props);
    this.updateDimensions();

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

    // The inputs we receive from PanGestureHandler
    const panState = new Value(-1);
    const panTranslationX = new Value(0);
    const panTranslationY = new Value(0);
    const panVelocityX = new Value(0);
    const panVelocityY = new Value(0);
    const panAbsoluteX = new Value(0);
    const panAbsoluteY = new Value(0);
    this.panEvent = event<PanGestureEvent>([
      {
        nativeEvent: {
          state: panState,
          translationX: panTranslationX,
          translationY: panTranslationY,
          velocityX: panVelocityX,
          velocityY: panVelocityY,
          absoluteX: panAbsoluteX,
          absoluteY: panAbsoluteY,
        },
      },
    ]);
    const curPanActive = new Value(0);
    const panActive = block([
      cond(
        and(
          gestureJustStarted(panState),
          // TODO: migrate this in the next diffs
          // this.outsideButtons(
          //   sub(panAbsoluteX, panTranslationX),
          //   sub(panAbsoluteY, panTranslationY),
          // ),
          1,
        ),
        set(curPanActive, 1),
      ),
      cond(gestureJustEnded(panState), set(curPanActive, 0)),
      curPanActive,
    ]);
    const lastPanActive = new Value(0);
    const panJustEnded = cond(eq(lastPanActive, panActive), 0, [
      set(lastPanActive, panActive),
      eq(panActive, 0),
    ]);

    // The inputs we receive from PinchGestureHandler
    const pinchState = new Value(-1);
    const pinchScale = new Value(1);
    const pinchFocalX = new Value(0);
    const pinchFocalY = new Value(0);
    this.pinchEvent = event<PinchGestureEvent>([
      {
        nativeEvent: {
          state: pinchState,
          scale: pinchScale,
          focalX: pinchFocalX,
          focalY: pinchFocalY,
        },
      },
    ]);
    const pinchActive = eq(pinchState, GestureState.ACTIVE);

    // The inputs we receive from single TapGestureHandler
    const singleTapState = new Value(-1);
    const singleTapX = new Value(0);
    const singleTapY = new Value(0);
    this.singleTapEvent = event<TapGestureEvent>([
      {
        nativeEvent: {
          state: singleTapState,
          x: singleTapX,
          y: singleTapY,
        },
      },
    ]);

    // The inputs we receive from double TapGestureHandler
    const doubleTapState = new Value(-1);
    const doubleTapX = new Value(0);
    const doubleTapY = new Value(0);
    this.doubleTapEvent = event<TapGestureEvent>([
      {
        nativeEvent: {
          state: doubleTapState,
          x: doubleTapX,
          y: doubleTapY,
        },
      },
    ]);

    // The all-important outputs
    const curScale = new Value(1);
    const curX = new Value(0);
    const curY = new Value(0);
    const curBackdropOpacity = new Value(1);
    const curCloseButtonOpacity = new Value(1);
    const curActionLinksOpacity = new Value(1);

    // The centered variables help us know if we need to be recentered
    const recenteredScale = max(curScale, 1);
    const horizontalPanSpace = this.horizontalPanSpace(recenteredScale);
    const verticalPanSpace = this.verticalPanSpace(recenteredScale);

    const resetXClock = new Clock();
    const resetYClock = new Clock();
    const zoomClock = new Clock();

    const dismissingFromPan = new Value(0);

    const roundedCurScale = divide(round(multiply(curScale, 1000)), 1000);
    const gestureActive = or(pinchActive, panActive);
    const activeInteraction = or(
      gestureActive,
      clockRunning(zoomClock),
      dismissingFromPan,
    );

    const updates = [
      this.singleTapUpdate(
        singleTapState,
        singleTapX,
        singleTapY,
        roundedCurScale,
        curCloseButtonOpacity,
        curActionLinksOpacity,
      ),
      this.doubleTapUpdate(
        doubleTapState,
        doubleTapX,
        doubleTapY,
        roundedCurScale,
        zoomClock,
        gestureActive,
        curScale,
        curX,
        curY,
      ),
      this.backdropOpacityUpdate(
        panJustEnded,
        pinchActive,
        panVelocityX,
        panVelocityY,
        roundedCurScale,
        curX,
        curY,
        curBackdropOpacity,
        dismissingFromPan,
      ),
      this.recenter(
        resetXClock,
        resetYClock,
        activeInteraction,
        recenteredScale,
        horizontalPanSpace,
        verticalPanSpace,
        curScale,
        curX,
        curY,
      ),
      this.flingUpdate(
        resetXClock,
        resetYClock,
        activeInteraction,
        panJustEnded,
        panVelocityX,
        panVelocityY,
        horizontalPanSpace,
        verticalPanSpace,
        curX,
        curY,
      ),
    ];
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

    this.beforeDoubleTapRefs = Platform.select({
      android: [],
      default: [this.pinchHandler, this.panHandler],
    });
    this.beforeSingleTapRefs = [
      ...this.beforeDoubleTapRefs,
      this.doubleTapHandler,
    ];
  }

  // How much space do we have to pan the image horizontally?
  horizontalPanSpace(scale: Node): Node {
    const apparentWidth = multiply(this.imageWidth, scale);
    const horizPop = divide(sub(apparentWidth, this.frameWidth), 2);
    return max(horizPop, 0);
  }

  // How much space do we have to pan the image vertically?
  verticalPanSpace(scale: Node): Node {
    const apparentHeight = multiply(this.imageHeight, scale);
    const vertPop = divide(sub(apparentHeight, this.frameHeight), 2);
    return max(vertPop, 0);
  }

  singleTapUpdate(
    // Inputs
    singleTapState: Node,
    singleTapX: Node,
    singleTapY: Node,
    roundedCurScale: Node,
    // Outputs
    curCloseButtonOpacity: Value,
    curActionLinksOpacity: Value,
  ): Node {
    const lastTapX = new Value(0);
    const lastTapY = new Value(0);
    const fingerJustReleased = and(
      gestureJustEnded(singleTapState),
      // TODO: migrate this in the next diffs
      //this.outsideButtons(lastTapX, lastTapY),
      1,
    );

    const wasZoomed = new Value(0);
    const isZoomed = greaterThan(roundedCurScale, 1);
    const becameUnzoomed = and(wasZoomed, not(isZoomed));

    const closeButtonState = cond(
      or(
        fingerJustReleased,
        and(becameUnzoomed, eq(this.closeButtonLastState, 0)),
      ),
      sub(1, this.closeButtonLastState),
      this.closeButtonLastState,
    );

    const actionLinksState = cond(
      isZoomed,
      0,
      cond(
        or(fingerJustReleased, becameUnzoomed),
        sub(1, this.actionLinksLastState),
        this.actionLinksLastState,
      ),
    );

    const closeButtonAppearClock = new Clock();
    const closeButtonDisappearClock = new Clock();
    const actionLinksAppearClock = new Clock();
    const actionLinksDisappearClock = new Clock();
    return block([
      fingerJustReleased,
      set(
        curCloseButtonOpacity,
        cond(
          eq(closeButtonState, 1),
          [
            stopClock(closeButtonDisappearClock),
            runTiming(closeButtonAppearClock, curCloseButtonOpacity, 1),
          ],
          [
            stopClock(closeButtonAppearClock),
            runTiming(closeButtonDisappearClock, curCloseButtonOpacity, 0),
          ],
        ),
      ),
      set(
        curActionLinksOpacity,
        cond(
          eq(actionLinksState, 1),
          [
            stopClock(actionLinksDisappearClock),
            runTiming(actionLinksAppearClock, curActionLinksOpacity, 1),
          ],
          [
            stopClock(actionLinksAppearClock),
            runTiming(actionLinksDisappearClock, curActionLinksOpacity, 0),
          ],
        ),
      ),
      set(this.actionLinksLastState, actionLinksState),
      set(this.closeButtonLastState, closeButtonState),
      set(wasZoomed, isZoomed),
      set(lastTapX, singleTapX),
      set(lastTapY, singleTapY),
      call([eq(curCloseButtonOpacity, 1)], this.props.updateCloseButtonEnabled),
      call([eq(curActionLinksOpacity, 1)], this.props.updateActionLinksEnabled),
    ]);
  }

  doubleTapUpdate(
    // Inputs
    doubleTapState: Node,
    doubleTapX: Node,
    doubleTapY: Node,
    roundedCurScale: Node,
    zoomClock: Clock,
    gestureActive: Node,
    // Outputs
    curScale: Value,
    curX: Value,
    curY: Value,
  ): Node {
    const zoomClockRunning = clockRunning(zoomClock);
    const zoomActive = and(not(gestureActive), zoomClockRunning);
    const targetScale = cond(greaterThan(roundedCurScale, 1), 1, 3);

    const tapXDiff = sub(doubleTapX, this.centerX, curX);
    const tapYDiff = sub(doubleTapY, this.centerY, curY);
    const tapXPercent = divide(tapXDiff, this.imageWidth, curScale);
    const tapYPercent = divide(tapYDiff, this.imageHeight, curScale);

    const horizPanSpace = this.horizontalPanSpace(targetScale);
    const vertPanSpace = this.verticalPanSpace(targetScale);
    const horizPanPercent = divide(horizPanSpace, this.imageWidth, targetScale);
    const vertPanPercent = divide(vertPanSpace, this.imageHeight, targetScale);

    const tapXPercentClamped = clamp(
      tapXPercent,
      multiply(-1, horizPanPercent),
      horizPanPercent,
    );
    const tapYPercentClamped = clamp(
      tapYPercent,
      multiply(-1, vertPanPercent),
      vertPanPercent,
    );
    const targetX = multiply(tapXPercentClamped, this.imageWidth, targetScale);
    const targetY = multiply(tapYPercentClamped, this.imageHeight, targetScale);

    const targetRelativeScale = divide(targetScale, curScale);
    const targetRelativeX = multiply(-1, add(targetX, curX));
    const targetRelativeY = multiply(-1, add(targetY, curY));

    const zoomScale = runTiming(zoomClock, 1, targetRelativeScale);
    const zoomX = runTiming(zoomClock, 0, targetRelativeX, false);
    const zoomY = runTiming(zoomClock, 0, targetRelativeY, false);

    const deltaScale = scaleDelta(zoomScale, zoomActive);
    const deltaX = panDelta(zoomX, zoomActive);
    const deltaY = panDelta(zoomY, zoomActive);

    const fingerJustReleased = and(
      gestureJustEnded(doubleTapState),
      // TODO: migrate this in the next diffs
      // this.outsideButtons(doubleTapX, doubleTapY),
      1,
    );

    return cond(
      [fingerJustReleased, deltaX, deltaY, deltaScale, gestureActive],
      stopClock(zoomClock),
      cond(or(zoomClockRunning, fingerJustReleased), [
        zoomX,
        zoomY,
        zoomScale,
        set(curX, add(curX, deltaX)),
        set(curY, add(curY, deltaY)),
        set(curScale, multiply(curScale, deltaScale)),
      ]),
    );
  }

  backdropOpacityUpdate(
    // Inputs
    panJustEnded: Node,
    pinchActive: Node,
    panVelocityX: Node,
    panVelocityY: Node,
    roundedCurScale: Node,
    // Outputs
    curX: Value,
    curY: Value,
    curBackdropOpacity: Value,
    dismissingFromPan: Value,
  ): Node {
    const progressiveOpacity = max(
      min(
        sub(1, abs(divide(curX, this.frameWidth))),
        sub(1, abs(divide(curY, this.frameHeight))),
      ),
      0,
    );

    const resetClock = new Clock();

    const velocity = pow(add(pow(panVelocityX, 2), pow(panVelocityY, 2)), 0.5);
    const shouldGoBack = and(
      panJustEnded,
      or(greaterThan(velocity, 50), greaterThan(0.7, progressiveOpacity)),
    );

    const decayClock = new Clock();
    const decayItems = [
      set(curX, runDecay(decayClock, panVelocityX, curX, false)),
      set(curY, runDecay(decayClock, panVelocityY, curY)),
    ];

    return cond(
      [panJustEnded, dismissingFromPan],
      decayItems,
      cond(
        or(pinchActive, greaterThan(roundedCurScale, 1)),
        set(curBackdropOpacity, runTiming(resetClock, curBackdropOpacity, 1)),
        [
          stopClock(resetClock),
          set(curBackdropOpacity, progressiveOpacity),
          set(dismissingFromPan, shouldGoBack),
          cond(shouldGoBack, [decayItems, call([], this.close)]),
        ],
      ),
    );
  }

  recenter(
    // Inputs
    resetXClock: Clock,
    resetYClock: Clock,
    activeInteraction: Node,
    recenteredScale: Node,
    horizontalPanSpace: Node,
    verticalPanSpace: Node,
    // Outputs
    curScale: Value,
    curX: Value,
    curY: Value,
  ): Node {
    const resetScaleClock = new Clock();

    const recenteredX = clamp(
      curX,
      multiply(-1, horizontalPanSpace),
      horizontalPanSpace,
    );
    const recenteredY = clamp(
      curY,
      multiply(-1, verticalPanSpace),
      verticalPanSpace,
    );

    return cond(
      activeInteraction,
      [
        stopClock(resetScaleClock),
        stopClock(resetXClock),
        stopClock(resetYClock),
      ],
      [
        cond(
          or(clockRunning(resetScaleClock), neq(recenteredScale, curScale)),
          set(curScale, runTiming(resetScaleClock, curScale, recenteredScale)),
        ),
        cond(
          or(clockRunning(resetXClock), neq(recenteredX, curX)),
          set(curX, runTiming(resetXClock, curX, recenteredX)),
        ),
        cond(
          or(clockRunning(resetYClock), neq(recenteredY, curY)),
          set(curY, runTiming(resetYClock, curY, recenteredY)),
        ),
      ],
    );
  }

  flingUpdate(
    // Inputs
    resetXClock: Clock,
    resetYClock: Clock,
    activeInteraction: Node,
    panJustEnded: Node,
    panVelocityX: Node,
    panVelocityY: Node,
    horizontalPanSpace: Node,
    verticalPanSpace: Node,
    // Outputs
    curX: Value,
    curY: Value,
  ): Node {
    const flingXClock = new Clock();
    const flingYClock = new Clock();

    const decayX = runDecay(flingXClock, panVelocityX, curX);
    const recenteredX = clamp(
      decayX,
      multiply(-1, horizontalPanSpace),
      horizontalPanSpace,
    );
    const decayY = runDecay(flingYClock, panVelocityY, curY);
    const recenteredY = clamp(
      decayY,
      multiply(-1, verticalPanSpace),
      verticalPanSpace,
    );

    return cond(
      activeInteraction,
      [stopClock(flingXClock), stopClock(flingYClock)],
      [
        cond(
          clockRunning(resetXClock),
          stopClock(flingXClock),
          cond(or(panJustEnded, clockRunning(flingXClock)), [
            set(curX, recenteredX),
            cond(neq(decayX, recenteredX), stopClock(flingXClock)),
          ]),
        ),
        cond(
          clockRunning(resetYClock),
          stopClock(flingYClock),
          cond(or(panJustEnded, clockRunning(flingYClock)), [
            set(curY, recenteredY),
            cond(neq(decayY, recenteredY), stopClock(flingYClock)),
          ]),
        ),
      ],
    );
  }

  updateDimensions() {
    const { width: frameWidth, height: frameHeight } = this.frame;
    const { topInset } = this.props.dimensions;
    if (this.frameWidth) {
      this.frameWidth.setValue(frameWidth);
    } else {
      this.frameWidth = new Value(frameWidth);
    }
    if (this.frameHeight) {
      this.frameHeight.setValue(frameHeight);
    } else {
      this.frameHeight = new Value(frameHeight);
    }

    const centerX = frameWidth / 2;
    const centerY = frameHeight / 2 + topInset;
    if (this.centerX) {
      this.centerX.setValue(centerX);
    } else {
      this.centerX = new Value(centerX);
    }
    if (this.centerY) {
      this.centerY.setValue(centerY);
    } else {
      this.centerY = new Value(centerY);
    }

    const { width, height } = this.props.contentDimensions;
    if (this.imageWidth) {
      this.imageWidth.setValue(width);
    } else {
      this.imageWidth = new Value(width);
    }
    if (this.imageHeight) {
      this.imageHeight.setValue(height);
    } else {
      this.imageHeight = new Value(height);
    }
  }

  componentDidUpdate(prevProps: Props) {
    if (this.props.dimensions !== prevProps.dimensions) {
      this.updateDimensions();
    }
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
                onPress={this.close}
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

  close = () => {
    this.props.navigation.goBackOnce();
  };
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

    const isActive = !overlayContext || !overlayContext.isDismissing;

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

    const [closeButtonEnabled, setCloseButtonEnabled] = React.useState(true);
    const [actionLinksEnabled, setActionLinksEnabled] = React.useState(true);

    const updateCloseButtonEnabled = React.useCallback(
      ([enabledNum]: [number]) => {
        const enabled = !!enabledNum;
        if (closeButtonEnabled !== enabled) {
          setCloseButtonEnabled(enabled);
        }
      },
      [closeButtonEnabled],
    );

    const updateActionLinksEnabled = React.useCallback(
      ([enabledNum]: [number]) => {
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

    const insets = useSafeAreaInsets();

    const outsideButtons = React.useCallback(
      (x: number, y: number): boolean => {
        'worklet';
        const isOutsideButton = (dim: ButtonDimensions) => {
          return (
            x < dim.x ||
            x > dim.x + dim.width ||
            y + insets.top < dim.y ||
            y + insets.top > dim.y + dim.height
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
        insets.top,
        mediaIconsDimensions,
      ],
    );

    const curX = useSharedValue(0);
    const curY = useSharedValue(0);
    const curScale = useSharedValue(1);

    const centerX = useSharedValue(dimensions.width / 2);
    const centerY = useSharedValue(dimensions.safeAreaHeight / 2);

    const lastPinchScale = useSharedValue(1);

    const pinchStart = React.useCallback(() => {
      'worklet';
      lastPinchScale.value = 1;
    }, [lastPinchScale]);

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
      [centerX.value, centerY.value, curScale, curX, curY, lastPinchScale],
    );

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
      },
      [lastPanTranslationX, lastPanTranslationY, outsideButtons, panActive],
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

    const panEnd = React.useCallback(() => {
      'worklet';
      panActive.value = false;
    }, [panActive]);

    const gesture = React.useMemo(() => {
      const pinchGesture = Gesture.Pinch()
        .onStart(pinchStart)
        .onUpdate(pinchUpdate);
      const panGesture = Gesture.Pan()
        .onStart(panStart)
        .onUpdate(panUpdate)
        .onEnd(panEnd);
      const doubleTapGesture = Gesture.Tap().numberOfTaps(2);
      const singleTapGesture = Gesture.Tap().numberOfTaps(1);

      return Gesture.Exclusive(
        Gesture.Simultaneous(pinchGesture, panGesture),
        doubleTapGesture,
        singleTapGesture,
      );
    }, [panEnd, panStart, panUpdate, pinchStart, pinchUpdate]);

    return (
      <FullScreenViewModal
        {...props}
        dimensions={dimensions}
        overlayContext={overlayContext}
        isActive={isActive}
        closeButtonEnabled={closeButtonEnabled}
        actionLinksEnabled={actionLinksEnabled}
        updateCloseButtonEnabled={updateCloseButtonEnabled}
        updateActionLinksEnabled={updateActionLinksEnabled}
        gesture={gesture}
        closeButtonRef={closeButtonRef}
        mediaIconsRef={mediaIconsRef}
        onCloseButtonLayout={onCloseButtonLayout}
        onMediaIconsLayout={onMediaIconsLayout}
      />
    );
  });

export default ConnectedFullScreenViewModal;
