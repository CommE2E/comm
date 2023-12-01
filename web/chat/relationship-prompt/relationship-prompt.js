// @flow

import {
  faUserMinus,
  faUserPlus,
  faUserShield,
  faUserSlash,
} from '@fortawesome/free-solid-svg-icons';
import * as React from 'react';

import { useRelationshipPrompt } from 'lib/hooks/relationship-prompt.js';
import { userRelationshipStatus } from 'lib/types/relationship-types.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';

import RelationshipPromptButtonContainer from './relationship-prompt-button-container.js';
import RelationshipPromptButton from './relationship-prompt-button.js';
import { buttonThemes } from '../../components/button.react.js';

type Props = { +threadInfo: ThreadInfo };

function RelationshipPrompt(props: Props) {
  const { threadInfo } = props;
  const {
    otherUserInfo,
    callbacks: { blockUser, unblockUser, friendUser, unfriendUser },
  } = useRelationshipPrompt(threadInfo);
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
          text="Block User"
          icon={faUserShield}
          buttonColor={buttonThemes.danger}
          onClick={blockUser}
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
          text="Unblock User"
          icon={faUserShield}
          buttonColor={buttonThemes.success}
          onClick={unblockUser}
        />
      </RelationshipPromptButtonContainer>
    );
  } else if (relationshipStatus === userRelationshipStatus.REQUEST_RECEIVED) {
    return (
      <RelationshipPromptButtonContainer>
        <RelationshipPromptButton
          text="Accept Friend Request"
          icon={faUserPlus}
          buttonColor={buttonThemes.success}
          onClick={friendUser}
        />
        <RelationshipPromptButton
          text="Reject Friend Request"
          icon={faUserSlash}
          buttonColor={buttonThemes.danger}
          onClick={unfriendUser}
        />
      </RelationshipPromptButtonContainer>
    );
  } else if (relationshipStatus === userRelationshipStatus.REQUEST_SENT) {
    return (
      <RelationshipPromptButtonContainer>
        <RelationshipPromptButton
          text="Withdraw Friend Request"
          icon={faUserMinus}
          buttonColor={buttonThemes.danger}
          onClick={unfriendUser}
        />
      </RelationshipPromptButtonContainer>
    );
  } else {
    return (
      <RelationshipPromptButtonContainer>
        <RelationshipPromptButton
          text="Add Friend"
          icon={faUserPlus}
          buttonColor={buttonThemes.success}
          onClick={friendUser}
        />
        <RelationshipPromptButton
          text="Block User"
          icon={faUserShield}
          buttonColor={buttonThemes.danger}
          onClick={blockUser}
        />
      </RelationshipPromptButtonContainer>
    );
  }
}

const MemoizedRelationshipPrompt: React.ComponentType<Props> =
  React.memo(RelationshipPrompt);

export default MemoizedRelationshipPrompt;
