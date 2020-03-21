// @flow

import type {
  NavigationLeafRoute,
  NavigationStackProp,
  NavigationStackScene,
  NavigationStackTransitionProps,
} from 'react-navigation-stack';
import {
  type MediaInfo,
  mediaInfoPropType,
  type Dimensions,
  dimensionsPropType,
} from 'lib/types/media-types';
import type { AppState } from '../redux/redux-setup';
import {
  type VerticalBounds,
  verticalBoundsPropType,
  type LayoutCoordinates,
  layoutCoordinatesPropType,
} from '../types/lightbox-types';

import * as React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import PropTypes from 'prop-types';
import {
  PinchGestureHandler,
  PanGestureHandler,
  TapGestureHandler,
  State as GestureState,
} from 'react-native-gesture-handler';
import Orientation from 'react-native-orientation-locker';
import Animated, { Easing } from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/Ionicons';

import { connect } from 'lib/utils/redux-utils';

import {
  contentBottomOffset,
  dimensionsSelector,
  contentVerticalOffsetSelector,
} from '../selectors/dimension-selectors';
import Multimedia from './multimedia.react';
import ConnectedStatusBar from '../connected-status-bar.react';
import {
  clamp,
  gestureJustStarted,
  gestureJustEnded,
} from '../utils/animation-utils';
import { intentionalSaveImage } from './save-image';

const {
  Value,
  Clock,
  event,
  Extrapolate,
  set,
  call,
  cond,
  not,
  and,
  or,
  eq,
  neq,
  greaterThan,
  lessThan,
  add,
  sub,
  multiply,
  divide,
  pow,
  max,
  min,
  round,
  abs,
  interpolate,
  startClock,
  stopClock,
  clockRunning,
  timing,
  decay,
} = Animated;

