// @flow

import type { RemoveMembersMessageData } from '../../types/message/remove-members';
import type { MessageSpec } from './message-spec';

export const removeMembersMessageSpec: MessageSpec<RemoveMembersMessageData> = Object.freeze(
  {
    messageContent(data) {
      return JSON.stringify(data.removedUserIDs);
    },
  },
);
