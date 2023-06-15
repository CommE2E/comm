// @flow

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as React from 'react';
import EmojiPicker, { useRecentPicksPersistence } from 'rn-emoji-keyboard';

const STORAGE_KEY = 'EMOJI_KEYBOARD_RECENT';

const categoryOrder = [
  'recently_used',
  'smileys_emotion',
  'people_body',
  'animals_nature',
  'food_drink',
  'travel_places',
  'activities',
  'objects',
  'symbols',
  'flags',
  'search',
];

export type EmojiSelection = {
  +emoji: string,
  +name: string,
  +slug: string,
  +unicode_version: string,
  +toneEnabled: string,
  +alreadySelected?: boolean,
};

type Props = {
  +onEmojiSelected: (emoji: EmojiSelection) => mixed,
  +emojiKeyboardOpen: boolean,
  +onEmojiKeyboardClose: () => mixed,
};

function EmojiKeyboard(props: Props): React.Node {
  const { onEmojiSelected, emojiKeyboardOpen, onEmojiKeyboardClose } = props;

  const initializationCallback = React.useCallback(async () => {
    const recentlyUsedEmojis = await AsyncStorage.getItem(STORAGE_KEY);
    return JSON.parse(recentlyUsedEmojis ?? '[]');
  }, []);

  const onStateChangeCallback = React.useCallback(
    async nextRecentlyUsedEmojis => {
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(nextRecentlyUsedEmojis),
      );
    },
    [],
  );

  useRecentPicksPersistence({
    initialization: initializationCallback,
    onStateChange: onStateChangeCallback,
  });

  return (
    <EmojiPicker
      onEmojiSelected={onEmojiSelected}
      open={emojiKeyboardOpen}
      onClose={onEmojiKeyboardClose}
      enableSearchBar
      enableSearchAnimation={false}
      enableRecentlyUsed
      categoryOrder={categoryOrder}
    />
  );
}

export default EmojiKeyboard;
