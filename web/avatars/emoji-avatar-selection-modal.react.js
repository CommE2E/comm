// @flow

import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import invariant from 'invariant';
import * as React from 'react';

import { EditUserAvatarContext } from 'lib/components/edit-user-avatar-provider.react.js';
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
import Tabs from '../components/tabs.react.js';
import LoadingIndicator from '../loading-indicator.react.js';
import Modal from '../modals/modal.react.js';
import ColorSelector from '../modals/threads/color-selector.react.js';
import { useSelector } from '../redux/redux-utils.js';

type TabType = 'emoji' | 'color';

function EmojiAvatarSelectionModal(): React.Node {
  const { popModal } = useModalContext();

  const editUserAvatarContext = React.useContext(EditUserAvatarContext);
  invariant(editUserAvatarContext, 'editUserAvatarContext should be set');

  const { baseSetUserAvatar, userAvatarSaveInProgress } = editUserAvatarContext;

  const [updateAvatarStatus, setUpdateAvatarStatus] =
    React.useState<?('success' | 'failure')>();

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
    setUpdateAvatarStatus();
    setPendingAvatarEmoji(selection.native);
  }, []);

  const onColorSelection = React.useCallback((hex: string) => {
    setUpdateAvatarStatus();
    setPendingAvatarColor(hex);
  }, []);

  const onSaveAvatar = React.useCallback(async () => {
    try {
      await baseSetUserAvatar(pendingEmojiAvatar);
      setUpdateAvatarStatus('success');
    } catch {
      setUpdateAvatarStatus('failure');
    }
  }, [pendingEmojiAvatar, baseSetUserAvatar]);

  let saveButtonContent;
  let buttonColor;
  if (userAvatarSaveInProgress) {
    buttonColor = buttonThemes.standard;
    saveButtonContent = <LoadingIndicator status="loading" size="medium" />;
  } else if (updateAvatarStatus === 'success') {
    buttonColor = buttonThemes.success;
    saveButtonContent = (
      <>
        <SWMansionIcon icon="check-circle" size={24} />
        {'Avatar update succeeded.'}
      </>
    );
  } else if (updateAvatarStatus === 'failure') {
    buttonColor = buttonThemes.danger;
    saveButtonContent = (
      <>
        <SWMansionIcon icon="warning-circle" size={24} />
        {'Avatar update failed. Please try again.'}
      </>
    );
  } else {
    buttonColor = buttonThemes.standard;
    saveButtonContent = 'Save Avatar';
  }

  const [currentTabType, setCurrentTabType] = React.useState<TabType>('emoji');

  return (
    <Modal name="Emoji avatar selection" size="large" onClose={popModal}>
      <div className={css.modalContainer}>
        <div className={css.avatarContainer}>
          <Avatar
            avatarInfo={pendingEmojiAvatar}
            size="profile"
            showSpinner={userAvatarSaveInProgress}
          />
        </div>
        <Tabs.Container activeTab={currentTabType} setTab={setCurrentTabType}>
          <Tabs.Item id="emoji" header="Emoji">
            <div className={css.tabBody}>
              <div className={css.emojiPickerContainer}>
                <Picker
                  data={data}
                  theme="dark"
                  onEmojiSelect={onEmojiSelect}
                  perLine={12}
                />
              </div>
            </div>
          </Tabs.Item>
          <Tabs.Item id="color" header="Color">
            <div className={css.tabBody}>
              <ColorSelector
                currentColor={pendingAvatarColor}
                onColorSelection={onColorSelection}
                size="large"
              />
            </div>
          </Tabs.Item>
        </Tabs.Container>
        <div className={css.modalBody}>
          <div className={css.saveButtonContainer}>
            <Button
              variant="filled"
              buttonColor={buttonColor}
              onClick={onSaveAvatar}
              disabled={userAvatarSaveInProgress}
            >
              <div className={css.saveAvatarButtonContent}>
                {saveButtonContent}
              </div>
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default EmojiAvatarSelectionModal;
