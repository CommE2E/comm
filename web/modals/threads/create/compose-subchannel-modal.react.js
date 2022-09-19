// @flow
import * as React from 'react';

import type { ThreadInfo } from 'lib/types/thread-types';
import { trimText } from 'lib/utils/text-utils';

import Stepper from '../../../components/stepper.react';
import Modal from '../../modal.react';
import css from './compose-subchannel-modal.css';
import SubchannelMembers from './steps/subchannel-members.react';
import SubchannelSettings from './steps/subchannel-settings.react';
import type { VisibilityType } from './steps/subchannel-settings.react';

type Props = {
  +onClose: () => void,
  +parentThreadInfo: ThreadInfo,
};

type Steps = 'settings' | 'members';

type HeaderProps = {
  +parentThreadName: string,
};

function ComposeSubchannelHeader(props: HeaderProps): React.Node {
  const { parentThreadName } = props;
  return (
    <div className={css.modalHeader}>
      <div>
        {'within '}
        <div className={css.modalHeaderParentName}>{parentThreadName}</div>
      </div>
    </div>
  );
}

function ComposeSubchannelModal(props: Props): React.Node {
  const { parentThreadInfo, onClose } = props;
  const { uiName: parentThreadName } = parentThreadInfo;

  const [activeStep, setActiveStep] = React.useState<Steps>('settings');

  const [channelName, setChannelName] = React.useState<string>('');
  const [visibilityType, setVisibilityType] = React.useState<VisibilityType>(
    'open',
  );
  const [announcement, setAnnouncement] = React.useState<boolean>(false);
  const [selectedUsers, setSelectedUsers] = React.useState<
    $ReadOnlySet<string>,
  >(new Set());
  const [searchUserText, setSearchUserText] = React.useState<string>('');

  const onChangeChannelName = React.useCallback(
    (event: SyntheticEvent<HTMLInputElement>) => {
      const target = event.currentTarget;
      setChannelName(target.value);
    },
    [],
  );

  const onOpenVisibilityTypeSelected = React.useCallback(
    () => setVisibilityType('open'),
    [],
  );

  const onSecretVisibilityTypeSelected = React.useCallback(
    () => setVisibilityType('secret'),
    [],
  );

  const onAnnouncementSelected = React.useCallback(
    () => setAnnouncement(!announcement),
    [announcement],
  );

  const toggleUserSelection = React.useCallback((userID: string) => {
    setSelectedUsers((users: $ReadOnlySet<string>) => {
      const newUsers = new Set(users);
      if (newUsers.has(userID)) {
        newUsers.delete(userID);
      } else {
        newUsers.add(userID);
      }
      return newUsers;
    });
  }, []);

  const subchannelSettings = React.useMemo(
    () => (
      <SubchannelSettings
        channelName={channelName}
        visibilityType={visibilityType}
        announcement={announcement}
        onChangeChannelName={onChangeChannelName}
        onOpenTypeSelect={onOpenVisibilityTypeSelected}
        onSecretTypeSelect={onSecretVisibilityTypeSelected}
        onAnnouncementSelected={onAnnouncementSelected}
      />
    ),
    [
      channelName,
      visibilityType,
      announcement,
      onChangeChannelName,
      onOpenVisibilityTypeSelected,
      onSecretVisibilityTypeSelected,
      onAnnouncementSelected,
    ],
  );

  const stepperButtons = React.useMemo(
    () => ({
      settings: {
        nextProps: {
          content: 'Next',
          disabled: !channelName.trim(),
          onClick: () => {
            setChannelName(channelName.trim());
            setActiveStep('members');
          },
        },
      },
      members: {
        prevProps: {
          content: 'Back',
          onClick: () => setActiveStep('settings'),
        },
        nextProps: {
          content: 'Create',
          onClick: () => {
            // TODO: make form logic
          },
        },
      },
    }),
    [channelName],
  );

  const subchannelMembers = React.useMemo(
    () => (
      <SubchannelMembers
        parentThreadInfo={parentThreadInfo}
        selectedUsers={selectedUsers}
        searchText={searchUserText}
        setSearchText={setSearchUserText}
        toggleUserSelection={toggleUserSelection}
      />
    ),
    [
      selectedUsers,
      toggleUserSelection,
      parentThreadInfo,
      searchUserText,
      setSearchUserText,
    ],
  );

  const modalName =
    activeStep === 'members'
      ? `Create channel - ${trimText(channelName, 11)}`
      : 'Create channel';

  return (
    <Modal name={modalName} onClose={onClose} size="fit-content">
      <ComposeSubchannelHeader parentThreadName={parentThreadName} />
      <div className={css.container}>
        <div className={css.stepItem}>
          <Stepper.Container
            className={css.stepContainer}
            activeStep={activeStep}
          >
            <Stepper.Item
              content={subchannelSettings}
              name="settings"
              nextProps={stepperButtons.settings.nextProps}
            />
            <Stepper.Item
              content={subchannelMembers}
              name="members"
              prevProps={stepperButtons.members.prevProps}
              nextProps={stepperButtons.members.nextProps}
            />
          </Stepper.Container>
        </div>
      </div>
    </Modal>
  );
}

export default ComposeSubchannelModal;
