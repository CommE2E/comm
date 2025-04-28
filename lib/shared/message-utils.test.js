// @flow

import { sortMessageIDs, sortMessageInfoList } from './id-utils.js';
import {
  isInvalidSidebarSource,
  isInvalidPinSource,
  isUnableToBeRenderedIndependently,
  findNewestMessageTimePerKeyserver,
} from './message-utils.js';
import { messageSpecs } from '../shared/messages/message-specs.js';
import type {
  RawMessageInfo,
  RawSidebarSourceMessageInfo,
} from '../types/message-types';
import { messageTypes } from '../types/message-types-enum.js';
import type { RawAddMembersMessageInfo } from '../types/messages/add-members.js';
import type { RawChangeRoleMessageInfo } from '../types/messages/change-role.js';
import type { RawChangeSettingsMessageInfo } from '../types/messages/change-settings.js';
import type { RawCreateEntryMessageInfo } from '../types/messages/create-entry.js';
import type { RawCreateSidebarMessageInfo } from '../types/messages/create-sidebar.js';
import type { RawCreateSubthreadMessageInfo } from '../types/messages/create-subthread.js';
import type { RawCreateThreadMessageInfo } from '../types/messages/create-thread.js';
import type { RawDeleteEntryMessageInfo } from '../types/messages/delete-entry.js';
import type { RawEditEntryMessageInfo } from '../types/messages/edit-entry.js';
import type { RawEditMessageInfo } from '../types/messages/edit.js';
import type { RawImagesMessageInfo } from '../types/messages/images.js';
import type { RawJoinThreadMessageInfo } from '../types/messages/join-thread.js';
import type { RawLeaveThreadMessageInfo } from '../types/messages/leave-thread.js';
import type { RawLegacyUpdateRelationshipMessageInfo } from '../types/messages/legacy-update-relationship.js';
import type { RawMediaMessageInfo } from '../types/messages/media.js';
import type { RawReactionMessageInfo } from '../types/messages/reaction.js';
import type { RawRemoveMembersMessageInfo } from '../types/messages/remove-members.js';
import type { RawRestoreEntryMessageInfo } from '../types/messages/restore-entry.js';
import type { RawTextMessageInfo } from '../types/messages/text.js';
import type { RawTogglePinMessageInfo } from '../types/messages/toggle-pin.js';
import { threadTypes } from '../types/thread-types-enum.js';

