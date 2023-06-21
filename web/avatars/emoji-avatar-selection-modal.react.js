// @flow

import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import invariant from 'invariant';
import * as React from 'react';

import { EditUserAvatarContext } from 'lib/components/base-edit-user-avatar-provider.react.js';
import { useModalContext } from 'lib/components/modal-provider.react.js';
import SWMansionIcon from 'lib/components/SWMansionIcon.react.js';
import {
  defaultAnonymousUserEmojiAvatar,
  getAvatarForUser,
  getDefaultAvatar,
} from 'lib/shared/avatar-utils.js';
import type {
  ClientAvatar,
  ClientEmojiAvatar,
} from 'lib/types/avatar-types.js';

import Avatar from './avatar.react.js';
import css from './emoji-avatar-selection-modal.css';
import Button, { buttonThemes } from '../components/button.react.js';
import LoadingIndicator from '../loading-indicator.react.js';
import Modal from '../modals/modal.react.js';
import ColorSelector from '../modals/threads/color-selector.react.js';
import { useSelector } from '../redux/redux-utils.js';

function EmojiAvatarSelectionModal(): React.Node {
  const { popModal } = useModalContext();

  const editUserAvatarContext = React.useContext(EditUserAvatarContext);
  invariant(editUserAvatarContext, 'editUserAvatarContext should be set');

  const { setUserAvatar, userAvatarSaveInProgress } = editUserAvatarContext;

  const [errorMessage, setErrorMessage] = React.useState<?string>();

  const currentUserInfo = useSelector(state => state.currentUserInfo);
  const currentUserAvatar: ClientAvatar = getAvatarForUser(currentUserInfo);
  const defaultUserAvatar: ClientEmojiAvatar = currentUserInfo?.username
    ? getDefaultAvatar(currentUserInfo.username)
    : defaultAnonymousUserEmojiAvatar;

  // eslint-disable-next-line no-unused-vars
  const [pendingAvatarEmoji, setPendingAvatarEmoji] = React.useState(
    currentUserAvatar.type === 'emoji'
      ? currentUserAvatar.emoji
      : defaultUserAvatar.emoji,
  );

  const [pendingAvatarColor, setPendingAvatarColor] = React.useState(
    currentUserAvatar.type === 'emoji'
      ? currentUserAvatar.color
      : defaultUserAvatar.color,
  );

  const pendingEmojiAvatar: ClientEmojiAvatar = React.useMemo(
    () => ({
      type: 'emoji',
      emoji: pendingAvatarEmoji,
      color: pendingAvatarColor,
    }),
    [pendingAvatarColor, pendingAvatarEmoji],
  );

  const onEmojiSelect = React.useCallback(selection => {
    setErrorMessage();
    setPendingAvatarEmoji(selection.native);
  }, []);

  const onColorSelection = React.useCallback((hex: string) => {
    setErrorMessage();
    setPendingAvatarColor(hex);
  }, []);

  const onSaveAvatar = React.useCallback(async () => {
    try {
      await setUserAvatar(pendingEmojiAvatar);
    } catch {
      setErrorMessage('Avatar update failed. Please try again.');
    }
  }, [pendingEmojiAvatar, setUserAvatar]);

  let saveButtonContent;
  if (userAvatarSaveInProgress) {
    saveButtonContent = <LoadingIndicator status="loading" size="medium" />;
  } else if (errorMessage) {
    saveButtonContent = (
      <>
        <SWMansionIcon icon="warning-circle" size={24} />
        {errorMessage}
      </>
    );
  } else {
    saveButtonContent = 'Save Avatar';
  }

  return (
    <Modal name="Emoji avatar selection" size="large" onClose={popModal}>
      <div className={css.modalBody}>
        <div className={css.avatarContainer}>
          <Avatar avatarInfo={pendingEmojiAvatar} size="profile" />
        </div>
        <div className={css.emojiPickerContainer}>
          <Picker data={data} theme="dark" onEmojiSelect={onEmojiSelect} />
        </div>
        <div className={css.colorSelectorContainer}>
          <ColorSelector
            currentColor={pendingAvatarColor}
            onColorSelection={onColorSelection}
          />
        </div>
        <div className={css.saveButtonContainer}>
          <Button
            variant="filled"
            buttonColor={
              errorMessage ? buttonThemes.danger : buttonThemes.standard
            }
            onClick={onSaveAvatar}
            disabled={userAvatarSaveInProgress}
          >
            <div className={css.saveAvatarButtonContent}>
              {saveButtonContent}
            </div>
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default EmojiAvatarSelectionModal;
