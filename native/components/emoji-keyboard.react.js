// @flow

import AsyncStorage from '@react-native-async-storage/async-storage';
import _flatMap from 'lodash/fp/flatMap.js';
import _flow from 'lodash/fp/flow.js';
import _keyBy from 'lodash/fp/keyBy.js';
import * as React from 'react';
import EmojiPicker, { useRecentPicksPersistence } from 'rn-emoji-keyboard';
import emojisData from 'rn-emoji-keyboard/src/assets/emojis.json';

import { useColors } from '../themes/colors.js';

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

const initializationCallback = async () => {
  const recentlyUsedEmojis = await AsyncStorage.getItem(STORAGE_KEY);
  return JSON.parse(recentlyUsedEmojis ?? '[]');
};

const onStateChangeCallback = async nextRecentlyUsedEmojis => {
  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(nextRecentlyUsedEmojis),
  );
};

const useRecentPicksPersistenceArgs = {
  initialization: initializationCallback,
  onStateChange: onStateChangeCallback,
};
const keyedEmojiData = _flow(_flatMap('data'), _keyBy('emoji'))(emojisData);

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
  +selectMultipleEmojis?: boolean,
  +alreadySelectedEmojis: $ReadOnlyArray<string>,
};

function EmojiKeyboard(props: Props): React.Node {
  const {
    onEmojiSelected,
    emojiKeyboardOpen,
    onEmojiKeyboardClose,
    selectMultipleEmojis,
    alreadySelectedEmojis,
  } = props;

  const [currentlySelected, setCurrentlySelected] = React.useState<
    $ReadOnlyArray<string>,
  >(() => alreadySelectedEmojis.map(emoji => keyedEmojiData[emoji].name));

  const handleOnEmojiSelected = React.useCallback(
    (emoji: EmojiSelection) => {
      if (!selectMultipleEmojis) {
        setCurrentlySelected([emoji.name]);
      } else if (emoji.alreadySelected) {
        setCurrentlySelected(prev =>
          prev.filter(emojiName => emojiName !== emoji.name),
        );
      } else {
        setCurrentlySelected(prev => [...prev, emoji.name]);
      }
      onEmojiSelected(emoji);
    },
    [onEmojiSelected, setCurrentlySelected, selectMultipleEmojis],
  );

  useRecentPicksPersistence(useRecentPicksPersistenceArgs);

  const colors = useColors();

  const theme = React.useMemo(
    () => ({
      knob: colors.emojiKeyboardKnob,
      container: colors.modalForeground,
      header: colors.modalBackgroundLabel,
      category: {
        icon: colors.emojiKeyboardCategoryIcon,
        iconActive: colors.panelForegroundLabel,
        container: colors.panelInputBackground,
        containerActive: colors.emojiKeyboardContainerActive,
      },
      search: {
        text: colors.panelForegroundLabel,
        placeholder: colors.panelInputSecondaryForeground,
        icon: colors.panelInputSecondaryForeground,
        background: colors.panelInputBackground,
      },
      emoji: {
        selected: colors.panelSecondaryForegroundBorder,
      },
    }),
    [
      colors.emojiKeyboardCategoryIcon,
      colors.emojiKeyboardKnob,
      colors.emojiKeyboardContainerActive,
      colors.modalBackgroundLabel,
      colors.modalForeground,
      colors.panelForegroundLabel,
      colors.panelInputBackground,
      colors.panelInputSecondaryForeground,
      colors.panelSecondaryForegroundBorder,
    ],
  );

  return (
    <EmojiPicker
      onEmojiSelected={handleOnEmojiSelected}
      open={emojiKeyboardOpen}
      onClose={onEmojiKeyboardClose}
      enableSearchBar
      enableSearchAnimation={false}
      enableRecentlyUsed
      categoryOrder={categoryOrder}
      selectedEmojis={currentlySelected}
      theme={theme}
      styles={emojiKeyboardStyles}
    />
  );
}

const emojiKeyboardStyles = {
  searchBar: {
    container: {
      borderWidth: 0,
      borderRadius: 8,
    },
  },
};

export default EmojiKeyboard;
