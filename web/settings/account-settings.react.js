// @flow

import * as React from 'react';

import { setUsersDeviceListsActionType } from 'lib/actions/aux-user-actions.js';
import { useLogOut, logOutActionTypes } from 'lib/actions/user-actions.js';
import { useModalContext } from 'lib/components/modal-provider.react.js';
import SWMansionIcon from 'lib/components/swmansion-icon.react.js';
import { useStringForUser } from 'lib/hooks/ens-cache.js';
import { getRelativeUserIDs } from 'lib/selectors/user-selectors.js';
import { accountHasPassword } from 'lib/shared/account-utils.js';
import { IdentityClientContext } from 'lib/shared/identity-client-context.js';
import { useTunnelbroker } from 'lib/tunnelbroker/tunnelbroker-context.js';
import {
  createOlmSessionsWithOwnDevices,
  getContentSigningKey,
} from 'lib/utils/crypto-utils.js';
import { convertSignedDeviceListsToRawDeviceLists } from 'lib/utils/device-list-utils.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';
import { useDispatch } from 'lib/utils/redux-utils.js';

import css from './account-settings.css';
import AppearanceChangeModal from './appearance-change-modal.react.js';
import BackupTestRestoreModal from './backup-test-restore-modal.react.js';
import PasswordChangeModal from './password-change-modal.js';
import BlockListModal from './relationship/block-list-modal.react.js';
import FriendListModal from './relationship/friend-list-modal.react.js';
import TunnelbrokerMessagesScreen from './tunnelbroker-message-list.react.js';
import TunnelbrokerTestScreen from './tunnelbroker-test.react.js';
import EditUserAvatar from '../avatars/edit-user-avatar.react.js';
import Button from '../components/button.react.js';
import { useSelector } from '../redux/redux-utils.js';
import { useStaffCanSee } from '../utils/staff-utils.js';

function AccountSettings(): React.Node {
  const sendLogoutRequest = useLogOut();
  const dispatchActionPromise = useDispatchActionPromise();
  const logOutUser = React.useCallback(
    () => dispatchActionPromise(logOutActionTypes, sendLogoutRequest()),
    [dispatchActionPromise, sendLogoutRequest],
  );
  const identityContext = React.useContext(IdentityClientContext);

  const userID = useSelector(state => state.currentUserInfo?.id);
  const [deviceID, setDeviceID] = React.useState<?string>();

  React.useEffect(() => {
    void (async () => {
      const contentSigningKey = await getContentSigningKey();
      setDeviceID(contentSigningKey);
    })();
  }, []);

  const { pushModal, popModal } = useModalContext();
  const showPasswordChangeModal = React.useCallback(
    () => pushModal(<PasswordChangeModal />),
    [pushModal],
  );

  const openFriendList = React.useCallback(
    () => pushModal(<FriendListModal />),
    [pushModal],
  );

  const openBlockList = React.useCallback(
    () => pushModal(<BlockListModal />),
    [pushModal],
  );

  const isAccountWithPassword = useSelector(state =>
    accountHasPassword(state.currentUserInfo),
  );

  const currentUserInfo = useSelector(state => state.currentUserInfo);
  const stringForUser = useStringForUser(currentUserInfo);

  const staffCanSee = useStaffCanSee();
  const { sendMessage, connected, addListener, removeListener } =
    useTunnelbroker();
  const openTunnelbrokerModal = React.useCallback(
    () =>
      pushModal(
        <TunnelbrokerTestScreen sendMessage={sendMessage} onClose={popModal} />,
      ),
    [popModal, pushModal, sendMessage],
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
        sendMessage,
      );
    } catch (e) {
      console.log(`Error creating olm sessions with own devices: ${e.message}`);
    }
  }, [identityContext, sendMessage]);

  const dispatch = useDispatch();
  const relativeUserIDs = useSelector(getRelativeUserIDs);

  const onCreateInitialPeerList = React.useCallback(async () => {
    if (!identityContext) {
      return;
    }

    try {
      const userDeviceLists =
        await identityContext.identityClient.getDeviceListsForUsers(
          relativeUserIDs,
        );
      const usersRawDeviceLists =
        convertSignedDeviceListsToRawDeviceLists(userDeviceLists);
      dispatch({
        type: setUsersDeviceListsActionType,
        payload: usersRawDeviceLists,
      });
    } catch (e) {
      console.log(`Error creating initial peer list: ${e.message}`);
    }
  }, [dispatch, identityContext, relativeUserIDs]);

  const openBackupTestRestoreModal = React.useCallback(
    () => pushModal(<BackupTestRestoreModal onClose={popModal} />),
    [popModal, pushModal],
  );

  const showAppearanceModal = React.useCallback(
    () => pushModal(<AppearanceChangeModal />),
    [pushModal],
  );

  if (!currentUserInfo || currentUserInfo.anonymous) {
    return null;
  }

  let changePasswordSection;
  if (isAccountWithPassword) {
    changePasswordSection = (
      <li>
        <span>Password</span>
        <span className={css.passwordContainer}>
          <span className={css.password}>******</span>
          <a className={css.editPasswordLink} onClick={showPasswordChangeModal}>
            <SWMansionIcon icon="edit-1" size={22} />
          </a>
        </span>
      </li>
    );
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
              <span>{connected.toString()}</span>
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
            <li>
              <span>Create initial peer list</span>
              <Button variant="text" onClick={onCreateInitialPeerList}>
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
            {changePasswordSection}
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
      </div>
    </div>
  );
}

export default AccountSettings;
