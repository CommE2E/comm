// @flow

import {
  setThreadUnreadStatusResultValidator,
  updateActivityResultValidator,
} from 'lib/types/activity-types.js';

import {
  fetchEntryInfosResponseValidator,
  fetchEntryRevisionInfosResultValidator,
  saveEntryResponseValidator,
  deleteEntryResponseValidator,
  deltaEntryInfosResultValidator,
  restoreEntryResponseValidator,
} from './entry-responders.js';
import { getSessionPublicKeysResponseValidator } from './keys-responders.js';
import {
  inviteLinkVerificationResponseValidator,
  fetchInviteLinksResponseValidator,
} from './link-responders.js';
import { messageReportCreationResultValidator } from './message-report-responder.js';
import {
  fetchMessageInfosResponseValidator,
  fetchPinnedMessagesResultValidator,
  sendEditMessageResponseValidator,
  sendMessageResponseValidator,
} from './message-responders.js';
import { relationshipErrorsValidator } from './relationship-responders.js';
import { reportCreationResponseValidator } from './report-responders.js';
import { userSearchResultValidator } from './search-responders.js';
import { siweNonceResponseValidator } from './siwe-nonce-responders.js';
import {
  changeThreadSettingsResultValidator,
  leaveThreadResultValidator,
  newThreadResponseValidator,
  threadFetchMediaResultValidator,
  threadJoinResultValidator,
  toggleMessagePinResultValidator,
  roleChangeRequestInputValidator,
} from './thread-responders.js';
import {
  logInResponseValidator,
  registerResponseValidator,
  logOutResponseValidator,
} from './user-responders.js';

