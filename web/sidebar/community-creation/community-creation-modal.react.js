// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';

import css from './community-creation-modal.css';
import CommIcon from '../../CommIcon.react.js';
import Button from '../../components/button.react.js';
import EnumSettingsOption from '../../components/enum-settings-option.react.js';
import UserAvatar from '../../components/user-avatar.react.js';
import Input from '../../modals/input.react.js';
import Modal from '../../modals/modal.react.js';

const announcementStatements = [
  {
    statement:
      `This option sets the community's root channel to an ` +
      `announcement channel. Only admins and other admin-appointed ` +
      `roles can send messages in an announcement channel.`,
    isStatementValid: true,
    styleStatementBasedOnValidity: false,
  },
];

function CommunityCreationModal(): React.Node {
  const modalContext = useModalContext();

  const [pendingCommunityName, setPendingCommunityName] =
    React.useState<string>('');

  const onChangePendingCommunityName = React.useCallback(
    (event: SyntheticEvent<HTMLInputElement>) =>
      setPendingCommunityName(event.currentTarget.value),
    [],
  );

  const [announcementSetting, setAnnouncementSetting] = React.useState(false);
  const onAnnouncementSelected = React.useCallback(() => {
    setAnnouncementSetting(!announcementSetting);
  }, [announcementSetting]);

  const megaphoneIcon = React.useMemo(
    () => <CommIcon icon="megaphone" size={24} />,
    [],
  );

  const avatarNodeEnabled = false;
  let avatarNode;
  if (avatarNodeEnabled) {
    avatarNode = (
      <div className={css.avatarContainer}>
        <UserAvatar userID="256" size="profile" />
      </div>
    );
  }

  return (
    <Modal
      name="Create a community"
      onClose={modalContext.popModal}
      size="small"
    >
      <div className={css.modalBody}>
        <div className={css.ancestryContainer}>
          <p>within</p>
        </div>
        {avatarNode}
        <form method="POST" className={css.formContainer}>
          <div>
            <div className={css.formTitle}>Community Name</div>
            <div className={css.formContent}>
              <Input
                type="text"
                value={pendingCommunityName}
                placeholder="Community Name"
                onChange={onChangePendingCommunityName}
              />
            </div>
          </div>
          <div className={css.formNotice}>
            You may edit your community&apos;s image and name later.
          </div>
          <hr />
          <div className={css.optionalSettingsContainer}>
            <div className={css.optionalSettingsLabel}>Optional settings</div>
            <EnumSettingsOption
              selected={announcementSetting}
              onSelect={onAnnouncementSelected}
              icon={megaphoneIcon}
              title="Announcement"
              statements={announcementStatements}
              iconPosition="top"
              type="checkbox"
            />
          </div>
          <div className={css.createCommunityButtonContainer}>
            <Button variant="filled">Create community</Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

export default CommunityCreationModal;
