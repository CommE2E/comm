// @flow

import { faUserMinus, faUserPlus } from '@fortawesome/free-solid-svg-icons';
import * as React from 'react';

import { useRelationshipPrompt } from 'lib/hooks/relationship-prompt.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import { userRelationshipStatus } from 'lib/types/relationship-types.js';

import UserProfileMessageButton from './user-profile-message-button.react.js';
import css from './user-profile.css';
import RelationshipPromptButton from '../../chat/relationship-prompt/relationship-prompt-button.js';
import { buttonThemes } from '../../components/button.react.js';

type Props = {
  +threadInfo: ThreadInfo,
};

function UserProfileActionButtons(props: Props): React.Node {
  const { threadInfo } = props;

  const {
    otherUserInfo,
    callbacks: { friendUser, unfriendUser },
    loadingState: { isLoadingFriendUser, isLoadingUnfriendUser },
  } = useRelationshipPrompt(threadInfo);

  const userProfileActionButtons = React.useMemo(() => {
    if (
      !otherUserInfo ||
      otherUserInfo.relationshipStatus === userRelationshipStatus.FRIEND
    ) {
      return <UserProfileMessageButton threadInfo={threadInfo} />;
    }

    if (
      otherUserInfo.relationshipStatus ===
      userRelationshipStatus.REQUEST_RECEIVED
    ) {
      return (
        <>
          <UserProfileMessageButton threadInfo={threadInfo} />
          <div>
            <p className={css.incomingFriendRequestText}>
              Incoming friend request
            </p>
            <div className={css.multiButtonRowContainer}>
              <RelationshipPromptButton
                text="Accept friend request"
                icon={faUserPlus}
                buttonColor={buttonThemes.success}
                onClick={friendUser}
                isLoading={isLoadingFriendUser}
                className={css.actionButton}
              />
              <RelationshipPromptButton
                text="Reject friend request"
                icon={faUserMinus}
                buttonColor={buttonThemes.danger}
                onClick={unfriendUser}
                isLoading={isLoadingUnfriendUser}
                className={css.actionButton}
              />
            </div>
          </div>
        </>
      );
    }

    if (
      otherUserInfo.relationshipStatus === userRelationshipStatus.REQUEST_SENT
    ) {
      return (
        <div className={css.multiButtonRowContainer}>
          <RelationshipPromptButton
            text="Withdraw friend request"
            icon={faUserMinus}
            buttonColor={buttonThemes.danger}
            onClick={unfriendUser}
            isLoading={isLoadingUnfriendUser}
            className={css.actionButton}
          />
          <UserProfileMessageButton threadInfo={threadInfo} />
        </div>
      );
    }
    return (
      <div className={css.multiButtonRowContainer}>
        <RelationshipPromptButton
          text="Add friend"
          icon={faUserPlus}
          buttonColor={buttonThemes.success}
          onClick={friendUser}
          isLoading={isLoadingFriendUser}
          className={css.actionButton}
        />
        <UserProfileMessageButton threadInfo={threadInfo} />
      </div>
    );
  }, [
    otherUserInfo,
    friendUser,
    isLoadingFriendUser,
    threadInfo,
    unfriendUser,
    isLoadingUnfriendUser,
  ]);

  return userProfileActionButtons;
}

export default UserProfileActionButtons;
