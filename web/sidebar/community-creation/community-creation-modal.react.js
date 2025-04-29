// @flow

import * as React from 'react';

import { newThreadActionTypes } from 'lib/actions/thread-actions.js';
import { useModalContext } from 'lib/components/modal-provider.react.js';
import { useNewThinThread } from 'lib/hooks/thread-hooks.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import type { LoadingStatus } from 'lib/types/loading-types.js';
import { threadTypes } from 'lib/types/thread-types-enum.js';
import type { NewThreadResult } from 'lib/types/thread-types.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';
import { useDispatch } from 'lib/utils/redux-utils.js';

import CommunityCreationKeyserverLabel from './community-creation-keyserver-label.react.js';
import css from './community-creation-modal.css';
import UserAvatar from '../../avatars/user-avatar.react.js';
import CommIcon from '../../comm-icon.react.js';
import Button, { buttonThemes } from '../../components/button.react.js';
import EnumSettingsOption from '../../components/enum-settings-option.react.js';
import LoadingIndicator from '../../loading-indicator.react.js';
import Input from '../../modals/input.react.js';
import Modal from '../../modals/modal.react.js';
import { updateNavInfoActionType } from '../../redux/action-types.js';
import { useSelector } from '../../redux/redux-utils.js';
import { nonThreadCalendarQuery } from '../../selectors/nav-selectors.js';

const announcementStatements = [
  {
    statement:
      `This option sets the community’s root channel to an ` +
      `announcement channel. Only admins and other admin-appointed ` +
      `roles can send messages in an announcement channel.`,
    isStatementValid: true,
    styleStatementBasedOnValidity: false,
  },
];

const communityCreationKeyserverLabel = <CommunityCreationKeyserverLabel />;

const createNewCommunityLoadingStatusSelector =
  createLoadingStatusSelector(newThreadActionTypes);

function CommunityCreationModal(): React.Node {
  const modalContext = useModalContext();

  const dispatch = useDispatch();
  const dispatchActionPromise = useDispatchActionPromise();

  const callNewThinThread = useNewThinThread();
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
      const newThreadResult: NewThreadResult = await callNewThinThread({
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
    callNewThinThread,
    pendingCommunityName,
  ]);

  const createNewCommunity = React.useCallback(async () => {
    setErrorMessage();

    const newThreadResultPromise = callCreateNewCommunity();
    void dispatchActionPromise(newThreadActionTypes, newThreadResultPromise);
    const newThreadResult: NewThreadResult = await newThreadResultPromise;

    const { newThreadID } = newThreadResult;
    await dispatch({
      type: updateNavInfoActionType,
      payload: {
        activeChatThreadID: newThreadID,
      },
    });

    modalContext.popModal();
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
        <UserAvatar userID="256" size="XL" />
      </div>
    );
  }

  const createNewCommunityLoadingStatus: LoadingStatus = useSelector(
    createNewCommunityLoadingStatusSelector,
  );

  const buttonContent = React.useMemo(() => {
    if (createNewCommunityLoadingStatus === 'loading') {
      return (
        <LoadingIndicator
          status={createNewCommunityLoadingStatus}
          size="medium"
        />
      );
    } else if (errorMessage) {
      return errorMessage;
    } else {
      return 'Create community';
    }
  }, [createNewCommunityLoadingStatus, errorMessage]);

  const button = React.useMemo(
    () => (
      <Button
        onClick={createNewCommunity}
        variant="filled"
        buttonColor={errorMessage ? buttonThemes.danger : buttonThemes.standard}
        disabled={createNewCommunityLoadingStatus === 'loading'}
      >
        <div className={css.createCommunityButtonContent}>{buttonContent}</div>
      </Button>
    ),
    [
      buttonContent,
      createNewCommunity,
      createNewCommunityLoadingStatus,
      errorMessage,
    ],
  );

  return (
    <Modal
      name="Create a community"
      onClose={modalContext.popModal}
      size="large"
      primaryButton={button}
      subheader={communityCreationKeyserverLabel}
    >
      <div className={css.modalBody}>
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
            You may edit your community&rsquo;s image and name later.
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
        </form>
      </div>
    </Modal>
  );
}

export default CommunityCreationModal;
