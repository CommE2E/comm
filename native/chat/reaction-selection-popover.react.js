// @flow

import invariant from 'invariant';
import * as React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import {
  useAnimatedStyle,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';

import {
  useReactionSelectionPopoverPosition,
  getCalculatedMargin,
  reactionSelectionPopoverDimensions,
} from './reaction-message-utils.js';
import SWMansionIcon from '../components/swmansion-icon.react.js';
import type { AppNavigationProp } from '../navigation/app-navigator.react.js';
import { OverlayContext } from '../navigation/overlay-context.js';
import type { TooltipModalParamList } from '../navigation/route-names.js';
import { useSelector } from '../redux/redux-utils.js';
import { useStyles } from '../themes/colors.js';
import { useTooltipActions } from '../tooltip/tooltip-hooks.js';
import type { TooltipRoute } from '../tooltip/tooltip.react.js';
import {
  AnimatedView,
  type WritableAnimatedStyleObj,
  type ReanimatedTransform,
} from '../types/styles.js';

type Props<RouteName: $Keys<TooltipModalParamList>> = {
  +navigation: AppNavigationProp<RouteName>,
  +route: TooltipRoute<RouteName>,
  +openEmojiPicker: () => mixed,
  +sendReaction: (reaction: string) => mixed,
};

function ReactionSelectionPopover<RouteName: $Keys<TooltipModalParamList>>(
  props: Props<RouteName>,
): React.Node {
  const { navigation, route, openEmojiPicker, sendReaction } = props;

  const { verticalBounds, initialCoordinates, margin } = route.params;
  const { containerStyle: popoverContainerStyle, popoverLocation } =
    useReactionSelectionPopoverPosition({
      initialCoordinates,
      verticalBounds,
      margin,
    });

  const overlayContext = React.useContext(OverlayContext);
  invariant(
    overlayContext,
    'ReactionSelectionPopover should have OverlayContext',
  );
  const { position } = overlayContext;
  invariant(position, 'position should be defined in ReactionSelectionPopover');

  const dimensions = useSelector(state => state.dimensions);

  const popoverHorizontalOffset = React.useMemo(() => {
    const { x, width } = initialCoordinates;

    const extraLeftSpace = x;
    const extraRightSpace = dimensions.width - width - x;

    const popoverWidth = reactionSelectionPopoverDimensions.width;
    if (extraLeftSpace < extraRightSpace) {
      const minWidth = width + 2 * extraLeftSpace;
      return (minWidth - popoverWidth) / 2;
    } else {
      const minWidth = width + 2 * extraRightSpace;
      return (popoverWidth - minWidth) / 2;
    }
  }, [initialCoordinates, dimensions]);

  const calculatedMargin = getCalculatedMargin(margin);
  const animationStyle = useAnimatedStyle(() => {
    const style: WritableAnimatedStyleObj = {};
    style.opacity = interpolate(
      position.value,
      [0, 0.1],
      [0, 1],
      Extrapolate.CLAMP,
    );
    const transform: Array<ReanimatedTransform> = [
      {
        scale: interpolate(
          position.value,
          [0.2, 0.8],
          [0, 1],
          Extrapolate.CLAMP,
        ),
      },
      {
        translateX: (1 - position.value) * popoverHorizontalOffset,
      },
    ];
    if (popoverLocation === 'above') {
      transform.push({
        translateY: interpolate(
          position.value,
          [0, 1],
          [calculatedMargin + reactionSelectionPopoverDimensions.height / 2, 0],
          Extrapolate.CLAMP,
        ),
      });
    } else {
      transform.push({
        translateY: interpolate(
          position.value,
          [0, 1],
          [
            -calculatedMargin - reactionSelectionPopoverDimensions.height / 2,
            0,
          ],
          Extrapolate.CLAMP,
        ),
      });
    }
    style.transform = transform;
    return style;
  }, [calculatedMargin, popoverLocation, popoverHorizontalOffset]);

  const styles = useStyles(unboundStyles);

  const containerStyle = React.useMemo(
    () => [
      {
        ...styles.reactionSelectionPopoverContainer,
        ...popoverContainerStyle,
      },
      animationStyle,
    ],
    [
      popoverContainerStyle,
      styles.reactionSelectionPopoverContainer,
      animationStyle,
    ],
  );

  const tooltipRouteKey = route.key;
  const { hideTooltip, dismissTooltip } = useTooltipActions(
    navigation,
    tooltipRouteKey,
  );

  const onPressDefaultEmoji = React.useCallback(
    (emoji: string) => {
      sendReaction(emoji);
      dismissTooltip();
    },
    [sendReaction, dismissTooltip],
  );

  const onPressEmojiKeyboardButton = React.useCallback(() => {
    openEmojiPicker();
    hideTooltip();
  }, [openEmojiPicker, hideTooltip]);

  const defaultEmojis = React.useMemo(() => {
    const defaultEmojisData = ['❤️', '😆', '😮', '😠', '👍'];

    return defaultEmojisData.map(emoji => (
      <TouchableOpacity key={emoji} onPress={() => onPressDefaultEmoji(emoji)}>
        <View style={styles.reactionSelectionItemContainer}>
          <Text style={styles.reactionSelectionItemEmoji}>{emoji}</Text>
        </View>
      </TouchableOpacity>
    ));
  }, [
    onPressDefaultEmoji,
    styles.reactionSelectionItemContainer,
    styles.reactionSelectionItemEmoji,
  ]);

  return (
    <AnimatedView style={containerStyle}>
      {defaultEmojis}
      <TouchableOpacity onPress={onPressEmojiKeyboardButton}>
        <View style={styles.emojiKeyboardButtonContainer}>
          <SWMansionIcon name="plus" style={styles.icon} size={18} />
        </View>
      </TouchableOpacity>
    </AnimatedView>
  );
}

const unboundStyles = {
  reactionSelectionPopoverContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'tooltipBackground',
    padding: 8,
    borderRadius: 8,
    flex: 1,
  },
  reactionSelectionItemContainer: {
    backgroundColor: 'reactionSelectionPopoverItemBackground',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
    borderRadius: 20,
    width: 40,
    height: 40,
    marginRight: 12,
  },
  reactionSelectionItemEmoji: {
    fontSize: 18,
  },
  emojiKeyboardButtonContainer: {
    backgroundColor: 'reactionSelectionPopoverItemBackground',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
    borderRadius: 20,
    width: 40,
    height: 40,
  },
  icon: {
    color: 'modalForegroundLabel',
  },
};

export default ReactionSelectionPopover;
