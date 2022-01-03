// @flow

import _findKey from 'lodash/fp/findKey';

import {
  type RawMessageInfo,
  rawMessageInfoValidator,
  rawSidebarSourceMessageInfoValidator,
} from './message-types';
import { messageTypes } from './message-types-enum';
import { rawAddMembersMessageInfoValidator } from './messages/add-members';
import { rawChangeRoleMessageInfoValidator } from './messages/change-role';
import { rawChangeSettingsMessageInfoValidator } from './messages/change-settings';
import { rawCreateEntryMessageInfoValidator } from './messages/create-entry';
import { rawCreateSidebarMessageInfoValidator } from './messages/create-sidebar';
import { rawCreateSubthreadMessageInfoValidator } from './messages/create-subthread';
import { rawCreateThreadMessageInfoValidator } from './messages/create-thread';
import { rawDeleteEntryMessageInfoValidator } from './messages/delete-entry';
import { rawEditEntryMessageInfoValidator } from './messages/edit-entry';
import { rawImagesMessageInfoValidator } from './messages/images';
import { rawJoinThreadMessageInfoValidator } from './messages/join-thread';
import { rawLeaveThreadMessageInfoValidator } from './messages/leave-thread';
import { rawMediaMessageInfoValidator } from './messages/media';
import { rawRemoveMembersMessageInfoValidator } from './messages/remove-members';
import { rawRestoreEntryMessageInfoValidator } from './messages/restore-entry';
import { rawTextMessageInfoValidator } from './messages/text';
import { rawUnsupportedMessageInfoValidator } from './messages/unsupported';
import { rawUpdateRelationshipMessageInfoValidator } from './messages/update-relationship';
import {
  type RawThreadInfo,
  rawThreadInfoValidator,
  threadTypes,
} from './thread-types';

const exampleMessages: $ReadOnlyArray<RawMessageInfo> = [
  {
    type: messageTypes.TEXT,
    id: '83833',
    threadID: '83815',
    time: 1631713425870,
    creatorID: '256',
    text: 'welcome to Comm!',
  },

  {
    type: messageTypes.CREATE_THREAD,
    id: '97504',
    threadID: '97489',
    time: 1640596580050,
    creatorID: '97379',
    initialThreadState: {
      type: 6,
      name: null,
      parentThreadID: '1',
      color: 'AA4B4B',
      memberIDs: ['256', '97379'],
    },
  },

  {
    type: messageTypes.ADD_MEMBERS,
    threadID: '97489',
    creatorID: '256',
    time: 1640772931026,
    addedUserIDs: ['85081'],
    id: '97666',
  },

  {
    type: messageTypes.CREATE_SUB_THREAD,
    id: '95592',
    threadID: '95507',
    time: 1638284263664,
    creatorID: '256',
    childThreadID: '95581',
  },

  {
    type: messageTypes.CHANGE_SETTINGS,
    id: '87135',
    threadID: '87080',
    time: 1634649616686,
    creatorID: '256',
    field: 'name',
    value: 'Some subthread',
  },

  {
    type: messageTypes.CHANGE_SETTINGS,
    id: '89102',
    threadID: '89076',
    time: 1635245981072,
    creatorID: '256',
    field: 'type',
    value: 3,
  },
  {
    type: messageTypes.REMOVE_MEMBERS,
    threadID: '97489',
    creatorID: '256',
    time: 1640773011289,
    removedUserIDs: ['85081'],
    id: '97672',
  },
  {
    type: messageTypes.CHANGE_ROLE,
    threadID: '85027',
    creatorID: '256',
    time: 1632393331694,
    userIDs: ['85081'],
    newRole: 'newRoleName',
    id: '85431',
  },
  {
    type: messageTypes.LEAVE_THREAD,
    id: '85431',
    threadID: '85027',
    time: 1632393331694,
    creatorID: '83810',
  },
  {
    type: messageTypes.JOIN_THREAD,
    id: '87430',
    threadID: '87080',
    time: 1634733568741,
    creatorID: '86565',
  },

  {
    type: messageTypes.CREATE_ENTRY,
    id: '95022',
    threadID: '89454',
    time: 1637675256735,
    creatorID: '89364',
    entryID: '95019',
    date: '2021-11-25',
    text: 'AAAA',
  },
  {
    type: messageTypes.EDIT_ENTRY,
    threadID: '87080',
    creatorID: '256',
    time: 1640773796328,
    entryID: '97710',
    date: '2021-12-29',
    text: 'Event',
    id: '97721',
  },
  {
    type: messageTypes.DELETE_ENTRY,
    threadID: '87080',
    creatorID: '256',
    time: 1640773854181,
    entryID: '97710',
    date: '2021-12-29',
    text: 'Event',
    id: '97730',
  },

  {
    type: messageTypes.RESTORE_ENTRY,
    threadID: '87080',
    creatorID: '256',
    time: 1640773882938,
    entryID: '97710',
    date: '2021-12-29',
    text: 'Event',
    id: '97730',
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
    threadID: '93342',
    creatorID: '83810',
    time: 1637145105828,
    media: [
      {
        id: '93503',
        type: 'photo',
        uri: 'http://10.0.2.2/comm/upload/93503/6b036857255e6089',
        dimensions: {
          width: 960,
          height: 1280,
        },
      },
    ],
    id: '93504',
  },

  {
    type: messageTypes.MULTIMEDIA,
    threadID: '85121',
    creatorID: '83810',
    time: 1640774784492,
    media: [
      {
        type: 'video',
        id: 'localUpload4',
        uri: 'file:///file.mp4',
        dimensions: {
          height: 234,
          width: 282,
        },
        localMediaSelection: {
          step: 'video_library',
          dimensions: {
            height: 234,
            width: 282,
          },
          uri: 'file:///file.mp4',
          filename: 'Screenshot_Code_2021-12-29_114405.mp4',
          mediaNativeID: '16',
          duration: 4.483,
          selectTime: 1640774780534,
          sendTime: 1640774784492,
          retries: 1,
        },
        loop: false,
        thumbnailID: 'localUpload6',
        thumbnailURI: 'file:///file.mp4',
      },
    ],
  },

  {
    type: messageTypes.UPDATE_RELATIONSHIP,
    id: '85186',
    threadID: '85088',
    time: 1632223175203,
    creatorID: '85081',
    targetID: '256',
    operation: 'request_sent',
  },

  {
    type: messageTypes.UPDATE_RELATIONSHIP,
    id: '97633',
    threadID: '85088',
    time: 1640607814852,
    creatorID: '256',
    targetID: '85081',
    operation: 'request_accepted',
  },

  {
    type: messageTypes.SIDEBAR_SOURCE,
    id: '94995',
    threadID: '94991',
    time: 1637675205605,
    creatorID: '256',
    sourceMessage: {
      type: 0,
      id: '94986',
      threadID: '89454',
      time: 1637675182492,
      creatorID: '256',
      text: 'Test',
    },
  },

  {
    type: messageTypes.CREATE_SIDEBAR,
    id: '94996',
    threadID: '94991',
    time: 1637675205605,
    creatorID: '256',
    sourceMessageAuthorID: '256',
    initialThreadState: {
      name: 'Test',
      parentThreadID: '89454',
      color: 'c85000',
      memberIDs: ['89364', '256'],
    },
  },
];

