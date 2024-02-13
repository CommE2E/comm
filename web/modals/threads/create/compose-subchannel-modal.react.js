// @flow

import * as React from 'react';

import {
  newThreadActionTypes,
  useNewThread,
} from 'lib/actions/thread-actions.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import { threadTypes } from 'lib/types/thread-types-enum.js';
import { useResolvedThreadInfo } from 'lib/utils/entity-helpers.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';
import { useDispatch } from 'lib/utils/redux-utils.js';
import { trimText } from 'lib/utils/text-utils.js';

import css from './compose-subchannel-modal.css';
import SubchannelMembers from './steps/subchannel-members.react.js';
import type { VisibilityType } from './steps/subchannel-settings.react.js';
import SubchannelSettings from './steps/subchannel-settings.react.js';
import Stepper from '../../../components/stepper.react.js';
import { updateNavInfoActionType } from '../../../redux/action-types.js';
import { useSelector } from '../../../redux/redux-utils.js';
import { nonThreadCalendarQuery } from '../../../selectors/nav-selectors.js';
import {
  useAddUsersListContext,
  AddUsersListProvider,
} from '../../../settings/relationship/add-users-list-provider.react.js';
import Modal from '../../modal.react.js';

type Props = {
  +onClose: () => void,
  +parentThreadInfo: ThreadInfo,
};

const getThreadType = (visibility: VisibilityType, announcement: boolean) => {
  if (visibility === 'open') {
    return announcement
      ? threadTypes.COMMUNITY_OPEN_ANNOUNCEMENT_SUBTHREAD
      : threadTypes.COMMUNITY_OPEN_SUBTHREAD;
  } else {
    return announcement
      ? threadTypes.COMMUNITY_SECRET_ANNOUNCEMENT_SUBTHREAD
      : threadTypes.COMMUNITY_SECRET_SUBTHREAD;
  }
};

type Steps = 'settings' | 'members';

type HeaderProps = {
  +parentThreadName: string,
};

function ComposeSubchannelHeader(props: HeaderProps): React.Node {
  const { parentThreadName } = props;
  return (
    <div className={css.modalHeader}>
      <div>{'within '}</div>
      <div className={css.modalHeaderParentName}>{parentThreadName}</div>
    </div>
  );
}

const createSubchannelLoadingStatusSelector =
  createLoadingStatusSelector(newThreadActionTypes);

function ComposeSubchannelModal(props: Props): React.Node {
  const { parentThreadInfo, onClose } = props;
  const { uiName: parentThreadName } = useResolvedThreadInfo(parentThreadInfo);

  const { pendingUsersToAdd } = useAddUsersListContext();

  const [activeStep, setActiveStep] = React.useState<Steps>('settings');

  const [channelName, setChannelName] = React.useState<string>('');
  const [visibilityType, setVisibilityType] =
    React.useState<VisibilityType>('open');
  const [announcement, setAnnouncement] = React.useState<boolean>(false);

  const loadingState = useSelector(createSubchannelLoadingStatusSelector);

  const [errorMessage, setErrorMessage] = React.useState<string>('');

  const calendarQuery = useSelector(nonThreadCalendarQuery);
  const callNewThread = useNewThread();

  const dispatchActionPromise = useDispatchActionPromise();
  const dispatch = useDispatch();

  const createSubchannel = React.useCallback(async () => {
    try {
      const threadType = getThreadType(visibilityType, announcement);

      const query = calendarQuery();
      const result = await callNewThread({
        name: channelName,
        type: threadType,
        parentThreadID: parentThreadInfo.id,
        initialMemberIDs: Array.from(pendingUsersToAdd.keys()),
        calendarQuery: query,
        color: parentThreadInfo.color,
      });

      return result;
    } catch (e) {
      await setErrorMessage('unknown error');
      return null;
    }
  }, [
    visibilityType,
    announcement,
    calendarQuery,
    callNewThread,
    channelName,
    parentThreadInfo.id,
    parentThreadInfo.color,
    pendingUsersToAdd,
  ]);

  const dispatchCreateSubchannel = React.useCallback(async () => {
    await setErrorMessage('');

    const response = createSubchannel();
    await dispatchActionPromise(newThreadActionTypes, response);
    const result = await response;

    if (result) {
      const { newThreadID } = result;
      await dispatch({
        type: updateNavInfoActionType,
        payload: {
          activeChatThreadID: newThreadID,
        },
      });

      props.onClose();
    }
  }, [dispatchActionPromise, createSubchannel, props, dispatch]);

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
            setErrorMessage('');
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
          loading: loadingState === 'loading',
          disabled: pendingUsersToAdd.size === 0,
          onClick: dispatchCreateSubchannel,
        },
      },
    }),
    [
      channelName,
      dispatchCreateSubchannel,
      loadingState,
      pendingUsersToAdd.size,
    ],
  );

  const subchannelMembers = React.useMemo(
    () => <SubchannelMembers parentThreadInfo={parentThreadInfo} />,
    [parentThreadInfo],
  );

  const modalName =
    activeStep === 'members'
      ? `Create channel - ${trimText(channelName, 11)}`
      : 'Create channel';

  return (
    <Modal name={modalName} onClose={onClose} size="fit-content">
      <div className={css.container}>
        <ComposeSubchannelHeader parentThreadName={parentThreadName} />
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
              errorMessage={errorMessage}
            />
          </Stepper.Container>
        </div>
      </div>
    </Modal>
  );
}

function ComposeSubchannelModalWrapper(props: Props): React.Node {
  return (
    <AddUsersListProvider>
      {<ComposeSubchannelModal {...props} />}
    </AddUsersListProvider>
  );
}

export default ComposeSubchannelModalWrapper;
