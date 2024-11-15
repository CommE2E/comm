// @flow

import _findKey from 'lodash/fp/findKey.js';

import { rawEntryInfoValidator } from './entry-types.js';
import {
  imageValidator,
  videoValidator,
  mediaValidator,
} from './media-types.js';
import { messageTypes } from './message-types-enum.js';
import {
  activityUpdateResponseServerSocketMessageValidator,
  apiResponseServerSocketMessageValidator,
  authErrorServerSocketMessageValidator,
  errorServerSocketMessageValidator,
  messagesServerSocketMessageValidator,
  pongServerSocketMessageValidator,
  serverRequestsServerSocketMessageValidator,
  serverSocketMessageTypes,
  serverStateSyncServerSocketMessageValidator,
  serverUpdatesServerSocketMessageValidator,
} from './socket-types.js';
import { threadTypes } from './thread-types-enum.js';
import { legacyThinRawThreadInfoValidator } from './thread-types.js';
import { updateTypes } from './update-types-enum.js';
import { messageSpecs } from '../shared/messages/message-specs.js';
import { updateSpecs } from '../shared/updates/update-specs.js';
import { values } from '../utils/objects.js';

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
        thumbnailURI: 'http://0.0.0.0:3000/comm/upload/92770/d56466051dcef1db',
      },
    ],
    id: '92771',
  },
  {
    type: messageTypes.LEGACY_UPDATE_RELATIONSHIP,
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

describe('message validation', () => {
  for (const validatorMessageTypeName in messageTypes) {
    const validatorMessageType = messageTypes[validatorMessageTypeName];
    const validator = messageSpecs[validatorMessageType].validator;

    for (const message of messages) {
      const messageTypeName = _findKey(e => e === message.type)(messageTypes);

      if (validatorMessageType === message.type) {
        it(`${validatorMessageTypeName} should validate ${messageTypeName}`, () => {
          expect(validator.is(message)).toBe(true);
        });
      } else if (
        !(
          (validatorMessageType === messageTypes.IMAGES &&
            message.type === messageTypes.MULTIMEDIA) ||
          (validatorMessageType === messageTypes.MULTIMEDIA &&
            message.type === messageTypes.IMAGES) ||
          (validatorMessageType === messageTypes.UPDATE_RELATIONSHIP &&
            message.type === messageTypes.LEGACY_UPDATE_RELATIONSHIP) ||
          (validatorMessageType === messageTypes.LEGACY_UPDATE_RELATIONSHIP &&
            message.type === messageTypes.UPDATE_RELATIONSHIP)
        )
      ) {
        it(`${validatorMessageTypeName} shouldn't validate ${messageTypeName}`, () => {
          expect(validator.is(message)).toBe(false);
        });
      }
    }
  }
});

const thread = {
  id: '85171',
  type: threadTypes.GENESIS_PERSONAL,
  name: '',
  description: '',
  color: '6d49ab',
  creationTime: 1675887298557,
  parentThreadID: '1',
  members: [
    {
      id: '256',
      role: null,
      permissions: {
        know_of: {
          value: true,
          source: '1',
        },
        visible: {
          value: true,
          source: '1',
        },
        voiced: {
          value: true,
          source: '1',
        },
        edit_entries: {
          value: true,
          source: '1',
        },
        edit_thread: {
          value: true,
          source: '1',
        },
        edit_thread_description: {
          value: true,
          source: '1',
        },
        edit_thread_color: {
          value: true,
          source: '1',
        },
        delete_thread: {
          value: true,
          source: '1',
        },
        create_subthreads: {
          value: true,
          source: '1',
        },
        create_sidebars: {
          value: true,
          source: '1',
        },
        join_thread: {
          value: true,
          source: '1',
        },
        edit_permissions: {
          value: true,
          source: '1',
        },
        add_members: {
          value: true,
          source: '1',
        },
        remove_members: {
          value: true,
          source: '1',
        },
        change_role: {
          value: true,
          source: '1',
        },
        leave_thread: {
          value: false,
          source: null,
        },
        react_to_message: {
          value: false,
          source: null,
        },
        edit_message: {
          value: false,
          source: null,
        },
        manage_pins: {
          value: true,
          source: '1',
        },
      },
      isSender: false,
    },
    {
      id: '83853',
      role: '85172',
      permissions: {
        know_of: {
          value: true,
          source: '85171',
        },
        visible: {
          value: true,
          source: '85171',
        },
        voiced: {
          value: true,
          source: '85171',
        },
        edit_entries: {
          value: true,
          source: '85171',
        },
        edit_thread: {
          value: true,
          source: '85171',
        },
        edit_thread_description: {
          value: true,
          source: '85171',
        },
        edit_thread_color: {
          value: true,
          source: '85171',
        },
        delete_thread: {
          value: false,
          source: null,
        },
        create_subthreads: {
          value: false,
          source: null,
        },
        create_sidebars: {
          value: true,
          source: '85171',
        },
        join_thread: {
          value: false,
          source: null,
        },
        edit_permissions: {
          value: false,
          source: null,
        },
        add_members: {
          value: false,
          source: null,
        },
        remove_members: {
          value: false,
          source: null,
        },
        change_role: {
          value: false,
          source: null,
        },
        leave_thread: {
          value: false,
          source: null,
        },
        react_to_message: {
          value: true,
          source: '85171',
        },
        edit_message: {
          value: true,
          source: '85171',
        },
        manage_pins: {
          value: false,
          source: null,
        },
      },
      isSender: true,
    },
  ],
  roles: {
    '85172': {
      id: '85172',
      name: 'Members',
      permissions: {
        know_of: true,
        visible: true,
        voiced: true,
        react_to_message: true,
        edit_message: true,
        edit_entries: true,
        edit_thread: true,
        edit_thread_color: true,
        edit_thread_description: true,
        create_sidebars: true,
        descendant_open_know_of: true,
        descendant_open_visible: true,
        child_open_join_thread: true,
      },
      isDefault: true,
    },
  },
  currentUser: {
    role: '85172',
    permissions: {
      know_of: {
        value: true,
        source: '85171',
      },
      visible: {
        value: true,
        source: '85171',
      },
      voiced: {
        value: true,
        source: '85171',
      },
      edit_entries: {
        value: true,
        source: '85171',
      },
      edit_thread: {
        value: true,
        source: '85171',
      },
      edit_thread_description: {
        value: true,
        source: '85171',
      },
      edit_thread_color: {
        value: true,
        source: '85171',
      },
      delete_thread: {
        value: false,
        source: null,
      },
      create_subthreads: {
        value: false,
        source: null,
      },
      create_sidebars: {
        value: true,
        source: '85171',
      },
      join_thread: {
        value: false,
        source: null,
      },
      edit_permissions: {
        value: false,
        source: null,
      },
      add_members: {
        value: false,
        source: null,
      },
      remove_members: {
        value: false,
        source: null,
      },
      change_role: {
        value: false,
        source: null,
      },
      leave_thread: {
        value: false,
        source: null,
      },
      react_to_message: {
        value: true,
        source: '85171',
      },
      edit_message: {
        value: true,
        source: '85171',
      },
      manage_pins: {
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
  pinnedCount: 0,
};

describe('thread validation', () => {
  it('should validate correct thread', () => {
    expect(legacyThinRawThreadInfoValidator.is(thread)).toBe(true);
  });
  it('should not validate incorrect thread', () => {
    expect(
      legacyThinRawThreadInfoValidator.is({
        ...thread,
        creationTime: undefined,
      }),
    ).toBe(false);
  });
});

const entry = {
  id: '92860',
  threadID: '85068',
  text: 'text',
  year: 2023,
  month: 4,
  day: 2,
  creationTime: 1682082939882,
  creatorID: '83853',
  deleted: false,
};

describe('entry validation', () => {
  it('should validate correct entry', () => {
    expect(rawEntryInfoValidator.is(entry)).toBe(true);
  });
  it('should not validate incorrect entry', () => {
    expect(rawEntryInfoValidator.is({ ...entry, threadID: 0 })).toBe(false);
  });
});

const updates = [
  {
    type: updateTypes.DELETE_ACCOUNT,
    id: '98424',
    time: 1640870111106,
    deletedUserID: '98262',
  },
  {
    type: updateTypes.UPDATE_THREAD,
    id: '97948',
    time: 1640868525494,
    threadInfo: thread,
  },
  {
    type: updateTypes.UPDATE_THREAD_READ_STATUS,
    id: '98002',
    time: 1640869373326,
    threadID: '83794',
    unread: true,
  },
  {
    type: updateTypes.DELETE_THREAD,
    id: '98208',
    time: 1640869773339,
    threadID: '97852',
  },
  {
    type: updateTypes.JOIN_THREAD,
    id: '98126',
    time: 1640869494461,
    threadInfo: thread,
    rawMessageInfos: messages,
    truncationStatus: 'exhaustive',
    rawEntryInfos: [entry],
  },
  {
    type: updateTypes.BAD_DEVICE_TOKEN,
    id: '98208',
    time: 1640869773495,
    deviceToken: 'some-device-token',
  },
  {
    type: updateTypes.UPDATE_ENTRY,
    id: '98233',
    time: 1640869844908,
    entryInfo: entry,
  },
  {
    type: updateTypes.UPDATE_CURRENT_USER,
    id: '98237',
    time: 1640869934058,
    currentUserInfo: {
      id: '256',
      username: 'ashoat',
    },
  },
  {
    type: updateTypes.UPDATE_USER,
    id: '97988',
    time: 1640869211822,
    updatedUserID: '86565',
  },
];

describe('server update validation', () => {
  for (const validatorUpdateType of values(updateTypes)) {
    const validator = updateSpecs[validatorUpdateType].infoValidator;
    const validatorUpdateTypeName = _findKey(
      e => e === Number(validatorUpdateType),
    )(updateTypes);

    for (const update of updates) {
      const updateTypeName = _findKey(e => e === update.type)(updateTypes);

      if (Number(validatorUpdateType) === update.type) {
        it(`${validatorUpdateTypeName} should validate ${updateTypeName}`, () => {
          expect(validator.is(update)).toBe(true);
        });
      } else {
        it(`${validatorUpdateTypeName} shouldn't validate ${updateTypeName}`, () => {
          expect(validator.is(update)).toBe(false);
        });
      }
    }
  }
});

describe('socket message validation', () => {
  const socketMessages = [
    {
      type: serverSocketMessageTypes.STATE_SYNC,
      responseTo: 0,
      payload: {
        type: 1,
        messagesResult: {
          rawMessageInfos: messages,
          truncationStatuses: { '86033': 'unchanged' },
          currentAsOf: 1683296863468,
        },
        updatesResult: {
          newUpdates: updates,
          currentAsOf: 1683296863489,
        },
        deltaEntryInfos: [],
        deletedEntryIDs: [],
        userInfos: [],
      },
    },
    {
      type: serverSocketMessageTypes.REQUESTS,
      payload: {
        serverRequests: [
          {
            type: 6,
            hashesToCheck: {
              threadInfos: 3311950643,
              entryInfos: 3191324567,
              currentUserInfo: 820850779,
              userInfos: 707653884,
            },
          },
        ],
      },
    },
    {
      type: serverSocketMessageTypes.ACTIVITY_UPDATE_RESPONSE,
      responseTo: 194,
      payload: { unfocusedToUnread: [] },
    },
    { type: serverSocketMessageTypes.PONG, responseTo: 190 },
    {
      type: 6,
      payload: {
        updatesResult: {
          currentAsOf: 1683298141720,
          newUpdates: [
            {
              type: 1,
              id: '94428',
              time: 1683298141720,
              threadInfo: thread,
            },
          ],
        },
        userInfos: [],
      },
    },
    {
      type: serverSocketMessageTypes.MESSAGES,
      payload: {
        messagesResult: {
          rawMessageInfos: messages,
          truncationStatuses: { '86033': 'unchanged' },
          currentAsOf: 1683298141707,
        },
      },
    },
    {
      type: serverSocketMessageTypes.API_RESPONSE,
      responseTo: 209,
      payload: {
        rawMessageInfos: messages,
        truncationStatuses: { '1': 'exhaustive' },
        userInfos: {},
      },
    },
  ];

  const validatorByMessageType = {
    [serverSocketMessageTypes.STATE_SYNC]:
      serverStateSyncServerSocketMessageValidator,
    [serverSocketMessageTypes.REQUESTS]:
      serverRequestsServerSocketMessageValidator,
    [serverSocketMessageTypes.ERROR]: errorServerSocketMessageValidator,
    [serverSocketMessageTypes.AUTH_ERROR]:
      authErrorServerSocketMessageValidator,
    [serverSocketMessageTypes.ACTIVITY_UPDATE_RESPONSE]:
      activityUpdateResponseServerSocketMessageValidator,
    [serverSocketMessageTypes.PONG]: pongServerSocketMessageValidator,
    [serverSocketMessageTypes.UPDATES]:
      serverUpdatesServerSocketMessageValidator,
    [serverSocketMessageTypes.MESSAGES]: messagesServerSocketMessageValidator,
    [serverSocketMessageTypes.API_RESPONSE]:
      apiResponseServerSocketMessageValidator,
  };

  for (const validatorMessageType in validatorByMessageType) {
    const validator = validatorByMessageType[validatorMessageType];
    const validatorMessageTypeName = _findKey(
      e => e === Number(validatorMessageType),
    )(serverSocketMessageTypes);

    for (const message of socketMessages) {
      const messageTypeName = _findKey(e => e === message.type)(
        serverSocketMessageTypes,
      );

      if (Number(validatorMessageType) === message.type) {
        it(`${validatorMessageTypeName} should validate ${messageTypeName}`, () => {
          expect(validator.is(message)).toBe(true);
        });
      } else {
        it(`${validatorMessageTypeName} shouldn't validate ${messageTypeName}`, () => {
          expect(validator.is(message)).toBe(false);
        });
      }
    }
  }
});
