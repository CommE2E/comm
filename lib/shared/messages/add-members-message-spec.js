// @flow

import type { AddMembersMessageData } from '../../types/message/add-members';
import type { MessageSpec } from './message-spec';

export const addMembersMessageSpec: MessageSpec<AddMembersMessageData> = Object.freeze(
  {
    messageContent(data) {
      return JSON.stringify(data.addedUserIDs);
    },
  },
);
