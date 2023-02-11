// @flow

import * as React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';

import SWMansionIcon from '../components/swmansion-icon.react.js';
import type { AppNavigationProp } from '../navigation/app-navigator.react.js';
import type { TooltipModalParamList } from '../navigation/route-names.js';
import { useStyles } from '../themes/colors.js';
import { useTooltipActions } from '../tooltip/tooltip-hooks.js';
import type { TooltipRoute } from '../tooltip/tooltip.react.js';
import type { ViewStyle } from '../types/styles.js';

type Props<RouteName: $Keys<TooltipModalParamList>> = {
  +navigation: AppNavigationProp<RouteName>,
  +route: TooltipRoute<RouteName>,
  +openEmojiPicker: () => mixed,
  +reactionSelectionPopoverContainerStyle: ViewStyle,
  +sendReaction: (reaction: string) => mixed,
};

function ReactionSelectionPopover<RouteName: $Keys<TooltipModalParamList>>(
  props: Props<RouteName>,
): React.Node {
  const {
    navigation,
    route,
    openEmojiPicker,
    reactionSelectionPopoverContainerStyle,
    sendReaction,
  } = props;

  const styles = useStyles(unboundStyles);

  const containerStyle = React.useMemo(
    () => [
      styles.reactionSelectionPopoverContainer,
      reactionSelectionPopoverContainerStyle,
    ],
    [
      reactionSelectionPopoverContainerStyle,
      styles.reactionSelectionPopoverContainer,
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
    <View style={containerStyle}>
      {defaultEmojis}
      <TouchableOpacity onPress={onPressEmojiKeyboardButton}>
        <View style={styles.emojiKeyboardButtonContainer}>
          <SWMansionIcon name="plus" style={styles.icon} size={18} />
        </View>
      </TouchableOpacity>
    </View>
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
