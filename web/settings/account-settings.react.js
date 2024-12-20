// @flow

import invariant from 'invariant';
import * as React from 'react';
import uuid from 'uuid';

import {
  useBaseLogOut,
  logOutActionTypes,
  useSecondaryDeviceLogOut,
} from 'lib/actions/user-actions.js';
import { useModalContext } from 'lib/components/modal-provider.react.js';
import SWMansionIcon from 'lib/components/swmansion-icon.react.js';
import { useStringForUser } from 'lib/hooks/ens-cache.js';
import {
  dmOperationSpecificationTypes,
  type OutboundDMOperationSpecification,
} from 'lib/shared/dm-ops/dm-op-utils.js';
import { useProcessAndSendDMOperation } from 'lib/shared/dm-ops/process-dm-ops.js';
import { IdentityClientContext } from 'lib/shared/identity-client-context.js';
import { useTunnelbroker } from 'lib/tunnelbroker/tunnelbroker-context.js';
import type { DMCreateThreadOperation } from 'lib/types/dm-ops.js';
import { thickThreadTypes } from 'lib/types/thread-types-enum.js';
import {
  createOlmSessionsWithOwnDevices,
  getContentSigningKey,
} from 'lib/utils/crypto-utils.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';
import { usingRestoreFlow } from 'lib/utils/services-utils.js';

import css from './account-settings.css';
import AppearanceChangeModal from './appearance-change-modal.react.js';
import BackupTestRestoreModal from './backup-test-restore-modal.react.js';
import BlockListModal from './relationship/block-list-modal.react.js';
import FriendListModal from './relationship/friend-list-modal.react.js';
import TunnelbrokerMessagesScreen from './tunnelbroker-message-list.react.js';
import TunnelbrokerTestScreen from './tunnelbroker-test.react.js';
import EditUserAvatar from '../avatars/edit-user-avatar.react.js';
import Button from '../components/button.react.js';
import VersionUnsupportedModal from '../modals/version-unsupported-modal.react.js';
import { useSelector } from '../redux/redux-utils.js';
import { useStaffCanSee } from '../utils/staff-utils.js';

