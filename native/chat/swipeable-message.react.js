// @flow

import type { ViewStyle } from '../types/styles';

import * as React from 'react';
import { View, Platform } from 'react-native';
import FontAwesomeIcon from 'react-native-vector-icons/FontAwesome';
import { TapticFeedback } from 'react-native-in-app-message';
import Animated from 'react-native-reanimated';
import {
  PanGestureHandler,
  State as GestureState,
} from 'react-native-gesture-handler';

import { useColors, useStyles } from '../themes/colors';
import { dividePastDistance, runSpring } from '../utils/animation-utils';

/* eslint-disable import/no-named-as-default-member */
const {
  Value,
  Clock,
  block,
  event,
  Extrapolate,
  set,
  call,
  cond,
  not,
  and,
  greaterOrEq,
  eq,
  add,
  abs,
  max,
  min,
  stopClock,
  interpolate,
  SpringUtils,
} = Animated;
/* eslint-enable import/no-named-as-default-member */

const threshold = 40;
const springConfig = {
  ...SpringUtils.makeConfigFromBouncinessAndSpeed({
    ...SpringUtils.makeDefaultConfig(),
    bounciness: 10,
    speed: 8,
  }),
  overshootClamping: true,
};

type Props = {|
  +onSwipeableWillOpen: () => void,
  +isViewer: boolean,
  +messageBoxStyle: ViewStyle,
  +children: React.Node,
|};
function SwipeableMessage(props: Props) {
  const { isViewer, onSwipeableWillOpen } = props;
  const onPassThreshold = React.useCallback(() => {
    if (Platform.OS === 'ios') {
      TapticFeedback.impact();
    }
  }, []);

  const {
    swipeEvent,
    transformMessageBoxStyle,
    translateReplyStyle,
  } = React.useMemo(() => {
    const swipeX = new Value(0);
    const swipeState = new Value(-1);
    const innerSwipeEvent = event([
      {
        nativeEvent: {
          translationX: swipeX,
          state: swipeState,
        },
      },
    ]);

    const curX = new Value(0);
    const prevSwipeState = new Value(-1);
    const resetClock = new Clock();

    const isActive = eq(swipeState, GestureState.ACTIVE);
    const baseActiveTranslation = isViewer
      ? min(add(curX, swipeX), 0)
      : max(add(curX, swipeX), 0);
    const activeTranslation = dividePastDistance(
      baseActiveTranslation,
      threshold,
      2,
    );

    const pastThreshold = greaterOrEq(abs(activeTranslation), threshold);
    const prevPastThreshold = new Value(0);

    const translateX = block([
      cond(and(eq(prevSwipeState, GestureState.ACTIVE), not(isActive)), [
        set(curX, activeTranslation),
        cond(pastThreshold, call([], onSwipeableWillOpen)),
      ]),
      set(prevSwipeState, swipeState),
      cond(
        and(isActive, pastThreshold, not(prevPastThreshold)),
        call([], onPassThreshold),
      ),
      set(prevPastThreshold, pastThreshold),
      cond(
        isActive,
        [stopClock(resetClock), activeTranslation],
        [
          cond(
            eq(curX, 0),
            stopClock(resetClock),
            set(curX, runSpring(resetClock, curX, 0, true, springConfig)),
          ),
          curX,
        ],
      ),
    ]);
    const innerTransformMessageBoxStyle = {
      transform: [{ translateX }],
    };

    const translateReplyIcon = interpolate(translateX, {
      inputRange: isViewer ? [-1 * threshold, 0] : [0, threshold],
      outputRange: isViewer ? [-23, -23 + threshold] : [0 - threshold, 0],
      extrapolate: Extrapolate.CLAMP,
    });
    const translateReplyOpacity = interpolate(translateX, {
      inputRange: isViewer ? [-1 * threshold, -25] : [25, threshold],
      outputRange: isViewer ? [1, 0] : [0, 1],
      extrapolate: Extrapolate.CLAMP,
    });
    const innerTranslateReplyStyle = {
      transform: [
        {
          translateX: translateReplyIcon,
        },
      ],
      opacity: translateReplyOpacity,
    };
    return {
      swipeEvent: innerSwipeEvent,
      transformMessageBoxStyle: innerTransformMessageBoxStyle,
      translateReplyStyle: innerTranslateReplyStyle,
    };
  }, [isViewer, onSwipeableWillOpen, onPassThreshold]);

  const iconPosition = isViewer ? { right: 0 } : { left: 0 };
  const { messageBoxStyle, children } = props;
  const colors = useColors();
  const styles = useStyles(unboundStyles);
  return (
    <React.Fragment>
      <View style={[styles.icon, iconPosition]}>
        <Animated.View style={translateReplyStyle}>
          <View style={styles.iconBackground}>
            <FontAwesomeIcon
              name="reply"
              color={colors.blockQuoteBorder}
              size={16}
            />
          </View>
        </Animated.View>
      </View>
      <PanGestureHandler
        maxPointers={1}
        minDist={10}
        onGestureEvent={swipeEvent}
        onHandlerStateChange={swipeEvent}
        failOffsetX={isViewer ? 5 : -5}
        failOffsetY={[-5, 5]}
      >
        <Animated.View style={[messageBoxStyle, transformMessageBoxStyle]}>
          {children}
        </Animated.View>
      </PanGestureHandler>
    </React.Fragment>
  );
}

const unboundStyles = {
  icon: {
    justifyContent: 'center',
    position: 'absolute',
  },
  iconBackground: {
    alignItems: 'center',
    backgroundColor: 'listChatBubble',
    borderRadius: 30,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
};

export default SwipeableMessage;
