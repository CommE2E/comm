// @flow

import * as React from 'react';
import { View, Text, TouchableWithoutFeedback } from 'react-native';
import EmojiPicker from 'rn-emoji-keyboard';

import { savedEmojiAvatarSelectorForCurrentUser } from 'lib/selectors/user-selectors.js';
import type { ClientEmojiAvatar } from 'lib/types/avatar-types.js';

import Avatar from '../components/avatar.react.js';
import Button from '../components/button.react.js';
import ColorRows from '../components/color-rows.react.js';
import { useSelector } from '../redux/redux-utils.js';
import { useStyles } from '../themes/colors.js';

function EmojiAvatarCreation(): React.Node {
  const savedEmojiAvatarFunc = useSelector(
    savedEmojiAvatarSelectorForCurrentUser,
  );
  const savedEmojiAvatar = savedEmojiAvatarFunc();

  const [pendingEmoji, setPendingEmoji] = React.useState<string>(
    savedEmojiAvatar.emoji,
  );
  const [pendingColor, setPendingColor] = React.useState<string>(
    savedEmojiAvatar.color,
  );
  const [emojiKeyboardOpen, setEmojiKeyboardOpen] =
    React.useState<boolean>(false);

  const styles = useStyles(unboundStyles);

  const onPressEditEmoji = React.useCallback(() => {
    setEmojiKeyboardOpen(true);
  }, []);

  const onPressSetAvatar = React.useCallback(() => {
    // TODO: handle saving avatar
  }, []);

  const onPressReset = React.useCallback(() => {
    setPendingEmoji(savedEmojiAvatar.emoji);
    setPendingColor(savedEmojiAvatar.color);
  }, [savedEmojiAvatar.color, savedEmojiAvatar.emoji]);

  const onEmojiSelected = React.useCallback(emoji => {
    setPendingEmoji(emoji.emoji);
  }, []);

  const onEmojiKeyboardClose = React.useCallback(
    () => setEmojiKeyboardOpen(false),
    [],
  );

  const stagedAvatarInfo: ClientEmojiAvatar = React.useMemo(
    () => ({
      type: 'emoji',
      emoji: pendingEmoji,
      color: pendingColor,
    }),
    [pendingColor, pendingEmoji],
  );

  return (
    <View style={styles.container}>
      <View style={styles.emojiAvatarCreationContainer}>
        <View style={styles.stagedAvatarSection}>
          <TouchableWithoutFeedback onPress={onPressEditEmoji}>
            <View>
              <Avatar size="profile" avatarInfo={stagedAvatarInfo} />
              <Text style={styles.editEmojiText}>Edit Emoji</Text>
            </View>
          </TouchableWithoutFeedback>
        </View>
        <View style={styles.colorRowsSection}>
          <ColorRows
            pendingColor={pendingColor}
            setPendingColor={setPendingColor}
            outerRingSelectedColorStyle={styles.selectedColorOuterRing}
          />
        </View>
      </View>
      <View style={styles.buttonsContainer}>
        <Button onPress={onPressSetAvatar} style={styles.saveButton}>
          <Text style={styles.saveButtonText}>Save Avatar</Text>
        </Button>
        <Button onPress={onPressReset} style={styles.resetButton}>
          <Text style={styles.resetButtonText}>Reset</Text>
        </Button>
      </View>
      <EmojiPicker
        onEmojiSelected={onEmojiSelected}
        open={emojiKeyboardOpen}
        onClose={onEmojiKeyboardClose}
      />
    </View>
  );
}

const unboundStyles = {
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  emojiAvatarCreationContainer: {
    paddingTop: 16,
  },
  stagedAvatarSection: {
    backgroundColor: 'panelForeground',
    paddingVertical: 24,
    alignItems: 'center',
  },
  editEmojiText: {
    color: 'purpleLink',
    marginTop: 16,
    fontWeight: '500',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  colorRowsSection: {
    paddingVertical: 24,
    marginTop: 24,
    backgroundColor: 'panelForeground',
    alignItems: 'center',
  },
  selectedColorOuterRing: {
    backgroundColor: 'modalSubtext',
  },
  buttonsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  saveButton: {
    backgroundColor: 'purpleButton',
    paddingVertical: 12,
    borderRadius: 8,
  },
  saveButtonText: {
    color: 'whiteText',
    textAlign: 'center',
    fontWeight: '500',
    fontSize: 16,
    lineHeight: 24,
  },
  resetButton: {
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    alignSelf: 'center',
  },
  resetButtonText: {
    color: 'redText',
    textAlign: 'center',
    fontWeight: '500',
    fontSize: 16,
    lineHeight: 24,
  },
  loadingContainer: {
    position: 'absolute',
    backgroundColor: 'black',
    width: 112,
    height: 112,
    borderRadius: 56,
    opacity: 0.6,
    justifyContent: 'center',
  },
};

export default EmojiAvatarCreation;
