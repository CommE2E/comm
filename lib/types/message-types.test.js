// @flow

import { messageTypes } from './message-types-enum.js';
import { isInvalidSidebarSource } from './message-types.js';
import type { RawSidebarSourceMessageInfo } from './message-types.js';
import type { RawAddMembersMessageInfo } from './messages/add-members.js';
import type { RawChangeRoleMessageInfo } from './messages/change-role.js';
import type { RawChangeSettingsMessageInfo } from './messages/change-settings.js';
import type { RawCreateEntryMessageInfo } from './messages/create-entry.js';
import type { RawCreateSidebarMessageInfo } from './messages/create-sidebar.js';
import type { RawCreateSubthreadMessageInfo } from './messages/create-subthread.js';
import type { RawCreateThreadMessageInfo } from './messages/create-thread.js';
import type { RawDeleteEntryMessageInfo } from './messages/delete-entry.js';
import type { RawEditEntryMessageInfo } from './messages/edit-entry.js';
import type { RawEditMessageInfo } from './messages/edit.js';
import type { RawImagesMessageInfo } from './messages/images.js';
import type { RawJoinThreadMessageInfo } from './messages/join-thread.js';
import type { RawLeaveThreadMessageInfo } from './messages/leave-thread.js';
import type { RawMediaMessageInfo } from './messages/media.js';
import type { RawReactionMessageInfo } from './messages/reaction.js';
import type { RawRemoveMembersMessageInfo } from './messages/remove-members.js';
import type { RawRestoreEntryMessageInfo } from './messages/restore-entry.js';
import type { RawTextMessageInfo } from './messages/text.js';
import type { RawTogglePinMessageInfo } from './messages/toggle-pin.js';
import type { RawUpdateRelationshipMessageInfo } from './messages/update-relationship.js';
import { threadTypes } from './thread-types-enum.js';

