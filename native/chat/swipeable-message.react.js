// @flow

import type { IconProps } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as React from 'react';
import { View } from 'react-native';
import { PanGestureHandler } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedGestureHandler,
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
  withSpring,
  interpolate,
  cancelAnimation,
  Extrapolate,
  type SharedValue,
} from 'react-native-reanimated';
import tinycolor from 'tinycolor2';

import { useMessageListScreenWidth } from './composed-message-width.js';
import CommIcon from '../components/comm-icon.react.js';
import { colors } from '../themes/colors.js';
import type { ViewStyle } from '../types/styles.js';

const primaryThreshold = 40;
const secondaryThreshold = 120;

function dividePastDistance(value, distance, factor) {
  'worklet';
  const absValue = Math.abs(value);
  if (absValue < distance) {
    return value;
  }
  const absFactor = value >= 0 ? 1 : -1;
  return absFactor * (distance + (absValue - distance) / factor);
}

function makeSpringConfig(velocity) {
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

function interpolateOpacityForViewerPrimarySnake(translateX) {
  'worklet';
  return interpolate(translateX, [-20, -5], [1, 0], Extrapolate.CLAMP);
}
function interpolateOpacityForNonViewerPrimarySnake(translateX) {
  'worklet';
  return interpolate(translateX, [5, 20], [0, 1], Extrapolate.CLAMP);
}
function interpolateTranslateXForViewerSecondarySnake(translateX) {
  'worklet';
  return interpolate(translateX, [-130, -120, -60, 0], [-130, -120, -5, 20]);
}
function interpolateTranslateXForNonViewerSecondarySnake(translateX) {
  'worklet';
  return interpolate(translateX, [0, 80, 120, 130], [0, 30, 120, 130]);
}

type SwipeSnakeProps<IconGlyphs: string> = {
  +isViewer: boolean,
  +translateX: SharedValue<number>,
  +color: string,
  +children: React.Element<React.ComponentType<IconProps<IconGlyphs>>>,
  +opacityInterpolator?: number => number, // must be worklet
  +translateXInterpolator?: number => number, // must be worklet
};
function SwipeSnake<IconGlyphs: string>(
  props: SwipeSnakeProps<IconGlyphs>,
): React.Node {
  const { translateX, isViewer, opacityInterpolator, translateXInterpolator } =
    props;
  const transformStyle = useAnimatedStyle(() => {
    const opacity = opacityInterpolator
      ? opacityInterpolator(translateX.value)
      : undefined;
    const translate = translateXInterpolator
      ? translateXInterpolator(translateX.value)
      : translateX.value;
    return {
      transform: [
        {
          translateX: translate,
        },
      ],
      opacity,
    };
  }, [isViewer, translateXInterpolator, opacityInterpolator]);

  const animationPosition = isViewer ? styles.right0 : styles.left0;
  const animationContainerStyle = React.useMemo(() => {
    return [styles.animationContainer, animationPosition];
  }, [animationPosition]);

  const iconPosition = isViewer ? styles.left0 : styles.right0;
  const swipeSnakeContainerStyle = React.useMemo(() => {
    return [styles.swipeSnakeContainer, transformStyle, iconPosition];
  }, [transformStyle, iconPosition]);

  const iconAlign = isViewer ? styles.alignStart : styles.alignEnd;
  const screenWidth = useMessageListScreenWidth();
  const { color } = props;
  const swipeSnakeStyle = React.useMemo(() => {
    return [
      styles.swipeSnake,
      iconAlign,
      {
        width: screenWidth,
        backgroundColor: color,
      },
    ];
  }, [iconAlign, screenWidth, color]);

  const { children } = props;
  const iconColor = tinycolor(color).isDark()
    ? colors.dark.listForegroundLabel
    : colors.light.listForegroundLabel;
  const coloredIcon = React.useMemo(
    () =>
      React.cloneElement(children, {
        color: iconColor,
      }),
    [children, iconColor],
  );

  return (
    <View style={animationContainerStyle}>
      <Animated.View style={swipeSnakeContainerStyle}>
        <View style={swipeSnakeStyle}>{coloredIcon}</View>
      </Animated.View>
    </View>
  );
}

type Props = {
  +triggerReply?: () => mixed,
  +triggerSidebar?: () => mixed,
  +isViewer: boolean,
  +messageBoxStyle: ViewStyle,
  +threadColor: string,
  +children: React.Node,
};
function SwipeableMessage(props: Props): React.Node {
  const { isViewer, triggerReply, triggerSidebar } = props;
  const secondaryActionExists = triggerReply && triggerSidebar;

  const onPassPrimaryThreshold = React.useCallback(() => {
    const impactStrength = secondaryActionExists
      ? Haptics.ImpactFeedbackStyle.Medium
      : Haptics.ImpactFeedbackStyle.Heavy;
    Haptics.impactAsync(impactStrength);
  }, [secondaryActionExists]);
  const onPassSecondaryThreshold = React.useCallback(() => {
    if (secondaryActionExists) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
  }, [secondaryActionExists]);

  const primaryAction = React.useCallback(() => {
    if (triggerReply) {
      triggerReply();
    } else if (triggerSidebar) {
      triggerSidebar();
    }
  }, [triggerReply, triggerSidebar]);
  const secondaryAction = React.useCallback(() => {
    if (triggerReply && triggerSidebar) {
      triggerSidebar();
    }
  }, [triggerReply, triggerSidebar]);

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
          primaryThreshold,
          2,
        );

        const absValue = Math.abs(translateX.value);
        const pastPrimaryThreshold = absValue >= primaryThreshold;
        if (pastPrimaryThreshold && !ctx.prevPastPrimaryThreshold) {
          runOnJS(onPassPrimaryThreshold)();
        }
        ctx.prevPastPrimaryThreshold = pastPrimaryThreshold;

        const pastSecondaryThreshold = absValue >= secondaryThreshold;
        if (pastSecondaryThreshold && !ctx.prevPastSecondaryThreshold) {
          runOnJS(onPassSecondaryThreshold)();
        }
        ctx.prevPastSecondaryThreshold = pastSecondaryThreshold;
      },
      onEnd: event => {
        const absValue = Math.abs(translateX.value);
        if (absValue >= secondaryThreshold && secondaryActionExists) {
          runOnJS(secondaryAction)();
        } else if (absValue >= primaryThreshold) {
          runOnJS(primaryAction)();
        }

        translateX.value = withSpring(0, makeSpringConfig(event.velocityX));
      },
    },
    [
      isViewer,
      onPassPrimaryThreshold,
      onPassSecondaryThreshold,
      primaryAction,
      secondaryAction,
      secondaryActionExists,
    ],
  );

  const transformMessageBoxStyle = useAnimatedStyle(
    () => ({
      transform: [{ translateX: translateX.value }],
    }),
    [],
  );

  const { messageBoxStyle, children } = props;

  if (!triggerReply && !triggerSidebar) {
    return (
      <PanGestureHandler enabled={false}>
        <Animated.View style={messageBoxStyle}>{children}</Animated.View>
      </PanGestureHandler>
    );
  }

  const threadColor = `#${props.threadColor}`;
  const tinyThreadColor = tinycolor(threadColor);

  const snakes = [];
  if (triggerReply) {
    const replySnakeOpacityInterpolator = isViewer
      ? interpolateOpacityForViewerPrimarySnake
      : interpolateOpacityForNonViewerPrimarySnake;
    snakes.push(
      <SwipeSnake
        isViewer={isViewer}
        translateX={translateX}
        color={threadColor}
        opacityInterpolator={replySnakeOpacityInterpolator}
        key="reply"
      >
        <CommIcon name="reply-filled" size={14} />
      </SwipeSnake>,
    );
  }
  if (triggerReply && triggerSidebar) {
    const sidebarSnakeTranslateXInterpolator = isViewer
      ? interpolateTranslateXForViewerSecondarySnake
      : interpolateTranslateXForNonViewerSecondarySnake;
    const darkerThreadColor = tinyThreadColor
      .darken(tinyThreadColor.isDark() ? 10 : 20)
      .toString();
    snakes.push(
      <SwipeSnake
        isViewer={isViewer}
        translateX={translateX}
        color={darkerThreadColor}
        translateXInterpolator={sidebarSnakeTranslateXInterpolator}
        key="sidebar"
      >
        <CommIcon name="sidebar-filled" size={16} />
      </SwipeSnake>,
    );
  } else if (triggerSidebar) {
    const sidebarSnakeOpacityInterpolator = isViewer
      ? interpolateOpacityForViewerPrimarySnake
      : interpolateOpacityForNonViewerPrimarySnake;
    snakes.push(
      <SwipeSnake
        isViewer={isViewer}
        translateX={translateX}
        color={threadColor}
        opacityInterpolator={sidebarSnakeOpacityInterpolator}
        key="sidebar"
      >
        <CommIcon name="sidebar-filled" size={16} />
      </SwipeSnake>,
    );
  }

  snakes.push(
    <PanGestureHandler
      maxPointers={1}
      activeOffsetX={[-4, 4]}
      onGestureEvent={swipeEvent}
      failOffsetX={isViewer ? 5 : -5}
      failOffsetY={[-5, 5]}
      key="gesture"
    >
      <Animated.View style={[messageBoxStyle, transformMessageBoxStyle]}>
        {children}
      </Animated.View>
    </PanGestureHandler>,
  );

  return snakes;
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
