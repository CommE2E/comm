// @flow

import * as React from 'react';

import { logOut } from 'lib/actions/user-actions';
import { preRequestUserStateSelector } from 'lib/selectors/account-selectors';
import { useServerCall } from 'lib/utils/action-utils';

import { useSelector } from '../redux/redux-utils';
import css from './account-settings.css';

function AccountSettings(): React.Node {
  const sendLogoutRequest = useServerCall(logOut);
  const preRequestUserState = useSelector(preRequestUserStateSelector);
  const logOutUser = React.useCallback(() => {
    sendLogoutRequest(preRequestUserState);
  }, [sendLogoutRequest, preRequestUserState]);

  const currentUserInfo = useSelector(state => state.currentUserInfo);
  if (!currentUserInfo || currentUserInfo.anonymous) {
    return null;
  }
  const { username } = currentUserInfo;

  return (
    <div className={css.container}>
      <h4 className={css.header}>My Account</h4>
      <div className={css.content}>
        <ul>
          <li>
            <p className={css.logoutContainer}>
              <span className={css.logoutLabel}>{'Logged in as '}</span>
              <span className={css.username}>{username}</span>
            </p>
            <button className={css.button} onClick={logOutUser}>
              Log out
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}

export default AccountSettings;
