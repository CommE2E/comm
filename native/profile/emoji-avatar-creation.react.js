// @flow

import invariant from 'invariant';
import * as React from 'react';
import {
  View,
  Text,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Alert,
} from 'react-native';
import EmojiPicker from 'rn-emoji-keyboard';

import {
  updateUserAvatar,
  updateUserAvatarActionTypes,
} from 'lib/actions/user-actions.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import type {
  ClientEmojiAvatar,
  ClientAvatar,
} from 'lib/types/avatar-types.js';
import {
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils.js';

import type { ProfileNavigationProp } from './profile.react.js';
import Avatar from '../components/avatar.react.js';
import Button from '../components/button.react.js';
import ColorRows from '../components/color-rows.react.js';
import { displayActionResultModal } from '../navigation/action-result-modal.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { useSelector } from '../redux/redux-utils.js';
import { useStyles } from '../themes/colors.js';

export type EmojiAvatarCreationParams = {
  +emojiAvatarInfo: ClientEmojiAvatar,
};

type Props = {
  +navigation: ProfileNavigationProp<'EmojiAvatarCreation'>,
  +route: NavigationRoute<'EmojiAvatarCreation'>,
};

function EmojiAvatarCreation(props: Props): React.Node {
  const { emoji: initalEmoji, color: initialColor } =
    props.route.params.emojiAvatarInfo;

  const [disableButton, setDisableButton] = React.useState<boolean>(false);
  const [lastSavedAvater, setLastSavedAvatar] =
    React.useState<?ClientAvatar>(null);
  const [pendingEmoji, setPendingEmoji] = React.useState<string>(initalEmoji);
  const [pendingColor, setPendingColor] = React.useState<string>(initialColor);
  const [emojiKeyboardOpen, setEmojiKeyboardOpen] =
    React.useState<boolean>(false);

  const activeTheme = useSelector(state => state.globalThemeInfo.activeTheme);
  const outerRingSelectedColor = React.useMemo(
    () => (activeTheme === 'light' ? 'CCCCCC' : '404040'),
    [activeTheme],
  );

  const styles = useStyles(unboundStyles);

  const dispatchActionPromise = useDispatchActionPromise();
  const callUpdateUserAvatar = useServerCall(updateUserAvatar);
  const loadingStatusSelector = createLoadingStatusSelector(
    updateUserAvatarActionTypes,
  );
  const loadingStatus = useSelector(loadingStatusSelector);

  const onPressEditEmoji = React.useCallback(() => {
    setEmojiKeyboardOpen(true);
  }, []);

  const onPressSetAvatar = React.useCallback(() => {
    setDisableButton(true);
    const newEmojiAvatarRequest = {
      type: 'emoji',
      emoji: pendingEmoji,
      color: pendingColor,
    };

    const saveAvatarPromise = (async () => {
      try {
        const response = await callUpdateUserAvatar(newEmojiAvatarRequest);

        displayActionResultModal('Avatar updated');
        setLastSavedAvatar(response);
        setDisableButton(false);

        return response;
      } catch (e) {
        Alert.alert(
          'Couldn’t save avatar',
          'Please try again later',
          [{ text: 'OK' }],
          {
            cancelable: true,
          },
        );
        setDisableButton(false);
        throw e;
      }
    })();

    dispatchActionPromise(updateUserAvatarActionTypes, saveAvatarPromise);
  }, [callUpdateUserAvatar, dispatchActionPromise, pendingColor, pendingEmoji]);

  const onPressReset = React.useCallback(() => {
    if (lastSavedAvater) {
      invariant(
        lastSavedAvater.type === 'emoji',
        'lastSavedAvatr type should be an emoji avatar',
      );

      setPendingEmoji(lastSavedAvater.emoji);
      setPendingColor(lastSavedAvater.color);
    } else {
      setPendingEmoji(initalEmoji);
      setPendingColor(initialColor);
    }
  }, [initalEmoji, initialColor, lastSavedAvater]);

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
    if (loadingStatus !== 'loading') {
      return null;
    }

    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="white" />
      </View>
    );
  }, [loadingStatus, styles.loadingContainer]);

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
            outerRingSelectedColor={outerRingSelectedColor}
          />
        </View>
      </View>
      <View style={styles.buttonsContainer}>
        <Button
          onPress={onPressSetAvatar}
          style={styles.saveButton}
          disabled={disableButton}
        >
          <Text style={styles.saveButtonText}>Save Avatar</Text>
        </Button>
        <Button
          onPress={onPressReset}
          style={styles.resetButton}
          disabled={disableButton}
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
    color: 'editEmojiText',
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
  buttonsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  saveButton: {
    backgroundColor: 'saveAvatarButton',
    paddingVertical: 12,
    borderRadius: 8,
  },
  saveButtonText: {
    color: 'saveAvatarButtonText',
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
    color: 'resetAvatarButtonText',
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
