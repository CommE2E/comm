// @flow

import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import SWMansionIcon from 'lib/components/SWMansionIcon.react.js';
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

type TabType = 'emoji' | 'color';

type Props = {
  +currentAvatar: ClientAvatar,
  +defaultAvatar: ClientEmojiAvatar,
  +setEmojiAvatar: (pendingEmojiAvatar: ClientEmojiAvatar) => Promise<void>,
  +avatarSaveInProgress: boolean,
};
function EmojiAvatarSelectionModal(props: Props): React.Node {
  const { popModal } = useModalContext();

  const { currentAvatar, defaultAvatar, setEmojiAvatar, avatarSaveInProgress } =
    props;

  const [updateAvatarStatus, setUpdateAvatarStatus] =
    React.useState<?('success' | 'failure')>();

  const [pendingAvatarEmoji, setPendingAvatarEmoji] = React.useState(
    currentAvatar.type === 'emoji' ? currentAvatar.emoji : defaultAvatar.emoji,
  );

  const [pendingAvatarColor, setPendingAvatarColor] = React.useState(
    currentAvatar.type === 'emoji' ? currentAvatar.color : defaultAvatar.color,
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
      await setEmojiAvatar(pendingEmojiAvatar);
      setUpdateAvatarStatus('success');
    } catch {
      setUpdateAvatarStatus('failure');
    }
  }, [setEmojiAvatar, pendingEmojiAvatar]);

  let saveButtonContent;
  let buttonColor;
  if (avatarSaveInProgress) {
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
            showSpinner={avatarSaveInProgress}
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
              disabled={avatarSaveInProgress}
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
