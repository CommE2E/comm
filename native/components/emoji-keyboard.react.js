// @flow

import * as React from 'react';
import EmojiPicker from 'rn-emoji-keyboard';

type Props = {
  +onEmojiSelected: (emoji: { emoji: string, ... }) => mixed,
  +emojiKeyboardOpen: boolean,
  +onEmojiKeyboardClose: () => mixed,
};

function EmojiKeyboard(props: Props): React.Node {
  const { onEmojiSelected, emojiKeyboardOpen, onEmojiKeyboardClose } = props;

  return (
    <EmojiPicker
      onEmojiSelected={onEmojiSelected}
      open={emojiKeyboardOpen}
      onClose={onEmojiKeyboardClose}
    />
  );
}

export default EmojiKeyboard;