function AccountSettings(): React.Node {
  const { pushModal, popModal } = useModalContext();

  const legacyLogOutOptions = React.useMemo(() => {
    const showVersionUnsupportedModal = () => {
      pushModal(<VersionUnsupportedModal />);
    };
    return {
      logOutType: 'legacy',
      handleUseNewFlowResponse: showVersionUnsupportedModal,
    };
  }, [pushModal]);
  const sendLegacyLogoutRequest = useBaseLogOut(legacyLogOutOptions);

  const sendSecondaryDeviceLogoutRequest = useSecondaryDeviceLogOut();
  const dispatchActionPromise = useDispatchActionPromise();
  const logOutUser = React.useCallback(() => {
    if (usingRestoreFlow) {
      return dispatchActionPromise(
        logOutActionTypes,
        sendSecondaryDeviceLogoutRequest(),
      );
    }
    return dispatchActionPromise(logOutActionTypes, sendLegacyLogoutRequest());
  }, [
    dispatchActionPromise,
    sendLegacyLogoutRequest,
    sendSecondaryDeviceLogoutRequest,
  ]);

  const identityContext = React.useContext(IdentityClientContext);

  const userID = useSelector(state => state.currentUserInfo?.id);
  const [deviceID, setDeviceID] = React.useState<?string>();

  React.useEffect(() => {
    void (async () => {
      const contentSigningKey = await getContentSigningKey();
      setDeviceID(contentSigningKey);
    })();
  }, []);

  const openFriendList = React.useCallback(
    () => pushModal(<FriendListModal />),
    [pushModal],
  );

  const openBlockList = React.useCallback(
    () => pushModal(<BlockListModal />),
    [pushModal],
  );

  const currentUserInfo = useSelector(state => state.currentUserInfo);
  const stringForUser = useStringForUser(currentUserInfo);

  const staffCanSee = useStaffCanSee();
  const { sendMessageToDevice, socketState, addListener, removeListener } =
    useTunnelbroker();
  const openTunnelbrokerModal = React.useCallback(
    () =>
      pushModal(
        <TunnelbrokerTestScreen
          sendMessageToDevice={sendMessageToDevice}
          onClose={popModal}
        />,
      ),
    [popModal, pushModal, sendMessageToDevice],
  );

  const openTunnelbrokerMessagesModal = React.useCallback(
    () =>
      pushModal(
        <TunnelbrokerMessagesScreen
          addListener={addListener}
          removeListener={removeListener}
          onClose={popModal}
        />,
      ),
    [addListener, popModal, pushModal, removeListener],
  );

  const onCreateOlmSessions = React.useCallback(async () => {
    if (!identityContext) {
      return;
    }
    const authMetadata = await identityContext.getAuthMetadata();
    try {
      await createOlmSessionsWithOwnDevices(
        authMetadata,
        identityContext.identityClient,
        sendMessageToDevice,
      );
    } catch (e) {
      console.log(`Error creating olm sessions with own devices: ${e.message}`);
    }
  }, [identityContext, sendMessageToDevice]);

  const openBackupTestRestoreModal = React.useCallback(
    () => pushModal(<BackupTestRestoreModal onClose={popModal} />),
    [popModal, pushModal],
  );

  const processAndSendDMOperation = useProcessAndSendDMOperation();
  const onCreateDMThread = React.useCallback(async () => {
    invariant(userID, 'userID should be set');
    const op: DMCreateThreadOperation = {
      type: 'create_thread',
      threadID: uuid.v4(),
      creatorID: userID,
      time: Date.now(),
      threadType: thickThreadTypes.LOCAL,
      memberIDs: [],
      roleID: uuid.v4(),
      newMessageID: uuid.v4(),
    };
    const specification: OutboundDMOperationSpecification = {
      type: dmOperationSpecificationTypes.OUTBOUND,
      op,
      recipients: {
        type: 'self_devices',
      },
    };
    await processAndSendDMOperation(specification);
  }, [processAndSendDMOperation, userID]);

  const showAppearanceModal = React.useCallback(
    () => pushModal(<AppearanceChangeModal />),
    [pushModal],
  );

  if (!currentUserInfo || currentUserInfo.anonymous) {
    return null;
  }

  let preferences;
  if (staffCanSee) {
    preferences = (
      <div className={css.preferencesContainer}>
        <h4 className={css.preferencesHeader}>Preferences</h4>
        <div className={css.content}>
          <ul>
            <li>
              <span>Appearance</span>
              <a className={css.editPasswordLink} onClick={showAppearanceModal}>
                <SWMansionIcon icon="edit-1" size={22} />
              </a>
            </li>
          </ul>
        </div>
      </div>
    );
  }
  let tunnelbroker;
  if (staffCanSee) {
    tunnelbroker = (
      <div className={css.preferencesContainer}>
        <h4 className={css.preferencesHeader}>Tunnelbroker menu</h4>
        <div className={css.content}>
          <ul>
            <li>
              <span>Connected</span>
              <span>{socketState.connected.toString()}</span>
            </li>
            <li>
              <span>Send message to device</span>
              <Button variant="text" onClick={openTunnelbrokerModal}>
                <p className={css.buttonText}>Insert data</p>
              </Button>
            </li>
            <li>
              <span>Trace received messages</span>
              <Button variant="text" onClick={openTunnelbrokerMessagesModal}>
                <p className={css.buttonText}>Show list</p>
              </Button>
            </li>
            <li>
              <span>Create session with own devices</span>
              <Button variant="text" onClick={onCreateOlmSessions}>
                <p className={css.buttonText}>Create</p>
              </Button>
            </li>
          </ul>
        </div>
      </div>
    );
  }
  let backup;
  if (staffCanSee) {
    backup = (
      <div className={css.preferencesContainer}>
        <h4 className={css.preferencesHeader}>Backup menu</h4>
        <div className={css.content}>
          <ul>
            <li>
              <span>Test backup restore</span>
              <Button variant="text" onClick={openBackupTestRestoreModal}>
                <p className={css.buttonText}>Insert data</p>
              </Button>
            </li>
          </ul>
        </div>
      </div>
    );
  }
  let deviceData;
  if (staffCanSee) {
    deviceData = (
      <div className={css.preferencesContainer}>
        <h4 className={css.preferencesHeader}>Device ID</h4>
        <div className={css.content}>
          <ul>
            <li>
              <span>{deviceID}</span>
            </li>
          </ul>
        </div>
        <h4 className={css.preferencesHeader}>User ID</h4>
        <div className={css.content}>
          <ul>
            <li>
              <span>{userID}</span>
            </li>
          </ul>
        </div>
      </div>
    );
  }
  let dms;
  if (staffCanSee) {
    dms = (
      <div className={css.preferencesContainer}>
        <h4 className={css.preferencesHeader}>DMs menu</h4>
        <div className={css.content}>
          <ul>
            <li>
              <span>Create a new local DM thread</span>
              <Button variant="text" onClick={onCreateDMThread}>
                <p className={css.buttonText}>Create</p>
              </Button>
            </li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className={css.container}>
      <div className={css.contentContainer}>
        <h4 className={css.header}>My Account</h4>
        <EditUserAvatar userID={currentUserInfo.id} />
        <div className={css.content}>
          <ul>
            <li>
              <p className={css.logoutContainer}>
                <span className={css.logoutLabel}>{'Logged in as '}</span>
                <span className={css.username}>{stringForUser}</span>
              </p>
              <Button variant="text" onClick={logOutUser}>
                <p className={css.buttonText}>Log out</p>
              </Button>
            </li>
            <li>
              <span>Friend List</span>
              <Button variant="text" onClick={openFriendList}>
                <p className={css.buttonText}>See List</p>
              </Button>
            </li>
            <li>
              <span>Block List</span>
              <Button variant="text" onClick={openBlockList}>
                <p className={css.buttonText}>See List</p>
              </Button>
            </li>
          </ul>
        </div>
        {preferences}
        {tunnelbroker}
        {backup}
        {deviceData}
        {dms}
      </div>
    </div>
  );
}

export default AccountSettings;
