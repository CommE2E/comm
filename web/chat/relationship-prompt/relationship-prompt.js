// @flow

import {
  faUserMinus,
  faUserPlus,
  faUserShield,
  faUserSlash,
} from '@fortawesome/free-solid-svg-icons';
import * as React from 'react';

import { useRelationshipPrompt } from 'lib/hooks/relationship-prompt.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import { userRelationshipStatus } from 'lib/types/relationship-types.js';
import type { UserInfo } from 'lib/types/user-types.js';

import RelationshipPromptButtonContainer from './relationship-prompt-button-container.js';
import RelationshipPromptButton from './relationship-prompt-button.js';
import { buttonThemes } from '../../components/button.react.js';

type Props = {
  +pendingPersonalThreadUserInfo: ?UserInfo,
  +threadInfo: ThreadInfo,
};
function RelationshipPrompt(props: Props) {
  const { threadInfo } = props;
  const {
    otherUserInfo,
    callbacks: { blockUser, unblockUser, friendUser, unfriendUser },
    loadingState: {
      isLoadingBlockUser,
      isLoadingUnblockUser,
      isLoadingFriendUser,
      isLoadingUnfriendUser,
    },
  } = useRelationshipPrompt(
    threadInfo,
    undefined,
    props.pendingPersonalThreadUserInfo,
  );
  if (!otherUserInfo?.username) {
    return null;
  }
  const relationshipStatus = otherUserInfo.relationshipStatus;

  if (relationshipStatus === userRelationshipStatus.FRIEND) {
    return null;
  } else if (relationshipStatus === userRelationshipStatus.BLOCKED_VIEWER) {
    return (
      <RelationshipPromptButtonContainer>
        <RelationshipPromptButton
          text="Block user"
          icon={faUserShield}
          buttonColor={buttonThemes.danger}
          onClick={blockUser}
          isLoading={isLoadingBlockUser}
        />
      </RelationshipPromptButtonContainer>
    );
  } else if (
    relationshipStatus === userRelationshipStatus.BOTH_BLOCKED ||
    relationshipStatus === userRelationshipStatus.BLOCKED_BY_VIEWER
  ) {
    return (
      <RelationshipPromptButtonContainer>
        <RelationshipPromptButton
          text="Unblock user"
          icon={faUserShield}
          buttonColor={buttonThemes.success}
          onClick={unblockUser}
          isLoading={isLoadingUnblockUser}
        />
      </RelationshipPromptButtonContainer>
    );
  } else if (relationshipStatus === userRelationshipStatus.REQUEST_RECEIVED) {
    return (
      <RelationshipPromptButtonContainer>
        <RelationshipPromptButton
          text="Accept friend request"
          icon={faUserPlus}
          buttonColor={buttonThemes.success}
          onClick={friendUser}
          isLoading={isLoadingFriendUser}
        />
        <RelationshipPromptButton
          text="Reject friend request"
          icon={faUserSlash}
          buttonColor={buttonThemes.danger}
          onClick={unfriendUser}
          isLoading={isLoadingUnfriendUser}
        />
      </RelationshipPromptButtonContainer>
    );
  } else if (relationshipStatus === userRelationshipStatus.REQUEST_SENT) {
    return (
      <RelationshipPromptButtonContainer>
        <RelationshipPromptButton
          text="Withdraw friend request"
          icon={faUserMinus}
          buttonColor={buttonThemes.danger}
          onClick={unfriendUser}
          isLoading={isLoadingUnfriendUser}
        />
      </RelationshipPromptButtonContainer>
    );
  } else {
    return (
      <RelationshipPromptButtonContainer>
        <RelationshipPromptButton
          text="Add friend"
          icon={faUserPlus}
          buttonColor={buttonThemes.success}
          onClick={friendUser}
          isLoading={isLoadingFriendUser}
        />
        <RelationshipPromptButton
          text="Block user"
          icon={faUserShield}
          buttonColor={buttonThemes.danger}
          onClick={blockUser}
          isLoading={isLoadingBlockUser}
        />
      </RelationshipPromptButtonContainer>
    );
  }
}

const MemoizedRelationshipPrompt: React.ComponentType<Props> =
  React.memo(RelationshipPrompt);

export default MemoizedRelationshipPrompt;