const textMessageInfo: RawTextMessageInfo = {
  type: messageTypes.TEXT,
  localID: 'local1',
  threadID: '10001',
  creatorID: '123',
  time: 10000,
  text: 'This is a text message',
  id: '1',
};
const createThreadMessageInfo: RawCreateThreadMessageInfo = {
  type: 1,
  threadID: '10001',
  creatorID: '123',
  time: 10000,
  initialThreadState: {
    type: threadTypes.COMMUNITY_ROOT,
    name: 'Random Thread',
    parentThreadID: '10000',
    color: '#FFFFFF',
    memberIDs: ['1', '2', '3'],
  },
  id: '1',
};
const addMembersMessageInfo: RawAddMembersMessageInfo = {
  type: messageTypes.ADD_MEMBERS,
  threadID: '10001',
  creatorID: '123',
  time: 10000,
  addedUserIDs: ['4', '5'],
  id: '1',
};
const createSubthreadMessageInfo: RawCreateSubthreadMessageInfo = {
  type: messageTypes.CREATE_SUB_THREAD,
  threadID: '10001',
  creatorID: '123',
  time: 10000,
  childThreadID: '10002',
  id: '1',
};
const changeSettingsMessageInfo: RawChangeSettingsMessageInfo = {
  type: messageTypes.CHANGE_SETTINGS,
  threadID: '10000',
  creatorID: '123',
  time: 10000,
  field: 'color',
  value: '#FFFFFF',
  id: '1',
};
const removeMembersMessageInfo: RawRemoveMembersMessageInfo = {
  type: messageTypes.REMOVE_MEMBERS,
  threadID: '10000',
  creatorID: '123',
  time: 10000,
  removedUserIDs: ['1', '2', '3'],
  id: '1',
};
const changeRoleMessageinfo: RawChangeRoleMessageInfo = {
  type: messageTypes.CHANGE_ROLE,
  threadID: '10000',
  creatorID: '123',
  time: 10000,
  userIDs: ['1', '2', '3'],
  newRole: '101',
  roleName: 'Moderators',
  id: '1',
};
const leaveThreadMessageInfo: RawLeaveThreadMessageInfo = {
  type: messageTypes.LEAVE_THREAD,
  threadID: '10000',
  creatorID: '123',
  time: 10000,
  id: '1',
};
const joinThreadMessageInfo: RawJoinThreadMessageInfo = {
  type: messageTypes.JOIN_THREAD,
  threadID: '10000',
  creatorID: '123',
  time: 10000,
  id: '1',
};
const createEntryMessageInfo: RawCreateEntryMessageInfo = {
  type: messageTypes.CREATE_ENTRY,
  threadID: '10000',
  creatorID: '123',
  time: 10000,
  entryID: '001',
  date: '2018-01-01',
  text: 'This is a calendar entry',
  id: '1',
};
const editEntryMessageInfo: RawEditEntryMessageInfo = {
  type: messageTypes.EDIT_ENTRY,
  threadID: '10000',
  creatorID: '123',
  time: 10000,
  entryID: '001',
  date: '2018-01-01',
  text: 'This is an edited calendar entry',
  id: '1',
};
const deleteEntryMessageInfo: RawDeleteEntryMessageInfo = {
  type: messageTypes.DELETE_ENTRY,
  threadID: '10000',
  creatorID: '123',
  time: 10000,
  entryID: '001',
  date: '2018-01-01',
  text: 'This is a deleted calendar entry',
  id: '1',
};
const restoreEntryMessageInfo: RawRestoreEntryMessageInfo = {
  type: messageTypes.RESTORE_ENTRY,
  threadID: '10000',
  creatorID: '123',
  time: 10000,
  entryID: '001',
  date: '2018-01-01',
  text: 'This is a restored calendar entry',
  id: '1',
};
const updateRelationshipMessageInfo: RawLegacyUpdateRelationshipMessageInfo = {
  type: messageTypes.LEGACY_UPDATE_RELATIONSHIP,
  threadID: '10000',
  creatorID: '123',
  targetID: '456',
  time: 10000,
  operation: 'request_sent',
  id: '1',
};
const imageMessageInfo: RawImagesMessageInfo = {
  type: messageTypes.IMAGES,
  localID: 'local1',
  threadID: '10001',
  creatorID: '123',
  time: 10000,
  media: [
    {
      id: '1',
      uri: 'https://example.com/image1.jpg',
      type: 'photo',
      dimensions: {
        height: 100,
        width: 100,
      },
      thumbHash: '1234567890',
    },
  ],
  id: '1',
};
const mediaMessageInfo: RawMediaMessageInfo = {
  type: messageTypes.MULTIMEDIA,
  localID: 'local1',
  threadID: '10001',
  creatorID: '123',
  time: 10000,
  media: [
    {
      id: '1',
      uri: 'https://example.com/image1.jpg',
      type: 'photo',
      dimensions: {
        height: 100,
        width: 100,
      },
      thumbHash: '1234567890',
    },
  ],
  id: '1',
};
const sidebarSourceMessageInfo: RawSidebarSourceMessageInfo = {
  type: messageTypes.SIDEBAR_SOURCE,
  threadID: '10000',
  creatorID: '123',
  time: 10000,
  sourceMessage: {
    type: messageTypes.TEXT,
    localID: 'local1',
    threadID: '10001',
    creatorID: '123',
    time: 10000,
    text: 'This is a text message',
    id: '1',
  },
  id: '1',
};
const createSidebarMessageInfo: RawCreateSidebarMessageInfo = {
  type: messageTypes.CREATE_SIDEBAR,
  threadID: '10000',
  creatorID: '123',
  time: 10000,
  sourceMessageAuthorID: '123',
  initialThreadState: {
    name: 'Random Thread',
    parentThreadID: '10000',
    color: '#FFFFFF',
    memberIDs: ['1', '2', '3'],
  },
  id: '1',
};
const reactionMessageInfo: RawReactionMessageInfo = {
  type: messageTypes.REACTION,
  localID: 'local1',
  threadID: '10001',
  creatorID: '123',
  time: 10000,
  targetMessageID: '1',
  reaction: 'like',
  action: 'add_reaction',
  id: '1',
};
const editMessageInfo: RawEditMessageInfo = {
  type: messageTypes.EDIT_MESSAGE,
  threadID: '10000',
  creatorID: '123',
  time: 10000,
  targetMessageID: '1',
  text: 'This is an edited message',
  id: '1',
};
const togglePinMessageInfo: RawTogglePinMessageInfo = {
  type: messageTypes.TOGGLE_PIN,
  threadID: '10000',
  targetMessageID: '1',
  action: 'pin',
  pinnedContent: 'a message',
  creatorID: '123',
  time: 10000,
  id: '1',
};

