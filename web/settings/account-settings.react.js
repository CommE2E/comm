// @flow

import * as React from 'react';

import { useLogOut, logOutActionTypes } from 'lib/actions/user-actions.js';
import { useModalContext } from 'lib/components/modal-provider.react.js';
import SWMansionIcon from 'lib/components/SWMansionIcon.react.js';
import { useStringForUser } from 'lib/hooks/ens-cache.js';
import { accountHasPassword } from 'lib/shared/account-utils.js';
import { useTunnelbroker } from 'lib/tunnelbroker/tunnelbroker-context.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';

import css from './account-settings.css';
import AppearanceChangeModal from './appearance-change-modal.react.js';
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
        <h4 className={css.preferencesHeader}>Tunnerlbroker menu</h4>
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
      </div>
    </div>
  );
}

export default AccountSettings;
