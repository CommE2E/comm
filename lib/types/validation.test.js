// @flow

import _findKey from 'lodash/fp/findKey.js';

import {
  imageValidator,
  videoValidator,
  mediaValidator,
} from './media-types.js';
import { messageTypes } from './message-types-enum.js';
import { rawSidebarSourceMessageInfoValidator } from './message-types.js';
import { rawAddMembersMessageInfoValidator } from './messages/add-members.js';
import { rawChangeRoleMessageInfoValidator } from './messages/change-role.js';
import { rawChangeSettingsMessageInfoValidator } from './messages/change-settings.js';
import { rawCreateEntryMessageInfoValidator } from './messages/create-entry.js';
import { rawCreateSidebarMessageInfoValidator } from './messages/create-sidebar.js';
import { rawCreateSubthreadMessageInfoValidator } from './messages/create-subthread.js';
import { rawCreateThreadMessageInfoValidator } from './messages/create-thread.js';
import { rawDeleteEntryMessageInfoValidator } from './messages/delete-entry.js';
import { rawEditEntryMessageInfoValidator } from './messages/edit-entry.js';
import { rawEditMessageInfoValidator } from './messages/edit.js';
import { rawImagesMessageInfoValidator } from './messages/images.js';
import { rawJoinThreadMessageInfoValidator } from './messages/join-thread.js';
import { rawLeaveThreadMessageInfoValidator } from './messages/leave-thread.js';
import { rawMediaMessageInfoValidator } from './messages/media.js';
import { rawReactionMessageInfoValidator } from './messages/reaction.js';
import { rawRemoveMembersMessageInfoValidator } from './messages/remove-members.js';
import { rawRestoreEntryMessageInfoValidator } from './messages/restore-entry.js';
import { rawTextMessageInfoValidator } from './messages/text.js';
import { rawTogglePinMessageInfoValidator } from './messages/toggle-pin.js';
import { rawUnsupportedMessageInfoValidator } from './messages/unsupported.js';
import { rawUpdateRelationshipMessageInfoValidator } from './messages/update-relationship.js';

describe('media validation', () => {
  const photo = {
    id: '92696',
    type: 'photo',
    uri: 'http://0.0.0.0:3000/comm/upload/92696/0fb272bd1c75d976',
    dimensions: {
      width: 340,
      height: 288,
    },
  };
  const video = {
    type: 'video',
    id: '92769',
    uri: 'http://0.0.0.0:3000/comm/upload/92769/4bcc6987b25b2f66',
    dimensions: {
      width: 480,
      height: 270,
    },
    thumbnailID: '92770',
    thumbnailURI: 'http://0.0.0.0:3000/comm/upload/92770/d56466051dcef1db',
  };

  it('should validate correct media', () => {
    expect(mediaValidator.is(photo)).toBe(true);
    expect(imageValidator.is(photo)).toBe(true);
    expect(mediaValidator.is(video)).toBe(true);
    expect(videoValidator.is(video)).toBe(true);
  });

  it('should not validate incorrect media', () => {
    expect(imageValidator.is(video)).toBe(false);
    expect(videoValidator.is(photo)).toBe(false);
    expect(mediaValidator.is({ ...photo, type: undefined })).toBe(false);
    expect(mediaValidator.is({ ...video, dimensions: undefined })).toBe(false);
  });
});

