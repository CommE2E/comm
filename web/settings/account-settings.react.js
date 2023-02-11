// @flow

import * as React from 'react';

import { logOut, logOutActionTypes } from 'lib/actions/user-actions.js';
import { useModalContext } from 'lib/components/modal-provider.react.js';
import SWMansionIcon from 'lib/components/SWMansionIcon.react.js';
import { useStringForUser } from 'lib/hooks/ens-cache.js';
import { preRequestUserStateSelector } from 'lib/selectors/account-selectors.js';
import { accountHasPassword } from 'lib/shared/account-utils.js';
import {
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils.js';

import css from './account-settings.css';
import PasswordChangeModal from './password-change-modal.js';
import BlockListModal from './relationship/block-list-modal.react.js';
import FriendListModal from './relationship/friend-list-modal.react.js';
import Button from '../components/button.react.js';
import { useSelector } from '../redux/redux-utils.js';

function AccountSettings(): React.Node {
  const sendLogoutRequest = useServerCall(logOut);
  const preRequestUserState = useSelector(preRequestUserStateSelector);
  const dispatchActionPromise = useDispatchActionPromise();
  const logOutUser = React.useCallback(
    () =>
      dispatchActionPromise(
        logOutActionTypes,
        sendLogoutRequest(preRequestUserState),
      ),
    [dispatchActionPromise, preRequestUserState, sendLogoutRequest],
  );

  const { pushModal, popModal } = useModalContext();
  const showPasswordChangeModal = React.useCallback(
    () => pushModal(<PasswordChangeModal />),
    [pushModal],
  );

  const openFriendList = React.useCallback(
    () => pushModal(<FriendListModal onClose={popModal} />),
    [popModal, pushModal],
  );

  const openBlockList = React.useCallback(
    () => pushModal(<BlockListModal onClose={popModal} />),
    [popModal, pushModal],
  );

  const isAccountWithPassword = useSelector(state =>
    accountHasPassword(state.currentUserInfo),
  );

  const currentUserInfo = useSelector(state => state.currentUserInfo);
  const stringForUser = useStringForUser(currentUserInfo);
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

  return (
    <div className={css.container}>
      <h4 className={css.header}>My Account</h4>
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
    </div>
  );
}

export default AccountSettings;