describe('user responder validators', () => {
  it('should validate logout response', () => {
    const response = { currentUserInfo: { id: '93078', anonymous: true } };
    expect(logOutResponseValidator.is(response)).toBe(true);
    response.currentUserInfo.anonymous = false;
    expect(logOutResponseValidator.is(response)).toBe(false);
  });

  it('should validate register response', () => {
    const response = {
      id: '93079',
      rawMessageInfos: [
        {
          type: 1,
          threadID: '93095',
          creatorID: '93079',
          time: 1682086407469,
          initialThreadState: {
            type: 6,
            name: null,
            parentThreadID: '1',
            color: '648caa',
            memberIDs: ['256', '93079'],
          },
          id: '93110',
        },
        {
          type: 0,
          threadID: '93095',
          creatorID: '256',
          time: 1682086407575,
          text: 'welcome to Comm!',
          id: '93113',
        },
      ],
      currentUserInfo: { id: '93079', username: 'user' },
      cookieChange: {
        threadInfos: {
          '1': {
            id: '1',
            type: 12,
            name: 'GENESIS',
            description: 'desc',
            color: 'c85000',
            creationTime: 1672934346213,
            parentThreadID: null,
            members: [
              {
                id: '256',
                role: '83796',
                permissions: {
                  know_of: { value: true, source: '1' },
                  membership: { value: false, source: null },
                  visible: { value: true, source: '1' },
                  voiced: { value: true, source: '1' },
                  edit_entries: { value: true, source: '1' },
                  edit_thread: { value: true, source: '1' },
                  edit_thread_description: { value: true, source: '1' },
                  edit_thread_color: { value: true, source: '1' },
                  delete_thread: { value: true, source: '1' },
                  create_subthreads: { value: true, source: '1' },
                  create_sidebars: { value: true, source: '1' },
                  join_thread: { value: false, source: null },
                  edit_permissions: { value: false, source: null },
                  add_members: { value: true, source: '1' },
                  remove_members: { value: true, source: '1' },
                  change_role: { value: true, source: '1' },
                  leave_thread: { value: false, source: null },
                  react_to_message: { value: true, source: '1' },
                  edit_message: { value: true, source: '1' },
                },
                isSender: false,
              },
            ],
            roles: {
              '83795': {
                id: '83795',
                name: 'Members',
                permissions: {
                  know_of: true,
                  visible: true,
                  descendant_open_know_of: true,
                  descendant_open_visible: true,
                  descendant_opentoplevel_join_thread: true,
                },
                isDefault: true,
              },
            },
            currentUser: {
              role: '83795',
              permissions: {
                know_of: { value: true, source: '1' },
                membership: { value: false, source: null },
                visible: { value: true, source: '1' },
                voiced: { value: false, source: null },
                edit_entries: { value: false, source: null },
                edit_thread: { value: false, source: null },
                edit_thread_description: { value: false, source: null },
                edit_thread_color: { value: false, source: null },
                delete_thread: { value: false, source: null },
                create_subthreads: { value: false, source: null },
                create_sidebars: { value: false, source: null },
                join_thread: { value: false, source: null },
                edit_permissions: { value: false, source: null },
                add_members: { value: false, source: null },
                remove_members: { value: false, source: null },
                change_role: { value: false, source: null },
                leave_thread: { value: false, source: null },
                react_to_message: { value: false, source: null },
                edit_message: { value: false, source: null },
              },
              subscription: { home: true, pushNotifs: true },
              unread: true,
            },
            repliesCount: 0,
            containingThreadID: null,
            community: null,
          },
        },
        userInfos: [
          { id: '5', username: 'commbot' },
          { id: '256', username: 'ashoat' },
          { id: '93079', username: 'temp_user7' },
        ],
      },
    };

    expect(registerResponseValidator.is(response)).toBe(true);
    response.cookieChange.userInfos = undefined;
    expect(registerResponseValidator.is(response)).toBe(false);
  });

  it('should validate login response', () => {
    const response = {
      currentUserInfo: { id: '93079', username: 'temp_user7' },
      rawMessageInfos: [
        {
          type: 0,
          id: '93115',
          threadID: '93094',
          time: 1682086407577,
          creatorID: '5',
          text: 'This is your private chat, where you can set',
        },
        {
          type: 1,
          id: '93111',
          threadID: '93094',
          time: 1682086407467,
          creatorID: '93079',
          initialThreadState: {
            type: 7,
            name: 'temp_user7',
            parentThreadID: '1',
            color: '575757',
            memberIDs: ['93079'],
          },
        },
      ],
      truncationStatuses: { '93094': 'exhaustive', '93095': 'exhaustive' },
      serverTime: 1682086579416,
      userInfos: [
        { id: '5', username: 'commbot' },
        { id: '256', username: 'ashoat' },
        { id: '93079', username: 'temp_user7' },
      ],
      cookieChange: {
        threadInfos: {
          '1': {
            id: '1',
            type: 12,
            name: 'GENESIS',
            description:
              'This is the first community on Comm. In the future it will',
            color: 'c85000',
            creationTime: 1672934346213,
            parentThreadID: null,
            members: [
              {
                id: '256',
                role: '83796',
                permissions: {
                  know_of: { value: true, source: '1' },
                  membership: { value: false, source: null },
                  visible: { value: true, source: '1' },
                  voiced: { value: true, source: '1' },
                  edit_entries: { value: true, source: '1' },
                  edit_thread: { value: true, source: '1' },
                  edit_thread_description: { value: true, source: '1' },
                  edit_thread_color: { value: true, source: '1' },
                  delete_thread: { value: true, source: '1' },
                  create_subthreads: { value: true, source: '1' },
                  create_sidebars: { value: true, source: '1' },
                  join_thread: { value: false, source: null },
                  edit_permissions: { value: false, source: null },
                  add_members: { value: true, source: '1' },
                  remove_members: { value: true, source: '1' },
                  change_role: { value: true, source: '1' },
                  leave_thread: { value: false, source: null },
                  react_to_message: { value: true, source: '1' },
                  edit_message: { value: true, source: '1' },
                },
                isSender: false,
              },
              {
                id: '93079',
                role: '83795',
                permissions: {
                  know_of: { value: true, source: '1' },
                  membership: { value: false, source: null },
                  visible: { value: true, source: '1' },
                  voiced: { value: false, source: null },
                  edit_entries: { value: false, source: null },
                  edit_thread: { value: false, source: null },
                  edit_thread_description: { value: false, source: null },
                  edit_thread_color: { value: false, source: null },
                  delete_thread: { value: false, source: null },
                  create_subthreads: { value: false, source: null },
                  create_sidebars: { value: false, source: null },
                  join_thread: { value: false, source: null },
                  edit_permissions: { value: false, source: null },
                  add_members: { value: false, source: null },
                  remove_members: { value: false, source: null },
                  change_role: { value: false, source: null },
                  leave_thread: { value: false, source: null },
                  react_to_message: { value: false, source: null },
                  edit_message: { value: false, source: null },
                },
                isSender: false,
              },
            ],
            roles: {
              '83795': {
                id: '83795',
                name: 'Members',
                permissions: {
                  know_of: true,
                  visible: true,
                  descendant_open_know_of: true,
                  descendant_open_visible: true,
                  descendant_opentoplevel_join_thread: true,
                },
                isDefault: true,
              },
              '83796': {
                id: '83796',
                name: 'Admins',
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
                  create_subthreads: true,
                  create_sidebars: true,
                  add_members: true,
                  delete_thread: true,
                  remove_members: true,
                  change_role: true,
                  descendant_know_of: true,
                  descendant_visible: true,
                  descendant_toplevel_join_thread: true,
                  child_join_thread: true,
                  descendant_voiced: true,
                  descendant_edit_entries: true,
                  descendant_edit_thread: true,
                  descendant_edit_thread_color: true,
                  descendant_edit_thread_description: true,
                  descendant_toplevel_create_subthreads: true,
                  descendant_toplevel_create_sidebars: true,
                  descendant_add_members: true,
                  descendant_delete_thread: true,
                  descendant_edit_permissions: true,
                  descendant_remove_members: true,
                  descendant_change_role: true,
                },
                isDefault: false,
              },
            },
            currentUser: {
              role: '83795',
              permissions: {
                know_of: { value: true, source: '1' },
                membership: { value: false, source: null },
                visible: { value: true, source: '1' },
                voiced: { value: false, source: null },
                edit_entries: { value: false, source: null },
                edit_thread: { value: false, source: null },
                edit_thread_description: { value: false, source: null },
                edit_thread_color: { value: false, source: null },
                delete_thread: { value: false, source: null },
                create_subthreads: { value: false, source: null },
                create_sidebars: { value: false, source: null },
                join_thread: { value: false, source: null },
                edit_permissions: { value: false, source: null },
                add_members: { value: false, source: null },
                remove_members: { value: false, source: null },
                change_role: { value: false, source: null },
                leave_thread: { value: false, source: null },
                react_to_message: { value: false, source: null },
                edit_message: { value: false, source: null },
              },
              subscription: { home: true, pushNotifs: true },
              unread: true,
            },
            repliesCount: 0,
            containingThreadID: null,
            community: null,
          },
        },
        userInfos: [],
      },
      rawEntryInfos: [],
    };

    expect(logInResponseValidator.is(response)).toBe(true);
    expect(
      logInResponseValidator.is({ ...response, currentUserInfo: undefined }),
    ).toBe(false);
  });
});

