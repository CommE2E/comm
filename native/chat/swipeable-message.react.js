// @flow

import { GestureHandlerRefContext } from '@react-navigation/stack';
import * as React from 'react';
import { View, Platform } from 'react-native';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { TapticFeedback } from 'react-native-in-app-message';
import Animated, {
  useAnimatedGestureHandler,
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
  withSpring,
  interpolate,
  cancelAnimation,
  Extrapolate,
} from 'react-native-reanimated';
import FontAwesomeIcon from 'react-native-vector-icons/FontAwesome';

import { useColors, useStyles } from '../themes/colors';
import type { ViewStyle } from '../types/styles';
import { dividePastDistance } from '../utils/animation-utils';

const threshold = 40;

function makeSpringConfig(velocity: number) {
  'worklet';
  return {
    stiffness: 257.1370588235294,
    damping: 19.003038357561845,
    mass: 1,
    overshootClamping: true,
    restDisplacementThreshold: 0.001,
    restSpeedThreshold: 0.001,
    velocity,
  };
}

type Props = {
  +onSwipeableWillOpen: () => void,
  +isViewer: boolean,
  +messageBoxStyle: ViewStyle,
  +children: React.Node,
};
function SwipeableMessage(props: Props): React.Node {
  const { isViewer, onSwipeableWillOpen } = props;
  const onPassThreshold = React.useCallback(() => {
    if (Platform.OS === 'ios') {
      TapticFeedback.impact();
    }
  }, []);

  const translateX = useSharedValue(0);
  const swipeEvent = useAnimatedGestureHandler({
    onStart: (event, ctx) => {
      ctx.translationAtStart = translateX.value;
      cancelAnimation(translateX.value);
    },
    onActive: (event, ctx) => {
      const translationX = ctx.translationAtStart + event.translationX;
      const baseActiveTranslation = isViewer
        ? Math.min(translationX, 0)
        : Math.max(translationX, 0);
      translateX.value = dividePastDistance(
        baseActiveTranslation,
        threshold,
        2,
      );

      const pastThreshold = Math.abs(translateX.value) >= threshold;
      if (pastThreshold && !ctx.prevPastThreshold) {
        runOnJS(onPassThreshold)();
      }
      ctx.prevPastThreshold = pastThreshold;
    },
    onEnd: event => {
      if (Math.abs(translateX.value) >= threshold) {
        runOnJS(onSwipeableWillOpen)();
      }

      translateX.value = withSpring(0, makeSpringConfig(event.velocityX));
    },
  });

  const transformMessageBoxStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const transformReplyStyle = useAnimatedStyle(() => {
    const translateReplyIcon = interpolate(
      translateX.value,
      isViewer ? [-1 * threshold, 0] : [0, threshold],
      isViewer ? [0, threshold] : [0 - threshold, 0],
      Extrapolate.CLAMP,
    );
    const replyIconOpacity = interpolate(
      translateX.value,
      isViewer ? [-1 * threshold, -25] : [25, threshold],
      isViewer ? [1, 0] : [0, 1],
      Extrapolate.CLAMP,
    );
    return {
      transform: [
        {
          translateX: translateReplyIcon,
        },
      ],
      opacity: replyIconOpacity,
    };
  });

  const iconPosition = isViewer ? { right: 0 } : { left: 0 };
  const { messageBoxStyle, children } = props;
  const colors = useColors();
  const styles = useStyles(unboundStyles);
  const reactNavGestureHandlerRef = React.useContext(GestureHandlerRefContext);
  const waitFor = reactNavGestureHandlerRef ?? undefined;
  return (
    <>
      <View style={[styles.icon, iconPosition]}>
        <Animated.View style={transformReplyStyle}>
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
        minDist={4}
        onGestureEvent={swipeEvent}
        failOffsetX={isViewer ? 5 : -5}
        failOffsetY={[-5, 5]}
        waitFor={waitFor}
      >
        <Animated.View style={[messageBoxStyle, transformMessageBoxStyle]}>
          {children}
        </Animated.View>
      </PanGestureHandler>
    </>
  );
}

const unboundStyles = {
  icon: {
    justifyContent: 'center',
    position: 'absolute',
    top: 0,
    bottom: 0,
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