describe('isInvalidSidebarSource', () => {
  it('should return false for RawTextMessageInfo', () => {
    const textMessageInfo: RawTextMessageInfo = {
      type: messageTypes.TEXT,
      localID: 'local1',
      threadID: '10001',
      creatorID: '123',
      time: 10000,
      text: 'This is a text message',
      id: '1',
    };

    const shouldBeInvalidSidebarSource =
      isInvalidSidebarSource(textMessageInfo);
    expect(shouldBeInvalidSidebarSource).toBe(false);
  });

  it('should return false for RawCreateThreadMessageInfo', () => {
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

    const shouldBeInvalidSidebarSource = isInvalidSidebarSource(
      createThreadMessageInfo,
    );
    expect(shouldBeInvalidSidebarSource).toBe(false);
  });

  it('should return false for RawAddMembersMessageInfo', () => {
    const addMembersMessageInfo: RawAddMembersMessageInfo = {
      type: messageTypes.ADD_MEMBERS,
      threadID: '10001',
      creatorID: '123',
      time: 10000,
      addedUserIDs: ['4', '5'],
      id: '1',
    };

    const shouldBeInvalidSidebarSource = isInvalidSidebarSource(
      addMembersMessageInfo,
    );
    expect(shouldBeInvalidSidebarSource).toBe(false);
  });

  it('should return false for RawCreateSubthreadMessageInfo', () => {
    const createSubthreadMessageInfo: RawCreateSubthreadMessageInfo = {
      type: messageTypes.CREATE_SUB_THREAD,
      threadID: '10001',
      creatorID: '123',
      time: 10000,
      childThreadID: '10002',
      id: '1',
    };

    const shouldBeInvalidSidebarSource = isInvalidSidebarSource(
      createSubthreadMessageInfo,
    );
    expect(shouldBeInvalidSidebarSource).toBe(false);
  });

  it('should return false for RawChangeSettingsMessageInfo', () => {
    const changeSettingsMessageInfo: RawChangeSettingsMessageInfo = {
      type: messageTypes.CHANGE_SETTINGS,
      threadID: '10000',
      creatorID: '123',
      time: 10000,
      field: 'color',
      value: '#FFFFFF',
      id: '1',
    };

    const shouldBeInvalidSidebarSource = isInvalidSidebarSource(
      changeSettingsMessageInfo,
    );
    expect(shouldBeInvalidSidebarSource).toBe(false);
  });

  it('should return false for RawRemoveMembersMessageInfo', () => {
    const removeMembersMessageInfo: RawRemoveMembersMessageInfo = {
      type: messageTypes.REMOVE_MEMBERS,
      threadID: '10000',
      creatorID: '123',
      time: 10000,
      removedUserIDs: ['1', '2', '3'],
      id: '1',
    };

    const shouldBeInvalidSidebarSource = isInvalidSidebarSource(
      removeMembersMessageInfo,
    );
    expect(shouldBeInvalidSidebarSource).toBe(false);
  });

  it('should return false for RawChangeRoleMessageInfo', () => {
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

    const shouldBeInvalidSidebarSource = isInvalidSidebarSource(
      changeRoleMessageinfo,
    );
    expect(shouldBeInvalidSidebarSource).toBe(false);
  });

  it('should return false for RawLeaveThreadMessageInfo', () => {
    const leaveThreadMessageInfo: RawLeaveThreadMessageInfo = {
      type: messageTypes.LEAVE_THREAD,
      threadID: '10000',
      creatorID: '123',
      time: 10000,
      id: '1',
    };

    const shouldBeInvalidSidebarSource = isInvalidSidebarSource(
      leaveThreadMessageInfo,
    );
    expect(shouldBeInvalidSidebarSource).toBe(false);
  });

  it('should return false for RawJoinThreadMessageInfo', () => {
    const joinThreadMessageInfo: RawJoinThreadMessageInfo = {
      type: messageTypes.JOIN_THREAD,
      threadID: '10000',
      creatorID: '123',
      time: 10000,
      id: '1',
    };

    const shouldBeInvalidSidebarSource = isInvalidSidebarSource(
      joinThreadMessageInfo,
    );
    expect(shouldBeInvalidSidebarSource).toBe(false);
  });

  it('should return false for RawCreateEntryMessageInfo', () => {
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

    const shouldBeInvalidSidebarSource = isInvalidSidebarSource(
      createEntryMessageInfo,
    );
    expect(shouldBeInvalidSidebarSource).toBe(false);
  });

  it('should return false for RawEditEntryMessageInfo', () => {
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

    const shouldBeInvalidSidebarSource =
      isInvalidSidebarSource(editEntryMessageInfo);
    expect(shouldBeInvalidSidebarSource).toBe(false);
  });

  it('should return false for RawDeleteEntryMessageInfo', () => {
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

    const shouldBeInvalidSidebarSource = isInvalidSidebarSource(
      deleteEntryMessageInfo,
    );
    expect(shouldBeInvalidSidebarSource).toBe(false);
  });

  it('should return false for RawRestoreEntryMessageInfo', () => {
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

    const shouldBeInvalidSidebarSource = isInvalidSidebarSource(
      restoreEntryMessageInfo,
    );
    expect(shouldBeInvalidSidebarSource).toBe(false);
  });

  it('should return false for RawUpdateRelationshipMessageInfo', () => {
    const updateRelationshipMessageInfo: RawUpdateRelationshipMessageInfo = {
      type: messageTypes.UPDATE_RELATIONSHIP,
      threadID: '10000',
      creatorID: '123',
      targetID: '456',
      time: 10000,
      operation: 'request_sent',
      id: '1',
    };

    const shouldBeInvalidSidebarSource = isInvalidSidebarSource(
      updateRelationshipMessageInfo,
    );
    expect(shouldBeInvalidSidebarSource).toBe(false);
  });

  it('should return false for RawImagesMessageInfo', () => {
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

    const shouldBeInvalidSidebarSource =
      isInvalidSidebarSource(imageMessageInfo);
    expect(shouldBeInvalidSidebarSource).toBe(false);
  });

  it('should return false for RawMediaMessageInfo', () => {
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

    const shouldBeInvalidSidebarSource =
      isInvalidSidebarSource(mediaMessageInfo);
    expect(shouldBeInvalidSidebarSource).toBe(false);
  });

  it('should return true for RawSidebarSourceMessageInfo', () => {
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

    const shouldBeInvalidSidebarSource = isInvalidSidebarSource(
      sidebarSourceMessageInfo,
    );
    expect(shouldBeInvalidSidebarSource).toBe(true);
  });

  it('should return false for RawCreateSidebarMessageInfo', () => {
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

    const shouldBeInvalidSidebarSource = isInvalidSidebarSource(
      createSidebarMessageInfo,
    );
    expect(shouldBeInvalidSidebarSource).toBe(false);
  });

  it('should return true for RawReactionMessageInfo', () => {
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

    const shouldBeInvalidSidebarSource =
      isInvalidSidebarSource(reactionMessageInfo);
    expect(shouldBeInvalidSidebarSource).toBe(true);
  });

  it('should return true for RawEditMessageInfo', () => {
    const editMessageInfo: RawEditMessageInfo = {
      type: messageTypes.EDIT_MESSAGE,
      threadID: '10000',
      creatorID: '123',
      time: 10000,
      targetMessageID: '1',
      text: 'This is an edited message',
      id: '1',
    };

    const shouldBeInvalidSidebarSource =
      isInvalidSidebarSource(editMessageInfo);
    expect(shouldBeInvalidSidebarSource).toBe(true);
  });

  it('should return true for RawTogglePinMessageInfo', () => {
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

    const shouldBeInvalidSidebarSource =
      isInvalidSidebarSource(togglePinMessageInfo);
    expect(shouldBeInvalidSidebarSource).toBe(true);
  });
});