describe('search responder', () => {
  it('should validate search response', () => {
    const response = {
      userInfos: [
        { id: '83817', username: 'temp_user0' },
        { id: '83853', username: 'temp_user1' },
        { id: '83890', username: 'temp_user2' },
        { id: '83928', username: 'temp_user3' },
      ],
    };

    expect(userSearchResultValidator.is(response)).toBe(true);
    response.userInfos.push({ id: 123 });
    expect(userSearchResultValidator.is(response)).toBe(false);
  });
});

describe('message report responder', () => {
  it('should validate message report response', () => {
    const response = {
      messageInfo: {
        type: 0,
        threadID: '101113',
        creatorID: '5',
        time: 1682429699746,
        text: 'text',
        id: '101121',
      },
    };

    expect(messageReportCreationResultValidator.is(response)).toBe(true);
    response.messageInfo.type = -2;
    expect(messageReportCreationResultValidator.is(response)).toBe(false);
  });
});

describe('relationship responder', () => {
  it('should validate relationship response', () => {
    const response = {
      invalid_user: ['83817', '83890'],
      already_friends: ['83890'],
    };

    expect(relationshipErrorsValidator.is(response)).toBe(true);
    expect(
      relationshipErrorsValidator.is({ ...response, user_blocked: {} }),
    ).toBe(false);
  });
});

describe('activity responder', () => {
  it('should validate update activity response', () => {
    const response = { unfocusedToUnread: ['93095'] };
    expect(updateActivityResultValidator.is(response)).toBe(true);
    response.unfocusedToUnread.push(123);
    expect(updateActivityResultValidator.is(response)).toBe(false);
  });

  it('should validate set thread unread response', () => {
    const response = { resetToUnread: false };
    expect(setThreadUnreadStatusResultValidator.is(response)).toBe(true);
    expect(
      setThreadUnreadStatusResultValidator.is({ ...response, unread: false }),
    ).toBe(false);
  });
});