function scaleDelta(value: Value, gestureActive: Value) {
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

function panDelta(value: Value, gestureActive: Value) {
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

function runTiming(
  clock: Clock,
  initialValue: Value | number,
  finalValue: Value | number,
  startStopClock: boolean = true,
): Value {
  const state = {
    finished: new Value(0),
    position: new Value(0),
    frameTime: new Value(0),
    time: new Value(0),
  };
  const config = {
    toValue: new Value(0),
    duration: 250,
    easing: Easing.out(Easing.ease),
  };
  return [
    cond(not(clockRunning(clock)), [
      set(state.finished, 0),
      set(state.frameTime, 0),
      set(state.time, 0),
      set(state.position, initialValue),
      set(config.toValue, finalValue),
      startStopClock && startClock(clock),
    ]),
    timing(clock, state, config),
    cond(state.finished, startStopClock && stopClock(clock)),
    state.position,
  ];
}

function runDecay(
  clock: Clock,
  velocity: Value,
  initialPosition: Value,
  startStopClock: boolean = true,
): Value {
  const state = {
    finished: new Value(0),
    velocity: new Value(0),
    position: new Value(0),
    time: new Value(0),
  };
  const config = { deceleration: 0.99 };
  return [
    cond(not(clockRunning(clock)), [
      set(state.finished, 0),
      set(state.velocity, velocity),
      set(state.position, initialPosition),
      set(state.time, 0),
      startStopClock && startClock(clock),
    ]),
    decay(clock, state, config),
    cond(state.finished, startStopClock && stopClock(clock)),
    state.position,
  ];
}

type NavProp = NavigationStackProp<{|
  ...NavigationLeafRoute,
  params: {|
    mediaInfo: MediaInfo,
    initialCoordinates: LayoutCoordinates,
    verticalBounds: VerticalBounds,
  |},
|}>;

type Props = {|
  navigation: NavProp,
  scene: NavigationStackScene,
  transitionProps: NavigationStackTransitionProps,
  position: Value,
  // Redux state
  screenDimensions: Dimensions,
  contentVerticalOffset: number,
|};
type State = {|
  closeButtonEnabled: boolean,
  actionLinksEnabled: boolean,
|};
class MultimediaModal extends React.PureComponent<Props, State> {
  static propTypes = {
    navigation: PropTypes.shape({
      state: PropTypes.shape({
        params: PropTypes.shape({
          mediaInfo: mediaInfoPropType.isRequired,
          initialCoordinates: layoutCoordinatesPropType.isRequired,
          verticalBounds: verticalBoundsPropType.isRequired,
        }).isRequired,
      }).isRequired,
      goBack: PropTypes.func.isRequired,
    }).isRequired,
    transitionProps: PropTypes.object.isRequired,
    position: PropTypes.instanceOf(Value).isRequired,
    scene: PropTypes.object.isRequired,
    screenDimensions: dimensionsPropType.isRequired,
    contentVerticalOffset: PropTypes.number.isRequired,
  };
  state = {
    closeButtonEnabled: true,
    actionLinksEnabled: true,
  };

  closeButton: ?TouchableOpacity;
  saveButton: ?TouchableOpacity;
  closeButtonX = new Value(-1);
  closeButtonY = new Value(-1);
  closeButtonWidth = new Value(0);
  closeButtonHeight = new Value(0);
  closeButtonLastState = new Value(1);
  saveButtonX = new Value(-1);
  saveButtonY = new Value(-1);
  saveButtonWidth = new Value(0);
  saveButtonHeight = new Value(0);
  actionLinksLastState = new Value(1);

  centerX = new Value(0);
  centerY = new Value(0);
  screenWidth = new Value(0);
  screenHeight = new Value(0);
  imageWidth = new Value(0);
  imageHeight = new Value(0);

  pinchHandler = React.createRef();
  panHandler = React.createRef();
  singleTapHandler = React.createRef();
  doubleTapHandler = React.createRef();
  handlerRefs = [
    this.pinchHandler,
    this.panHandler,
    this.singleTapHandler,
    this.doubleTapHandler,
  ];
  beforeDoubleTapRefs = [this.pinchHandler, this.panHandler];
  beforeSingleTapRefs = [
    this.pinchHandler,
    this.panHandler,
    this.doubleTapHandler,
  ];

  pinchEvent;
  panEvent;
  singleTapEvent;
  doubleTapEvent;

  scale: Value;
  x: Value;
  y: Value;
  backdropOpacity: Value;
  imageContainerOpacity: Value;
  actionLinksOpacity: Value;
  closeButtonOpacity: Value;

  constructor(props: Props) {
    super(props);
    this.updateDimensions();

    const { imageWidth, imageHeight } = this;
    const left = sub(this.centerX, divide(imageWidth, 2));
    const top = sub(this.centerY, divide(imageHeight, 2));

    const { initialCoordinates } = props.navigation.state.params;
    const initialScale = divide(initialCoordinates.width, imageWidth);
    const initialTranslateX = sub(
      initialCoordinates.x + initialCoordinates.width / 2,
      add(left, divide(imageWidth, 2)),
    );
    const initialTranslateY = sub(
      initialCoordinates.y + initialCoordinates.height / 2,
      add(top, divide(imageHeight, 2)),
    );

    const { position } = props;
    const { index } = props.scene;
    const navigationProgress = interpolate(position, {
      inputRange: [index - 1, index],
      outputRange: [0, 1],
      extrapolate: Extrapolate.CLAMP,
    });

    // The inputs we receive from PanGestureHandler
    const panState = new Value(-1);
    const panTranslationX = new Value(0);
    const panTranslationY = new Value(0);
    const panVelocityX = new Value(0);
    const panVelocityY = new Value(0);
    const panAbsoluteX = new Value(0);
    const panAbsoluteY = new Value(0);
    this.panEvent = event([
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
    const panActive = [
      cond(
        and(
          gestureJustStarted(panState),
          this.outsideButtons(
            sub(panAbsoluteX, panTranslationX),
            sub(panAbsoluteY, panTranslationY),
          ),
        ),
        set(curPanActive, 1),
      ),
      cond(gestureJustEnded(panState), set(curPanActive, 0)),
      curPanActive,
    ];
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
    this.pinchEvent = event([
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
    this.singleTapEvent = event([
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
    this.doubleTapEvent = event([
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
      this.pinchUpdate(
        pinchActive,
        pinchScale,
        pinchFocalX,
        pinchFocalY,
        curScale,
        curX,
        curY,
      ),
      this.panUpdate(panActive, panTranslationX, panTranslationY, curX, curY),
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
        curX,
        curY,
        roundedCurScale,
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
    this.imageContainerOpacity = interpolate(navigationProgress, {
      inputRange: [0, 0.1],
      outputRange: [0, 1],
      extrapolate: Extrapolate.CLAMP,
    });
    const buttonOpacity = interpolate(updatedBackdropOpacity, {
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

  // How much space do we have to pan the image horizontally?
  horizontalPanSpace(scale: Value) {
    const apparentWidth = multiply(this.imageWidth, scale);
    const horizPop = divide(sub(apparentWidth, this.screenWidth), 2);
    return max(horizPop, 0);
  }

  // How much space do we have to pan the image vertically?
  verticalPanSpace(scale: Value) {
    const apparentHeight = multiply(this.imageHeight, scale);
    const vertPop = divide(sub(apparentHeight, this.screenHeight), 2);
    return max(vertPop, 0);
  }

  pinchUpdate(
    // Inputs
    pinchActive: Value,
    pinchScale: Value,
    pinchFocalX: Value,
    pinchFocalY: Value,
    // Outputs
    curScale: Value,
    curX: Value,
    curY: Value,
  ): Value {
    const deltaScale = scaleDelta(pinchScale, pinchActive);
    const deltaPinchX = multiply(
      sub(1, deltaScale),
      sub(pinchFocalX, curX, this.centerX),
    );
    const deltaPinchY = multiply(
      sub(1, deltaScale),
      sub(pinchFocalY, curY, this.centerY),
    );

    return cond(
      [deltaScale, pinchActive],
      [
        set(curX, add(curX, deltaPinchX)),
        set(curY, add(curY, deltaPinchY)),
        set(curScale, multiply(curScale, deltaScale)),
      ],
    );
  }

  outsideButtons(x: Value, y: Value) {
    const {
      closeButtonX,
      closeButtonY,
      closeButtonWidth,
      closeButtonHeight,
      closeButtonLastState,
      saveButtonX,
      saveButtonY,
      saveButtonWidth,
      saveButtonHeight,
      actionLinksLastState,
    } = this;
    return and(
      or(
        eq(closeButtonLastState, 0),
        lessThan(x, closeButtonX),
        greaterThan(x, add(closeButtonX, closeButtonWidth)),
        lessThan(y, closeButtonY),
        greaterThan(y, add(closeButtonY, closeButtonHeight)),
      ),
      or(
        eq(actionLinksLastState, 0),
        lessThan(x, saveButtonX),
        greaterThan(x, add(saveButtonX, saveButtonWidth)),
        lessThan(y, saveButtonY),
        greaterThan(y, add(saveButtonY, saveButtonHeight)),
      ),
    );
  }

  panUpdate(
    // Inputs
    panActive: Value,
    panTranslationX: Value,
    panTranslationY: Value,
    // Outputs
    curX: Value,
    curY: Value,
  ): Value {
    const deltaX = panDelta(panTranslationX, panActive);
    const deltaY = panDelta(panTranslationY, panActive);
    return cond(
      [deltaX, deltaY, panActive],
      [set(curX, add(curX, deltaX)), set(curY, add(curY, deltaY))],
    );
  }

  singleTapUpdate(
    // Inputs
    singleTapState: Value,
    singleTapX: Value,
    singleTapY: Value,
    roundedCurScale: Value,
    // Outputs
    curCloseButtonOpacity: Value,
    curActionLinksOpacity: Value,
  ): Value {
    const lastTapX = new Value(0);
    const lastTapY = new Value(0);
    const fingerJustReleased = and(
      gestureJustEnded(singleTapState),
      this.outsideButtons(lastTapX, lastTapY),
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
    return [
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
      call([eq(curCloseButtonOpacity, 1)], this.setCloseButtonEnabled),
      call([eq(curActionLinksOpacity, 1)], this.setActionLinksEnabled),
    ];
  }

  doubleTapUpdate(
    // Inputs
    doubleTapState: Value,
    doubleTapX: Value,
    doubleTapY: Value,
    roundedCurScale: Value,
    zoomClock: Clock,
    gestureActive: Value,
    // Outputs
    curScale: Value,
    curX: Value,
    curY: Value,
  ): Value {
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
      this.outsideButtons(doubleTapX, doubleTapY),
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
    panJustEnded: Value,
    pinchActive: Value,
    panVelocityX: Value,
    panVelocityY: Value,
    curX: Value,
    curY: Value,
    roundedCurScale: Value,
    // Outputs
    curBackdropOpacity: Value,
    dismissingFromPan: Value,
  ): Value {
    const progressiveOpacity = max(
      min(
        sub(1, abs(divide(curX, this.screenWidth))),
        sub(1, abs(divide(curY, this.screenHeight))),
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
    activeInteraction: Value,
    recenteredScale: Value,
    horizontalPanSpace: Value,
    verticalPanSpace: Value,
    // Outputs
    curScale: Value,
    curX: Value,
    curY: Value,
  ): Value {
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
    activeInteraction: Value,
    panJustEnded: Value,
    panVelocityX: Value,
    panVelocityY: Value,
    horizontalPanSpace: Value,
    verticalPanSpace: Value,
    // Outputs
    curX: Value,
    curY: Value,
  ): Value {
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
    const { width: screenWidth, height: screenHeight } = this.screenDimensions;
    this.screenWidth.setValue(screenWidth);
    this.screenHeight.setValue(screenHeight);

    this.centerX.setValue(screenWidth / 2);
    this.centerY.setValue(screenHeight / 2 + this.props.contentVerticalOffset);

    const { width, height } = this.imageDimensions;
    this.imageWidth.setValue(width);
    this.imageHeight.setValue(height);
  }

  componentDidMount() {
    if (MultimediaModal.isActive(this.props)) {
      Orientation.unlockAllOrientations();
    }
  }

  componentWillUnmount() {
    if (MultimediaModal.isActive(this.props)) {
      Orientation.lockToPortrait();
    }
  }

  componentDidUpdate(prevProps: Props) {
    if (
      this.props.screenDimensions !== prevProps.screenDimensions ||
      this.props.contentVerticalOffset !== prevProps.contentVerticalOffset
    ) {
      this.updateDimensions();
    }

    const isActive = MultimediaModal.isActive(this.props);
    const wasActive = MultimediaModal.isActive(prevProps);
    if (isActive && !wasActive) {
      Orientation.unlockAllOrientations();
    } else if (!isActive && wasActive) {
      Orientation.lockToPortrait();
    }
  }

  get screenDimensions(): Dimensions {
    const { screenDimensions, contentVerticalOffset } = this.props;
    if (contentVerticalOffset === 0) {
      return screenDimensions;
    }
    const { height, width } = screenDimensions;
    return { height: height - contentVerticalOffset, width };
  }

  get imageDimensions(): Dimensions {
    // Make space for the close button
    let { height: maxHeight, width: maxWidth } = this.screenDimensions;
    if (maxHeight > maxWidth) {
      maxHeight -= 100;
    } else {
      maxWidth -= 100;
    }

    const { dimensions } = this.props.navigation.state.params.mediaInfo;
    if (dimensions.height < maxHeight && dimensions.width < maxWidth) {
      return dimensions;
    }

    const heightRatio = maxHeight / dimensions.height;
    const widthRatio = maxWidth / dimensions.width;
    if (heightRatio < widthRatio) {
      return {
        height: maxHeight,
        width: dimensions.width * heightRatio,
      };
    } else {
      return {
        width: maxWidth,
        height: dimensions.height * widthRatio,
      };
    }
  }

  get imageContainerStyle() {
    const { height, width } = this.imageDimensions;
    const { height: screenHeight, width: screenWidth } = this.screenDimensions;
    const top = (screenHeight - height) / 2 + this.props.contentVerticalOffset;
    const left = (screenWidth - width) / 2;
    const { verticalBounds } = this.props.navigation.state.params;
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

  static isActive(props) {
    const ourIndex = props.scene.index;
    const curIndex = props.transitionProps.index;
    return curIndex >= ourIndex;
  }

  get contentContainerStyle() {
    const { verticalBounds } = this.props.navigation.state.params;
    const fullScreenHeight =
      this.screenDimensions.height +
      contentBottomOffset +
      this.props.contentVerticalOffset;
    const top = verticalBounds.y;
    const bottom = fullScreenHeight - verticalBounds.y - verticalBounds.height;

    // margin will clip, but padding won't
    const verticalStyle = MultimediaModal.isActive(this.props)
      ? { paddingTop: top, paddingBottom: bottom }
      : { marginTop: top, marginBottom: bottom };
    return [styles.contentContainer, verticalStyle];
  }

  render() {
    const { mediaInfo } = this.props.navigation.state.params;
    const statusBar = MultimediaModal.isActive(this.props) ? (
      <ConnectedStatusBar hidden />
    ) : null;
    const backdropStyle = { opacity: this.backdropOpacity };
    const closeButtonStyle = {
      opacity: this.closeButtonOpacity,
      top: Math.max(this.props.contentVerticalOffset - 2, 4),
    };
    const saveButtonStyle = { opacity: this.actionLinksOpacity };
    const view = (
      <Animated.View style={styles.container}>
        {statusBar}
        <Animated.View style={[styles.backdrop, backdropStyle]} />
        <View style={this.contentContainerStyle}>
          <Animated.View style={this.imageContainerStyle}>
            <Multimedia mediaInfo={mediaInfo} spinnerColor="white" />
          </Animated.View>
        </View>
        <Animated.View style={[styles.closeButtonContainer, closeButtonStyle]}>
          <TouchableOpacity
            onPress={this.close}
            disabled={!this.state.closeButtonEnabled}
            onLayout={this.onCloseButtonLayout}
            ref={this.closeButtonRef}
          >
            <Text style={styles.closeButton}>×</Text>
          </TouchableOpacity>
        </Animated.View>
        <Animated.View style={[styles.saveButtonContainer, saveButtonStyle]}>
          <TouchableOpacity
            onPress={this.save}
            disabled={!this.state.actionLinksEnabled}
            style={styles.saveButton}
            onLayout={this.onSaveButtonLayout}
            ref={this.saveButtonRef}
          >
            <Icon
              name={Platform.OS === 'ios' ? 'ios-save' : 'md-save'}
              style={styles.saveButtonIcon}
            />
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    );
    return (
      <PinchGestureHandler
        onGestureEvent={this.pinchEvent}
        onHandlerStateChange={this.pinchEvent}
        simultaneousHandlers={this.handlerRefs}
        ref={this.pinchHandler}
      >
        <Animated.View style={styles.container}>
          <PanGestureHandler
            onGestureEvent={this.panEvent}
            onHandlerStateChange={this.panEvent}
            simultaneousHandlers={this.handlerRefs}
            ref={this.panHandler}
            avgTouches
          >
            <Animated.View style={styles.container}>
              <TapGestureHandler
                onHandlerStateChange={this.doubleTapEvent}
                simultaneousHandlers={this.handlerRefs}
                ref={this.doubleTapHandler}
                waitFor={this.beforeDoubleTapRefs}
                numberOfTaps={2}
              >
                <Animated.View style={styles.container}>
                  <TapGestureHandler
                    onHandlerStateChange={this.singleTapEvent}
                    simultaneousHandlers={this.handlerRefs}
                    ref={this.singleTapHandler}
                    waitFor={this.beforeSingleTapRefs}
                    numberOfTaps={1}
                  >
                    {view}
                  </TapGestureHandler>
                </Animated.View>
              </TapGestureHandler>
            </Animated.View>
          </PanGestureHandler>
        </Animated.View>
      </PinchGestureHandler>
    );
  }

  close = () => {
    this.props.navigation.goBack();
  };

  save = async () => {
    await intentionalSaveImage(this.props.navigation.state.params.mediaInfo);
  };

  setCloseButtonEnabled = ([enabledNum]: [number]) => {
    const enabled = !!enabledNum;
    if (this.state.closeButtonEnabled !== enabled) {
      this.setState({ closeButtonEnabled: enabled });
    }
  };

  setActionLinksEnabled = ([enabledNum]: [number]) => {
    const enabled = !!enabledNum;
    if (this.state.actionLinksEnabled !== enabled) {
      this.setState({ actionLinksEnabled: enabled });
    }
  };

  closeButtonRef = (closeButton: ?TouchableOpacity) => {
    this.closeButton = closeButton;
  };

  saveButtonRef = (saveButton: ?TouchableOpacity) => {
    this.saveButton = saveButton;
  };

  onCloseButtonLayout = () => {
    const { closeButton } = this;
    if (!closeButton) {
      return;
    }
    closeButton.measure((x, y, width, height, pageX, pageY) => {
      this.closeButtonX.setValue(pageX);
      this.closeButtonY.setValue(pageY);
      this.closeButtonWidth.setValue(width);
      this.closeButtonHeight.setValue(height);
    });
  };

  onSaveButtonLayout = () => {
    const { saveButton } = this;
    if (!saveButton) {
      return;
    }
    saveButton.measure((x, y, width, height, pageX, pageY) => {
      this.saveButtonX.setValue(pageX);
      this.saveButtonY.setValue(pageY);
      this.saveButtonWidth.setValue(width);
      this.saveButtonHeight.setValue(height);
    });
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
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  saveButton: {
    alignItems: 'center',
    paddingBottom: 2,
    paddingLeft: 8,
    paddingRight: 8,
    paddingTop: 2,
  },
  saveButtonContainer: {
    bottom: contentBottomOffset + 8,
    left: 16,
    position: 'absolute',
  },
  saveButtonIcon: {
    color: '#D7D7DC',
    fontSize: 36,
    textShadowColor: '#1C1C1E',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  saveButtonText: {
    color: '#D7D7DC',
    fontSize: 14,
    textShadowColor: '#1C1C1E',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
});

export default connect((state: AppState) => ({
  screenDimensions: dimensionsSelector(state),
  contentVerticalOffset: contentVerticalOffsetSelector(state),
}))(MultimediaModal);
