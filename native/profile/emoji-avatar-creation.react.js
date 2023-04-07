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

const loadingStatusSelector = createLoadingStatusSelector(
  updateUserAvatarActionTypes,
);

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

  const [lastSavedAvater, setLastSavedAvatar] =
    React.useState<?ClientAvatar>(null);
  const [pendingEmoji, setPendingEmoji] = React.useState<string>(initalEmoji);
  const [pendingColor, setPendingColor] = React.useState<string>(initialColor);
  const [emojiKeyboardOpen, setEmojiKeyboardOpen] =
    React.useState<boolean>(false);

  const styles = useStyles(unboundStyles);

  const dispatchActionPromise = useDispatchActionPromise();
  const callUpdateUserAvatar = useServerCall(updateUserAvatar);

  const saveAvatarCallLoading = useSelector(
    state => loadingStatusSelector(state) === 'loading',
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

    const saveAvatarPromise = (async () => {
      try {
        const response = await callUpdateUserAvatar(newEmojiAvatarRequest);

        displayActionResultModal('Avatar updated');
        setLastSavedAvatar(response);

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
    if (!saveAvatarCallLoading) {
      return null;
    }

    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="white" />
      </View>
    );
  }, [saveAvatarCallLoading, styles.loadingContainer]);

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
          disabled={saveAvatarCallLoading}
        >
          <Text style={styles.saveButtonText}>Save Avatar</Text>
        </Button>
        <Button
          onPress={onPressReset}
          style={styles.resetButton}
          disabled={saveAvatarCallLoading}
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

export default EmojiAvatarCreation;