describe('keys responder', () => {
  it('should validate get session public keys response', () => {
    const response = {
      identityKey: 'key',
      oneTimeKey: 'key',
    };

    expect(getSessionPublicKeysResponseValidator.is(response)).toBe(true);
    expect(getSessionPublicKeysResponseValidator.is(null)).toBe(true);
    expect(
      getSessionPublicKeysResponseValidator.is({
        ...response,
        identityKey: undefined,
      }),
    ).toBe(false);
  });
});

describe('siwe nonce responders', () => {
  it('should validate siwe nonce response', () => {
    const response = { nonce: 'nonce' };
    expect(siweNonceResponseValidator.is(response)).toBe(true);
    expect(siweNonceResponseValidator.is({ nonce: 123 })).toBe(false);
  });
});

describe('entry reponders', () => {
  it('should validate entry fetch response', () => {
    const response = {
      rawEntryInfos: [
        {
          id: '92860',
          threadID: '85068',
          text: 'text',
          year: 2023,
          month: 4,
          day: 2,
          creationTime: 1682082939882,
          creatorID: '83853',
          deleted: false,
        },
      ],
      userInfos: {
        '123': {
          id: '123',
          username: 'username',
        },
      },
    };
    expect(fetchEntryInfosResponseValidator.is(response)).toBe(true);
    expect(
      fetchEntryInfosResponseValidator.is({
        ...response,
        userInfos: undefined,
      }),
    ).toBe(false);
  });

  it('should validate entry revision fetch response', () => {
    const response = {
      result: [
        {
          id: '93297',
          authorID: '83853',
          text: 'text',
          lastUpdate: 1682603494202,
          deleted: false,
          threadID: '83859',
          entryID: '93270',
        },
        {
          id: '93284',
          authorID: '83853',
          text: 'text',
          lastUpdate: 1682603426996,
          deleted: true,
          threadID: '83859',
          entryID: '93270',
        },
      ],
    };
    expect(fetchEntryRevisionInfosResultValidator.is(response)).toBe(true);
    expect(
      fetchEntryRevisionInfosResultValidator.is({
        ...response,
        result: {},
      }),
    ).toBe(false);
  });

  it('should validate entry save response', () => {
    const response = {
      entryID: '93270',
      newMessageInfos: [
        {
          type: 9,
          threadID: '83859',
          creatorID: '83853',
          time: 1682603362817,
          entryID: '93270',
          date: '2023-04-03',
          text: 'text',
          id: '93272',
        },
      ],
      updatesResult: { viewerUpdates: [], userInfos: [] },
    };

    expect(saveEntryResponseValidator.is(response)).toBe(true);
    expect(
      saveEntryResponseValidator.is({
        ...response,
        entryID: undefined,
      }),
    ).toBe(false);
  });

  it('should validate entry delete response', () => {
    const response = {
      threadID: '83859',
      newMessageInfos: [
        {
          type: 11,
          threadID: '83859',
          creatorID: '83853',
          time: 1682603427038,
          entryID: '93270',
          date: '2023-04-03',
          text: 'text',
          id: '93285',
        },
      ],
      updatesResult: { viewerUpdates: [], userInfos: [] },
    };
    expect(deleteEntryResponseValidator.is(response)).toBe(true);
    expect(
      deleteEntryResponseValidator.is({
        ...response,
        threadID: undefined,
      }),
    ).toBe(false);
  });

  it('should validate entry restore response', () => {
    const response = {
      newMessageInfos: [
        {
          type: 11,
          threadID: '83859',
          creatorID: '83853',
          time: 1682603427038,
          entryID: '93270',
          date: '2023-04-03',
          text: 'text',
          id: '93285',
        },
      ],
      updatesResult: { viewerUpdates: [], userInfos: [] },
    };
    expect(restoreEntryResponseValidator.is(response)).toBe(true);
    expect(
      restoreEntryResponseValidator.is({
        ...response,
        newMessageInfos: undefined,
      }),
    ).toBe(false);
  });

  it('should validate entry delta response', () => {
    const response = {
      rawEntryInfos: [
        {
          id: '92860',
          threadID: '85068',
          text: 'text',
          year: 2023,
          month: 4,
          day: 2,
          creationTime: 1682082939882,
          creatorID: '83853',
          deleted: false,
        },
      ],
      deletedEntryIDs: ['92860'],
      userInfos: [
        {
          id: '123',
          username: 'username',
        },
      ],
    };
    expect(deltaEntryInfosResultValidator.is(response)).toBe(true);
    expect(
      deltaEntryInfosResultValidator.is({
        ...response,
        rawEntryInfos: undefined,
      }),
    ).toBe(false);
  });
});