describe('isInvalidSidebarSource & canBeSidebarSource', () => {
  it('should return false for RawTextMessageInfo', () => {
    const messageSpec = messageSpecs[messageTypes.TEXT];

    const shouldBeInvalidSidebarSource =
      isInvalidSidebarSource(textMessageInfo);
    const canBeSidebarSource = messageSpec.canBeSidebarSource;

    expect(shouldBeInvalidSidebarSource).toBe(false);
    expect(canBeSidebarSource).toBe(true);
  });

  it('should return false for RawCreateThreadMessageInfo', () => {
    const messageSpec = messageSpecs[messageTypes.CREATE_THREAD];

    const shouldBeInvalidSidebarSource = isInvalidSidebarSource(
      createThreadMessageInfo,
    );
    const canBeSidebarSource = messageSpec.canBeSidebarSource;

    expect(shouldBeInvalidSidebarSource).toBe(false);
    expect(canBeSidebarSource).toBe(true);
  });

  it('should return false for RawAddMembersMessageInfo', () => {
    const messageSpec = messageSpecs[messageTypes.ADD_MEMBERS];

    const shouldBeInvalidSidebarSource = isInvalidSidebarSource(
      addMembersMessageInfo,
    );
    const canBeSidebarSource = messageSpec.canBeSidebarSource;

    expect(shouldBeInvalidSidebarSource).toBe(false);
    expect(canBeSidebarSource).toBe(true);
  });

  it('should return false for RawCreateSubthreadMessageInfo', () => {
    const messageSpec = messageSpecs[messageTypes.CREATE_SUB_THREAD];

    const shouldBeInvalidSidebarSource = isInvalidSidebarSource(
      createSubthreadMessageInfo,
    );
    const canBeSidebarSource = messageSpec.canBeSidebarSource;

    expect(shouldBeInvalidSidebarSource).toBe(false);
    expect(canBeSidebarSource).toBe(true);
  });

  it('should return false for RawChangeSettingsMessageInfo', () => {
    const messageSpec = messageSpecs[messageTypes.CHANGE_SETTINGS];

    const shouldBeInvalidSidebarSource = isInvalidSidebarSource(
      changeSettingsMessageInfo,
    );
    const canBeSidebarSource = messageSpec.canBeSidebarSource;

    expect(shouldBeInvalidSidebarSource).toBe(false);
    expect(canBeSidebarSource).toBe(true);
  });

  it('should return false for RawRemoveMembersMessageInfo', () => {
    const messageSpec = messageSpecs[messageTypes.REMOVE_MEMBERS];

    const shouldBeInvalidSidebarSource = isInvalidSidebarSource(
      removeMembersMessageInfo,
    );
    const canBeSidebarSource = messageSpec.canBeSidebarSource;

    expect(shouldBeInvalidSidebarSource).toBe(false);
    expect(canBeSidebarSource).toBe(true);
  });

  it('should return false for RawChangeRoleMessageInfo', () => {
    const messageSpec = messageSpecs[messageTypes.CHANGE_ROLE];

    const shouldBeInvalidSidebarSource = isInvalidSidebarSource(
      changeRoleMessageinfo,
    );
    const canBeSidebarSource = messageSpec.canBeSidebarSource;

    expect(shouldBeInvalidSidebarSource).toBe(false);
    expect(canBeSidebarSource).toBe(true);
  });

  it('should return false for RawLeaveThreadMessageInfo', () => {
    const messageSpec = messageSpecs[messageTypes.LEAVE_THREAD];

    const shouldBeInvalidSidebarSource = isInvalidSidebarSource(
      leaveThreadMessageInfo,
    );
    const canBeSidebarSource = messageSpec.canBeSidebarSource;

    expect(shouldBeInvalidSidebarSource).toBe(false);
    expect(canBeSidebarSource).toBe(true);
  });

  it('should return false for RawJoinThreadMessageInfo', () => {
    const messageSpec = messageSpecs[messageTypes.JOIN_THREAD];

    const shouldBeInvalidSidebarSource = isInvalidSidebarSource(
      joinThreadMessageInfo,
    );
    const canBeSidebarSource = messageSpec.canBeSidebarSource;

    expect(shouldBeInvalidSidebarSource).toBe(false);
    expect(canBeSidebarSource).toBe(true);
  });

  it('should return false for RawCreateEntryMessageInfo', () => {
    const messageSpec = messageSpecs[messageTypes.CREATE_ENTRY];

    const shouldBeInvalidSidebarSource = isInvalidSidebarSource(
      createEntryMessageInfo,
    );
    const canBeSidebarSource = messageSpec.canBeSidebarSource;

    expect(shouldBeInvalidSidebarSource).toBe(false);
    expect(canBeSidebarSource).toBe(true);
  });

  it('should return false for RawEditEntryMessageInfo', () => {
    const messageSpec = messageSpecs[messageTypes.EDIT_ENTRY];

    const shouldBeInvalidSidebarSource =
      isInvalidSidebarSource(editEntryMessageInfo);
    const canBeSidebarSource = messageSpec.canBeSidebarSource;

    expect(shouldBeInvalidSidebarSource).toBe(false);
    expect(canBeSidebarSource).toBe(true);
  });

  it('should return false for RawDeleteEntryMessageInfo', () => {
    const messageSpec = messageSpecs[messageTypes.DELETE_ENTRY];

    const shouldBeInvalidSidebarSource = isInvalidSidebarSource(
      deleteEntryMessageInfo,
    );
    const canBeSidebarSource = messageSpec.canBeSidebarSource;

    expect(shouldBeInvalidSidebarSource).toBe(false);
    expect(canBeSidebarSource).toBe(true);
  });

  it('should return false for RawRestoreEntryMessageInfo', () => {
    const messageSpec = messageSpecs[messageTypes.RESTORE_ENTRY];

    const shouldBeInvalidSidebarSource = isInvalidSidebarSource(
      restoreEntryMessageInfo,
    );
    const canBeSidebarSource = messageSpec.canBeSidebarSource;

    expect(shouldBeInvalidSidebarSource).toBe(false);
    expect(canBeSidebarSource).toBe(true);
  });

  it('should return false for RawUpdateRelationshipMessageInfo', () => {
    const messageSpec = messageSpecs[messageTypes.LEGACY_UPDATE_RELATIONSHIP];

    const shouldBeInvalidSidebarSource = isInvalidSidebarSource(
      updateRelationshipMessageInfo,
    );
    const canBeSidebarSource = messageSpec.canBeSidebarSource;

    expect(shouldBeInvalidSidebarSource).toBe(false);
    expect(canBeSidebarSource).toBe(true);
  });

  it('should return false for RawImagesMessageInfo', () => {
    const messageSpec = messageSpecs[messageTypes.IMAGES];

    const shouldBeInvalidSidebarSource =
      isInvalidSidebarSource(imageMessageInfo);
    const canBeSidebarSource = messageSpec.canBeSidebarSource;

    expect(shouldBeInvalidSidebarSource).toBe(false);
    expect(canBeSidebarSource).toBe(true);
  });

  it('should return false for RawMediaMessageInfo', () => {
    const messageSpec = messageSpecs[messageTypes.MULTIMEDIA];

    const shouldBeInvalidSidebarSource =
      isInvalidSidebarSource(mediaMessageInfo);
    const canBeSidebarSource = messageSpec.canBeSidebarSource;

    expect(shouldBeInvalidSidebarSource).toBe(false);
    expect(canBeSidebarSource).toBe(true);
  });

  it('should return true for RawSidebarSourceMessageInfo', () => {
    const messageSpec = messageSpecs[messageTypes.SIDEBAR_SOURCE];

    const shouldBeInvalidSidebarSource = isInvalidSidebarSource(
      sidebarSourceMessageInfo,
    );
    const canBeSidebarSource = messageSpec.canBeSidebarSource;

    expect(shouldBeInvalidSidebarSource).toBe(true);
    expect(canBeSidebarSource).toBe(false);
  });

  it('should return false for RawCreateSidebarMessageInfo', () => {
    const messageSpec = messageSpecs[messageTypes.CREATE_SIDEBAR];

    const shouldBeInvalidSidebarSource = isInvalidSidebarSource(
      createSidebarMessageInfo,
    );
    const canBeSidebarSource = messageSpec.canBeSidebarSource;

    expect(shouldBeInvalidSidebarSource).toBe(false);
    expect(canBeSidebarSource).toBe(true);
  });

  it('should return true for RawReactionMessageInfo', () => {
    const messageSpec = messageSpecs[messageTypes.REACTION];

    const shouldBeInvalidSidebarSource =
      isInvalidSidebarSource(reactionMessageInfo);
    const canBeSidebarSource = messageSpec.canBeSidebarSource;

    expect(shouldBeInvalidSidebarSource).toBe(true);
    expect(canBeSidebarSource).toBe(false);
  });

  it('should return true for RawEditMessageInfo', () => {
    const messageSpec = messageSpecs[messageTypes.EDIT_MESSAGE];

    const shouldBeInvalidSidebarSource =
      isInvalidSidebarSource(editMessageInfo);
    const canBeSidebarSource = messageSpec.canBeSidebarSource;

    expect(shouldBeInvalidSidebarSource).toBe(true);
    expect(canBeSidebarSource).toBe(false);
  });

  it('should return true for RawTogglePinMessageInfo', () => {
    const messageSpec = messageSpecs[messageTypes.TOGGLE_PIN];

    const shouldBeInvalidSidebarSource =
      isInvalidSidebarSource(togglePinMessageInfo);
    const canBeSidebarSource = messageSpec.canBeSidebarSource;

    expect(shouldBeInvalidSidebarSource).toBe(true);
    expect(canBeSidebarSource).toBe(false);
  });
});

