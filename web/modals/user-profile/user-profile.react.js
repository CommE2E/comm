// @flow

import * as React from 'react';

import SWMansionIcon from 'lib/components/SWMansionIcon.react.js';
import { relationshipBlockedInEitherDirection } from 'lib/shared/relationship-utils.js';
import { useUserProfileThreadInfo } from 'lib/shared/thread-utils.js';
import { stringForUserExplicit } from 'lib/shared/user-utils.js';
import type { UserInfo } from 'lib/types/user-types';
import sleep from 'lib/utils/sleep.js';

import UserProfileMessageButton from './user-profile-message-button.react.js';
import css from './user-profile.css';
import UserAvatar from '../../avatars/user-avatar.react.js';

type Props = {
  +userInfo: ?UserInfo,
};

function UserProfile(props: Props): React.Node {
  const { userInfo } = props;

  const userProfileThreadInfo = useUserProfileThreadInfo(userInfo);

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

  const messageButton = React.useMemo(() => {
    if (
      !userProfileThreadInfo ||
      relationshipBlockedInEitherDirection(userInfo?.relationshipStatus)
    ) {
      return null;
    }

    return (
      <UserProfileMessageButton threadInfo={userProfileThreadInfo.threadInfo} />
    );
  }, [userInfo?.relationshipStatus, userProfileThreadInfo]);

  return (
    <div className={css.container}>
      <div className={css.userInfoContainer}>
        <UserAvatar userID={userInfo?.id} size="L" />
        <div className={css.usernameContainer}>
          <div className={css.usernameText}>{usernameText}</div>
          <div
            className={css.copyUsernameContainer}
            onClick={onClickCopyUsername}
          >
            <SWMansionIcon
              icon={!usernameCopied ? 'copy' : 'check'}
              size={16}
            />
            <p className={css.copyUsernameText}>
              {!usernameCopied ? 'Copy username' : 'Username copied!'}
            </p>
          </div>
        </div>
      </div>
      <div className={css.buttonsContainer}>{messageButton}</div>
    </div>
  );
}

export default UserProfile;