describe('message validation', () => {
  const messages = [
    {
      type: messageTypes.TEXT,
      threadID: '83859',
      creatorID: '83853',
      time: 1682077048858,
      text: 'text',
      localID: 'local1',
      id: '92837',
    },
    {
      type: messageTypes.CREATE_THREAD,
      id: '83876',
      threadID: '83859',
      time: 1673561105839,
      creatorID: '83853',
      initialThreadState: {
        type: 6,
        name: null,
        parentThreadID: '1',
        color: '57697f',
        memberIDs: ['256', '83853'],
      },
    },
    {
      type: messageTypes.ADD_MEMBERS,
      id: '4754380',
      threadID: '4746046',
      time: 1680179819346,
      creatorID: '256',
      addedUserIDs: ['518252', '1329299', '1559042'],
    },
    {
      type: messageTypes.CREATE_SUB_THREAD,
      threadID: '87111',
      creatorID: '83928',
      time: 1682083573756,
      childThreadID: '92993',
      id: '93000',
    },
    {
      type: messageTypes.CHANGE_SETTINGS,
      threadID: '83859',
      creatorID: '83853',
      time: 1682082984605,
      field: 'color',
      value: 'b8753d',
      id: '92880',
    },
    {
      type: messageTypes.REMOVE_MEMBERS,
      threadID: '92993',
      creatorID: '83928',
      time: 1682083613415,
      removedUserIDs: ['83890'],
      id: '93012',
    },
    {
      type: messageTypes.CHANGE_ROLE,
      threadID: '85027',
      creatorID: '256',
      time: 1632393331694,
      userIDs: ['85081'],
      newRole: 'role',
      id: '85431',
    },
    {
      type: messageTypes.LEAVE_THREAD,
      id: '93027',
      threadID: '92993',
      time: 1682083651037,
      creatorID: '83928',
    },
    {
      type: messageTypes.JOIN_THREAD,
      threadID: '92993',
      creatorID: '83928',
      time: 1682083678595,
      id: '93035',
    },
    {
      type: messageTypes.CREATE_ENTRY,
      threadID: '84695',
      creatorID: '83928',
      time: 1682083217395,
      entryID: '92917',
      date: '2023-04-02',
      text: 'text',
      id: '92920',
    },
    {
      type: messageTypes.EDIT_ENTRY,
      threadID: '84695',
      creatorID: '83928',
      time: 1682083374471,
      entryID: '92917',
      date: '2023-04-02',
      text: 'text',
      id: '92950',
    },
    {
      type: messageTypes.DELETE_ENTRY,
      threadID: '86033',
      creatorID: '83928',
      time: 1682083220296,
      entryID: '92904',
      date: '2023-04-02',
      text: 'text',
      id: '92932',
    },
    {
      type: messageTypes.RESTORE_ENTRY,
      id: '92962',
      threadID: '86033',
      time: 1682083414244,
      creatorID: '83928',
      entryID: '92904',
      date: '2023-04-02',
      text: 'text',
    },
    {
      type: messageTypes.UNSUPPORTED,
      threadID: '87080',
      creatorID: '256',
      time: 1640733462322,
      robotext: 'unsupported message',
      unsupportedMessageInfo: {
        type: 105,
        threadID: '97489',
        creatorID: '256',
        time: 1640773011289,
        id: '97672',
      },
      id: '97730',
    },
    {
      type: messageTypes.IMAGES,
      threadID: '92796',
      creatorID: '83928',
      time: 1682083469079,
      media: [
        {
          id: '92974',
          uri: 'http://0.0.0.0:3000/comm/upload/92974/ff3d02ded71e2762',
          type: 'photo',
          dimensions: {
            width: 220,
            height: 220,
          },
        },
      ],
      localID: 'local0',
      id: '92976',
    },
    {
      type: messageTypes.MULTIMEDIA,
      threadID: '89644',
      creatorID: '83853',
      time: 1682076177257,
      media: [
        {
          type: 'video',
          id: '92769',
          uri: 'http://0.0.0.0:3000/comm/upload/92769/4bcc6987b25b2f66',
          dimensions: {
            width: 480,
            height: 270,
          },
          thumbnailID: '92770',
          thumbnailURI:
            'http://0.0.0.0:3000/comm/upload/92770/d56466051dcef1db',
        },
      ],
      id: '92771',
    },
    {
      type: messageTypes.UPDATE_RELATIONSHIP,
      threadID: '92796',
      creatorID: '83928',
      targetID: '83853',
      time: 1682083716312,
      operation: 'request_sent',
      id: '93039',
    },
    {
      type: messageTypes.SIDEBAR_SOURCE,
      threadID: '93044',
      creatorID: '83928',
      time: 1682083756831,
      sourceMessage: {
        type: 0,
        id: '92816',
        threadID: '92796',
        time: 1682076737518,
        creatorID: '83928',
        text: 'text',
      },
      id: '93049',
    },
    {
      type: messageTypes.CREATE_SIDEBAR,
      threadID: '93044',
      creatorID: '83928',
      time: 1682083756831,
      sourceMessageAuthorID: '83928',
      initialThreadState: {
        name: 'text',
        parentThreadID: '92796',
        color: 'aa4b4b',
        memberIDs: ['83853', '83928'],
      },
      id: '93050',
    },
    {
      type: messageTypes.REACTION,
      threadID: '86033',
      localID: 'local8',
      creatorID: '83928',
      time: 1682083295820,
      targetMessageID: '91607',
      reaction: '😂',
      action: 'add_reaction',
      id: '92943',
    },
    {
      type: messageTypes.EDIT_MESSAGE,
      threadID: '86033',
      creatorID: '83928',
      time: 1682083295820,
      targetMessageID: '91607',
      text: 'text',
      id: '92943',
    },
    {
      type: messageTypes.TOGGLE_PIN,
      threadID: '86033',
      targetMessageID: '91607',
      action: 'pin',
      pinnedContent: 'text',
      creatorID: '83928',
      time: 1682083295820,
      id: '92943',
    },
  ];

  const validatorByMessageType = {
    '0': rawTextMessageInfoValidator,
    '1': rawCreateThreadMessageInfoValidator,
    '2': rawAddMembersMessageInfoValidator,
    '3': rawCreateSubthreadMessageInfoValidator,
    '4': rawChangeSettingsMessageInfoValidator,
    '5': rawRemoveMembersMessageInfoValidator,
    '6': rawChangeRoleMessageInfoValidator,
    '7': rawLeaveThreadMessageInfoValidator,
    '8': rawJoinThreadMessageInfoValidator,
    '9': rawCreateEntryMessageInfoValidator,
    '10': rawEditEntryMessageInfoValidator,
    '11': rawDeleteEntryMessageInfoValidator,
    '12': rawRestoreEntryMessageInfoValidator,
    '13': rawUnsupportedMessageInfoValidator,
    '14': rawImagesMessageInfoValidator,
    '15': rawMediaMessageInfoValidator,
    '16': rawUpdateRelationshipMessageInfoValidator,
    '17': rawSidebarSourceMessageInfoValidator,
    '18': rawCreateSidebarMessageInfoValidator,
    '19': rawReactionMessageInfoValidator,
    '20': rawEditMessageInfoValidator,
    '21': rawTogglePinMessageInfoValidator,
  };

  for (const messageType in validatorByMessageType) {
    const validator = validatorByMessageType[messageType];
    const messageTypeName = _findKey(e => e === Number(messageType))(
      messageTypes,
    );

    it(`should only validate correct '${messageTypeName}' messages`, () => {
      for (const message of messages) {
        expect(validator.is(message)).toBe(
          Number(messageType) === message.type,
        );
      }
    });
  }
});