describe('isInvalidPinSource & canBePinned', () => {
  it('should return true for RawTextMessageInfo', () => {
    const messageSpec = messageSpecs[messageTypes.TEXT];

    const shouldBeInvalidPinSource = isInvalidPinSource(textMessageInfo);
    const canBePinned = messageSpec.canBePinned;

    expect(shouldBeInvalidPinSource).toBe(false);
    expect(canBePinned).toBe(true);
  });

  it('should return false for RawCreateThreadMessageInfo', () => {
    const messageSpec = messageSpecs[messageTypes.CREATE_THREAD];

    const shouldBeInvalidPinSource = isInvalidPinSource(
      createThreadMessageInfo,
    );
    const canBePinned = messageSpec.canBePinned;

    expect(shouldBeInvalidPinSource).toBe(true);
    expect(canBePinned).toBe(false);
  });

  it('should return false for RawAddMembersMessageInfo', () => {
    const messageSpec = messageSpecs[messageTypes.ADD_MEMBERS];

    const shouldBeInvalidPinSource = isInvalidPinSource(addMembersMessageInfo);
    const canBePinned = messageSpec.canBePinned;

    expect(shouldBeInvalidPinSource).toBe(true);
    expect(canBePinned).toBe(false);
  });

  it('should return false for RawCreateSubthreadMessageInfo', () => {
    const messageSpec = messageSpecs[messageTypes.CREATE_SUB_THREAD];

    const shouldBeInvalidPinSource = isInvalidPinSource(
      createSubthreadMessageInfo,
    );
    const canBePinned = messageSpec.canBePinned;

    expect(shouldBeInvalidPinSource).toBe(true);
    expect(canBePinned).toBe(false);
  });

  it('should return false for RawChangeSettingsMessageInfo', () => {
    const messageSpec = messageSpecs[messageTypes.CHANGE_SETTINGS];

    const shouldBeInvalidPinSource = isInvalidPinSource(
      changeSettingsMessageInfo,
    );
    const canBePinned = messageSpec.canBePinned;

    expect(shouldBeInvalidPinSource).toBe(true);
    expect(canBePinned).toBe(false);
  });

  it('should return false for RawRemoveMembersMessageInfo', () => {
    const messageSpec = messageSpecs[messageTypes.REMOVE_MEMBERS];

    const shouldBeInvalidPinSource = isInvalidPinSource(
      removeMembersMessageInfo,
    );
    const canBePinned = messageSpec.canBePinned;

    expect(shouldBeInvalidPinSource).toBe(true);
    expect(canBePinned).toBe(false);
  });

  it('should return false for RawChangeRoleMessageInfo', () => {
    const messageSpec = messageSpecs[messageTypes.CHANGE_ROLE];

    const shouldBeInvalidPinSource = isInvalidPinSource(changeRoleMessageinfo);
    const canBePinned = messageSpec.canBePinned;

    expect(shouldBeInvalidPinSource).toBe(true);
    expect(canBePinned).toBe(false);
  });

  it('should return false for RawLeaveThreadMessageInfo', () => {
    const messageSpec = messageSpecs[messageTypes.LEAVE_THREAD];

    const shouldBeInvalidPinSource = isInvalidPinSource(leaveThreadMessageInfo);
    const canBePinned = messageSpec.canBePinned;

    expect(shouldBeInvalidPinSource).toBe(true);
    expect(canBePinned).toBe(false);
  });

  it('should return false for RawJoinThreadMessageInfo', () => {
    const messageSpec = messageSpecs[messageTypes.JOIN_THREAD];

    const shouldBeInvalidPinSource = isInvalidPinSource(joinThreadMessageInfo);
    const canBePinned = messageSpec.canBePinned;

    expect(shouldBeInvalidPinSource).toBe(true);
    expect(canBePinned).toBe(false);
  });

  it('should return false for RawCreateEntryMessageInfo', () => {
    const messageSpec = messageSpecs[messageTypes.CREATE_ENTRY];

    const shouldBeInvalidPinSource = isInvalidPinSource(createEntryMessageInfo);
    const canBePinned = messageSpec.canBePinned;

    expect(shouldBeInvalidPinSource).toBe(true);
    expect(canBePinned).toBe(false);
  });

  it('should return false for RawEditEntryMessageInfo', () => {
    const messageSpec = messageSpecs[messageTypes.EDIT_ENTRY];

    const shouldBeInvalidPinSource = isInvalidPinSource(editEntryMessageInfo);
    const canBePinned = messageSpec.canBePinned;

    expect(shouldBeInvalidPinSource).toBe(true);
    expect(canBePinned).toBe(false);
  });

  it('should return false for RawDeleteEntryMessageInfo', () => {
    const messageSpec = messageSpecs[messageTypes.DELETE_ENTRY];

    const shouldBeInvalidPinSource = isInvalidPinSource(deleteEntryMessageInfo);
    const canBePinned = messageSpec.canBePinned;

    expect(shouldBeInvalidPinSource).toBe(true);
    expect(canBePinned).toBe(false);
  });

  it('should return false for RawRestoreEntryMessageInfo', () => {
    const messageSpec = messageSpecs[messageTypes.RESTORE_ENTRY];

    const shouldBeInvalidPinSource = isInvalidPinSource(
      restoreEntryMessageInfo,
    );
    const canBePinned = messageSpec.canBePinned;

    expect(shouldBeInvalidPinSource).toBe(true);
    expect(canBePinned).toBe(false);
  });

  it('should return false for RawUpdateRelationshipMessageInfo', () => {
    const messageSpec = messageSpecs[messageTypes.LEGACY_UPDATE_RELATIONSHIP];

    const shouldBeInvalidPinSource = isInvalidPinSource(
      updateRelationshipMessageInfo,
    );
    const canBePinned = messageSpec.canBePinned;

    expect(shouldBeInvalidPinSource).toBe(true);
    expect(canBePinned).toBe(false);
  });

  it('should return true for RawImagesMessageInfo', () => {
    const messageSpec = messageSpecs[messageTypes.IMAGES];

    const shouldBeInvalidPinSource = isInvalidPinSource(imageMessageInfo);
    const canBePinned = messageSpec.canBePinned;

    expect(shouldBeInvalidPinSource).toBe(false);
    expect(canBePinned).toBe(true);
  });

  it('should return true for RawMediaMessageInfo', () => {
    const messageSpec = messageSpecs[messageTypes.MULTIMEDIA];

    const shouldBeInvalidPinSource = isInvalidPinSource(mediaMessageInfo);
    const canBePinned = messageSpec.canBePinned;

    expect(shouldBeInvalidPinSource).toBe(false);
    expect(canBePinned).toBe(true);
  });

  it('should return false for RawSidebarSourceMessageInfo', () => {
    const messageSpec = messageSpecs[messageTypes.SIDEBAR_SOURCE];

    const shouldBeInvalidPinSource = isInvalidPinSource(
      sidebarSourceMessageInfo,
    );
    const canBePinned = messageSpec.canBePinned;

    expect(shouldBeInvalidPinSource).toBe(true);
    expect(canBePinned).toBe(false);
  });

  it('should return false for RawCreateSidebarMessageInfo', () => {
    const messageSpec = messageSpecs[messageTypes.CREATE_SIDEBAR];

    const shouldBeInvalidPinSource = isInvalidPinSource(
      createSidebarMessageInfo,
    );
    const canBePinned = messageSpec.canBePinned;

    expect(shouldBeInvalidPinSource).toBe(true);
    expect(canBePinned).toBe(false);
  });

  it('should return false for RawReactionMessageInfo', () => {
    const messageSpec = messageSpecs[messageTypes.REACTION];

    const shouldBeInvalidPinSource = isInvalidPinSource(reactionMessageInfo);
    const canBePinned = messageSpec.canBePinned;

    expect(shouldBeInvalidPinSource).toBe(true);
    expect(canBePinned).toBe(false);
  });

  it('should return false for RawEditMessageInfo', () => {
    const messageSpec = messageSpecs[messageTypes.EDIT_MESSAGE];

    const shouldBeInvalidPinSource = isInvalidPinSource(editMessageInfo);
    const canBePinned = messageSpec.canBePinned;

    expect(shouldBeInvalidPinSource).toBe(true);
    expect(canBePinned).toBe(false);
  });

  it('should return false for RawTogglePinMessageInfo', () => {
    const messageSpec = messageSpecs[messageTypes.TOGGLE_PIN];

    const shouldBeInvalidPinSource = isInvalidPinSource(togglePinMessageInfo);
    const canBePinned = messageSpec.canBePinned;

    expect(shouldBeInvalidPinSource).toBe(true);
    expect(canBePinned).toBe(false);
  });

  describe('isUnableToBeRenderedIndependently & canBeRenderedIndependently', () => {
    it('should return false for RawReactionMessageInfo', () => {
      const messageSpec = messageSpecs[messageTypes.REACTION];

      const shouldBeUnableToBeRenderedIndependently =
        isUnableToBeRenderedIndependently(reactionMessageInfo);
      const canBeRenderedIndependently = messageSpec.canBeRenderedIndependently;

      expect(shouldBeUnableToBeRenderedIndependently).toBe(true);
      expect(canBeRenderedIndependently).toBe(false);
    });

    it('should return false for RawEditMessageInfo', () => {
      const messageSpec = messageSpecs[messageTypes.EDIT_MESSAGE];

      const shouldBeUnableToBeRenderedIndependently =
        isUnableToBeRenderedIndependently(editMessageInfo);
      const canBeRenderedIndependently = messageSpec.canBeRenderedIndependently;

      expect(shouldBeUnableToBeRenderedIndependently).toBe(true);
      expect(canBeRenderedIndependently).toBe(false);
    });
  });
});

