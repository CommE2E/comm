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

import { colorIsDark } from 'lib/shared/thread-utils';

import { colors } from '../themes/colors';
import type { ViewStyle } from '../types/styles';
import { dividePastDistance } from '../utils/animation-utils';
import { useMessageListScreenWidth } from './composed-message-width';

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
  +threadColor: string,
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
  const swipeEvent = useAnimatedGestureHandler(
    {
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
    },
    [isViewer, onSwipeableWillOpen],
  );

  const animationPosition = isViewer ? styles.right0 : styles.left0;
  const animationContainerStyle = React.useMemo(() => {
    return [styles.animationContainer, animationPosition];
  }, [animationPosition]);

  const transformSwipeSnakeStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      isViewer ? [-20, -5] : [5, 20],
      isViewer ? [1, 0] : [0, 1],
      Extrapolate.CLAMP,
    );
    return {
      transform: [
        {
          translateX: translateX.value,
        },
      ],
      opacity,
    };
  }, [isViewer]);

  const iconPosition = isViewer ? styles.left0 : styles.right0;
  const swipeSnakeContainerStyle = React.useMemo(() => {
    return [styles.swipeSnakeContainer, transformSwipeSnakeStyle, iconPosition];
  }, [transformSwipeSnakeStyle, iconPosition]);

  const transformMessageBoxStyle = useAnimatedStyle(
    () => ({
      transform: [{ translateX: translateX.value }],
    }),
    [],
  );

  const iconAlign = isViewer ? styles.alignStart : styles.alignEnd;
  const screenWidth = useMessageListScreenWidth();
  const { threadColor } = props;
  const swipeSnakeStyle = React.useMemo(() => {
    return [
      styles.swipeSnake,
      iconAlign,
      {
        width: screenWidth,
        backgroundColor: `#${threadColor}`,
      },
    ];
  }, [iconAlign, screenWidth, threadColor]);

  const iconColor = colorIsDark(threadColor)
    ? colors.dark.listForegroundLabel
    : colors.light.listForegroundLabel;

  const { messageBoxStyle, children } = props;
  const reactNavGestureHandlerRef = React.useContext(GestureHandlerRefContext);
  const waitFor = reactNavGestureHandlerRef ?? undefined;
  return (
    <>
      <View style={animationContainerStyle}>
        <Animated.View style={swipeSnakeContainerStyle}>
          <View style={swipeSnakeStyle}>
            <FontAwesomeIcon name="reply" color={iconColor} size={16} />
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

const styles = {
  swipeSnakeContainer: {
    marginHorizontal: 20,
    justifyContent: 'center',
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
  animationContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
  swipeSnake: {
    paddingHorizontal: 15,
    flex: 1,
    borderRadius: 25,
    height: 30,
    justifyContent: 'center',
    maxHeight: 50,
  },
  left0: {
    left: 0,
  },
  right0: {
    right: 0,
  },
  alignStart: {
    alignItems: 'flex-start',
  },
  alignEnd: {
    alignItems: 'flex-end',
  },
};

export default SwipeableMessage;
