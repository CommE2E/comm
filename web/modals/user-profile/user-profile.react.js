// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import SWMansionIcon from 'lib/components/SWMansionIcon.react.js';
import { relationshipBlockedInEitherDirection } from 'lib/shared/relationship-utils.js';
import { stringForUserExplicit } from 'lib/shared/user-utils.js';
import type { UserProfileThreadInfo } from 'lib/types/thread-types';
import type { UserInfo } from 'lib/types/user-types';
import sleep from 'lib/utils/sleep.js';

import UserProfileActionButtons from './user-profile-action-buttons.react.js';
import UserProfileAvatarModal from './user-profile-avatar-modal.react.js';
import css from './user-profile.css';
import UserAvatar from '../../avatars/user-avatar.react.js';

type Props = {
  +userInfo: ?UserInfo,
  +userProfileThreadInfo: ?UserProfileThreadInfo,
};

function UserProfile(props: Props): React.Node {
  const { userInfo, userProfileThreadInfo } = props;

  const { pushModal } = useModalContext();

  const usernameText = stringForUserExplicit(userInfo);

  const [usernameCopied, setUsernameCopied] = React.useState<boolean>(false);

  const onClickUserAvatar = React.useCallback(() => {
    pushModal(<UserProfileAvatarModal userID={userInfo?.id} />);
  }, [pushModal, userInfo?.id]);

  const onClickCopyUsername = React.useCallback(async () => {
    if (usernameCopied) {
      return;
    }

    await navigator.clipboard.writeText(usernameText);
    setUsernameCopied(true);
    await sleep(3000);
    setUsernameCopied(false);
  }, [usernameCopied, usernameText]);

  const actionButtons = React.useMemo(() => {
    if (
      !userProfileThreadInfo ||
      relationshipBlockedInEitherDirection(userInfo?.relationshipStatus)
    ) {
      return null;
    }

    return (
      <UserProfileActionButtons threadInfo={userProfileThreadInfo.threadInfo} />
    );
  }, [userInfo?.relationshipStatus, userProfileThreadInfo]);

  const userProfile = React.useMemo(
    () => (
      <div className={css.container}>
        <div className={css.userInfoContainer}>
          <div className={css.userAvatarContainer} onClick={onClickUserAvatar}>
            <UserAvatar userID={userInfo?.id} size="L" />
          </div>
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
        {actionButtons}
      </div>
    ),
    [
      actionButtons,
      onClickCopyUsername,
      onClickUserAvatar,
      userInfo?.id,
      usernameCopied,
      usernameText,
    ],
  );

  return userProfile;
}

export default UserProfile;