describe('thread responders', () => {
  it('should validate change thread settings response', () => {
    const response = {
      updatesResult: {
        newUpdates: [
          {
            type: 1,
            id: '93601',
            time: 1682759546258,
            threadInfo: {
              id: '92796',
              type: 6,
              name: '',
              description: '',
              color: 'b8753d',
              creationTime: 1682076700918,
              parentThreadID: '1',
              members: [],
              roles: {},
              currentUser: {
                role: '85172',
                permissions: {},
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
            },
          },
        ],
      },
      newMessageInfos: [
        {
          type: 4,
          threadID: '92796',
          creatorID: '83928',
          time: 1682759546275,
          field: 'color',
          value: 'b8753d',
          id: '93602',
        },
      ],
    };
    expect(changeThreadSettingsResultValidator.is(response)).toBe(true);
    expect(
      changeThreadSettingsResultValidator.is({
        ...response,
        newMessageInfos: undefined,
      }),
    ).toBe(false);
  });

  it('should validate leave thread response', () => {
    const response = {
      updatesResult: {
        newUpdates: [
          { type: 3, id: '93595', time: 1682759498811, threadID: '93561' },
        ],
      },
    };
    expect(leaveThreadResultValidator.is(response)).toBe(true);
    expect(
      leaveThreadResultValidator.is({
        ...response,
        updatedResult: undefined,
      }),
    ).toBe(false);
  });

  it('should validate new thread response', () => {
    const response = {
      newThreadID: '93619',
      updatesResult: {
        newUpdates: [
          {
            type: 4,
            id: '93621',
            time: 1682759805331,
            threadInfo: {
              id: '93619',
              type: 5,
              name: 'a',
              description: '',
              color: 'b8753d',
              creationTime: 1682759805298,
              parentThreadID: '92796',
              members: [],
              roles: {},
              currentUser: {
                role: '85172',
                permissions: {},
                subscription: {
                  home: true,
                  pushNotifs: true,
                },
                unread: false,
              },
              repliesCount: 0,
              containingThreadID: '92796',
              community: '1',
              sourceMessageID: '93614',
              pinnedCount: 0,
            },
            rawMessageInfos: [],
            truncationStatus: 'exhaustive',
            rawEntryInfos: [],
          },
        ],
      },
      userInfos: {
        '256': { id: '256', username: 'ashoat' },
        '83928': { id: '83928', username: 'temp_user3' },
      },
      newMessageInfos: [],
    };
    expect(newThreadResponseValidator.is(response)).toBe(true);
    expect(
      newThreadResponseValidator.is({
        ...response,
        newMessageInfos: {},
      }),
    ).toBe(false);
  });

  it('should validate thread join response', () => {
    const response = {
      rawMessageInfos: [
        {
          type: 8,
          threadID: '93619',
          creatorID: '83928',
          time: 1682759915935,
          id: '93640',
        },
      ],
      truncationStatuses: {},
      userInfos: {
        '256': { id: '256', username: 'ashoat' },
        '83928': { id: '83928', username: 'temp_user3' },
      },
      updatesResult: {
        newUpdates: [],
      },
    };
    expect(threadJoinResultValidator.is(response)).toBe(true);
    expect(
      threadJoinResultValidator.is({
        ...response,
        updatesResult: [],
      }),
    ).toBe(false);
  });

  it('should validate thread fetch media response', () => {
    const response = {
      media: [
        {
          type: 'photo',
          id: '93642',
          uri: 'http://0.0.0.0:3000/comm/upload/93642/1e0d7a5262952e3b',
          dimensions: { width: 220, height: 220 },
        },
      ],
    };
    expect(threadFetchMediaResultValidator.is(response)).toBe(true);
    expect(
      threadFetchMediaResultValidator.is({ ...response, media: undefined }),
    ).toBe(false);
  });

  it('should validate toggle message pin response', () => {
    const response = { threadID: '123', newMessageInfos: [] };
    expect(toggleMessagePinResultValidator.is(response)).toBe(true);
    expect(
      toggleMessagePinResultValidator.is({ ...response, threadID: undefined }),
    ).toBe(false);
  });

  it('should validate role change request input', () => {
    const input = {
      threadID: '123',
      memberIDs: [],
      role: '1',
    };

    expect(roleChangeRequestInputValidator.is(input)).toBe(true);
    expect(roleChangeRequestInputValidator.is({ ...input, role: '2|1' })).toBe(
      true,
    );
    expect(roleChangeRequestInputValidator.is({ ...input, role: '-1' })).toBe(
      false,
    );
    expect(roleChangeRequestInputValidator.is({ ...input, role: '2|-1' })).toBe(
      false,
    );
  });
});

describe('message responders', () => {
  it('should validate send message response', () => {
    const response = {
      newMessageInfo: {
        type: 0,
        threadID: '93619',
        creatorID: '83928',
        time: 1682761023640,
        text: 'a',
        localID: 'local3',
        id: '93649',
      },
    };
    expect(sendMessageResponseValidator.is(response)).toBe(true);
    expect(
      sendMessageResponseValidator.is({
        ...response,
        newMEssageInfos: undefined,
      }),
    ).toBe(false);
  });

  it('should validate fetch message infos response', () => {
    const response = {
      rawMessageInfos: [
        {
          type: 0,
          id: '83954',
          threadID: '83938',
          time: 1673561155110,
          creatorID: '256',
          text: 'welcome to Comm!',
        },
      ],
      truncationStatuses: { '83938': 'exhaustive' },
      userInfos: {
        '256': { id: '256', username: 'ashoat' },
        '83928': { id: '83928', username: 'temp_user3' },
      },
    };
    expect(fetchMessageInfosResponseValidator.is(response)).toBe(true);
    expect(
      fetchMessageInfosResponseValidator.is({
        ...response,
        userInfos: undefined,
      }),
    ).toBe(false);
  });

  it('should validate send edit message response', () => {
    const response = {
      newMessageInfos: [
        {
          type: 0,
          id: '83954',
          threadID: '83938',
          time: 1673561155110,
          creatorID: '256',
          text: 'welcome to Comm!',
        },
      ],
    };
    expect(sendEditMessageResponseValidator.is(response)).toBe(true);
    expect(
      sendEditMessageResponseValidator.is({
        ...response,
        newMessageInfos: undefined,
      }),
    ).toBe(false);
  });

  it('should validate fetch pinned message response', () => {
    const response = {
      pinnedMessages: [
        {
          type: 0,
          id: '83954',
          threadID: '83938',
          time: 1673561155110,
          creatorID: '256',
          text: 'welcome to Comm!',
        },
      ],
    };
    expect(fetchPinnedMessagesResultValidator.is(response)).toBe(true);
    expect(
      fetchPinnedMessagesResultValidator.is({
        ...response,
        pinnedMessages: undefined,
      }),
    ).toBe(false);
  });
});

describe('report responders', () => {
  it('should validate report creation response', () => {
    const response = { id: '123' };
    expect(reportCreationResponseValidator.is(response)).toBe(true);
    expect(reportCreationResponseValidator.is({})).toBe(false);
  });
});

describe('link responders', () => {
  it('should validate invite link verification response', () => {
    const response = {
      status: 'already_joined',
      community: {
        name: 'name',
        id: '123',
      },
    };
    expect(inviteLinkVerificationResponseValidator.is(response)).toBe(true);
    expect(inviteLinkVerificationResponseValidator.is({})).toBe(false);
  });

  it('should validate invite link verification response', () => {
    const response = {
      links: [
        {
          name: 'name',
          primary: true,
          role: '123',
          communityID: '123',
          expirationTime: 123,
          limitOfUses: 123,
          numberOfUses: 123,
        },
      ],
    };
    expect(fetchInviteLinksResponseValidator.is(response)).toBe(true);
    expect(fetchInviteLinksResponseValidator.is({ links: {} })).toBe(false);
  });
});