describe('findNewestMessageTimePerKeyserver', () => {
  it('should return the time of the newest message for every keyserver', () => {
    const messages: $ReadOnlyArray<RawMessageInfo> = [
      {
        type: 0,
        threadID: '256|100',
        creatorID: '256',
        time: 4,
        text: 'test',
      },
      {
        type: 0,
        threadID: '1|100',
        creatorID: '256',
        time: 2,
        text: 'test',
      },
      {
        type: 0,
        threadID: '1|100',
        creatorID: '256',
        time: 3,
        text: 'test',
      },
      {
        type: 0,
        threadID: '256|100',
        creatorID: '256',
        time: 1,
        text: 'test',
      },
    ];

    const result = { ['256']: 4, ['1']: 3 };
    expect(findNewestMessageTimePerKeyserver(messages)).toEqual(result);
  });
});

describe('sortMessageInfoList', () => {
  it(
    'should sort messages by time and then by the number in id. ' +
      'Local ids should be sorted lexicographically',
    () => {
      const messages: $ReadOnlyArray<RawMessageInfo> = [
        {
          type: 0,
          threadID: '256|100',
          creatorID: '256',
          time: 4,
          text: 'test',
          id: '256|9',
        },
        {
          type: 0,
          threadID: '256|100',
          creatorID: '256',
          time: 2,
          text: 'test',
          localID: 'local100',
        },
        {
          type: 0,
          threadID: '256|100',
          creatorID: '256',
          time: 1,
          text: 'test',
          id: '256|1',
        },
        {
          type: 0,
          threadID: '256|100',
          creatorID: '256',
          time: 1,
          text: 'test',
          localID: 'local20',
        },
        {
          type: 0,
          threadID: '256|100',
          creatorID: '256',
          time: 1,
          text: 'test',
          localID: 'local100',
        },
        {
          type: 0,
          threadID: '256|100',
          creatorID: '256',
          time: 1,
          text: 'test',
          id: '256|20',
        },
      ];
      const result = sortMessageInfoList(messages);
      expect(result.map(item => item.id ?? item.localID)).toEqual([
        '256|9',
        'local100',
        'local20',
        'local100',
        '256|20',
        '256|1',
      ]);
    },
  );

  it('on the keyserver, should sort messages by time and then by id', () => {
    const messages: $ReadOnlyArray<RawMessageInfo> = [
      {
        type: 0,
        threadID: '100',
        creatorID: '256',
        time: 4,
        text: 'test',
        id: '9',
      },
      {
        type: 0,
        threadID: '100',
        creatorID: '256',
        time: 2,
        text: 'test',
        localID: '100',
      },
      {
        type: 0,
        threadID: '100',
        creatorID: '256',
        time: 1,
        text: 'test',
        id: '1',
      },
      {
        type: 0,
        threadID: '100',
        creatorID: '256',
        time: 1,
        text: 'test',
        localID: '10',
      },
      {
        type: 0,
        threadID: '100',
        creatorID: '256',
        time: 1,
        text: 'test',
        localID: '200',
      },
      {
        type: 0,
        threadID: '100',
        creatorID: '256',
        time: 1,
        text: 'test',
        id: '20',
      },
    ];
    const result = sortMessageInfoList(messages);
    expect(result.map(item => item.id ?? item.localID)).toEqual([
      '9',
      '100',
      '200',
      '20',
      '10',
      '1',
    ]);
  });
});

