// @flow

import * as React from 'react';

import SWMansionIcon from 'lib/components/SWMansionIcon.react.js';
import { stringForUserExplicit } from 'lib/shared/user-utils.js';
import type { UserInfo } from 'lib/types/user-types';
import sleep from 'lib/utils/sleep.js';

import css from './user-profile.css';
import UserAvatar from '../../avatars/user-avatar.react.js';

type Props = {
  +userInfo: ?UserInfo,
};

function UserProfile(props: Props): React.Node {
  const { userInfo } = props;

  const usernameText = stringForUserExplicit(userInfo);

  const [usernameCopied, setUsernameCopied] = React.useState<boolean>(false);

  const onClickCopyUsername = React.useCallback(async () => {
    if (usernameCopied) {
      return;
    }

    await navigator.clipboard.writeText(usernameText);
    setUsernameCopied(true);
    await sleep(3000);
    setUsernameCopied(false);
  }, [usernameCopied, usernameText]);

  return (
    <div className={css.container}>
      <UserAvatar userID={userInfo?.id} size="L" />
      <div className={css.usernameContainer}>
        <div className={css.usernameText}>{usernameText}</div>
        <div
          className={css.copyUsernameContainer}
          onClick={onClickCopyUsername}
        >
          <SWMansionIcon icon={!usernameCopied ? 'copy' : 'check'} size={16} />
          <p className={css.copyUsernameText}>
            {!usernameCopied ? 'Copy username' : 'Username copied!'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default UserProfile;
