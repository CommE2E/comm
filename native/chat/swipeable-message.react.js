// @flow

import type { IconProps } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as React from 'react';
import { View } from 'react-native';
import {
  PanGestureHandler,
  type PanGestureEvent,
} from 'react-native-gesture-handler';
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
  type WithSpringConfig,
} from 'react-native-reanimated';
import tinycolor from 'tinycolor2';

import { useMessageListScreenWidth } from './composed-message-width.js';
import CommIcon from '../components/comm-icon.react.js';
import { colors } from '../themes/colors.js';
import type { ViewStyle } from '../types/styles.js';

const primaryThreshold = 40;
const secondaryThreshold = 120;

const panGestureHandlerActiveOffsetX = [-4, 4];
const panGestureHandlerFailOffsetY = [-5, 5];

function dividePastDistance(
  value: number,
  distance: number,
  factor: number,
): number {
  'worklet';
  const absValue = Math.abs(value);
  if (absValue < distance) {
    return value;
  }
  const absFactor = value >= 0 ? 1 : -1;
  return absFactor * (distance + (absValue - distance) / factor);
}

function makeSpringConfig(velocity: number): WithSpringConfig {
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

function interpolateOpacityForViewerPrimarySnake(translateX: number): number {
  'worklet';
  return interpolate(translateX, [-20, -5], [1, 0], Extrapolate.CLAMP);
}

function interpolateOpacityForNonViewerPrimarySnake(
  translateX: number,
): number {
  'worklet';
  return interpolate(translateX, [5, 20], [0, 1], Extrapolate.CLAMP);
}

function interpolateTranslateXForViewerSecondarySnake(
  translateX: number,
): number {
  'worklet';
  return interpolate(translateX, [-130, -120, -60, 0], [-130, -120, -5, 20]);
}

function interpolateTranslateXForNonViewerSecondarySnake(
  translateX: number,
): number {
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

  const swipeSnake = React.useMemo(
    () => (
      <View style={animationContainerStyle}>
        <Animated.View style={swipeSnakeContainerStyle}>
          <View style={swipeSnakeStyle}>{coloredIcon}</View>
        </Animated.View>
      </View>
    ),
    [
      animationContainerStyle,
      coloredIcon,
      swipeSnakeContainerStyle,
      swipeSnakeStyle,
    ],
  );

  return swipeSnake;
}

type Props = {
  +triggerReply?: () => mixed,
  +triggerSidebar?: () => mixed,
  +isViewer: boolean,
  +contentStyle: ViewStyle,
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
  const swipeEvent = useAnimatedGestureHandler<PanGestureEvent>(
    {
      onStart: (event: PanGestureEvent, ctx: { [string]: mixed }) => {
        ctx.translationAtStart = translateX.value;
        cancelAnimation(translateX);
      },

      onActive: (event: PanGestureEvent, ctx: { [string]: mixed }) => {
        const { translationAtStart } = ctx;
        if (typeof translationAtStart !== 'number') {
          throw new Error('translationAtStart should be number');
        }
        const translationX = translationAtStart + event.translationX;
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

      onEnd: (event: PanGestureEvent) => {
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

  const transformContentStyle = useAnimatedStyle(
    () => ({
      transform: [{ translateX: translateX.value }],
    }),
    [],
  );

  const { contentStyle, children } = props;

  const panGestureHandlerStyle = React.useMemo(
    () => [contentStyle, transformContentStyle],
    [contentStyle, transformContentStyle],
  );

  const threadColor = `#${props.threadColor}`;
  const tinyThreadColor = tinycolor(threadColor);

  const replyIcon = React.useMemo(
    () => <CommIcon name="reply-filled" size={14} />,
    [],
  );
  const replySwipeSnake = React.useMemo(
    () => (
      <SwipeSnake
        isViewer={isViewer}
        translateX={translateX}
        color={threadColor}
        opacityInterpolator={
          isViewer
            ? interpolateOpacityForViewerPrimarySnake
            : interpolateOpacityForNonViewerPrimarySnake
        }
        key="reply"
      >
        {replyIcon}
      </SwipeSnake>
    ),
    [isViewer, replyIcon, threadColor, translateX],
  );

  const sidebarIcon = React.useMemo(
    () => <CommIcon name="sidebar-filled" size={16} />,
    [],
  );
  const sidebarSwipeSnakeWithReplySwipeSnake = React.useMemo(
    () => (
      <SwipeSnake
        isViewer={isViewer}
        translateX={translateX}
        color={tinyThreadColor
          .darken(tinyThreadColor.isDark() ? 10 : 20)
          .toString()}
        translateXInterpolator={
          isViewer
            ? interpolateTranslateXForViewerSecondarySnake
            : interpolateTranslateXForNonViewerSecondarySnake
        }
        key="sidebar"
      >
        {sidebarIcon}
      </SwipeSnake>
    ),
    [isViewer, sidebarIcon, tinyThreadColor, translateX],
  );

  const sidebarSwipeSnakeWithoutReplySwipeSnake = React.useMemo(
    () => (
      <SwipeSnake
        isViewer={isViewer}
        translateX={translateX}
        color={threadColor}
        opacityInterpolator={
          isViewer
            ? interpolateOpacityForViewerPrimarySnake
            : interpolateOpacityForNonViewerPrimarySnake
        }
        key="sidebar"
      >
        {sidebarIcon}
      </SwipeSnake>
    ),
    [isViewer, sidebarIcon, threadColor, translateX],
  );

  const panGestureHandler = React.useMemo(
    () => (
      <PanGestureHandler
        maxPointers={1}
        activeOffsetX={panGestureHandlerActiveOffsetX}
        onGestureEvent={swipeEvent}
        failOffsetX={isViewer ? 5 : -5}
        failOffsetY={panGestureHandlerFailOffsetY}
        key="gesture"
      >
        <Animated.View style={panGestureHandlerStyle}>{children}</Animated.View>
      </PanGestureHandler>
    ),
    [children, isViewer, panGestureHandlerStyle, swipeEvent],
  );

  const swipeableMessage = React.useMemo(() => {
    if (!triggerReply && !triggerSidebar) {
      return (
        <PanGestureHandler enabled={false}>
          <Animated.View style={contentStyle}>{children}</Animated.View>
        </PanGestureHandler>
      );
    }
    const snakes: Array<React.Node> = [];
    if (triggerReply) {
      snakes.push(replySwipeSnake);
    }
    if (triggerReply && triggerSidebar) {
      snakes.push(sidebarSwipeSnakeWithReplySwipeSnake);
    } else if (triggerSidebar) {
      snakes.push(sidebarSwipeSnakeWithoutReplySwipeSnake);
    }
    snakes.push(panGestureHandler);
    return snakes;
  }, [
    children,
    contentStyle,
    panGestureHandler,
    replySwipeSnake,
    sidebarSwipeSnakeWithReplySwipeSnake,
    sidebarSwipeSnakeWithoutReplySwipeSnake,
    triggerReply,
    triggerSidebar,
  ]);

  return swipeableMessage;
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