describe('sortMessageIDs', () => {
  it(
    'should sort messages by time and then by the number in id. ' +
      'Local ids should be sorted lexicographically',
    () => {
      const messages = {
        ['256|0']: {
          type: 0,
          threadID: '100',
          creatorID: '256',
          time: 5,
          text: 'test',
          id: '256|0',
        },
        ['256|100']: {
          type: 0,
          threadID: '100',
          creatorID: '256',
          time: 1,
          text: 'test',
          id: '256|100',
        },
        ['local333']: {
          type: 0,
          threadID: '100',
          creatorID: '256',
          time: 1,
          text: 'test',
          localID: 'local333',
        },
        ['256|1325993']: {
          type: 0,
          threadID: '100',
          creatorID: '256',
          time: 1,
          text: 'test',
          localID: '256|1325993',
        },
        ['256|1']: {
          type: 0,
          threadID: '100',
          creatorID: '256',
          time: 1,
          text: 'test',
          id: '256|1',
        },
      };
      expect(
        sortMessageIDs(messages)([
          '256|0',
          '256|100',
          'local333',
          '256|1325993',
          '256|1',
        ]),
      ).toEqual(['256|0', 'local333', '256|1325993', '256|100', '256|1']);
    },
  );

  it('should sort local ids lexicographically', () => {
    const messages = {
      ['local9']: {
        type: 0,
        threadID: '100',
        creatorID: '256',
        time: 5,
        text: 'test',
        id: '256|0',
      },
      ['local100']: {
        type: 0,
        threadID: '100',
        creatorID: '256',
        time: 1,
        text: 'test',
        id: '256|100',
      },
      ['local333']: {
        type: 0,
        threadID: '100',
        creatorID: '256',
        time: 1,
        text: 'test',
        localID: 'local333',
      },
    };
    expect(
      sortMessageIDs(messages)(['local9', 'local100', 'local333']),
    ).toEqual(['local9', 'local333', 'local100']);
  });
});
