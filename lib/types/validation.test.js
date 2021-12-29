// @flow

import {
  type RawMessageInfo,
  rawMessageInfoValidator,
  rawSidebarSourceMessageInfoValidator,
} from './message-types';
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
import { type RawThreadInfo, rawThreadInfoValidator } from './thread-types';

const exampleMessages: $ReadOnlyArray<RawMessageInfo> = [
  {
    type: 0,
    id: '83833',
    threadID: '83815',
    time: 1631713425870,
    creatorID: '256',
    text: 'welcome to Comm!',
  },

  {
    type: 1,
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
    type: 2,
    threadID: '97489',
    creatorID: '256',
    time: 1640772931026,
    addedUserIDs: ['85081'],
    id: '97666',
  },

  {
    type: 3,
    id: '95592',
    threadID: '95507',
    time: 1638284263664,
    creatorID: '256',
    childThreadID: '95581',
  },

  {
    type: 4,
    id: '87135',
    threadID: '87080',
    time: 1634649616686,
    creatorID: '256',
    field: 'name',
    value: 'Some subthread',
  },

  {
    type: 4,
    id: '89102',
    threadID: '89076',
    time: 1635245981072,
    creatorID: '256',
    field: 'type',
    value: 3,
  },
  {
    type: 5,
    threadID: '97489',
    creatorID: '256',
    time: 1640773011289,
    removedUserIDs: ['85081'],
    id: '97672',
  },
  {
    type: 6,
    threadID: '85027',
    creatorID: '256',
    time: 1632393331694,
    userIDs: ['85081'],
    newRole: 'newRoleName',
    id: '85431',
  },
  {
    type: 7,
    id: '85431',
    threadID: '85027',
    time: 1632393331694,
    creatorID: '83810',
  },
  {
    type: 8,
    id: '87430',
    threadID: '87080',
    time: 1634733568741,
    creatorID: '86565',
  },

  {
    type: 9,
    id: '95022',
    threadID: '89454',
    time: 1637675256735,
    creatorID: '89364',
    entryID: '95019',
    date: '2021-11-25',
    text: 'AAAA',
  },
  {
    type: 10,
    threadID: '87080',
    creatorID: '256',
    time: 1640773796328,
    entryID: '97710',
    date: '2021-12-29',
    text: 'Event',
    id: '97721',
  },
  {
    type: 11,
    threadID: '87080',
    creatorID: '256',
    time: 1640773854181,
    entryID: '97710',
    date: '2021-12-29',
    text: 'Event',
    id: '97730',
  },

  {
    type: 12,
    threadID: '87080',
    creatorID: '256',
    time: 1640773882938,
    entryID: '97710',
    date: '2021-12-29',
    text: 'Event',
    id: '97730',
  },

  {
    type: 13,
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
    type: 14,
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
    type: 15,
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
    type: 16,
    id: '85186',
    threadID: '85088',
    time: 1632223175203,
    creatorID: '85081',
    targetID: '256',
    operation: 'request_sent',
  },

  {
    type: 16,
    id: '97633',
    threadID: '85088',
    time: 1640607814852,
    creatorID: '256',
    targetID: '85081',
    operation: 'request_accepted',
  },

  {
    type: 17,
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
    type: 18,
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
  type: 6,
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

  describe('TextMessage validation', () => {
    it('Should validate correct TextMessage', () => {
      expect(
        exampleMessages
          .filter(m => m.type === 0)
          .every(msg => rawTextMessageInfoValidator.is(msg)),
      ).toBe(true);
    });
  });
  describe('CreateThreadMessage validation', () => {
    it('Should validate correct CreateThreadMessage', () => {
      expect(
        exampleMessages
          .filter(m => m.type === 1)
          .every(msg => rawCreateThreadMessageInfoValidator.is(msg)),
      ).toBe(true);
    });
  });
  describe('AddMembersMessage validation', () => {
    it('Should validate correct AddMembersMessage', () => {
      expect(
        exampleMessages
          .filter(m => m.type === 2)
          .every(msg => rawAddMembersMessageInfoValidator.is(msg)),
      ).toBe(true);
    });
  });
  describe('CreateSubthreadMessage validation', () => {
    it('Should validate correct CreateSubthreadMessage', () => {
      expect(
        exampleMessages
          .filter(m => m.type === 3)
          .every(msg => rawCreateSubthreadMessageInfoValidator.is(msg)),
      ).toBe(true);
    });
  });
  describe('ChangeSettingsMessage validation', () => {
    it('Should validate correct ChangeSettingsMessage', () => {
      expect(
        exampleMessages
          .filter(m => m.type === 4)
          .every(msg => rawChangeSettingsMessageInfoValidator.is(msg)),
      ).toBe(true);
    });
  });
  describe('RemoveMembersMessage validation', () => {
    it('Should validate correct RemoveMembersMessage', () => {
      expect(
        exampleMessages
          .filter(m => m.type === 5)
          .every(msg => rawRemoveMembersMessageInfoValidator.is(msg)),
      ).toBe(true);
    });
  });
  describe('ChangeRoleMessage validation', () => {
    it('Should validate correct ChangeRoleMessage', () => {
      expect(
        exampleMessages
          .filter(m => m.type === 6)
          .every(msg => rawChangeRoleMessageInfoValidator.is(msg)),
      ).toBe(true);
    });
  });
  describe('LeaveThreadMessage validation', () => {
    it('Should validate correct LeaveThreadMessage', () => {
      expect(
        exampleMessages
          .filter(m => m.type === 7)
          .every(msg => rawLeaveThreadMessageInfoValidator.is(msg)),
      ).toBe(true);
    });
  });
  describe('JoinThreadMessage validation', () => {
    it('Should validate correct JoinThreadMessage', () => {
      expect(
        exampleMessages
          .filter(m => m.type === 8)
          .every(msg => rawJoinThreadMessageInfoValidator.is(msg)),
      ).toBe(true);
    });
  });
  describe('CreateEntryMessage validation', () => {
    it('Should validate correct CreateEntryMessage', () => {
      expect(
        exampleMessages
          .filter(m => m.type === 9)
          .every(msg => rawCreateEntryMessageInfoValidator.is(msg)),
      ).toBe(true);
    });
  });
  describe('EditEntryMessage validation', () => {
    it('Should validate correct EditEntryMessage', () => {
      expect(
        exampleMessages
          .filter(m => m.type === 10)
          .every(msg => rawEditEntryMessageInfoValidator.is(msg)),
      ).toBe(true);
    });
  });
  describe('DeleteEntryMessage validation', () => {
    it('Should validate correct DeleteEntryMessage', () => {
      expect(
        exampleMessages
          .filter(m => m.type === 11)
          .every(msg => rawDeleteEntryMessageInfoValidator.is(msg)),
      ).toBe(true);
    });
  });
  describe('RestoreEntryMessage validation', () => {
    it('Should validate correct RestoreEntryMessage', () => {
      expect(
        exampleMessages
          .filter(m => m.type === 12)
          .every(msg => rawRestoreEntryMessageInfoValidator.is(msg)),
      ).toBe(true);
    });
  });
  describe('UnsupportedMessage validation', () => {
    it('Should validate correct UnsupportedMessage', () => {
      expect(
        exampleMessages
          .filter(m => m.type === 13)
          .every(msg => rawUnsupportedMessageInfoValidator.is(msg)),
      ).toBe(true);
    });
  });
  describe('ImagesMessage validation', () => {
    it('Should validate correct ImagesMessage', () => {
      expect(
        exampleMessages
          .filter(m => m.type === 14)
          .every(msg => rawImagesMessageInfoValidator.is(msg)),
      ).toBe(true);
    });
  });
  describe('MediaMessage validation', () => {
    it('Should validate correct MediaMessage', () => {
      expect(
        exampleMessages
          .filter(m => m.type === 15)
          .every(msg => rawMediaMessageInfoValidator.is(msg)),
      ).toBe(true);
    });
  });
  describe('UpdateRelationshipMessage validation', () => {
    it('Should validate correct UpdateRelationshipMessage', () => {
      expect(
        exampleMessages
          .filter(m => m.type === 16)
          .every(msg => rawUpdateRelationshipMessageInfoValidator.is(msg)),
      ).toBe(true);
    });
  });
  describe('SidebarSourceMessage validation', () => {
    it('Should validate correct SidebarSourceMessage', () => {
      expect(
        exampleMessages
          .filter(m => m.type === 17)
          .every(msg => rawSidebarSourceMessageInfoValidator.is(msg)),
      ).toBe(true);
    });
  });
  describe('CreateSidebarMessage validation', () => {
    it('Should validate correct CreateSidebarMessage', () => {
      expect(
        exampleMessages
          .filter(m => m.type === 18)
          .every(msg => rawCreateSidebarMessageInfoValidator.is(msg)),
      ).toBe(true);
    });
  });
});

describe('Thread validation', () => {
  it('Should validate correct thread', () => {
    expect(rawThreadInfoValidator.is(exampleThread)).toBe(true);
  });
});
