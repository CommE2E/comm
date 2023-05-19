// @flow

import * as React from 'react';
import { useDispatch } from 'react-redux';

import { newThread, newThreadActionTypes } from 'lib/actions/thread-actions.js';
import { useModalContext } from 'lib/components/modal-provider.react.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import type { LoadingStatus } from 'lib/types/loading-types.js';
import { threadTypes } from 'lib/types/thread-types-enum.js';
import type { NewThreadResult } from 'lib/types/thread-types.js';
import {
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils.js';

import CommunityCreationKeyserverLabel from './community-creation-keyserver-label.react.js';
import CommunityCreationMembersModal from './community-creation-members-modal.react.js';
import css from './community-creation-modal.css';
import CommIcon from '../../CommIcon.react.js';
import Button, { buttonThemes } from '../../components/button.react.js';
import EnumSettingsOption from '../../components/enum-settings-option.react.js';
import UserAvatar from '../../components/user-avatar.react.js';
import LoadingIndicator from '../../loading-indicator.react.js';
import Input from '../../modals/input.react.js';
import Modal from '../../modals/modal.react.js';
import { updateNavInfoActionType } from '../../redux/action-types.js';
import { useSelector } from '../../redux/redux-utils.js';
import { nonThreadCalendarQuery } from '../../selectors/nav-selectors.js';

const announcementStatements = [
  {
    statement:
      `This option sets the community&apos;s root channel to an ` +
      `announcement channel. Only admins and other admin-appointed ` +
      `roles can send messages in an announcement channel.`,
    isStatementValid: true,
    styleStatementBasedOnValidity: false,
  },
];

const createNewCommunityLoadingStatusSelector =
  createLoadingStatusSelector(newThreadActionTypes);

function CommunityCreationModal(): React.Node {
  const modalContext = useModalContext();

  const dispatch = useDispatch();
  const dispatchActionPromise = useDispatchActionPromise();

  const callNewThread = useServerCall(newThread);
  const calendarQueryFunc = useSelector(nonThreadCalendarQuery);

  const [errorMessage, setErrorMessage] = React.useState<?string>();

  const [pendingCommunityName, setPendingCommunityName] =
    React.useState<string>('');

  const onChangePendingCommunityName = React.useCallback(
    (event: SyntheticEvent<HTMLInputElement>) => {
      setErrorMessage();
      setPendingCommunityName(event.currentTarget.value);
    },
    [],
  );

  const [announcementSetting, setAnnouncementSetting] = React.useState(false);
  const onAnnouncementSelected = React.useCallback(() => {
    setErrorMessage();
    setAnnouncementSetting(!announcementSetting);
  }, [announcementSetting]);

  const callCreateNewCommunity = React.useCallback(async () => {
    const calendarQuery = calendarQueryFunc();

    try {
      const newThreadResult: NewThreadResult = await callNewThread({
        name: pendingCommunityName,
        type: announcementSetting
          ? threadTypes.COMMUNITY_ANNOUNCEMENT_ROOT
          : threadTypes.COMMUNITY_ROOT,
        calendarQuery,
      });
      return newThreadResult;
    } catch (e) {
      setErrorMessage('Community creation failed. Please try again.');
      throw e;
    }
  }, [
    announcementSetting,
    calendarQueryFunc,
    callNewThread,
    pendingCommunityName,
  ]);

  const createNewCommunity = React.useCallback(async () => {
    setErrorMessage();

    const newThreadResultPromise = callCreateNewCommunity();
    dispatchActionPromise(newThreadActionTypes, newThreadResultPromise);
    const newThreadResult: NewThreadResult = await newThreadResultPromise;

    const { newThreadID } = newThreadResult;
    await dispatch({
      type: updateNavInfoActionType,
      payload: {
        activeChatThreadID: newThreadID,
      },
    });

    modalContext.popModal();
    modalContext.pushModal(
      <CommunityCreationMembersModal
        onClose={modalContext.popModal}
        threadID={newThreadID}
      />,
    );
  }, [callCreateNewCommunity, dispatch, dispatchActionPromise, modalContext]);

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

  const createNewCommunityLoadingStatus: LoadingStatus = useSelector(
    createNewCommunityLoadingStatusSelector,
  );
  let buttonContent;
  if (createNewCommunityLoadingStatus === 'loading') {
    buttonContent = (
      <LoadingIndicator
        status={createNewCommunityLoadingStatus}
        size="medium"
      />
    );
  } else if (errorMessage) {
    buttonContent = errorMessage;
  } else {
    buttonContent = 'Create community';
  }

  return (
    <Modal
      name="Create a community"
      onClose={modalContext.popModal}
      size="large"
    >
      <div className={css.modalBody}>
        <CommunityCreationKeyserverLabel />
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
            <Button
              onClick={createNewCommunity}
              variant="filled"
              buttonColor={
                errorMessage ? buttonThemes.danger : buttonThemes.standard
              }
            >
              <div className={css.createCommunityButtonContent}>
                {buttonContent}
              </div>
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

export default CommunityCreationModal;
