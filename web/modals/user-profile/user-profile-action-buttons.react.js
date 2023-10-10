// @flow

import { faUserMinus, faUserPlus } from '@fortawesome/free-solid-svg-icons';
import classNames from 'classnames';
import * as React from 'react';

import { useRelationshipPrompt } from 'lib/hooks/relationship-prompt.js';
import { userRelationshipStatus } from 'lib/types/relationship-types.js';
import type { ThreadInfo } from 'lib/types/thread-types';

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
  } = useRelationshipPrompt(threadInfo);

  const singleButtonContainer = classNames([
    css.buttonContainer,
    css.singleButtonRowContainer,
  ]);

  const multiButtonsContainer = classNames([
    css.buttonContainer,
    css.multiButtonRowContainer,
  ]);

  const userProfileActionButtons = React.useMemo(() => {
    if (
      !otherUserInfo ||
      otherUserInfo.relationshipStatus === userRelationshipStatus.FRIEND
    ) {
      return (
        <div className={singleButtonContainer}>
          <UserProfileMessageButton threadInfo={threadInfo} />
        </div>
      );
    }

    if (
      otherUserInfo.relationshipStatus ===
      userRelationshipStatus.REQUEST_RECEIVED
    ) {
      return (
        <div className={css.buttonContainer}>
          <UserProfileMessageButton threadInfo={threadInfo} />
          <div>
            <p className={css.incomingFriendRequestText}>
              Incoming friend request
            </p>
            <div className={css.multiButtonRowContainer}>
              <RelationshipPromptButton
                text="Accept"
                icon={faUserPlus}
                buttonColor={buttonThemes.success}
                onClick={friendUser}
                className={css.actionButton}
              />
              <RelationshipPromptButton
                text="Reject"
                icon={faUserMinus}
                buttonColor={buttonThemes.danger}
                onClick={unfriendUser}
                className={css.actionButton}
              />
            </div>
          </div>
        </div>
      );
    }

    if (
      otherUserInfo.relationshipStatus === userRelationshipStatus.REQUEST_SENT
    ) {
      return (
        <div className={multiButtonsContainer}>
          <RelationshipPromptButton
            text="Withdraw Friend Request"
            icon={faUserMinus}
            buttonColor={buttonThemes.danger}
            onClick={unfriendUser}
            className={css.actionButton}
          />
          <UserProfileMessageButton threadInfo={threadInfo} />
        </div>
      );
    }
    return (
      <div className={multiButtonsContainer}>
        <RelationshipPromptButton
          text="Add Friend"
          icon={faUserPlus}
          buttonColor={buttonThemes.success}
          onClick={friendUser}
          className={css.actionButton}
        />
        <UserProfileMessageButton threadInfo={threadInfo} />
      </div>
    );
  }, [
    otherUserInfo,
    multiButtonsContainer,
    friendUser,
    threadInfo,
    singleButtonContainer,
    unfriendUser,
  ]);

  return userProfileActionButtons;
}

export default UserProfileActionButtons;
