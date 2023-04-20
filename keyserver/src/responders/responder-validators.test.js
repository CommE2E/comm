// @flow

import {
  logInResponseValidator,
  registerResponseValidator,
  logOutResponseValidator,
} from './user-responders.js';

describe('user responder', () => {
  it('logout response', () => {
    const response = { currentUserInfo: { id: '93078', anonymous: true } };
    expect(logOutResponseValidator.is(response)).toBe(true);
    response.currentUserInfo.anonymous = false;
    expect(logOutResponseValidator.is(response)).toBe(false);
  });

  it('register response', () => {
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

  it('login response', () => {
    const response = {
      currentUserInfo: { id: '93079', username: 'temp_user7' },
      rawMessageInfos: [
        {
          type: 0,
          id: '93115',
          threadID: '93094',
          time: 1682086407577,
          creatorID: '5',
          text: 'This is your private chat, where you can set reminders and jot notes in private!',
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
              'This is the first community on Comm. In the future it will be possible to create chats outside of a community, but for now all of these chats get set with GENESIS as their parent. GENESIS is hosted on Ashoat’s keyserver.',
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
