// @flow

import * as React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';

import type { SetState } from 'lib/types/hook-types';

import SWMansionIcon from '../components/swmansion-icon.react';
import { useStyles } from '../themes/colors';
import type { ViewStyle } from '../types/styles';

type ReactionSelectionPopoverProps = {
  +setHideTooltip: SetState<boolean>,
  +showEmojiKeyboard: SharedValue<boolean>,
  +reactionSelectionPopoverContainerStyle: ViewStyle,
  +sendReaction: (reaction: string) => mixed,
};

function ReactionSelectionPopover(
  props: ReactionSelectionPopoverProps,
): React.Node {
  const {
    setHideTooltip,
    showEmojiKeyboard,
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

  const onPressDefaultEmoji = React.useCallback(
    (emoji: string) => {
      sendReaction(emoji);
      setHideTooltip(true);
    },
    [sendReaction, setHideTooltip],
  );

  const onPressEmojiKeyboardButton = React.useCallback(() => {
    showEmojiKeyboard.value = true;
    setHideTooltip(true);
  }, [setHideTooltip, showEmojiKeyboard]);

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
