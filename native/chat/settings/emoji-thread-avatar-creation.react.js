// @flow

import * as React from 'react';
import {
  View,
  Text,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from 'react-native';
import EmojiPicker from 'rn-emoji-keyboard';

import { changeThreadSettingsActionTypes } from 'lib/actions/thread-actions.js';
import { updateUserAvatarActionTypes } from 'lib/actions/user-actions.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import { savedEmojiAvatarSelectorForThread } from 'lib/selectors/thread-selectors.js';
import { savedEmojiAvatarSelectorForCurrentUser } from 'lib/selectors/user-selectors.js';
import type { ClientEmojiAvatar } from 'lib/types/avatar-types.js';

import Avatar from '../../avatars/avatar.react.js';
import type { ChatNavigationProp } from '../../chat/chat.react.js';
import Button from '../../components/button.react.js';
import ColorRows from '../../components/color-rows.react.js';
import type { NavigationRoute } from '../../navigation/route-names.js';
import { useSelector } from '../../redux/redux-utils.js';
import { useStyles } from '../../themes/colors.js';
import {
  useSaveUserAvatar,
  useSaveThreadAvatar,
} from '../../utils/avatar-utils.js';

const userAvatarLoadingStatusSelector = createLoadingStatusSelector(
  updateUserAvatarActionTypes,
);

const threadAvatarLoadingStatusSelector = createLoadingStatusSelector(
  changeThreadSettingsActionTypes,
  `${changeThreadSettingsActionTypes.started}:avatar`,
);

export type EmojiThreadAvatarCreationParams = {
  +threadID?: string,
  +containingThreadID?: ?string,
};

type Props = {
  +navigation: ChatNavigationProp<'EmojiThreadAvatarCreation'>,
  +route: NavigationRoute<'EmojiThreadAvatarCreation'>,
};

function EmojiThreadAvatarCreation(props: Props): React.Node {
  const { threadID, containingThreadID } = props.route.params;

  const selector = threadID
    ? savedEmojiAvatarSelectorForThread(threadID, containingThreadID)
    : savedEmojiAvatarSelectorForCurrentUser;

  const savedEmojiAvatarFunc = useSelector(selector);

  const [pendingEmoji, setPendingEmoji] = React.useState<string>(
    () => savedEmojiAvatarFunc().emoji,
  );
  const [pendingColor, setPendingColor] = React.useState<string>(
    () => savedEmojiAvatarFunc().color,
  );
  const [emojiKeyboardOpen, setEmojiKeyboardOpen] =
    React.useState<boolean>(false);

  const styles = useStyles(unboundStyles);

  const saveUserAvatar = useSaveUserAvatar();
  const saveThreadAvatar = useSaveThreadAvatar();

  const saveUserAvatarCallLoading = useSelector(
    state => userAvatarLoadingStatusSelector(state) === 'loading',
  );
  const saveThreadAvatarCallLoading = useSelector(
    state => threadAvatarLoadingStatusSelector(state) === 'loading',
  );

  const onPressEditEmoji = React.useCallback(() => {
    setEmojiKeyboardOpen(true);
  }, []);

  const onPressSetAvatar = React.useCallback(() => {
    const newEmojiAvatarRequest = {
      type: 'emoji',
      emoji: pendingEmoji,
      color: pendingColor,
    };

    if (!threadID) {
      saveUserAvatar(newEmojiAvatarRequest);
    } else {
      saveThreadAvatar(newEmojiAvatarRequest, threadID);
    }
  }, [pendingColor, pendingEmoji, saveThreadAvatar, saveUserAvatar, threadID]);

  const onPressReset = React.useCallback(() => {
    const resetEmojiAvatar = savedEmojiAvatarFunc();

    setPendingEmoji(resetEmojiAvatar.emoji);
    setPendingColor(resetEmojiAvatar.color);
  }, [savedEmojiAvatarFunc]);

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

  const loadingContainer = React.useMemo(() => {
    if (!saveUserAvatarCallLoading && !saveThreadAvatarCallLoading) {
      return null;
    }

    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="white" />
      </View>
    );
  }, [
    saveThreadAvatarCallLoading,
    saveUserAvatarCallLoading,
    styles.loadingContainer,
  ]);

  return (
    <View style={styles.container}>
      <View style={styles.emojiAvatarCreationContainer}>
        <View style={styles.stagedAvatarSection}>
          <TouchableWithoutFeedback onPress={onPressEditEmoji}>
            <View>
              <View>
                <Avatar size="profile" avatarInfo={stagedAvatarInfo} />
                {loadingContainer}
              </View>
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
        <Button
          onPress={onPressSetAvatar}
          style={styles.saveButton}
          disabled={saveUserAvatarCallLoading || saveThreadAvatarCallLoading}
        >
          <Text style={styles.saveButtonText}>Save Avatar</Text>
        </Button>
        <Button
          onPress={onPressReset}
          style={styles.resetButton}
          disabled={saveUserAvatarCallLoading || saveThreadAvatarCallLoading}
        >
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

export default EmojiThreadAvatarCreation;