const exampleThread: RawThreadInfo = {
  id: '97489',
  type: threadTypes.PERSONAL,
  name: '',
  description: '',
  color: 'AA4B4B',
  creationTime: 1640596580050,
  parentThreadID: '1',
  members: [
    {
      id: '256',
      role: '97490',
      permissions: {
        know_of: {
          value: true,
          source: '97489',
        },
        membership: {
          value: false,
          source: null,
        },

        leave_thread: {
          value: false,
          source: null,
        },
      },
      isSender: true,
    },
    {
      id: '85081',
      role: '97490',
      permissions: {
        know_of: {
          value: true,
          source: '97489',
        },
        membership: {
          value: false,
          source: null,
        },
      },
      isSender: false,
    },
    {
      id: '97379',
      role: '97490',
      permissions: {
        know_of: {
          value: true,
          source: '97489',
        },
        membership: {
          value: false,
          source: null,
        },
      },
      isSender: false,
    },
  ],
  roles: {
    '97490': {
      id: '97490',
      name: 'Members',
      permissions: {
        voiced: true,
        know_of: true,
        visible: true,
        edit_thread: true,
        edit_entries: true,
        create_sidebars: true,
        edit_thread_color: true,
        child_open_join_thread: true,
        descendant_open_know_of: true,
        descendant_open_visible: true,
        edit_thread_description: true,
      },
      isDefault: true,
    },
  },
  currentUser: {
    role: '97490',
    permissions: {
      know_of: {
        value: true,
        source: '97489',
      },
      membership: {
        value: false,
        source: null,
      },
    },
    subscription: {
      home: true,
      pushNotifs: true,
    },
    unread: false,
  },
  repliesCount: 0,
  containingThreadID: '1',
  community: '1',
};

describe('Message validation', () => {
  it('Should validate correct message of every type', () => {
    expect(exampleMessages.every(msg => rawMessageInfoValidator.is(msg))).toBe(
      true,
    );
  });

  const messageValidators = {
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
  };

  for (const messageType of Object.keys(messageValidators)) {
    const messageTypeName =
      _findKey(el => el === Number(messageType))(messageTypes) || '';
    describe(`${messageTypeName} message validation`, () => {
      it(`Should validate correct message of type ${messageTypeName}`, () => {
        expect(
          exampleMessages
            .filter(msg => msg.type === Number(messageType))
            .every(msg => messageValidators[messageType].is(msg)),
        ).toBe(true);
      });
      it('Should not validate messages other types', () => {
        expect(
          exampleMessages
            .filter(msg => msg.type !== Number(messageType))
            .some(msg => messageValidators[messageType].is(msg)),
        ).toBe(false);
      });
    });
  }
});

describe('Thread validation', () => {
  it('Should validate correct thread', () => {
    expect(rawThreadInfoValidator.is(exampleThread)).toBe(true);
  });
  it('Should not validate thread with wrong type', () => {
    expect(rawThreadInfoValidator.is({ ...exampleThread, type: 0 })).toBe(
      false,
    );
  });
});
