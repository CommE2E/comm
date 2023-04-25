// @flow

import type { ThreadStoreThreadInfos } from 'lib/types/thread-types.js';

const threadStoreThreads: ThreadStoreThreadInfos = {
  '1': {
    color: 'b8753d',
    community: null,
    containingThreadID: null,
    creationTime: 1679537878106,
    currentUser: {
      permissions: {
        add_members: {
          source: null,
          value: false,
        },
        change_role: {
          source: null,
          value: false,
        },
        create_sidebars: {
          source: null,
          value: false,
        },
        create_subthreads: {
          source: null,
          value: false,
        },
        delete_thread: {
          source: null,
          value: false,
        },
        edit_entries: {
          source: null,
          value: false,
        },
        edit_message: {
          source: null,
          value: false,
        },
        edit_permissions: {
          source: null,
          value: false,
        },
        edit_thread: {
          source: null,
          value: false,
        },
        edit_thread_avatar: {
          source: null,
          value: false,
        },
        edit_thread_color: {
          source: null,
          value: false,
        },
        edit_thread_description: {
          source: null,
          value: false,
        },
        join_thread: {
          source: null,
          value: false,
        },
        know_of: {
          source: '1',
          value: true,
        },
        leave_thread: {
          source: null,
          value: false,
        },
        manage_pins: {
          source: null,
          value: false,
        },
        membership: {
          source: null,
          value: false,
        },
        react_to_message: {
          source: null,
          value: false,
        },
        remove_members: {
          source: null,
          value: false,
        },
        visible: {
          source: '1',
          value: true,
        },
        voiced: {
          source: null,
          value: false,
        },
      },
      role: '83795',
      subscription: {
        home: true,
        pushNotifs: true,
      },
      unread: false,
    },
    description:
      'This is the first community on Comm. In the future it will be possible to create chats outside of a community, but for now all of these chats get set with GENESIS as their parent. GENESIS is hosted on Ashoat’s keyserver.',
    id: '1',
    members: [
      {
        id: '256',
        isSender: false,
        permissions: {
          add_members: {
            source: '1',
            value: true,
          },
          change_role: {
            source: '1',
            value: true,
          },
          create_sidebars: {
            source: '1',
            value: true,
          },
          create_subthreads: {
            source: '1',
            value: true,
          },
          delete_thread: {
            source: '1',
            value: true,
          },
          edit_entries: {
            source: '1',
            value: true,
          },
          edit_message: {
            source: '1',
            value: true,
          },
          edit_permissions: {
            source: null,
            value: false,
          },
          edit_thread: {
            source: '1',
            value: true,
          },
          edit_thread_avatar: {
            source: '1',
            value: true,
          },
          edit_thread_color: {
            source: '1',
            value: true,
          },
          edit_thread_description: {
            source: '1',
            value: true,
          },
          join_thread: {
            source: null,
            value: false,
          },
          know_of: {
            source: '1',
            value: true,
          },
          leave_thread: {
            source: null,
            value: false,
          },
          manage_pins: {
            source: '1',
            value: true,
          },
          membership: {
            source: null,
            value: false,
          },
          react_to_message: {
            source: '1',
            value: true,
          },
          remove_members: {
            source: '1',
            value: true,
          },
          visible: {
            source: '1',
            value: true,
          },
          voiced: {
            source: '1',
            value: true,
          },
        },
        role: '83796',
      },
      {
        id: '84589',
        isSender: false,
        permissions: {
          add_members: {
            source: null,
            value: false,
          },
          change_role: {
            source: null,
            value: false,
          },
          create_sidebars: {
            source: null,
            value: false,
          },
          create_subthreads: {
            source: null,
            value: false,
          },
          delete_thread: {
            source: null,
            value: false,
          },
          edit_entries: {
            source: null,
            value: false,
          },
          edit_message: {
            source: null,
            value: false,
          },
          edit_permissions: {
            source: null,
            value: false,
          },
          edit_thread: {
            source: null,
            value: false,
          },
          edit_thread_avatar: {
            source: null,
            value: false,
          },
          edit_thread_color: {
            source: null,
            value: false,
          },
          edit_thread_description: {
            source: null,
            value: false,
          },
          join_thread: {
            source: null,
            value: false,
          },
          know_of: {
            source: '1',
            value: true,
          },
          leave_thread: {
            source: null,
            value: false,
          },
          manage_pins: {
            source: null,
            value: false,
          },
          membership: {
            source: null,
            value: false,
          },
          react_to_message: {
            source: null,
            value: false,
          },
          remove_members: {
            source: null,
            value: false,
          },
          visible: {
            source: '1',
            value: true,
          },
          voiced: {
            source: null,
            value: false,
          },
        },
        role: '83795',
      },
    ],
    name: 'GENESIS',
    parentThreadID: null,
    pinnedCount: 0,
    repliesCount: 0,
    roles: {
      '83795': {
        id: '83795',
        isDefault: true,
        name: 'Members',
        permissions: {
          descendant_open_know_of: true,
          descendant_open_visible: true,
          descendant_opentoplevel_join_thread: true,
          know_of: true,
          visible: true,
        },
      },
      '83796': {
        id: '83796',
        isDefault: false,
        name: 'Admins',
        permissions: {
          add_members: true,
          change_role: true,
          child_join_thread: true,
          create_sidebars: true,
          create_subthreads: true,
          delete_thread: true,
          descendant_add_members: true,
          descendant_change_role: true,
          descendant_delete_thread: true,
          descendant_edit_entries: true,
          descendant_edit_permissions: true,
          descendant_edit_thread: true,
          descendant_edit_thread_avatar: true,
          descendant_edit_thread_color: true,
          descendant_edit_thread_description: true,
          descendant_know_of: true,
          descendant_manage_pins: true,
          descendant_remove_members: true,
          descendant_toplevel_create_sidebars: true,
          descendant_toplevel_create_subthreads: true,
          descendant_toplevel_join_thread: true,
          descendant_visible: true,
          descendant_voiced: true,
          edit_entries: true,
          edit_message: true,
          edit_thread: true,
          edit_thread_avatar: true,
          edit_thread_color: true,
          edit_thread_description: true,
          know_of: true,
          manage_pins: true,
          react_to_message: true,
          remove_members: true,
          visible: true,
          voiced: true,
        },
      },
    },
    type: 12,
  },
  '84596': {
    color: '575757',
    community: '1',
    containingThreadID: '1',
    creationTime: 1680734420100,
    currentUser: {
      permissions: {
        add_members: {
          source: null,
          value: false,
        },
        change_role: {
          source: null,
          value: false,
        },
        create_sidebars: {
          source: '84596',
          value: true,
        },
        create_subthreads: {
          source: null,
          value: false,
        },
        delete_thread: {
          source: null,
          value: false,
        },
        edit_entries: {
          source: '84596',
          value: true,
        },
        edit_message: {
          source: '84596',
          value: true,
        },
        edit_permissions: {
          source: null,
          value: false,
        },
        edit_thread: {
          source: null,
          value: false,
        },
        edit_thread_avatar: {
          source: null,
          value: false,
        },
        edit_thread_color: {
          source: '84596',
          value: true,
        },
        edit_thread_description: {
          source: '84596',
          value: true,
        },
        join_thread: {
          source: null,
          value: false,
        },
        know_of: {
          source: '84596',
          value: true,
        },
        leave_thread: {
          source: null,
          value: false,
        },
        manage_pins: {
          source: null,
          value: false,
        },
        membership: {
          source: null,
          value: false,
        },
        react_to_message: {
          source: '84596',
          value: true,
        },
        remove_members: {
          source: null,
          value: false,
        },
        visible: {
          source: '84596',
          value: true,
        },
        voiced: {
          source: '84596',
          value: true,
        },
      },
      role: '84597',
      subscription: {
        home: true,
        pushNotifs: true,
      },
      unread: false,
    },
    description:
      'This is your private chat, where you can set reminders and jot notes in private!',
    id: '84596',
    members: [
      {
        id: '256',
        isSender: false,
        permissions: {
          add_members: {
            source: '1',
            value: true,
          },
          change_role: {
            source: '1',
            value: true,
          },
          create_sidebars: {
            source: '1',
            value: true,
          },
          create_subthreads: {
            source: '1',
            value: true,
          },
          delete_thread: {
            source: '1',
            value: true,
          },
          edit_entries: {
            source: '1',
            value: true,
          },
          edit_message: {
            source: null,
            value: false,
          },
          edit_permissions: {
            source: '1',
            value: true,
          },
          edit_thread: {
            source: '1',
            value: true,
          },
          edit_thread_avatar: {
            source: '1',
            value: true,
          },
          edit_thread_color: {
            source: '1',
            value: true,
          },
          edit_thread_description: {
            source: '1',
            value: true,
          },
          join_thread: {
            source: '1',
            value: true,
          },
          know_of: {
            source: '1',
            value: true,
          },
          leave_thread: {
            source: null,
            value: false,
          },
          manage_pins: {
            source: '1',
            value: true,
          },
          membership: {
            source: null,
            value: false,
          },
          react_to_message: {
            source: null,
            value: false,
          },
          remove_members: {
            source: '1',
            value: true,
          },
          visible: {
            source: '1',
            value: true,
          },
          voiced: {
            source: '1',
            value: true,
          },
        },
        role: null,
      },
      {
        id: '84589',
        isSender: false,
        permissions: {
          add_members: {
            source: null,
            value: false,
          },
          change_role: {
            source: null,
            value: false,
          },
          create_sidebars: {
            source: '84596',
            value: true,
          },
          create_subthreads: {
            source: null,
            value: false,
          },
          delete_thread: {
            source: null,
            value: false,
          },
          edit_entries: {
            source: '84596',
            value: true,
          },
          edit_message: {
            source: '84596',
            value: true,
          },
          edit_permissions: {
            source: null,
            value: false,
          },
          edit_thread: {
            source: null,
            value: false,
          },
          edit_thread_avatar: {
            source: null,
            value: false,
          },
          edit_thread_color: {
            source: '84596',
            value: true,
          },
          edit_thread_description: {
            source: '84596',
            value: true,
          },
          join_thread: {
            source: null,
            value: false,
          },
          know_of: {
            source: '84596',
            value: true,
          },
          leave_thread: {
            source: null,
            value: false,
          },
          manage_pins: {
            source: null,
            value: false,
          },
          membership: {
            source: null,
            value: false,
          },
          react_to_message: {
            source: '84596',
            value: true,
          },
          remove_members: {
            source: null,
            value: false,
          },
          visible: {
            source: '84596',
            value: true,
          },
          voiced: {
            source: '84596',
            value: true,
          },
        },
        role: '84597',
      },
    ],
    name: 'hillary',
    parentThreadID: '1',
    pinnedCount: 0,
    repliesCount: 0,
    roles: {
      '84597': {
        id: '84597',
        isDefault: true,
        name: 'Members',
        permissions: {
          child_open_join_thread: true,
          create_sidebars: true,
          descendant_open_know_of: true,
          descendant_open_visible: true,
          edit_entries: true,
          edit_message: true,
          edit_thread_color: true,
          edit_thread_description: true,
          know_of: true,
          react_to_message: true,
          visible: true,
          voiced: true,
        },
      },
    },
    type: 7,
  },
  '84598': {
    color: '5c9f5f',
    community: '1',
    containingThreadID: '1',
    creationTime: 1680734420159,
    currentUser: {
      permissions: {
        add_members: {
          source: null,
          value: false,
        },
        change_role: {
          source: null,
          value: false,
        },
        create_sidebars: {
          source: '84598',
          value: true,
        },
        create_subthreads: {
          source: null,
          value: false,
        },
        delete_thread: {
          source: null,
          value: false,
        },
        edit_entries: {
          source: '84598',
          value: true,
        },
        edit_message: {
          source: '84598',
          value: true,
        },
        edit_permissions: {
          source: null,
          value: false,
        },
        edit_thread: {
          source: '84598',
          value: true,
        },
        edit_thread_avatar: {
          source: null,
          value: false,
        },
        edit_thread_color: {
          source: '84598',
          value: true,
        },
        edit_thread_description: {
          source: '84598',
          value: true,
        },
        join_thread: {
          source: null,
          value: false,
        },
        know_of: {
          source: '84598',
          value: true,
        },
        leave_thread: {
          source: null,
          value: false,
        },
        manage_pins: {
          source: null,
          value: false,
        },
        membership: {
          source: null,
          value: false,
        },
        react_to_message: {
          source: '84598',
          value: true,
        },
        remove_members: {
          source: null,
          value: false,
        },
        visible: {
          source: '84598',
          value: true,
        },
        voiced: {
          source: '84598',
          value: true,
        },
      },
      role: '84599',
      subscription: {
        home: true,
        pushNotifs: true,
      },
      unread: false,
    },
    description: '',
    id: '84598',
    members: [
      {
        id: '256',
        isSender: true,
        permissions: {
          add_members: {
            source: '1',
            value: true,
          },
          change_role: {
            source: '1',
            value: true,
          },
          create_sidebars: {
            source: '84598',
            value: true,
          },
          create_subthreads: {
            source: '1',
            value: true,
          },
          delete_thread: {
            source: '1',
            value: true,
          },
          edit_entries: {
            source: '84598',
            value: true,
          },
          edit_message: {
            source: '84598',
            value: true,
          },
          edit_permissions: {
            source: '1',
            value: true,
          },
          edit_thread: {
            source: '84598',
            value: true,
          },
          edit_thread_avatar: {
            source: '1',
            value: true,
          },
          edit_thread_color: {
            source: '84598',
            value: true,
          },
          edit_thread_description: {
            source: '84598',
            value: true,
          },
          join_thread: {
            source: '1',
            value: true,
          },
          know_of: {
            source: '84598',
            value: true,
          },
          leave_thread: {
            source: null,
            value: false,
          },
          manage_pins: {
            source: '1',
            value: true,
          },
          membership: {
            source: null,
            value: false,
          },
          react_to_message: {
            source: '84598',
            value: true,
          },
          remove_members: {
            source: '1',
            value: true,
          },
          visible: {
            source: '84598',
            value: true,
          },
          voiced: {
            source: '84598',
            value: true,
          },
        },
        role: '84599',
      },
      {
        id: '84589',
        isSender: false,
        permissions: {
          add_members: {
            source: null,
            value: false,
          },
          change_role: {
            source: null,
            value: false,
          },
          create_sidebars: {
            source: '84598',
            value: true,
          },
          create_subthreads: {
            source: null,
            value: false,
          },
          delete_thread: {
            source: null,
            value: false,
          },
          edit_entries: {
            source: '84598',
            value: true,
          },
          edit_message: {
            source: '84598',
            value: true,
          },
          edit_permissions: {
            source: null,
            value: false,
          },
          edit_thread: {
            source: '84598',
            value: true,
          },
          edit_thread_avatar: {
            source: null,
            value: false,
          },
          edit_thread_color: {
            source: '84598',
            value: true,
          },
          edit_thread_description: {
            source: '84598',
            value: true,
          },
          join_thread: {
            source: null,
            value: false,
          },
          know_of: {
            source: '84598',
            value: true,
          },
          leave_thread: {
            source: null,
            value: false,
          },
          manage_pins: {
            source: null,
            value: false,
          },
          membership: {
            source: null,
            value: false,
          },
          react_to_message: {
            source: '84598',
            value: true,
          },
          remove_members: {
            source: null,
            value: false,
          },
          visible: {
            source: '84598',
            value: true,
          },
          voiced: {
            source: '84598',
            value: true,
          },
        },
        role: '84599',
      },
    ],
    name: '',
    parentThreadID: '1',
    pinnedCount: 0,
    repliesCount: 0,
    roles: {
      '84599': {
        id: '84599',
        isDefault: true,
        name: 'Members',
        permissions: {
          child_open_join_thread: true,
          create_sidebars: true,
          descendant_open_know_of: true,
          descendant_open_visible: true,
          edit_entries: true,
          edit_message: true,
          edit_thread: true,
          edit_thread_color: true,
          edit_thread_description: true,
          know_of: true,
          react_to_message: true,
          visible: true,
          voiced: true,
        },
      },
    },
    type: 6,
  },
  '84627': {
    color: 'aa4b4b',
    community: '1',
    containingThreadID: '1',
    creationTime: 1680734427175,
    currentUser: {
      permissions: {
        add_members: {
          source: null,
          value: false,
        },
        change_role: {
          source: null,
          value: false,
        },
        create_sidebars: {
          source: '84627',
          value: true,
        },
        create_subthreads: {
          source: null,
          value: false,
        },
        delete_thread: {
          source: null,
          value: false,
        },
        edit_entries: {
          source: '84627',
          value: true,
        },
        edit_message: {
          source: '84627',
          value: true,
        },
        edit_permissions: {
          source: null,
          value: false,
        },
        edit_thread: {
          source: '84627',
          value: true,
        },
        edit_thread_avatar: {
          source: null,
          value: false,
        },
        edit_thread_color: {
          source: '84627',
          value: true,
        },
        edit_thread_description: {
          source: '84627',
          value: true,
        },
        join_thread: {
          source: null,
          value: false,
        },
        know_of: {
          source: '84627',
          value: true,
        },
        leave_thread: {
          source: null,
          value: false,
        },
        manage_pins: {
          source: null,
          value: false,
        },
        membership: {
          source: null,
          value: false,
        },
        react_to_message: {
          source: '84627',
          value: true,
        },
        remove_members: {
          source: null,
          value: false,
        },
        visible: {
          source: '84627',
          value: true,
        },
        voiced: {
          source: '84627',
          value: true,
        },
      },
      role: '84628',
      subscription: {
        home: true,
        pushNotifs: true,
      },
      unread: false,
    },
    description: '',
    id: '84627',
    members: [
      {
        id: '256',
        isSender: false,
        permissions: {
          add_members: {
            source: '1',
            value: true,
          },
          change_role: {
            source: '1',
            value: true,
          },
          create_sidebars: {
            source: '1',
            value: true,
          },
          create_subthreads: {
            source: '1',
            value: true,
          },
          delete_thread: {
            source: '1',
            value: true,
          },
          edit_entries: {
            source: '1',
            value: true,
          },
          edit_message: {
            source: null,
            value: false,
          },
          edit_permissions: {
            source: '1',
            value: true,
          },
          edit_thread: {
            source: '1',
            value: true,
          },
          edit_thread_avatar: {
            source: '1',
            value: true,
          },
          edit_thread_color: {
            source: '1',
            value: true,
          },
          edit_thread_description: {
            source: '1',
            value: true,
          },
          join_thread: {
            source: '1',
            value: true,
          },
          know_of: {
            source: '1',
            value: true,
          },
          leave_thread: {
            source: null,
            value: false,
          },
          manage_pins: {
            source: '1',
            value: true,
          },
          membership: {
            source: null,
            value: false,
          },
          react_to_message: {
            source: null,
            value: false,
          },
          remove_members: {
            source: '1',
            value: true,
          },
          visible: {
            source: '1',
            value: true,
          },
          voiced: {
            source: '1',
            value: true,
          },
        },
        role: null,
      },
      {
        id: '83969',
        isSender: false,
        permissions: {
          add_members: {
            source: null,
            value: false,
          },
          change_role: {
            source: null,
            value: false,
          },
          create_sidebars: {
            source: '84627',
            value: true,
          },
          create_subthreads: {
            source: null,
            value: false,
          },
          delete_thread: {
            source: null,
            value: false,
          },
          edit_entries: {
            source: '84627',
            value: true,
          },
          edit_message: {
            source: '84627',
            value: true,
          },
          edit_permissions: {
            source: null,
            value: false,
          },
          edit_thread: {
            source: '84627',
            value: true,
          },
          edit_thread_avatar: {
            source: null,
            value: false,
          },
          edit_thread_color: {
            source: '84627',
            value: true,
          },
          edit_thread_description: {
            source: '84627',
            value: true,
          },
          join_thread: {
            source: null,
            value: false,
          },
          know_of: {
            source: '84627',
            value: true,
          },
          leave_thread: {
            source: null,
            value: false,
          },
          manage_pins: {
            source: null,
            value: false,
          },
          membership: {
            source: null,
            value: false,
          },
          react_to_message: {
            source: '84627',
            value: true,
          },
          remove_members: {
            source: null,
            value: false,
          },
          visible: {
            source: '84627',
            value: true,
          },
          voiced: {
            source: '84627',
            value: true,
          },
        },
        role: '84628',
      },
      {
        id: '84589',
        isSender: false,
        permissions: {
          add_members: {
            source: null,
            value: false,
          },
          change_role: {
            source: null,
            value: false,
          },
          create_sidebars: {
            source: '84627',
            value: true,
          },
          create_subthreads: {
            source: null,
            value: false,
          },
          delete_thread: {
            source: null,
            value: false,
          },
          edit_entries: {
            source: '84627',
            value: true,
          },
          edit_message: {
            source: '84627',
            value: true,
          },
          edit_permissions: {
            source: null,
            value: false,
          },
          edit_thread: {
            source: '84627',
            value: true,
          },
          edit_thread_avatar: {
            source: null,
            value: false,
          },
          edit_thread_color: {
            source: '84627',
            value: true,
          },
          edit_thread_description: {
            source: '84627',
            value: true,
          },
          join_thread: {
            source: null,
            value: false,
          },
          know_of: {
            source: '84627',
            value: true,
          },
          leave_thread: {
            source: null,
            value: false,
          },
          manage_pins: {
            source: null,
            value: false,
          },
          membership: {
            source: null,
            value: false,
          },
          react_to_message: {
            source: '84627',
            value: true,
          },
          remove_members: {
            source: null,
            value: false,
          },
          visible: {
            source: '84627',
            value: true,
          },
          voiced: {
            source: '84627',
            value: true,
          },
        },
        role: '84628',
      },
    ],
    name: '',
    parentThreadID: '1',
    pinnedCount: 0,
    repliesCount: 0,
    roles: {
      '84628': {
        id: '84628',
        isDefault: true,
        name: 'Members',
        permissions: {
          child_open_join_thread: true,
          create_sidebars: true,
          descendant_open_know_of: true,
          descendant_open_visible: true,
          edit_entries: true,
          edit_message: true,
          edit_thread: true,
          edit_thread_color: true,
          edit_thread_description: true,
          know_of: true,
          react_to_message: true,
          visible: true,
          voiced: true,
        },
      },
    },
    type: 6,
  },
  '84656': {
    color: '6d49ab',
    community: '1',
    containingThreadID: '1',
    creationTime: 1680734490721,
    currentUser: {
      permissions: {
        add_members: {
          source: '84656',
          value: true,
        },
        change_role: {
          source: null,
          value: false,
        },
        create_sidebars: {
          source: '84656',
          value: true,
        },
        create_subthreads: {
          source: '84656',
          value: true,
        },
        delete_thread: {
          source: null,
          value: false,
        },
        edit_entries: {
          source: '84656',
          value: true,
        },
        edit_message: {
          source: '84656',
          value: true,
        },
        edit_permissions: {
          source: '84656',
          value: true,
        },
        edit_thread: {
          source: '84656',
          value: true,
        },
        edit_thread_avatar: {
          source: '84656',
          value: true,
        },
        edit_thread_color: {
          source: '84656',
          value: true,
        },
        edit_thread_description: {
          source: '84656',
          value: true,
        },
        join_thread: {
          source: null,
          value: false,
        },
        know_of: {
          source: '84656',
          value: true,
        },
        leave_thread: {
          source: '84656',
          value: true,
        },
        manage_pins: {
          source: null,
          value: false,
        },
        membership: {
          source: null,
          value: false,
        },
        react_to_message: {
          source: '84656',
          value: true,
        },
        remove_members: {
          source: '84656',
          value: true,
        },
        visible: {
          source: '84656',
          value: true,
        },
        voiced: {
          source: '84656',
          value: true,
        },
      },
      role: '84657',
      subscription: {
        home: true,
        pushNotifs: true,
      },
      unread: false,
    },
    description: '',
    id: '84656',
    members: [
      {
        id: '256',
        isSender: false,
        permissions: {
          add_members: {
            source: '1',
            value: true,
          },
          change_role: {
            source: '1',
            value: true,
          },
          create_sidebars: {
            source: '1',
            value: true,
          },
          create_subthreads: {
            source: '1',
            value: true,
          },
          delete_thread: {
            source: '1',
            value: true,
          },
          edit_entries: {
            source: '1',
            value: true,
          },
          edit_message: {
            source: null,
            value: false,
          },
          edit_permissions: {
            source: '1',
            value: true,
          },
          edit_thread: {
            source: '1',
            value: true,
          },
          edit_thread_avatar: {
            source: '1',
            value: true,
          },
          edit_thread_color: {
            source: '1',
            value: true,
          },
          edit_thread_description: {
            source: '1',
            value: true,
          },
          join_thread: {
            source: '1',
            value: true,
          },
          know_of: {
            source: '1',
            value: true,
          },
          leave_thread: {
            source: null,
            value: false,
          },
          manage_pins: {
            source: '1',
            value: true,
          },
          membership: {
            source: null,
            value: false,
          },
          react_to_message: {
            source: null,
            value: false,
          },
          remove_members: {
            source: '1',
            value: true,
          },
          visible: {
            source: '1',
            value: true,
          },
          voiced: {
            source: '1',
            value: true,
          },
        },
        role: null,
      },
      {
        id: '83809',
        isSender: true,
        permissions: {
          add_members: {
            source: '84656',
            value: true,
          },
          change_role: {
            source: null,
            value: false,
          },
          create_sidebars: {
            source: '84656',
            value: true,
          },
          create_subthreads: {
            source: '84656',
            value: true,
          },
          delete_thread: {
            source: null,
            value: false,
          },
          edit_entries: {
            source: '84656',
            value: true,
          },
          edit_message: {
            source: '84656',
            value: true,
          },
          edit_permissions: {
            source: '84656',
            value: true,
          },
          edit_thread: {
            source: '84656',
            value: true,
          },
          edit_thread_avatar: {
            source: '84656',
            value: true,
          },
          edit_thread_color: {
            source: '84656',
            value: true,
          },
          edit_thread_description: {
            source: '84656',
            value: true,
          },
          join_thread: {
            source: null,
            value: false,
          },
          know_of: {
            source: '84656',
            value: true,
          },
          leave_thread: {
            source: '84656',
            value: true,
          },
          manage_pins: {
            source: null,
            value: false,
          },
          membership: {
            source: null,
            value: false,
          },
          react_to_message: {
            source: '84656',
            value: true,
          },
          remove_members: {
            source: '84656',
            value: true,
          },
          visible: {
            source: '84656',
            value: true,
          },
          voiced: {
            source: '84656',
            value: true,
          },
        },
        role: '84657',
      },
      {
        id: '83969',
        isSender: true,
        permissions: {
          add_members: {
            source: '84656',
            value: true,
          },
          change_role: {
            source: null,
            value: false,
          },
          create_sidebars: {
            source: '84656',
            value: true,
          },
          create_subthreads: {
            source: '84656',
            value: true,
          },
          delete_thread: {
            source: null,
            value: false,
          },
          edit_entries: {
            source: '84656',
            value: true,
          },
          edit_message: {
            source: '84656',
            value: true,
          },
          edit_permissions: {
            source: '84656',
            value: true,
          },
          edit_thread: {
            source: '84656',
            value: true,
          },
          edit_thread_avatar: {
            source: '84656',
            value: true,
          },
          edit_thread_color: {
            source: '84656',
            value: true,
          },
          edit_thread_description: {
            source: '84656',
            value: true,
          },
          join_thread: {
            source: null,
            value: false,
          },
          know_of: {
            source: '84656',
            value: true,
          },
          leave_thread: {
            source: '84656',
            value: true,
          },
          manage_pins: {
            source: null,
            value: false,
          },
          membership: {
            source: null,
            value: false,
          },
          react_to_message: {
            source: '84656',
            value: true,
          },
          remove_members: {
            source: '84656',
            value: true,
          },
          visible: {
            source: '84656',
            value: true,
          },
          voiced: {
            source: '84656',
            value: true,
          },
        },
        role: '84657',
      },
      {
        id: '84589',
        isSender: false,
        permissions: {
          add_members: {
            source: '84656',
            value: true,
          },
          change_role: {
            source: null,
            value: false,
          },
          create_sidebars: {
            source: '84656',
            value: true,
          },
          create_subthreads: {
            source: '84656',
            value: true,
          },
          delete_thread: {
            source: null,
            value: false,
          },
          edit_entries: {
            source: '84656',
            value: true,
          },
          edit_message: {
            source: '84656',
            value: true,
          },
          edit_permissions: {
            source: '84656',
            value: true,
          },
          edit_thread: {
            source: '84656',
            value: true,
          },
          edit_thread_avatar: {
            source: '84656',
            value: true,
          },
          edit_thread_color: {
            source: '84656',
            value: true,
          },
          edit_thread_description: {
            source: '84656',
            value: true,
          },
          join_thread: {
            source: null,
            value: false,
          },
          know_of: {
            source: '84656',
            value: true,
          },
          leave_thread: {
            source: '84656',
            value: true,
          },
          manage_pins: {
            source: null,
            value: false,
          },
          membership: {
            source: null,
            value: false,
          },
          react_to_message: {
            source: '84656',
            value: true,
          },
          remove_members: {
            source: '84656',
            value: true,
          },
          visible: {
            source: '84656',
            value: true,
          },
          voiced: {
            source: '84656',
            value: true,
          },
        },
        role: '84657',
      },
    ],
    name: 'group',
    parentThreadID: '1',
    pinnedCount: 0,
    repliesCount: 0,
    roles: {
      '84657': {
        id: '84657',
        isDefault: true,
        name: 'Members',
        permissions: {
          add_members: true,
          child_open_join_thread: true,
          create_sidebars: true,
          create_subthreads: true,
          descendant_open_know_of: true,
          descendant_open_visible: true,
          descendant_opentoplevel_join_thread: true,
          edit_entries: true,
          edit_message: true,
          edit_permissions: true,
          edit_thread: true,
          edit_thread_avatar: true,
          edit_thread_color: true,
          edit_thread_description: true,
          know_of: true,
          leave_thread: true,
          react_to_message: true,
          remove_members: true,
          visible: true,
          voiced: true,
        },
      },
    },
    type: 4,
  },
  '86071': {
    color: '6d49ab',
    community: '1',
    containingThreadID: '1',
    creationTime: 1681160151827,
    currentUser: {
      permissions: {
        add_members: {
          source: null,
          value: false,
        },
        change_role: {
          source: null,
          value: false,
        },
        create_sidebars: {
          source: '86071',
          value: true,
        },
        create_subthreads: {
          source: null,
          value: false,
        },
        delete_thread: {
          source: null,
          value: false,
        },
        edit_entries: {
          source: '86071',
          value: true,
        },
        edit_message: {
          source: '86071',
          value: true,
        },
        edit_permissions: {
          source: null,
          value: false,
        },
        edit_thread: {
          source: '86071',
          value: true,
        },
        edit_thread_avatar: {
          source: null,
          value: false,
        },
        edit_thread_color: {
          source: '86071',
          value: true,
        },
        edit_thread_description: {
          source: '86071',
          value: true,
        },
        join_thread: {
          source: null,
          value: false,
        },
        know_of: {
          source: '86071',
          value: true,
        },
        leave_thread: {
          source: null,
          value: false,
        },
        manage_pins: {
          source: null,
          value: false,
        },
        membership: {
          source: null,
          value: false,
        },
        react_to_message: {
          source: '86071',
          value: true,
        },
        remove_members: {
          source: null,
          value: false,
        },
        visible: {
          source: '86071',
          value: true,
        },
        voiced: {
          source: '86071',
          value: true,
        },
      },
      role: '86072',
      subscription: {
        home: true,
        pushNotifs: true,
      },
      unread: false,
    },
    description: '',
    id: '86071',
    members: [
      {
        id: '256',
        isSender: false,
        permissions: {
          add_members: {
            source: '1',
            value: true,
          },
          change_role: {
            source: '1',
            value: true,
          },
          create_sidebars: {
            source: '1',
            value: true,
          },
          create_subthreads: {
            source: '1',
            value: true,
          },
          delete_thread: {
            source: '1',
            value: true,
          },
          edit_entries: {
            source: '1',
            value: true,
          },
          edit_message: {
            source: null,
            value: false,
          },
          edit_permissions: {
            source: '1',
            value: true,
          },
          edit_thread: {
            source: '1',
            value: true,
          },
          edit_thread_avatar: {
            source: '1',
            value: true,
          },
          edit_thread_color: {
            source: '1',
            value: true,
          },
          edit_thread_description: {
            source: '1',
            value: true,
          },
          join_thread: {
            source: '1',
            value: true,
          },
          know_of: {
            source: '1',
            value: true,
          },
          leave_thread: {
            source: null,
            value: false,
          },
          manage_pins: {
            source: '1',
            value: true,
          },
          membership: {
            source: null,
            value: false,
          },
          react_to_message: {
            source: null,
            value: false,
          },
          remove_members: {
            source: '1',
            value: true,
          },
          visible: {
            source: '1',
            value: true,
          },
          voiced: {
            source: '1',
            value: true,
          },
        },
        role: null,
      },
      {
        id: '84589',
        isSender: true,
        permissions: {
          add_members: {
            source: null,
            value: false,
          },
          change_role: {
            source: null,
            value: false,
          },
          create_sidebars: {
            source: '86071',
            value: true,
          },
          create_subthreads: {
            source: null,
            value: false,
          },
          delete_thread: {
            source: null,
            value: false,
          },
          edit_entries: {
            source: '86071',
            value: true,
          },
          edit_message: {
            source: '86071',
            value: true,
          },
          edit_permissions: {
            source: null,
            value: false,
          },
          edit_thread: {
            source: '86071',
            value: true,
          },
          edit_thread_avatar: {
            source: null,
            value: false,
          },
          edit_thread_color: {
            source: '86071',
            value: true,
          },
          edit_thread_description: {
            source: '86071',
            value: true,
          },
          join_thread: {
            source: null,
            value: false,
          },
          know_of: {
            source: '86071',
            value: true,
          },
          leave_thread: {
            source: null,
            value: false,
          },
          manage_pins: {
            source: null,
            value: false,
          },
          membership: {
            source: null,
            value: false,
          },
          react_to_message: {
            source: '86071',
            value: true,
          },
          remove_members: {
            source: null,
            value: false,
          },
          visible: {
            source: '86071',
            value: true,
          },
          voiced: {
            source: '86071',
            value: true,
          },
        },
        role: '86072',
      },
      {
        id: '85999',
        isSender: true,
        permissions: {
          add_members: {
            source: null,
            value: false,
          },
          change_role: {
            source: null,
            value: false,
          },
          create_sidebars: {
            source: '86071',
            value: true,
          },
          create_subthreads: {
            source: null,
            value: false,
          },
          delete_thread: {
            source: null,
            value: false,
          },
          edit_entries: {
            source: '86071',
            value: true,
          },
          edit_message: {
            source: '86071',
            value: true,
          },
          edit_permissions: {
            source: null,
            value: false,
          },
          edit_thread: {
            source: '86071',
            value: true,
          },
          edit_thread_avatar: {
            source: null,
            value: false,
          },
          edit_thread_color: {
            source: '86071',
            value: true,
          },
          edit_thread_description: {
            source: '86071',
            value: true,
          },
          join_thread: {
            source: null,
            value: false,
          },
          know_of: {
            source: '86071',
            value: true,
          },
          leave_thread: {
            source: null,
            value: false,
          },
          manage_pins: {
            source: null,
            value: false,
          },
          membership: {
            source: null,
            value: false,
          },
          react_to_message: {
            source: '86071',
            value: true,
          },
          remove_members: {
            source: null,
            value: false,
          },
          visible: {
            source: '86071',
            value: true,
          },
          voiced: {
            source: '86071',
            value: true,
          },
        },
        role: '86072',
      },
    ],
    name: '',
    parentThreadID: '1',
    pinnedCount: 0,
    repliesCount: 0,
    roles: {
      '86072': {
        id: '86072',
        isDefault: true,
        name: 'Members',
        permissions: {
          child_open_join_thread: true,
          create_sidebars: true,
          descendant_open_know_of: true,
          descendant_open_visible: true,
          edit_entries: true,
          edit_message: true,
          edit_thread: true,
          edit_thread_color: true,
          edit_thread_description: true,
          know_of: true,
          react_to_message: true,
          visible: true,
          voiced: true,
        },
      },
    },
    type: 6,
  },
  '87789': {
    color: '6d49ab',
    community: '1',
    containingThreadID: '1',
    creationTime: 1682367957349,
    currentUser: {
      permissions: {
        add_members: {
          source: '87789',
          value: true,
        },
        change_role: {
          source: null,
          value: false,
        },
        create_sidebars: {
          source: '87789',
          value: true,
        },
        create_subthreads: {
          source: '87789',
          value: true,
        },
        delete_thread: {
          source: null,
          value: false,
        },
        edit_entries: {
          source: '87789',
          value: true,
        },
        edit_message: {
          source: '87789',
          value: true,
        },
        edit_permissions: {
          source: '87789',
          value: true,
        },
        edit_thread: {
          source: '87789',
          value: true,
        },
        edit_thread_avatar: {
          source: '87789',
          value: true,
        },
        edit_thread_color: {
          source: '87789',
          value: true,
        },
        edit_thread_description: {
          source: '87789',
          value: true,
        },
        join_thread: {
          source: '84656',
          value: true,
        },
        know_of: {
          source: '87789',
          value: true,
        },
        leave_thread: {
          source: '87789',
          value: true,
        },
        manage_pins: {
          source: null,
          value: false,
        },
        membership: {
          source: null,
          value: false,
        },
        react_to_message: {
          source: '87789',
          value: true,
        },
        remove_members: {
          source: '87789',
          value: true,
        },
        visible: {
          source: '87789',
          value: true,
        },
        voiced: {
          source: '87789',
          value: true,
        },
      },
      role: '87790',
      subscription: {
        home: true,
        pushNotifs: true,
      },
      unread: false,
    },
    description: '',
    id: '87789',
    members: [
      {
        id: '256',
        isSender: false,
        permissions: {
          add_members: {
            source: '1',
            value: true,
          },
          change_role: {
            source: '1',
            value: true,
          },
          create_sidebars: {
            source: '1',
            value: true,
          },
          create_subthreads: {
            source: '1',
            value: true,
          },
          delete_thread: {
            source: '1',
            value: true,
          },
          edit_entries: {
            source: '1',
            value: true,
          },
          edit_message: {
            source: null,
            value: false,
          },
          edit_permissions: {
            source: '1',
            value: true,
          },
          edit_thread: {
            source: '1',
            value: true,
          },
          edit_thread_avatar: {
            source: '1',
            value: true,
          },
          edit_thread_color: {
            source: '1',
            value: true,
          },
          edit_thread_description: {
            source: '1',
            value: true,
          },
          join_thread: {
            source: '1',
            value: true,
          },
          know_of: {
            source: '1',
            value: true,
          },
          leave_thread: {
            source: null,
            value: false,
          },
          manage_pins: {
            source: '1',
            value: true,
          },
          membership: {
            source: null,
            value: false,
          },
          react_to_message: {
            source: null,
            value: false,
          },
          remove_members: {
            source: '1',
            value: true,
          },
          visible: {
            source: '1',
            value: true,
          },
          voiced: {
            source: '1',
            value: true,
          },
        },
        role: null,
      },
      {
        id: '83809',
        isSender: false,
        permissions: {
          add_members: {
            source: null,
            value: false,
          },
          change_role: {
            source: null,
            value: false,
          },
          create_sidebars: {
            source: null,
            value: false,
          },
          create_subthreads: {
            source: null,
            value: false,
          },
          delete_thread: {
            source: null,
            value: false,
          },
          edit_entries: {
            source: null,
            value: false,
          },
          edit_message: {
            source: null,
            value: false,
          },
          edit_permissions: {
            source: null,
            value: false,
          },
          edit_thread: {
            source: null,
            value: false,
          },
          edit_thread_avatar: {
            source: null,
            value: false,
          },
          edit_thread_color: {
            source: null,
            value: false,
          },
          edit_thread_description: {
            source: null,
            value: false,
          },
          join_thread: {
            source: '84656',
            value: true,
          },
          know_of: {
            source: '84656',
            value: true,
          },
          leave_thread: {
            source: null,
            value: false,
          },
          manage_pins: {
            source: null,
            value: false,
          },
          membership: {
            source: null,
            value: false,
          },
          react_to_message: {
            source: null,
            value: false,
          },
          remove_members: {
            source: null,
            value: false,
          },
          visible: {
            source: '84656',
            value: true,
          },
          voiced: {
            source: null,
            value: false,
          },
        },
        role: null,
      },
      {
        id: '83969',
        isSender: false,
        permissions: {
          add_members: {
            source: '87789',
            value: true,
          },
          change_role: {
            source: null,
            value: false,
          },
          create_sidebars: {
            source: '87789',
            value: true,
          },
          create_subthreads: {
            source: '87789',
            value: true,
          },
          delete_thread: {
            source: null,
            value: false,
          },
          edit_entries: {
            source: '87789',
            value: true,
          },
          edit_message: {
            source: '87789',
            value: true,
          },
          edit_permissions: {
            source: '87789',
            value: true,
          },
          edit_thread: {
            source: '87789',
            value: true,
          },
          edit_thread_avatar: {
            source: '87789',
            value: true,
          },
          edit_thread_color: {
            source: '87789',
            value: true,
          },
          edit_thread_description: {
            source: '87789',
            value: true,
          },
          join_thread: {
            source: '84656',
            value: true,
          },
          know_of: {
            source: '87789',
            value: true,
          },
          leave_thread: {
            source: '87789',
            value: true,
          },
          manage_pins: {
            source: null,
            value: false,
          },
          membership: {
            source: null,
            value: false,
          },
          react_to_message: {
            source: '87789',
            value: true,
          },
          remove_members: {
            source: '87789',
            value: true,
          },
          visible: {
            source: '87789',
            value: true,
          },
          voiced: {
            source: '87789',
            value: true,
          },
        },
        role: '87790',
      },
      {
        id: '84589',
        isSender: false,
        permissions: {
          add_members: {
            source: '87789',
            value: true,
          },
          change_role: {
            source: null,
            value: false,
          },
          create_sidebars: {
            source: '87789',
            value: true,
          },
          create_subthreads: {
            source: '87789',
            value: true,
          },
          delete_thread: {
            source: null,
            value: false,
          },
          edit_entries: {
            source: '87789',
            value: true,
          },
          edit_message: {
            source: '87789',
            value: true,
          },
          edit_permissions: {
            source: '87789',
            value: true,
          },
          edit_thread: {
            source: '87789',
            value: true,
          },
          edit_thread_avatar: {
            source: '87789',
            value: true,
          },
          edit_thread_color: {
            source: '87789',
            value: true,
          },
          edit_thread_description: {
            source: '87789',
            value: true,
          },
          join_thread: {
            source: '84656',
            value: true,
          },
          know_of: {
            source: '87789',
            value: true,
          },
          leave_thread: {
            source: '87789',
            value: true,
          },
          manage_pins: {
            source: null,
            value: false,
          },
          membership: {
            source: null,
            value: false,
          },
          react_to_message: {
            source: '87789',
            value: true,
          },
          remove_members: {
            source: '87789',
            value: true,
          },
          visible: {
            source: '87789',
            value: true,
          },
          voiced: {
            source: '87789',
            value: true,
          },
        },
        role: '87790',
      },
    ],
    name: 'Subthread',
    parentThreadID: '84656',
    pinnedCount: 0,
    repliesCount: 0,
    roles: {
      '87790': {
        id: '87790',
        isDefault: true,
        name: 'Members',
        permissions: {
          add_members: true,
          child_open_join_thread: true,
          create_sidebars: true,
          create_subthreads: true,
          descendant_open_know_of: true,
          descendant_open_visible: true,
          descendant_opentoplevel_join_thread: true,
          edit_entries: true,
          edit_message: true,
          edit_permissions: true,
          edit_thread: true,
          edit_thread_avatar: true,
          edit_thread_color: true,
          edit_thread_description: true,
          know_of: true,
          leave_thread: true,
          react_to_message: true,
          remove_members: true,
          visible: true,
          voiced: true,
        },
      },
    },
    type: 3,
  },
  '87817': {
    color: '6d49ab',
    community: '1',
    containingThreadID: '1',
    creationTime: 1682368005862,
    currentUser: {
      permissions: {
        add_members: {
          source: '87817',
          value: true,
        },
        change_role: {
          source: null,
          value: false,
        },
        create_sidebars: {
          source: '87817',
          value: true,
        },
        create_subthreads: {
          source: '87817',
          value: true,
        },
        delete_thread: {
          source: null,
          value: false,
        },
        edit_entries: {
          source: '87817',
          value: true,
        },
        edit_message: {
          source: '87817',
          value: true,
        },
        edit_permissions: {
          source: '87817',
          value: true,
        },
        edit_thread: {
          source: '87817',
          value: true,
        },
        edit_thread_avatar: {
          source: '87817',
          value: true,
        },
        edit_thread_color: {
          source: '87817',
          value: true,
        },
        edit_thread_description: {
          source: '87817',
          value: true,
        },
        join_thread: {
          source: '84656',
          value: true,
        },
        know_of: {
          source: '87817',
          value: true,
        },
        leave_thread: {
          source: '87817',
          value: true,
        },
        manage_pins: {
          source: null,
          value: false,
        },
        membership: {
          source: null,
          value: false,
        },
        react_to_message: {
          source: '87817',
          value: true,
        },
        remove_members: {
          source: '87817',
          value: true,
        },
        visible: {
          source: '87817',
          value: true,
        },
        voiced: {
          source: '87817',
          value: true,
        },
      },
      role: '87818',
      subscription: {
        home: true,
        pushNotifs: true,
      },
      unread: false,
    },
    description: '',
    id: '87817',
    members: [
      {
        id: '256',
        isSender: false,
        permissions: {
          add_members: {
            source: '1',
            value: true,
          },
          change_role: {
            source: '1',
            value: true,
          },
          create_sidebars: {
            source: '1',
            value: true,
          },
          create_subthreads: {
            source: '1',
            value: true,
          },
          delete_thread: {
            source: '1',
            value: true,
          },
          edit_entries: {
            source: '1',
            value: true,
          },
          edit_message: {
            source: null,
            value: false,
          },
          edit_permissions: {
            source: '1',
            value: true,
          },
          edit_thread: {
            source: '1',
            value: true,
          },
          edit_thread_avatar: {
            source: '1',
            value: true,
          },
          edit_thread_color: {
            source: '1',
            value: true,
          },
          edit_thread_description: {
            source: '1',
            value: true,
          },
          join_thread: {
            source: '1',
            value: true,
          },
          know_of: {
            source: '1',
            value: true,
          },
          leave_thread: {
            source: null,
            value: false,
          },
          manage_pins: {
            source: '1',
            value: true,
          },
          membership: {
            source: null,
            value: false,
          },
          react_to_message: {
            source: null,
            value: false,
          },
          remove_members: {
            source: '1',
            value: true,
          },
          visible: {
            source: '1',
            value: true,
          },
          voiced: {
            source: '1',
            value: true,
          },
        },
        role: null,
      },
      {
        id: '83809',
        isSender: false,
        permissions: {
          add_members: {
            source: null,
            value: false,
          },
          change_role: {
            source: null,
            value: false,
          },
          create_sidebars: {
            source: null,
            value: false,
          },
          create_subthreads: {
            source: null,
            value: false,
          },
          delete_thread: {
            source: null,
            value: false,
          },
          edit_entries: {
            source: null,
            value: false,
          },
          edit_message: {
            source: null,
            value: false,
          },
          edit_permissions: {
            source: null,
            value: false,
          },
          edit_thread: {
            source: null,
            value: false,
          },
          edit_thread_avatar: {
            source: null,
            value: false,
          },
          edit_thread_color: {
            source: null,
            value: false,
          },
          edit_thread_description: {
            source: null,
            value: false,
          },
          join_thread: {
            source: '84656',
            value: true,
          },
          know_of: {
            source: '84656',
            value: true,
          },
          leave_thread: {
            source: null,
            value: false,
          },
          manage_pins: {
            source: null,
            value: false,
          },
          membership: {
            source: null,
            value: false,
          },
          react_to_message: {
            source: null,
            value: false,
          },
          remove_members: {
            source: null,
            value: false,
          },
          visible: {
            source: '84656',
            value: true,
          },
          voiced: {
            source: null,
            value: false,
          },
        },
        role: null,
      },
      {
        id: '83969',
        isSender: false,
        permissions: {
          add_members: {
            source: '87817',
            value: true,
          },
          change_role: {
            source: null,
            value: false,
          },
          create_sidebars: {
            source: '87817',
            value: true,
          },
          create_subthreads: {
            source: '87817',
            value: true,
          },
          delete_thread: {
            source: null,
            value: false,
          },
          edit_entries: {
            source: '87817',
            value: true,
          },
          edit_message: {
            source: '87817',
            value: true,
          },
          edit_permissions: {
            source: '87817',
            value: true,
          },
          edit_thread: {
            source: '87817',
            value: true,
          },
          edit_thread_avatar: {
            source: '87817',
            value: true,
          },
          edit_thread_color: {
            source: '87817',
            value: true,
          },
          edit_thread_description: {
            source: '87817',
            value: true,
          },
          join_thread: {
            source: '84656',
            value: true,
          },
          know_of: {
            source: '87817',
            value: true,
          },
          leave_thread: {
            source: '87817',
            value: true,
          },
          manage_pins: {
            source: null,
            value: false,
          },
          membership: {
            source: null,
            value: false,
          },
          react_to_message: {
            source: '87817',
            value: true,
          },
          remove_members: {
            source: '87817',
            value: true,
          },
          visible: {
            source: '87817',
            value: true,
          },
          voiced: {
            source: '87817',
            value: true,
          },
        },
        role: '87818',
      },
      {
        id: '84589',
        isSender: true,
        permissions: {
          add_members: {
            source: '87817',
            value: true,
          },
          change_role: {
            source: null,
            value: false,
          },
          create_sidebars: {
            source: '87817',
            value: true,
          },
          create_subthreads: {
            source: '87817',
            value: true,
          },
          delete_thread: {
            source: null,
            value: false,
          },
          edit_entries: {
            source: '87817',
            value: true,
          },
          edit_message: {
            source: '87817',
            value: true,
          },
          edit_permissions: {
            source: '87817',
            value: true,
          },
          edit_thread: {
            source: '87817',
            value: true,
          },
          edit_thread_avatar: {
            source: '87817',
            value: true,
          },
          edit_thread_color: {
            source: '87817',
            value: true,
          },
          edit_thread_description: {
            source: '87817',
            value: true,
          },
          join_thread: {
            source: '84656',
            value: true,
          },
          know_of: {
            source: '87817',
            value: true,
          },
          leave_thread: {
            source: '87817',
            value: true,
          },
          manage_pins: {
            source: null,
            value: false,
          },
          membership: {
            source: null,
            value: false,
          },
          react_to_message: {
            source: '87817',
            value: true,
          },
          remove_members: {
            source: '87817',
            value: true,
          },
          visible: {
            source: '87817',
            value: true,
          },
          voiced: {
            source: '87817',
            value: true,
          },
        },
        role: '87818',
      },
    ],
    name: '',
    parentThreadID: '84656',
    pinnedCount: 0,
    repliesCount: 0,
    roles: {
      '87818': {
        id: '87818',
        isDefault: true,
        name: 'Members',
        permissions: {
          add_members: true,
          child_open_join_thread: true,
          create_sidebars: true,
          create_subthreads: true,
          descendant_open_know_of: true,
          descendant_open_visible: true,
          descendant_opentoplevel_join_thread: true,
          edit_entries: true,
          edit_message: true,
          edit_permissions: true,
          edit_thread: true,
          edit_thread_avatar: true,
          edit_thread_color: true,
          edit_thread_description: true,
          know_of: true,
          leave_thread: true,
          react_to_message: true,
          remove_members: true,
          visible: true,
          voiced: true,
        },
      },
    },
    type: 3,
  },
  '87837': {
    color: '6d49ab',
    community: '1',
    containingThreadID: '86071',
    creationTime: 1682368041060,
    currentUser: {
      permissions: {
        add_members: {
          source: '87837',
          value: true,
        },
        change_role: {
          source: null,
          value: false,
        },
        create_sidebars: {
          source: null,
          value: false,
        },
        create_subthreads: {
          source: null,
          value: false,
        },
        delete_thread: {
          source: null,
          value: false,
        },
        edit_entries: {
          source: null,
          value: false,
        },
        edit_message: {
          source: '87837',
          value: true,
        },
        edit_permissions: {
          source: '87837',
          value: true,
        },
        edit_thread: {
          source: '87837',
          value: true,
        },
        edit_thread_avatar: {
          source: '87837',
          value: true,
        },
        edit_thread_color: {
          source: '87837',
          value: true,
        },
        edit_thread_description: {
          source: '87837',
          value: true,
        },
        join_thread: {
          source: '86071',
          value: true,
        },
        know_of: {
          source: '86071',
          value: true,
        },
        leave_thread: {
          source: '87837',
          value: true,
        },
        manage_pins: {
          source: null,
          value: false,
        },
        membership: {
          source: null,
          value: false,
        },
        react_to_message: {
          source: '87837',
          value: true,
        },
        remove_members: {
          source: '87837',
          value: true,
        },
        visible: {
          source: '86071',
          value: true,
        },
        voiced: {
          source: '87837',
          value: true,
        },
      },
      role: '87838',
      subscription: {
        home: true,
        pushNotifs: true,
      },
      unread: false,
    },
    description: '',
    id: '87837',
    members: [
      {
        id: '256',
        isSender: false,
        permissions: {
          add_members: {
            source: '1',
            value: true,
          },
          change_role: {
            source: '1',
            value: true,
          },
          create_sidebars: {
            source: null,
            value: false,
          },
          create_subthreads: {
            source: null,
            value: false,
          },
          delete_thread: {
            source: '1',
            value: true,
          },
          edit_entries: {
            source: '1',
            value: true,
          },
          edit_message: {
            source: null,
            value: false,
          },
          edit_permissions: {
            source: '1',
            value: true,
          },
          edit_thread: {
            source: '1',
            value: true,
          },
          edit_thread_avatar: {
            source: '1',
            value: true,
          },
          edit_thread_color: {
            source: '1',
            value: true,
          },
          edit_thread_description: {
            source: '1',
            value: true,
          },
          join_thread: {
            source: null,
            value: false,
          },
          know_of: {
            source: '1',
            value: true,
          },
          leave_thread: {
            source: null,
            value: false,
          },
          manage_pins: {
            source: '1',
            value: true,
          },
          membership: {
            source: null,
            value: false,
          },
          react_to_message: {
            source: null,
            value: false,
          },
          remove_members: {
            source: '1',
            value: true,
          },
          visible: {
            source: '1',
            value: true,
          },
          voiced: {
            source: '1',
            value: true,
          },
        },
        role: null,
      },
      {
        id: '84589',
        isSender: true,
        permissions: {
          add_members: {
            source: '87837',
            value: true,
          },
          change_role: {
            source: null,
            value: false,
          },
          create_sidebars: {
            source: null,
            value: false,
          },
          create_subthreads: {
            source: null,
            value: false,
          },
          delete_thread: {
            source: null,
            value: false,
          },
          edit_entries: {
            source: null,
            value: false,
          },
          edit_message: {
            source: '87837',
            value: true,
          },
          edit_permissions: {
            source: '87837',
            value: true,
          },
          edit_thread: {
            source: '87837',
            value: true,
          },
          edit_thread_avatar: {
            source: '87837',
            value: true,
          },
          edit_thread_color: {
            source: '87837',
            value: true,
          },
          edit_thread_description: {
            source: '87837',
            value: true,
          },
          join_thread: {
            source: '86071',
            value: true,
          },
          know_of: {
            source: '86071',
            value: true,
          },
          leave_thread: {
            source: '87837',
            value: true,
          },
          manage_pins: {
            source: null,
            value: false,
          },
          membership: {
            source: null,
            value: false,
          },
          react_to_message: {
            source: '87837',
            value: true,
          },
          remove_members: {
            source: '87837',
            value: true,
          },
          visible: {
            source: '86071',
            value: true,
          },
          voiced: {
            source: '87837',
            value: true,
          },
        },
        role: '87838',
      },
      {
        id: '85999',
        isSender: false,
        permissions: {
          add_members: {
            source: '87837',
            value: true,
          },
          change_role: {
            source: null,
            value: false,
          },
          create_sidebars: {
            source: null,
            value: false,
          },
          create_subthreads: {
            source: null,
            value: false,
          },
          delete_thread: {
            source: null,
            value: false,
          },
          edit_entries: {
            source: null,
            value: false,
          },
          edit_message: {
            source: '87837',
            value: true,
          },
          edit_permissions: {
            source: '87837',
            value: true,
          },
          edit_thread: {
            source: '87837',
            value: true,
          },
          edit_thread_avatar: {
            source: '87837',
            value: true,
          },
          edit_thread_color: {
            source: '87837',
            value: true,
          },
          edit_thread_description: {
            source: '87837',
            value: true,
          },
          join_thread: {
            source: '86071',
            value: true,
          },
          know_of: {
            source: '86071',
            value: true,
          },
          leave_thread: {
            source: '87837',
            value: true,
          },
          manage_pins: {
            source: null,
            value: false,
          },
          membership: {
            source: null,
            value: false,
          },
          react_to_message: {
            source: '87837',
            value: true,
          },
          remove_members: {
            source: '87837',
            value: true,
          },
          visible: {
            source: '86071',
            value: true,
          },
          voiced: {
            source: '87837',
            value: true,
          },
        },
        role: '87838',
      },
    ],
    name: 'Hello',
    parentThreadID: '86071',
    pinnedCount: 0,
    repliesCount: 1,
    roles: {
      '87838': {
        id: '87838',
        isDefault: true,
        name: 'Members',
        permissions: {
          add_members: true,
          edit_message: true,
          edit_permissions: true,
          edit_thread: true,
          edit_thread_avatar: true,
          edit_thread_color: true,
          edit_thread_description: true,
          leave_thread: true,
          react_to_message: true,
          remove_members: true,
          voiced: true,
        },
      },
    },
    sourceMessageID: '86339',
    type: 5,
  },
};

// Clear out contents of role permissions to ensure `updateRolesAndPermissions`
// constructs them properly without depending on anything from existing store.
const threadStoreThreadsWithEmptyRolePermissions: ThreadStoreThreadInfos = {
  '1': {
    color: 'b8753d',
    community: null,
    containingThreadID: null,
    creationTime: 1679537878106,
    currentUser: {
      permissions: {
        add_members: {
          source: null,
          value: false,
        },
        change_role: {
          source: null,
          value: false,
        },
        create_sidebars: {
          source: null,
          value: false,
        },
        create_subthreads: {
          source: null,
          value: false,
        },
        delete_thread: {
          source: null,
          value: false,
        },
        edit_entries: {
          source: null,
          value: false,
        },
        edit_message: {
          source: null,
          value: false,
        },
        edit_permissions: {
          source: null,
          value: false,
        },
        edit_thread: {
          source: null,
          value: false,
        },
        edit_thread_avatar: {
          source: null,
          value: false,
        },
        edit_thread_color: {
          source: null,
          value: false,
        },
        edit_thread_description: {
          source: null,
          value: false,
        },
        join_thread: {
          source: null,
          value: false,
        },
        know_of: {
          source: '1',
          value: true,
        },
        leave_thread: {
          source: null,
          value: false,
        },
        manage_pins: {
          source: null,
          value: false,
        },
        membership: {
          source: null,
          value: false,
        },
        react_to_message: {
          source: null,
          value: false,
        },
        remove_members: {
          source: null,
          value: false,
        },
        visible: {
          source: '1',
          value: true,
        },
        voiced: {
          source: null,
          value: false,
        },
      },
      role: '83795',
      subscription: {
        home: true,
        pushNotifs: true,
      },
      unread: false,
    },
    description:
      'This is the first community on Comm. In the future it will be possible to create chats outside of a community, but for now all of these chats get set with GENESIS as their parent. GENESIS is hosted on Ashoat’s keyserver.',
    id: '1',
    members: [
      {
        id: '256',
        isSender: false,
        permissions: {
          add_members: {
            source: '1',
            value: true,
          },
          change_role: {
            source: '1',
            value: true,
          },
          create_sidebars: {
            source: '1',
            value: true,
          },
          create_subthreads: {
            source: '1',
            value: true,
          },
          delete_thread: {
            source: '1',
            value: true,
          },
          edit_entries: {
            source: '1',
            value: true,
          },
          edit_message: {
            source: '1',
            value: true,
          },
          edit_permissions: {
            source: null,
            value: false,
          },
          edit_thread: {
            source: '1',
            value: true,
          },
          edit_thread_avatar: {
            source: '1',
            value: true,
          },
          edit_thread_color: {
            source: '1',
            value: true,
          },
          edit_thread_description: {
            source: '1',
            value: true,
          },
          join_thread: {
            source: null,
            value: false,
          },
          know_of: {
            source: '1',
            value: true,
          },
          leave_thread: {
            source: null,
            value: false,
          },
          manage_pins: {
            source: '1',
            value: true,
          },
          membership: {
            source: null,
            value: false,
          },
          react_to_message: {
            source: '1',
            value: true,
          },
          remove_members: {
            source: '1',
            value: true,
          },
          visible: {
            source: '1',
            value: true,
          },
          voiced: {
            source: '1',
            value: true,
          },
        },
        role: '83796',
      },
      {
        id: '84589',
        isSender: false,
        permissions: {
          add_members: {
            source: null,
            value: false,
          },
          change_role: {
            source: null,
            value: false,
          },
          create_sidebars: {
            source: null,
            value: false,
          },
          create_subthreads: {
            source: null,
            value: false,
          },
          delete_thread: {
            source: null,
            value: false,
          },
          edit_entries: {
            source: null,
            value: false,
          },
          edit_message: {
            source: null,
            value: false,
          },
          edit_permissions: {
            source: null,
            value: false,
          },
          edit_thread: {
            source: null,
            value: false,
          },
          edit_thread_avatar: {
            source: null,
            value: false,
          },
          edit_thread_color: {
            source: null,
            value: false,
          },
          edit_thread_description: {
            source: null,
            value: false,
          },
          join_thread: {
            source: null,
            value: false,
          },
          know_of: {
            source: '1',
            value: true,
          },
          leave_thread: {
            source: null,
            value: false,
          },
          manage_pins: {
            source: null,
            value: false,
          },
          membership: {
            source: null,
            value: false,
          },
          react_to_message: {
            source: null,
            value: false,
          },
          remove_members: {
            source: null,
            value: false,
          },
          visible: {
            source: '1',
            value: true,
          },
          voiced: {
            source: null,
            value: false,
          },
        },
        role: '83795',
      },
    ],
    name: 'GENESIS',
    parentThreadID: null,
    pinnedCount: 0,
    repliesCount: 0,
    roles: {
      '83795': {
        id: '83795',
        isDefault: true,
        name: 'Members',
        permissions: {},
      },
      '83796': {
        id: '83796',
        isDefault: false,
        name: 'Admins',
        permissions: {},
      },
    },
    type: 12,
  },
  '84596': {
    color: '575757',
    community: '1',
    containingThreadID: '1',
    creationTime: 1680734420100,
    currentUser: {
      permissions: {
        add_members: {
          source: null,
          value: false,
        },
        change_role: {
          source: null,
          value: false,
        },
        create_sidebars: {
          source: '84596',
          value: true,
        },
        create_subthreads: {
          source: null,
          value: false,
        },
        delete_thread: {
          source: null,
          value: false,
        },
        edit_entries: {
          source: '84596',
          value: true,
        },
        edit_message: {
          source: '84596',
          value: true,
        },
        edit_permissions: {
          source: null,
          value: false,
        },
        edit_thread: {
          source: null,
          value: false,
        },
        edit_thread_avatar: {
          source: null,
          value: false,
        },
        edit_thread_color: {
          source: '84596',
          value: true,
        },
        edit_thread_description: {
          source: '84596',
          value: true,
        },
        join_thread: {
          source: null,
          value: false,
        },
        know_of: {
          source: '84596',
          value: true,
        },
        leave_thread: {
          source: null,
          value: false,
        },
        manage_pins: {
          source: null,
          value: false,
        },
        membership: {
          source: null,
          value: false,
        },
        react_to_message: {
          source: '84596',
          value: true,
        },
        remove_members: {
          source: null,
          value: false,
        },
        visible: {
          source: '84596',
          value: true,
        },
        voiced: {
          source: '84596',
          value: true,
        },
      },
      role: '84597',
      subscription: {
        home: true,
        pushNotifs: true,
      },
      unread: false,
    },
    description:
      'This is your private chat, where you can set reminders and jot notes in private!',
    id: '84596',
    members: [
      {
        id: '256',
        isSender: false,
        permissions: {
          add_members: {
            source: '1',
            value: true,
          },
          change_role: {
            source: '1',
            value: true,
          },
          create_sidebars: {
            source: '1',
            value: true,
          },
          create_subthreads: {
            source: '1',
            value: true,
          },
          delete_thread: {
            source: '1',
            value: true,
          },
          edit_entries: {
            source: '1',
            value: true,
          },
          edit_message: {
            source: null,
            value: false,
          },
          edit_permissions: {
            source: '1',
            value: true,
          },
          edit_thread: {
            source: '1',
            value: true,
          },
          edit_thread_avatar: {
            source: '1',
            value: true,
          },
          edit_thread_color: {
            source: '1',
            value: true,
          },
          edit_thread_description: {
            source: '1',
            value: true,
          },
          join_thread: {
            source: '1',
            value: true,
          },
          know_of: {
            source: '1',
            value: true,
          },
          leave_thread: {
            source: null,
            value: false,
          },
          manage_pins: {
            source: '1',
            value: true,
          },
          membership: {
            source: null,
            value: false,
          },
          react_to_message: {
            source: null,
            value: false,
          },
          remove_members: {
            source: '1',
            value: true,
          },
          visible: {
            source: '1',
            value: true,
          },
          voiced: {
            source: '1',
            value: true,
          },
        },
        role: null,
      },
      {
        id: '84589',
        isSender: false,
        permissions: {
          add_members: {
            source: null,
            value: false,
          },
          change_role: {
            source: null,
            value: false,
          },
          create_sidebars: {
            source: '84596',
            value: true,
          },
          create_subthreads: {
            source: null,
            value: false,
          },
          delete_thread: {
            source: null,
            value: false,
          },
          edit_entries: {
            source: '84596',
            value: true,
          },
          edit_message: {
            source: '84596',
            value: true,
          },
          edit_permissions: {
            source: null,
            value: false,
          },
          edit_thread: {
            source: null,
            value: false,
          },
          edit_thread_avatar: {
            source: null,
            value: false,
          },
          edit_thread_color: {
            source: '84596',
            value: true,
          },
          edit_thread_description: {
            source: '84596',
            value: true,
          },
          join_thread: {
            source: null,
            value: false,
          },
          know_of: {
            source: '84596',
            value: true,
          },
          leave_thread: {
            source: null,
            value: false,
          },
          manage_pins: {
            source: null,
            value: false,
          },
          membership: {
            source: null,
            value: false,
          },
          react_to_message: {
            source: '84596',
            value: true,
          },
          remove_members: {
            source: null,
            value: false,
          },
          visible: {
            source: '84596',
            value: true,
          },
          voiced: {
            source: '84596',
            value: true,
          },
        },
        role: '84597',
      },
    ],
    name: 'hillary',
    parentThreadID: '1',
    pinnedCount: 0,
    repliesCount: 0,
    roles: {
      '84597': {
        id: '84597',
        isDefault: true,
        name: 'Members',
        permissions: {},
      },
    },
    type: 7,
  },
  '84598': {
    color: '5c9f5f',
    community: '1',
    containingThreadID: '1',
    creationTime: 1680734420159,
    currentUser: {
      permissions: {
        add_members: {
          source: null,
          value: false,
        },
        change_role: {
          source: null,
          value: false,
        },
        create_sidebars: {
          source: '84598',
          value: true,
        },
        create_subthreads: {
          source: null,
          value: false,
        },
        delete_thread: {
          source: null,
          value: false,
        },
        edit_entries: {
          source: '84598',
          value: true,
        },
        edit_message: {
          source: '84598',
          value: true,
        },
        edit_permissions: {
          source: null,
          value: false,
        },
        edit_thread: {
          source: '84598',
          value: true,
        },
        edit_thread_avatar: {
          source: null,
          value: false,
        },
        edit_thread_color: {
          source: '84598',
          value: true,
        },
        edit_thread_description: {
          source: '84598',
          value: true,
        },
        join_thread: {
          source: null,
          value: false,
        },
        know_of: {
          source: '84598',
          value: true,
        },
        leave_thread: {
          source: null,
          value: false,
        },
        manage_pins: {
          source: null,
          value: false,
        },
        membership: {
          source: null,
          value: false,
        },
        react_to_message: {
          source: '84598',
          value: true,
        },
        remove_members: {
          source: null,
          value: false,
        },
        visible: {
          source: '84598',
          value: true,
        },
        voiced: {
          source: '84598',
          value: true,
        },
      },
      role: '84599',
      subscription: {
        home: true,
        pushNotifs: true,
      },
      unread: false,
    },
    description: '',
    id: '84598',
    members: [
      {
        id: '256',
        isSender: true,
        permissions: {
          add_members: {
            source: '1',
            value: true,
          },
          change_role: {
            source: '1',
            value: true,
          },
          create_sidebars: {
            source: '84598',
            value: true,
          },
          create_subthreads: {
            source: '1',
            value: true,
          },
          delete_thread: {
            source: '1',
            value: true,
          },
          edit_entries: {
            source: '84598',
            value: true,
          },
          edit_message: {
            source: '84598',
            value: true,
          },
          edit_permissions: {
            source: '1',
            value: true,
          },
          edit_thread: {
            source: '84598',
            value: true,
          },
          edit_thread_avatar: {
            source: '1',
            value: true,
          },
          edit_thread_color: {
            source: '84598',
            value: true,
          },
          edit_thread_description: {
            source: '84598',
            value: true,
          },
          join_thread: {
            source: '1',
            value: true,
          },
          know_of: {
            source: '84598',
            value: true,
          },
          leave_thread: {
            source: null,
            value: false,
          },
          manage_pins: {
            source: '1',
            value: true,
          },
          membership: {
            source: null,
            value: false,
          },
          react_to_message: {
            source: '84598',
            value: true,
          },
          remove_members: {
            source: '1',
            value: true,
          },
          visible: {
            source: '84598',
            value: true,
          },
          voiced: {
            source: '84598',
            value: true,
          },
        },
        role: '84599',
      },
      {
        id: '84589',
        isSender: false,
        permissions: {
          add_members: {
            source: null,
            value: false,
          },
          change_role: {
            source: null,
            value: false,
          },
          create_sidebars: {
            source: '84598',
            value: true,
          },
          create_subthreads: {
            source: null,
            value: false,
          },
          delete_thread: {
            source: null,
            value: false,
          },
          edit_entries: {
            source: '84598',
            value: true,
          },
          edit_message: {
            source: '84598',
            value: true,
          },
          edit_permissions: {
            source: null,
            value: false,
          },
          edit_thread: {
            source: '84598',
            value: true,
          },
          edit_thread_avatar: {
            source: null,
            value: false,
          },
          edit_thread_color: {
            source: '84598',
            value: true,
          },
          edit_thread_description: {
            source: '84598',
            value: true,
          },
          join_thread: {
            source: null,
            value: false,
          },
          know_of: {
            source: '84598',
            value: true,
          },
          leave_thread: {
            source: null,
            value: false,
          },
          manage_pins: {
            source: null,
            value: false,
          },
          membership: {
            source: null,
            value: false,
          },
          react_to_message: {
            source: '84598',
            value: true,
          },
          remove_members: {
            source: null,
            value: false,
          },
          visible: {
            source: '84598',
            value: true,
          },
          voiced: {
            source: '84598',
            value: true,
          },
        },
        role: '84599',
      },
    ],
    name: '',
    parentThreadID: '1',
    pinnedCount: 0,
    repliesCount: 0,
    roles: {
      '84599': {
        id: '84599',
        isDefault: true,
        name: 'Members',
        permissions: {},
      },
    },
    type: 6,
  },
  '84627': {
    color: 'aa4b4b',
    community: '1',
    containingThreadID: '1',
    creationTime: 1680734427175,
    currentUser: {
      permissions: {
        add_members: {
          source: null,
          value: false,
        },
        change_role: {
          source: null,
          value: false,
        },
        create_sidebars: {
          source: '84627',
          value: true,
        },
        create_subthreads: {
          source: null,
          value: false,
        },
        delete_thread: {
          source: null,
          value: false,
        },
        edit_entries: {
          source: '84627',
          value: true,
        },
        edit_message: {
          source: '84627',
          value: true,
        },
        edit_permissions: {
          source: null,
          value: false,
        },
        edit_thread: {
          source: '84627',
          value: true,
        },
        edit_thread_avatar: {
          source: null,
          value: false,
        },
        edit_thread_color: {
          source: '84627',
          value: true,
        },
        edit_thread_description: {
          source: '84627',
          value: true,
        },
        join_thread: {
          source: null,
          value: false,
        },
        know_of: {
          source: '84627',
          value: true,
        },
        leave_thread: {
          source: null,
          value: false,
        },
        manage_pins: {
          source: null,
          value: false,
        },
        membership: {
          source: null,
          value: false,
        },
        react_to_message: {
          source: '84627',
          value: true,
        },
        remove_members: {
          source: null,
          value: false,
        },
        visible: {
          source: '84627',
          value: true,
        },
        voiced: {
          source: '84627',
          value: true,
        },
      },
      role: '84628',
      subscription: {
        home: true,
        pushNotifs: true,
      },
      unread: false,
    },
    description: '',
    id: '84627',
    members: [
      {
        id: '256',
        isSender: false,
        permissions: {
          add_members: {
            source: '1',
            value: true,
          },
          change_role: {
            source: '1',
            value: true,
          },
          create_sidebars: {
            source: '1',
            value: true,
          },
          create_subthreads: {
            source: '1',
            value: true,
          },
          delete_thread: {
            source: '1',
            value: true,
          },
          edit_entries: {
            source: '1',
            value: true,
          },
          edit_message: {
            source: null,
            value: false,
          },
          edit_permissions: {
            source: '1',
            value: true,
          },
          edit_thread: {
            source: '1',
            value: true,
          },
          edit_thread_avatar: {
            source: '1',
            value: true,
          },
          edit_thread_color: {
            source: '1',
            value: true,
          },
          edit_thread_description: {
            source: '1',
            value: true,
          },
          join_thread: {
            source: '1',
            value: true,
          },
          know_of: {
            source: '1',
            value: true,
          },
          leave_thread: {
            source: null,
            value: false,
          },
          manage_pins: {
            source: '1',
            value: true,
          },
          membership: {
            source: null,
            value: false,
          },
          react_to_message: {
            source: null,
            value: false,
          },
          remove_members: {
            source: '1',
            value: true,
          },
          visible: {
            source: '1',
            value: true,
          },
          voiced: {
            source: '1',
            value: true,
          },
        },
        role: null,
      },
      {
        id: '83969',
        isSender: false,
        permissions: {
          add_members: {
            source: null,
            value: false,
          },
          change_role: {
            source: null,
            value: false,
          },
          create_sidebars: {
            source: '84627',
            value: true,
          },
          create_subthreads: {
            source: null,
            value: false,
          },
          delete_thread: {
            source: null,
            value: false,
          },
          edit_entries: {
            source: '84627',
            value: true,
          },
          edit_message: {
            source: '84627',
            value: true,
          },
          edit_permissions: {
            source: null,
            value: false,
          },
          edit_thread: {
            source: '84627',
            value: true,
          },
          edit_thread_avatar: {
            source: null,
            value: false,
          },
          edit_thread_color: {
            source: '84627',
            value: true,
          },
          edit_thread_description: {
            source: '84627',
            value: true,
          },
          join_thread: {
            source: null,
            value: false,
          },
          know_of: {
            source: '84627',
            value: true,
          },
          leave_thread: {
            source: null,
            value: false,
          },
          manage_pins: {
            source: null,
            value: false,
          },
          membership: {
            source: null,
            value: false,
          },
          react_to_message: {
            source: '84627',
            value: true,
          },
          remove_members: {
            source: null,
            value: false,
          },
          visible: {
            source: '84627',
            value: true,
          },
          voiced: {
            source: '84627',
            value: true,
          },
        },
        role: '84628',
      },
      {
        id: '84589',
        isSender: false,
        permissions: {
          add_members: {
            source: null,
            value: false,
          },
          change_role: {
            source: null,
            value: false,
          },
          create_sidebars: {
            source: '84627',
            value: true,
          },
          create_subthreads: {
            source: null,
            value: false,
          },
          delete_thread: {
            source: null,
            value: false,
          },
          edit_entries: {
            source: '84627',
            value: true,
          },
          edit_message: {
            source: '84627',
            value: true,
          },
          edit_permissions: {
            source: null,
            value: false,
          },
          edit_thread: {
            source: '84627',
            value: true,
          },
          edit_thread_avatar: {
            source: null,
            value: false,
          },
          edit_thread_color: {
            source: '84627',
            value: true,
          },
          edit_thread_description: {
            source: '84627',
            value: true,
          },
          join_thread: {
            source: null,
            value: false,
          },
          know_of: {
            source: '84627',
            value: true,
          },
          leave_thread: {
            source: null,
            value: false,
          },
          manage_pins: {
            source: null,
            value: false,
          },
          membership: {
            source: null,
            value: false,
          },
          react_to_message: {
            source: '84627',
            value: true,
          },
          remove_members: {
            source: null,
            value: false,
          },
          visible: {
            source: '84627',
            value: true,
          },
          voiced: {
            source: '84627',
            value: true,
          },
        },
        role: '84628',
      },
    ],
    name: '',
    parentThreadID: '1',
    pinnedCount: 0,
    repliesCount: 0,
    roles: {
      '84628': {
        id: '84628',
        isDefault: true,
        name: 'Members',
        permissions: {},
      },
    },
    type: 6,
  },
  '84656': {
    color: '6d49ab',
    community: '1',
    containingThreadID: '1',
    creationTime: 1680734490721,
    currentUser: {
      permissions: {
        add_members: {
          source: '84656',
          value: true,
        },
        change_role: {
          source: null,
          value: false,
        },
        create_sidebars: {
          source: '84656',
          value: true,
        },
        create_subthreads: {
          source: '84656',
          value: true,
        },
        delete_thread: {
          source: null,
          value: false,
        },
        edit_entries: {
          source: '84656',
          value: true,
        },
        edit_message: {
          source: '84656',
          value: true,
        },
        edit_permissions: {
          source: '84656',
          value: true,
        },
        edit_thread: {
          source: '84656',
          value: true,
        },
        edit_thread_avatar: {
          source: '84656',
          value: true,
        },
        edit_thread_color: {
          source: '84656',
          value: true,
        },
        edit_thread_description: {
          source: '84656',
          value: true,
        },
        join_thread: {
          source: null,
          value: false,
        },
        know_of: {
          source: '84656',
          value: true,
        },
        leave_thread: {
          source: '84656',
          value: true,
        },
        manage_pins: {
          source: null,
          value: false,
        },
        membership: {
          source: null,
          value: false,
        },
        react_to_message: {
          source: '84656',
          value: true,
        },
        remove_members: {
          source: '84656',
          value: true,
        },
        visible: {
          source: '84656',
          value: true,
        },
        voiced: {
          source: '84656',
          value: true,
        },
      },
      role: '84657',
      subscription: {
        home: true,
        pushNotifs: true,
      },
      unread: false,
    },
    description: '',
    id: '84656',
    members: [
      {
        id: '256',
        isSender: false,
        permissions: {
          add_members: {
            source: '1',
            value: true,
          },
          change_role: {
            source: '1',
            value: true,
          },
          create_sidebars: {
            source: '1',
            value: true,
          },
          create_subthreads: {
            source: '1',
            value: true,
          },
          delete_thread: {
            source: '1',
            value: true,
          },
          edit_entries: {
            source: '1',
            value: true,
          },
          edit_message: {
            source: null,
            value: false,
          },
          edit_permissions: {
            source: '1',
            value: true,
          },
          edit_thread: {
            source: '1',
            value: true,
          },
          edit_thread_avatar: {
            source: '1',
            value: true,
          },
          edit_thread_color: {
            source: '1',
            value: true,
          },
          edit_thread_description: {
            source: '1',
            value: true,
          },
          join_thread: {
            source: '1',
            value: true,
          },
          know_of: {
            source: '1',
            value: true,
          },
          leave_thread: {
            source: null,
            value: false,
          },
          manage_pins: {
            source: '1',
            value: true,
          },
          membership: {
            source: null,
            value: false,
          },
          react_to_message: {
            source: null,
            value: false,
          },
          remove_members: {
            source: '1',
            value: true,
          },
          visible: {
            source: '1',
            value: true,
          },
          voiced: {
            source: '1',
            value: true,
          },
        },
        role: null,
      },
      {
        id: '83809',
        isSender: true,
        permissions: {
          add_members: {
            source: '84656',
            value: true,
          },
          change_role: {
            source: null,
            value: false,
          },
          create_sidebars: {
            source: '84656',
            value: true,
          },
          create_subthreads: {
            source: '84656',
            value: true,
          },
          delete_thread: {
            source: null,
            value: false,
          },
          edit_entries: {
            source: '84656',
            value: true,
          },
          edit_message: {
            source: '84656',
            value: true,
          },
          edit_permissions: {
            source: '84656',
            value: true,
          },
          edit_thread: {
            source: '84656',
            value: true,
          },
          edit_thread_avatar: {
            source: '84656',
            value: true,
          },
          edit_thread_color: {
            source: '84656',
            value: true,
          },
          edit_thread_description: {
            source: '84656',
            value: true,
          },
          join_thread: {
            source: null,
            value: false,
          },
          know_of: {
            source: '84656',
            value: true,
          },
          leave_thread: {
            source: '84656',
            value: true,
          },
          manage_pins: {
            source: null,
            value: false,
          },
          membership: {
            source: null,
            value: false,
          },
          react_to_message: {
            source: '84656',
            value: true,
          },
          remove_members: {
            source: '84656',
            value: true,
          },
          visible: {
            source: '84656',
            value: true,
          },
          voiced: {
            source: '84656',
            value: true,
          },
        },
        role: '84657',
      },
      {
        id: '83969',
        isSender: true,
        permissions: {
          add_members: {
            source: '84656',
            value: true,
          },
          change_role: {
            source: null,
            value: false,
          },
          create_sidebars: {
            source: '84656',
            value: true,
          },
          create_subthreads: {
            source: '84656',
            value: true,
          },
          delete_thread: {
            source: null,
            value: false,
          },
          edit_entries: {
            source: '84656',
            value: true,
          },
          edit_message: {
            source: '84656',
            value: true,
          },
          edit_permissions: {
            source: '84656',
            value: true,
          },
          edit_thread: {
            source: '84656',
            value: true,
          },
          edit_thread_avatar: {
            source: '84656',
            value: true,
          },
          edit_thread_color: {
            source: '84656',
            value: true,
          },
          edit_thread_description: {
            source: '84656',
            value: true,
          },
          join_thread: {
            source: null,
            value: false,
          },
          know_of: {
            source: '84656',
            value: true,
          },
          leave_thread: {
            source: '84656',
            value: true,
          },
          manage_pins: {
            source: null,
            value: false,
          },
          membership: {
            source: null,
            value: false,
          },
          react_to_message: {
            source: '84656',
            value: true,
          },
          remove_members: {
            source: '84656',
            value: true,
          },
          visible: {
            source: '84656',
            value: true,
          },
          voiced: {
            source: '84656',
            value: true,
          },
        },
        role: '84657',
      },
      {
        id: '84589',
        isSender: false,
        permissions: {
          add_members: {
            source: '84656',
            value: true,
          },
          change_role: {
            source: null,
            value: false,
          },
          create_sidebars: {
            source: '84656',
            value: true,
          },
          create_subthreads: {
            source: '84656',
            value: true,
          },
          delete_thread: {
            source: null,
            value: false,
          },
          edit_entries: {
            source: '84656',
            value: true,
          },
          edit_message: {
            source: '84656',
            value: true,
          },
          edit_permissions: {
            source: '84656',
            value: true,
          },
          edit_thread: {
            source: '84656',
            value: true,
          },
          edit_thread_avatar: {
            source: '84656',
            value: true,
          },
          edit_thread_color: {
            source: '84656',
            value: true,
          },
          edit_thread_description: {
            source: '84656',
            value: true,
          },
          join_thread: {
            source: null,
            value: false,
          },
          know_of: {
            source: '84656',
            value: true,
          },
          leave_thread: {
            source: '84656',
            value: true,
          },
          manage_pins: {
            source: null,
            value: false,
          },
          membership: {
            source: null,
            value: false,
          },
          react_to_message: {
            source: '84656',
            value: true,
          },
          remove_members: {
            source: '84656',
            value: true,
          },
          visible: {
            source: '84656',
            value: true,
          },
          voiced: {
            source: '84656',
            value: true,
          },
        },
        role: '84657',
      },
    ],
    name: 'group',
    parentThreadID: '1',
    pinnedCount: 0,
    repliesCount: 0,
    roles: {
      '84657': {
        id: '84657',
        isDefault: true,
        name: 'Members',
        permissions: {},
      },
    },
    type: 4,
  },
  '86071': {
    color: '6d49ab',
    community: '1',
    containingThreadID: '1',
    creationTime: 1681160151827,
    currentUser: {
      permissions: {
        add_members: {
          source: null,
          value: false,
        },
        change_role: {
          source: null,
          value: false,
        },
        create_sidebars: {
          source: '86071',
          value: true,
        },
        create_subthreads: {
          source: null,
          value: false,
        },
        delete_thread: {
          source: null,
          value: false,
        },
        edit_entries: {
          source: '86071',
          value: true,
        },
        edit_message: {
          source: '86071',
          value: true,
        },
        edit_permissions: {
          source: null,
          value: false,
        },
        edit_thread: {
          source: '86071',
          value: true,
        },
        edit_thread_avatar: {
          source: null,
          value: false,
        },
        edit_thread_color: {
          source: '86071',
          value: true,
        },
        edit_thread_description: {
          source: '86071',
          value: true,
        },
        join_thread: {
          source: null,
          value: false,
        },
        know_of: {
          source: '86071',
          value: true,
        },
        leave_thread: {
          source: null,
          value: false,
        },
        manage_pins: {
          source: null,
          value: false,
        },
        membership: {
          source: null,
          value: false,
        },
        react_to_message: {
          source: '86071',
          value: true,
        },
        remove_members: {
          source: null,
          value: false,
        },
        visible: {
          source: '86071',
          value: true,
        },
        voiced: {
          source: '86071',
          value: true,
        },
      },
      role: '86072',
      subscription: {
        home: true,
        pushNotifs: true,
      },
      unread: false,
    },
    description: '',
    id: '86071',
    members: [
      {
        id: '256',
        isSender: false,
        permissions: {
          add_members: {
            source: '1',
            value: true,
          },
          change_role: {
            source: '1',
            value: true,
          },
          create_sidebars: {
            source: '1',
            value: true,
          },
          create_subthreads: {
            source: '1',
            value: true,
          },
          delete_thread: {
            source: '1',
            value: true,
          },
          edit_entries: {
            source: '1',
            value: true,
          },
          edit_message: {
            source: null,
            value: false,
          },
          edit_permissions: {
            source: '1',
            value: true,
          },
          edit_thread: {
            source: '1',
            value: true,
          },
          edit_thread_avatar: {
            source: '1',
            value: true,
          },
          edit_thread_color: {
            source: '1',
            value: true,
          },
          edit_thread_description: {
            source: '1',
            value: true,
          },
          join_thread: {
            source: '1',
            value: true,
          },
          know_of: {
            source: '1',
            value: true,
          },
          leave_thread: {
            source: null,
            value: false,
          },
          manage_pins: {
            source: '1',
            value: true,
          },
          membership: {
            source: null,
            value: false,
          },
          react_to_message: {
            source: null,
            value: false,
          },
          remove_members: {
            source: '1',
            value: true,
          },
          visible: {
            source: '1',
            value: true,
          },
          voiced: {
            source: '1',
            value: true,
          },
        },
        role: null,
      },
      {
        id: '84589',
        isSender: true,
        permissions: {
          add_members: {
            source: null,
            value: false,
          },
          change_role: {
            source: null,
            value: false,
          },
          create_sidebars: {
            source: '86071',
            value: true,
          },
          create_subthreads: {
            source: null,
            value: false,
          },
          delete_thread: {
            source: null,
            value: false,
          },
          edit_entries: {
            source: '86071',
            value: true,
          },
          edit_message: {
            source: '86071',
            value: true,
          },
          edit_permissions: {
            source: null,
            value: false,
          },
          edit_thread: {
            source: '86071',
            value: true,
          },
          edit_thread_avatar: {
            source: null,
            value: false,
          },
          edit_thread_color: {
            source: '86071',
            value: true,
          },
          edit_thread_description: {
            source: '86071',
            value: true,
          },
          join_thread: {
            source: null,
            value: false,
          },
          know_of: {
            source: '86071',
            value: true,
          },
          leave_thread: {
            source: null,
            value: false,
          },
          manage_pins: {
            source: null,
            value: false,
          },
          membership: {
            source: null,
            value: false,
          },
          react_to_message: {
            source: '86071',
            value: true,
          },
          remove_members: {
            source: null,
            value: false,
          },
          visible: {
            source: '86071',
            value: true,
          },
          voiced: {
            source: '86071',
            value: true,
          },
        },
        role: '86072',
      },
      {
        id: '85999',
        isSender: true,
        permissions: {
          add_members: {
            source: null,
            value: false,
          },
          change_role: {
            source: null,
            value: false,
          },
          create_sidebars: {
            source: '86071',
            value: true,
          },
          create_subthreads: {
            source: null,
            value: false,
          },
          delete_thread: {
            source: null,
            value: false,
          },
          edit_entries: {
            source: '86071',
            value: true,
          },
          edit_message: {
            source: '86071',
            value: true,
          },
          edit_permissions: {
            source: null,
            value: false,
          },
          edit_thread: {
            source: '86071',
            value: true,
          },
          edit_thread_avatar: {
            source: null,
            value: false,
          },
          edit_thread_color: {
            source: '86071',
            value: true,
          },
          edit_thread_description: {
            source: '86071',
            value: true,
          },
          join_thread: {
            source: null,
            value: false,
          },
          know_of: {
            source: '86071',
            value: true,
          },
          leave_thread: {
            source: null,
            value: false,
          },
          manage_pins: {
            source: null,
            value: false,
          },
          membership: {
            source: null,
            value: false,
          },
          react_to_message: {
            source: '86071',
            value: true,
          },
          remove_members: {
            source: null,
            value: false,
          },
          visible: {
            source: '86071',
            value: true,
          },
          voiced: {
            source: '86071',
            value: true,
          },
        },
        role: '86072',
      },
    ],
    name: '',
    parentThreadID: '1',
    pinnedCount: 0,
    repliesCount: 0,
    roles: {
      '86072': {
        id: '86072',
        isDefault: true,
        name: 'Members',
        permissions: {},
      },
    },
    type: 6,
  },
  '87789': {
    color: '6d49ab',
    community: '1',
    containingThreadID: '1',
    creationTime: 1682367957349,
    currentUser: {
      permissions: {
        add_members: {
          source: '87789',
          value: true,
        },
        change_role: {
          source: null,
          value: false,
        },
        create_sidebars: {
          source: '87789',
          value: true,
        },
        create_subthreads: {
          source: '87789',
          value: true,
        },
        delete_thread: {
          source: null,
          value: false,
        },
        edit_entries: {
          source: '87789',
          value: true,
        },
        edit_message: {
          source: '87789',
          value: true,
        },
        edit_permissions: {
          source: '87789',
          value: true,
        },
        edit_thread: {
          source: '87789',
          value: true,
        },
        edit_thread_avatar: {
          source: '87789',
          value: true,
        },
        edit_thread_color: {
          source: '87789',
          value: true,
        },
        edit_thread_description: {
          source: '87789',
          value: true,
        },
        join_thread: {
          source: '84656',
          value: true,
        },
        know_of: {
          source: '87789',
          value: true,
        },
        leave_thread: {
          source: '87789',
          value: true,
        },
        manage_pins: {
          source: null,
          value: false,
        },
        membership: {
          source: null,
          value: false,
        },
        react_to_message: {
          source: '87789',
          value: true,
        },
        remove_members: {
          source: '87789',
          value: true,
        },
        visible: {
          source: '87789',
          value: true,
        },
        voiced: {
          source: '87789',
          value: true,
        },
      },
      role: '87790',
      subscription: {
        home: true,
        pushNotifs: true,
      },
      unread: false,
    },
    description: '',
    id: '87789',
    members: [
      {
        id: '256',
        isSender: false,
        permissions: {
          add_members: {
            source: '1',
            value: true,
          },
          change_role: {
            source: '1',
            value: true,
          },
          create_sidebars: {
            source: '1',
            value: true,
          },
          create_subthreads: {
            source: '1',
            value: true,
          },
          delete_thread: {
            source: '1',
            value: true,
          },
          edit_entries: {
            source: '1',
            value: true,
          },
          edit_message: {
            source: null,
            value: false,
          },
          edit_permissions: {
            source: '1',
            value: true,
          },
          edit_thread: {
            source: '1',
            value: true,
          },
          edit_thread_avatar: {
            source: '1',
            value: true,
          },
          edit_thread_color: {
            source: '1',
            value: true,
          },
          edit_thread_description: {
            source: '1',
            value: true,
          },
          join_thread: {
            source: '1',
            value: true,
          },
          know_of: {
            source: '1',
            value: true,
          },
          leave_thread: {
            source: null,
            value: false,
          },
          manage_pins: {
            source: '1',
            value: true,
          },
          membership: {
            source: null,
            value: false,
          },
          react_to_message: {
            source: null,
            value: false,
          },
          remove_members: {
            source: '1',
            value: true,
          },
          visible: {
            source: '1',
            value: true,
          },
          voiced: {
            source: '1',
            value: true,
          },
        },
        role: null,
      },
      {
        id: '83809',
        isSender: false,
        permissions: {
          add_members: {
            source: null,
            value: false,
          },
          change_role: {
            source: null,
            value: false,
          },
          create_sidebars: {
            source: null,
            value: false,
          },
          create_subthreads: {
            source: null,
            value: false,
          },
          delete_thread: {
            source: null,
            value: false,
          },
          edit_entries: {
            source: null,
            value: false,
          },
          edit_message: {
            source: null,
            value: false,
          },
          edit_permissions: {
            source: null,
            value: false,
          },
          edit_thread: {
            source: null,
            value: false,
          },
          edit_thread_avatar: {
            source: null,
            value: false,
          },
          edit_thread_color: {
            source: null,
            value: false,
          },
          edit_thread_description: {
            source: null,
            value: false,
          },
          join_thread: {
            source: '84656',
            value: true,
          },
          know_of: {
            source: '84656',
            value: true,
          },
          leave_thread: {
            source: null,
            value: false,
          },
          manage_pins: {
            source: null,
            value: false,
          },
          membership: {
            source: null,
            value: false,
          },
          react_to_message: {
            source: null,
            value: false,
          },
          remove_members: {
            source: null,
            value: false,
          },
          visible: {
            source: '84656',
            value: true,
          },
          voiced: {
            source: null,
            value: false,
          },
        },
        role: null,
      },
      {
        id: '83969',
        isSender: false,
        permissions: {
          add_members: {
            source: '87789',
            value: true,
          },
          change_role: {
            source: null,
            value: false,
          },
          create_sidebars: {
            source: '87789',
            value: true,
          },
          create_subthreads: {
            source: '87789',
            value: true,
          },
          delete_thread: {
            source: null,
            value: false,
          },
          edit_entries: {
            source: '87789',
            value: true,
          },
          edit_message: {
            source: '87789',
            value: true,
          },
          edit_permissions: {
            source: '87789',
            value: true,
          },
          edit_thread: {
            source: '87789',
            value: true,
          },
          edit_thread_avatar: {
            source: '87789',
            value: true,
          },
          edit_thread_color: {
            source: '87789',
            value: true,
          },
          edit_thread_description: {
            source: '87789',
            value: true,
          },
          join_thread: {
            source: '84656',
            value: true,
          },
          know_of: {
            source: '87789',
            value: true,
          },
          leave_thread: {
            source: '87789',
            value: true,
          },
          manage_pins: {
            source: null,
            value: false,
          },
          membership: {
            source: null,
            value: false,
          },
          react_to_message: {
            source: '87789',
            value: true,
          },
          remove_members: {
            source: '87789',
            value: true,
          },
          visible: {
            source: '87789',
            value: true,
          },
          voiced: {
            source: '87789',
            value: true,
          },
        },
        role: '87790',
      },
      {
        id: '84589',
        isSender: false,
        permissions: {
          add_members: {
            source: '87789',
            value: true,
          },
          change_role: {
            source: null,
            value: false,
          },
          create_sidebars: {
            source: '87789',
            value: true,
          },
          create_subthreads: {
            source: '87789',
            value: true,
          },
          delete_thread: {
            source: null,
            value: false,
          },
          edit_entries: {
            source: '87789',
            value: true,
          },
          edit_message: {
            source: '87789',
            value: true,
          },
          edit_permissions: {
            source: '87789',
            value: true,
          },
          edit_thread: {
            source: '87789',
            value: true,
          },
          edit_thread_avatar: {
            source: '87789',
            value: true,
          },
          edit_thread_color: {
            source: '87789',
            value: true,
          },
          edit_thread_description: {
            source: '87789',
            value: true,
          },
          join_thread: {
            source: '84656',
            value: true,
          },
          know_of: {
            source: '87789',
            value: true,
          },
          leave_thread: {
            source: '87789',
            value: true,
          },
          manage_pins: {
            source: null,
            value: false,
          },
          membership: {
            source: null,
            value: false,
          },
          react_to_message: {
            source: '87789',
            value: true,
          },
          remove_members: {
            source: '87789',
            value: true,
          },
          visible: {
            source: '87789',
            value: true,
          },
          voiced: {
            source: '87789',
            value: true,
          },
        },
        role: '87790',
      },
    ],
    name: 'Subthread',
    parentThreadID: '84656',
    pinnedCount: 0,
    repliesCount: 0,
    roles: {
      '87790': {
        id: '87790',
        isDefault: true,
        name: 'Members',
        permissions: {},
      },
    },
    type: 3,
  },
  '87817': {
    color: '6d49ab',
    community: '1',
    containingThreadID: '1',
    creationTime: 1682368005862,
    currentUser: {
      permissions: {
        add_members: {
          source: '87817',
          value: true,
        },
        change_role: {
          source: null,
          value: false,
        },
        create_sidebars: {
          source: '87817',
          value: true,
        },
        create_subthreads: {
          source: '87817',
          value: true,
        },
        delete_thread: {
          source: null,
          value: false,
        },
        edit_entries: {
          source: '87817',
          value: true,
        },
        edit_message: {
          source: '87817',
          value: true,
        },
        edit_permissions: {
          source: '87817',
          value: true,
        },
        edit_thread: {
          source: '87817',
          value: true,
        },
        edit_thread_avatar: {
          source: '87817',
          value: true,
        },
        edit_thread_color: {
          source: '87817',
          value: true,
        },
        edit_thread_description: {
          source: '87817',
          value: true,
        },
        join_thread: {
          source: '84656',
          value: true,
        },
        know_of: {
          source: '87817',
          value: true,
        },
        leave_thread: {
          source: '87817',
          value: true,
        },
        manage_pins: {
          source: null,
          value: false,
        },
        membership: {
          source: null,
          value: false,
        },
        react_to_message: {
          source: '87817',
          value: true,
        },
        remove_members: {
          source: '87817',
          value: true,
        },
        visible: {
          source: '87817',
          value: true,
        },
        voiced: {
          source: '87817',
          value: true,
        },
      },
      role: '87818',
      subscription: {
        home: true,
        pushNotifs: true,
      },
      unread: false,
    },
    description: '',
    id: '87817',
    members: [
      {
        id: '256',
        isSender: false,
        permissions: {
          add_members: {
            source: '1',
            value: true,
          },
          change_role: {
            source: '1',
            value: true,
          },
          create_sidebars: {
            source: '1',
            value: true,
          },
          create_subthreads: {
            source: '1',
            value: true,
          },
          delete_thread: {
            source: '1',
            value: true,
          },
          edit_entries: {
            source: '1',
            value: true,
          },
          edit_message: {
            source: null,
            value: false,
          },
          edit_permissions: {
            source: '1',
            value: true,
          },
          edit_thread: {
            source: '1',
            value: true,
          },
          edit_thread_avatar: {
            source: '1',
            value: true,
          },
          edit_thread_color: {
            source: '1',
            value: true,
          },
          edit_thread_description: {
            source: '1',
            value: true,
          },
          join_thread: {
            source: '1',
            value: true,
          },
          know_of: {
            source: '1',
            value: true,
          },
          leave_thread: {
            source: null,
            value: false,
          },
          manage_pins: {
            source: '1',
            value: true,
          },
          membership: {
            source: null,
            value: false,
          },
          react_to_message: {
            source: null,
            value: false,
          },
          remove_members: {
            source: '1',
            value: true,
          },
          visible: {
            source: '1',
            value: true,
          },
          voiced: {
            source: '1',
            value: true,
          },
        },
        role: null,
      },
      {
        id: '83809',
        isSender: false,
        permissions: {
          add_members: {
            source: null,
            value: false,
          },
          change_role: {
            source: null,
            value: false,
          },
          create_sidebars: {
            source: null,
            value: false,
          },
          create_subthreads: {
            source: null,
            value: false,
          },
          delete_thread: {
            source: null,
            value: false,
          },
          edit_entries: {
            source: null,
            value: false,
          },
          edit_message: {
            source: null,
            value: false,
          },
          edit_permissions: {
            source: null,
            value: false,
          },
          edit_thread: {
            source: null,
            value: false,
          },
          edit_thread_avatar: {
            source: null,
            value: false,
          },
          edit_thread_color: {
            source: null,
            value: false,
          },
          edit_thread_description: {
            source: null,
            value: false,
          },
          join_thread: {
            source: '84656',
            value: true,
          },
          know_of: {
            source: '84656',
            value: true,
          },
          leave_thread: {
            source: null,
            value: false,
          },
          manage_pins: {
            source: null,
            value: false,
          },
          membership: {
            source: null,
            value: false,
          },
          react_to_message: {
            source: null,
            value: false,
          },
          remove_members: {
            source: null,
            value: false,
          },
          visible: {
            source: '84656',
            value: true,
          },
          voiced: {
            source: null,
            value: false,
          },
        },
        role: null,
      },
      {
        id: '83969',
        isSender: false,
        permissions: {
          add_members: {
            source: '87817',
            value: true,
          },
          change_role: {
            source: null,
            value: false,
          },
          create_sidebars: {
            source: '87817',
            value: true,
          },
          create_subthreads: {
            source: '87817',
            value: true,
          },
          delete_thread: {
            source: null,
            value: false,
          },
          edit_entries: {
            source: '87817',
            value: true,
          },
          edit_message: {
            source: '87817',
            value: true,
          },
          edit_permissions: {
            source: '87817',
            value: true,
          },
          edit_thread: {
            source: '87817',
            value: true,
          },
          edit_thread_avatar: {
            source: '87817',
            value: true,
          },
          edit_thread_color: {
            source: '87817',
            value: true,
          },
          edit_thread_description: {
            source: '87817',
            value: true,
          },
          join_thread: {
            source: '84656',
            value: true,
          },
          know_of: {
            source: '87817',
            value: true,
          },
          leave_thread: {
            source: '87817',
            value: true,
          },
          manage_pins: {
            source: null,
            value: false,
          },
          membership: {
            source: null,
            value: false,
          },
          react_to_message: {
            source: '87817',
            value: true,
          },
          remove_members: {
            source: '87817',
            value: true,
          },
          visible: {
            source: '87817',
            value: true,
          },
          voiced: {
            source: '87817',
            value: true,
          },
        },
        role: '87818',
      },
      {
        id: '84589',
        isSender: true,
        permissions: {
          add_members: {
            source: '87817',
            value: true,
          },
          change_role: {
            source: null,
            value: false,
          },
          create_sidebars: {
            source: '87817',
            value: true,
          },
          create_subthreads: {
            source: '87817',
            value: true,
          },
          delete_thread: {
            source: null,
            value: false,
          },
          edit_entries: {
            source: '87817',
            value: true,
          },
          edit_message: {
            source: '87817',
            value: true,
          },
          edit_permissions: {
            source: '87817',
            value: true,
          },
          edit_thread: {
            source: '87817',
            value: true,
          },
          edit_thread_avatar: {
            source: '87817',
            value: true,
          },
          edit_thread_color: {
            source: '87817',
            value: true,
          },
          edit_thread_description: {
            source: '87817',
            value: true,
          },
          join_thread: {
            source: '84656',
            value: true,
          },
          know_of: {
            source: '87817',
            value: true,
          },
          leave_thread: {
            source: '87817',
            value: true,
          },
          manage_pins: {
            source: null,
            value: false,
          },
          membership: {
            source: null,
            value: false,
          },
          react_to_message: {
            source: '87817',
            value: true,
          },
          remove_members: {
            source: '87817',
            value: true,
          },
          visible: {
            source: '87817',
            value: true,
          },
          voiced: {
            source: '87817',
            value: true,
          },
        },
        role: '87818',
      },
    ],
    name: '',
    parentThreadID: '84656',
    pinnedCount: 0,
    repliesCount: 0,
    roles: {
      '87818': {
        id: '87818',
        isDefault: true,
        name: 'Members',
        permissions: {},
      },
    },
    type: 3,
  },
  '87837': {
    color: '6d49ab',
    community: '1',
    containingThreadID: '86071',
    creationTime: 1682368041060,
    currentUser: {
      permissions: {
        add_members: {
          source: '87837',
          value: true,
        },
        change_role: {
          source: null,
          value: false,
        },
        create_sidebars: {
          source: null,
          value: false,
        },
        create_subthreads: {
          source: null,
          value: false,
        },
        delete_thread: {
          source: null,
          value: false,
        },
        edit_entries: {
          source: null,
          value: false,
        },
        edit_message: {
          source: '87837',
          value: true,
        },
        edit_permissions: {
          source: '87837',
          value: true,
        },
        edit_thread: {
          source: '87837',
          value: true,
        },
        edit_thread_avatar: {
          source: '87837',
          value: true,
        },
        edit_thread_color: {
          source: '87837',
          value: true,
        },
        edit_thread_description: {
          source: '87837',
          value: true,
        },
        join_thread: {
          source: '86071',
          value: true,
        },
        know_of: {
          source: '86071',
          value: true,
        },
        leave_thread: {
          source: '87837',
          value: true,
        },
        manage_pins: {
          source: null,
          value: false,
        },
        membership: {
          source: null,
          value: false,
        },
        react_to_message: {
          source: '87837',
          value: true,
        },
        remove_members: {
          source: '87837',
          value: true,
        },
        visible: {
          source: '86071',
          value: true,
        },
        voiced: {
          source: '87837',
          value: true,
        },
      },
      role: '87838',
      subscription: {
        home: true,
        pushNotifs: true,
      },
      unread: false,
    },
    description: '',
    id: '87837',
    members: [
      {
        id: '256',
        isSender: false,
        permissions: {
          add_members: {
            source: '1',
            value: true,
          },
          change_role: {
            source: '1',
            value: true,
          },
          create_sidebars: {
            source: null,
            value: false,
          },
          create_subthreads: {
            source: null,
            value: false,
          },
          delete_thread: {
            source: '1',
            value: true,
          },
          edit_entries: {
            source: '1',
            value: true,
          },
          edit_message: {
            source: null,
            value: false,
          },
          edit_permissions: {
            source: '1',
            value: true,
          },
          edit_thread: {
            source: '1',
            value: true,
          },
          edit_thread_avatar: {
            source: '1',
            value: true,
          },
          edit_thread_color: {
            source: '1',
            value: true,
          },
          edit_thread_description: {
            source: '1',
            value: true,
          },
          join_thread: {
            source: null,
            value: false,
          },
          know_of: {
            source: '1',
            value: true,
          },
          leave_thread: {
            source: null,
            value: false,
          },
          manage_pins: {
            source: '1',
            value: true,
          },
          membership: {
            source: null,
            value: false,
          },
          react_to_message: {
            source: null,
            value: false,
          },
          remove_members: {
            source: '1',
            value: true,
          },
          visible: {
            source: '1',
            value: true,
          },
          voiced: {
            source: '1',
            value: true,
          },
        },
        role: null,
      },
      {
        id: '84589',
        isSender: true,
        permissions: {
          add_members: {
            source: '87837',
            value: true,
          },
          change_role: {
            source: null,
            value: false,
          },
          create_sidebars: {
            source: null,
            value: false,
          },
          create_subthreads: {
            source: null,
            value: false,
          },
          delete_thread: {
            source: null,
            value: false,
          },
          edit_entries: {
            source: null,
            value: false,
          },
          edit_message: {
            source: '87837',
            value: true,
          },
          edit_permissions: {
            source: '87837',
            value: true,
          },
          edit_thread: {
            source: '87837',
            value: true,
          },
          edit_thread_avatar: {
            source: '87837',
            value: true,
          },
          edit_thread_color: {
            source: '87837',
            value: true,
          },
          edit_thread_description: {
            source: '87837',
            value: true,
          },
          join_thread: {
            source: '86071',
            value: true,
          },
          know_of: {
            source: '86071',
            value: true,
          },
          leave_thread: {
            source: '87837',
            value: true,
          },
          manage_pins: {
            source: null,
            value: false,
          },
          membership: {
            source: null,
            value: false,
          },
          react_to_message: {
            source: '87837',
            value: true,
          },
          remove_members: {
            source: '87837',
            value: true,
          },
          visible: {
            source: '86071',
            value: true,
          },
          voiced: {
            source: '87837',
            value: true,
          },
        },
        role: '87838',
      },
      {
        id: '85999',
        isSender: false,
        permissions: {
          add_members: {
            source: '87837',
            value: true,
          },
          change_role: {
            source: null,
            value: false,
          },
          create_sidebars: {
            source: null,
            value: false,
          },
          create_subthreads: {
            source: null,
            value: false,
          },
          delete_thread: {
            source: null,
            value: false,
          },
          edit_entries: {
            source: null,
            value: false,
          },
          edit_message: {
            source: '87837',
            value: true,
          },
          edit_permissions: {
            source: '87837',
            value: true,
          },
          edit_thread: {
            source: '87837',
            value: true,
          },
          edit_thread_avatar: {
            source: '87837',
            value: true,
          },
          edit_thread_color: {
            source: '87837',
            value: true,
          },
          edit_thread_description: {
            source: '87837',
            value: true,
          },
          join_thread: {
            source: '86071',
            value: true,
          },
          know_of: {
            source: '86071',
            value: true,
          },
          leave_thread: {
            source: '87837',
            value: true,
          },
          manage_pins: {
            source: null,
            value: false,
          },
          membership: {
            source: null,
            value: false,
          },
          react_to_message: {
            source: '87837',
            value: true,
          },
          remove_members: {
            source: '87837',
            value: true,
          },
          visible: {
            source: '86071',
            value: true,
          },
          voiced: {
            source: '87837',
            value: true,
          },
        },
        role: '87838',
      },
    ],
    name: 'Hello',
    parentThreadID: '86071',
    pinnedCount: 0,
    repliesCount: 1,
    roles: {
      '87838': {
        id: '87838',
        isDefault: true,
        name: 'Members',
        permissions: {},
      },
    },
    sourceMessageID: '86339',
    type: 5,
  },
};

// Clear out contents of role permissions AND member permissions to
// ensure `updateRolesAndPermissions` constructs them properly
// without dependingon anything from existing store.
const threadStoreThreadsWithEmptyRolePermissionsAndMemberPermissions: ThreadStoreThreadInfos =
  {
    '1': {
      color: 'b8753d',
      community: null,
      containingThreadID: null,
      creationTime: 1679537878106,
      currentUser: {
        permissions: {
          add_members: {
            source: null,
            value: false,
          },
          change_role: {
            source: null,
            value: false,
          },
          create_sidebars: {
            source: null,
            value: false,
          },
          create_subthreads: {
            source: null,
            value: false,
          },
          delete_thread: {
            source: null,
            value: false,
          },
          edit_entries: {
            source: null,
            value: false,
          },
          edit_message: {
            source: null,
            value: false,
          },
          edit_permissions: {
            source: null,
            value: false,
          },
          edit_thread: {
            source: null,
            value: false,
          },
          edit_thread_avatar: {
            source: null,
            value: false,
          },
          edit_thread_color: {
            source: null,
            value: false,
          },
          edit_thread_description: {
            source: null,
            value: false,
          },
          join_thread: {
            source: null,
            value: false,
          },
          know_of: {
            source: '1',
            value: true,
          },
          leave_thread: {
            source: null,
            value: false,
          },
          manage_pins: {
            source: null,
            value: false,
          },
          membership: {
            source: null,
            value: false,
          },
          react_to_message: {
            source: null,
            value: false,
          },
          remove_members: {
            source: null,
            value: false,
          },
          visible: {
            source: '1',
            value: true,
          },
          voiced: {
            source: null,
            value: false,
          },
        },
        role: '83795',
        subscription: {
          home: true,
          pushNotifs: true,
        },
        unread: false,
      },
      description:
        'This is the first community on Comm. In the future it will be possible to create chats outside of a community, but for now all of these chats get set with GENESIS as their parent. GENESIS is hosted on Ashoat’s keyserver.',
      id: '1',
      members: [
        {
          id: '256',
          isSender: false,
          permissions: {},
          role: '83796',
        },
        {
          id: '84589',
          isSender: false,
          permissions: {},
          role: '83795',
        },
      ],
      name: 'GENESIS',
      parentThreadID: null,
      pinnedCount: 0,
      repliesCount: 0,
      roles: {
        '83795': {
          id: '83795',
          isDefault: true,
          name: 'Members',
          permissions: {},
        },
        '83796': {
          id: '83796',
          isDefault: false,
          name: 'Admins',
          permissions: {},
        },
      },
      type: 12,
    },
    '84596': {
      color: '575757',
      community: '1',
      containingThreadID: '1',
      creationTime: 1680734420100,
      currentUser: {
        permissions: {
          add_members: {
            source: null,
            value: false,
          },
          change_role: {
            source: null,
            value: false,
          },
          create_sidebars: {
            source: '84596',
            value: true,
          },
          create_subthreads: {
            source: null,
            value: false,
          },
          delete_thread: {
            source: null,
            value: false,
          },
          edit_entries: {
            source: '84596',
            value: true,
          },
          edit_message: {
            source: '84596',
            value: true,
          },
          edit_permissions: {
            source: null,
            value: false,
          },
          edit_thread: {
            source: null,
            value: false,
          },
          edit_thread_avatar: {
            source: null,
            value: false,
          },
          edit_thread_color: {
            source: '84596',
            value: true,
          },
          edit_thread_description: {
            source: '84596',
            value: true,
          },
          join_thread: {
            source: null,
            value: false,
          },
          know_of: {
            source: '84596',
            value: true,
          },
          leave_thread: {
            source: null,
            value: false,
          },
          manage_pins: {
            source: null,
            value: false,
          },
          membership: {
            source: null,
            value: false,
          },
          react_to_message: {
            source: '84596',
            value: true,
          },
          remove_members: {
            source: null,
            value: false,
          },
          visible: {
            source: '84596',
            value: true,
          },
          voiced: {
            source: '84596',
            value: true,
          },
        },
        role: '84597',
        subscription: {
          home: true,
          pushNotifs: true,
        },
        unread: false,
      },
      description:
        'This is your private chat, where you can set reminders and jot notes in private!',
      id: '84596',
      members: [
        {
          id: '256',
          isSender: false,
          permissions: {},
          role: null,
        },
        {
          id: '84589',
          isSender: false,
          permissions: {},
          role: '84597',
        },
      ],
      name: 'hillary',
      parentThreadID: '1',
      pinnedCount: 0,
      repliesCount: 0,
      roles: {
        '84597': {
          id: '84597',
          isDefault: true,
          name: 'Members',
          permissions: {},
        },
      },
      type: 7,
    },
    '84598': {
      color: '5c9f5f',
      community: '1',
      containingThreadID: '1',
      creationTime: 1680734420159,
      currentUser: {
        permissions: {
          add_members: {
            source: null,
            value: false,
          },
          change_role: {
            source: null,
            value: false,
          },
          create_sidebars: {
            source: '84598',
            value: true,
          },
          create_subthreads: {
            source: null,
            value: false,
          },
          delete_thread: {
            source: null,
            value: false,
          },
          edit_entries: {
            source: '84598',
            value: true,
          },
          edit_message: {
            source: '84598',
            value: true,
          },
          edit_permissions: {
            source: null,
            value: false,
          },
          edit_thread: {
            source: '84598',
            value: true,
          },
          edit_thread_avatar: {
            source: null,
            value: false,
          },
          edit_thread_color: {
            source: '84598',
            value: true,
          },
          edit_thread_description: {
            source: '84598',
            value: true,
          },
          join_thread: {
            source: null,
            value: false,
          },
          know_of: {
            source: '84598',
            value: true,
          },
          leave_thread: {
            source: null,
            value: false,
          },
          manage_pins: {
            source: null,
            value: false,
          },
          membership: {
            source: null,
            value: false,
          },
          react_to_message: {
            source: '84598',
            value: true,
          },
          remove_members: {
            source: null,
            value: false,
          },
          visible: {
            source: '84598',
            value: true,
          },
          voiced: {
            source: '84598',
            value: true,
          },
        },
        role: '84599',
        subscription: {
          home: true,
          pushNotifs: true,
        },
        unread: false,
      },
      description: '',
      id: '84598',
      members: [
        {
          id: '256',
          isSender: true,
          permissions: {},
          role: '84599',
        },
        {
          id: '84589',
          isSender: false,
          permissions: {},
          role: '84599',
        },
      ],
      name: '',
      parentThreadID: '1',
      pinnedCount: 0,
      repliesCount: 0,
      roles: {
        '84599': {
          id: '84599',
          isDefault: true,
          name: 'Members',
          permissions: {},
        },
      },
      type: 6,
    },
    '84627': {
      color: 'aa4b4b',
      community: '1',
      containingThreadID: '1',
      creationTime: 1680734427175,
      currentUser: {
        permissions: {
          add_members: {
            source: null,
            value: false,
          },
          change_role: {
            source: null,
            value: false,
          },
          create_sidebars: {
            source: '84627',
            value: true,
          },
          create_subthreads: {
            source: null,
            value: false,
          },
          delete_thread: {
            source: null,
            value: false,
          },
          edit_entries: {
            source: '84627',
            value: true,
          },
          edit_message: {
            source: '84627',
            value: true,
          },
          edit_permissions: {
            source: null,
            value: false,
          },
          edit_thread: {
            source: '84627',
            value: true,
          },
          edit_thread_avatar: {
            source: null,
            value: false,
          },
          edit_thread_color: {
            source: '84627',
            value: true,
          },
          edit_thread_description: {
            source: '84627',
            value: true,
          },
          join_thread: {
            source: null,
            value: false,
          },
          know_of: {
            source: '84627',
            value: true,
          },
          leave_thread: {
            source: null,
            value: false,
          },
          manage_pins: {
            source: null,
            value: false,
          },
          membership: {
            source: null,
            value: false,
          },
          react_to_message: {
            source: '84627',
            value: true,
          },
          remove_members: {
            source: null,
            value: false,
          },
          visible: {
            source: '84627',
            value: true,
          },
          voiced: {
            source: '84627',
            value: true,
          },
        },
        role: '84628',
        subscription: {
          home: true,
          pushNotifs: true,
        },
        unread: false,
      },
      description: '',
      id: '84627',
      members: [
        {
          id: '256',
          isSender: false,
          permissions: {},
          role: null,
        },
        {
          id: '83969',
          isSender: false,
          permissions: {},
          role: '84628',
        },
        {
          id: '84589',
          isSender: false,
          permissions: {},
          role: '84628',
        },
      ],
      name: '',
      parentThreadID: '1',
      pinnedCount: 0,
      repliesCount: 0,
      roles: {
        '84628': {
          id: '84628',
          isDefault: true,
          name: 'Members',
          permissions: {},
        },
      },
      type: 6,
    },
    '84656': {
      color: '6d49ab',
      community: '1',
      containingThreadID: '1',
      creationTime: 1680734490721,
      currentUser: {
        permissions: {
          add_members: {
            source: '84656',
            value: true,
          },
          change_role: {
            source: null,
            value: false,
          },
          create_sidebars: {
            source: '84656',
            value: true,
          },
          create_subthreads: {
            source: '84656',
            value: true,
          },
          delete_thread: {
            source: null,
            value: false,
          },
          edit_entries: {
            source: '84656',
            value: true,
          },
          edit_message: {
            source: '84656',
            value: true,
          },
          edit_permissions: {
            source: '84656',
            value: true,
          },
          edit_thread: {
            source: '84656',
            value: true,
          },
          edit_thread_avatar: {
            source: '84656',
            value: true,
          },
          edit_thread_color: {
            source: '84656',
            value: true,
          },
          edit_thread_description: {
            source: '84656',
            value: true,
          },
          join_thread: {
            source: null,
            value: false,
          },
          know_of: {
            source: '84656',
            value: true,
          },
          leave_thread: {
            source: '84656',
            value: true,
          },
          manage_pins: {
            source: null,
            value: false,
          },
          membership: {
            source: null,
            value: false,
          },
          react_to_message: {
            source: '84656',
            value: true,
          },
          remove_members: {
            source: '84656',
            value: true,
          },
          visible: {
            source: '84656',
            value: true,
          },
          voiced: {
            source: '84656',
            value: true,
          },
        },
        role: '84657',
        subscription: {
          home: true,
          pushNotifs: true,
        },
        unread: false,
      },
      description: '',
      id: '84656',
      members: [
        {
          id: '256',
          isSender: false,
          permissions: {},
          role: null,
        },
        {
          id: '83809',
          isSender: true,
          permissions: {},
          role: '84657',
        },
        {
          id: '83969',
          isSender: true,
          permissions: {},
          role: '84657',
        },
        {
          id: '84589',
          isSender: false,
          permissions: {},
          role: '84657',
        },
      ],
      name: 'group',
      parentThreadID: '1',
      pinnedCount: 0,
      repliesCount: 0,
      roles: {
        '84657': {
          id: '84657',
          isDefault: true,
          name: 'Members',
          permissions: {},
        },
      },
      type: 4,
    },
    '86071': {
      color: '6d49ab',
      community: '1',
      containingThreadID: '1',
      creationTime: 1681160151827,
      currentUser: {
        permissions: {
          add_members: {
            source: null,
            value: false,
          },
          change_role: {
            source: null,
            value: false,
          },
          create_sidebars: {
            source: '86071',
            value: true,
          },
          create_subthreads: {
            source: null,
            value: false,
          },
          delete_thread: {
            source: null,
            value: false,
          },
          edit_entries: {
            source: '86071',
            value: true,
          },
          edit_message: {
            source: '86071',
            value: true,
          },
          edit_permissions: {
            source: null,
            value: false,
          },
          edit_thread: {
            source: '86071',
            value: true,
          },
          edit_thread_avatar: {
            source: null,
            value: false,
          },
          edit_thread_color: {
            source: '86071',
            value: true,
          },
          edit_thread_description: {
            source: '86071',
            value: true,
          },
          join_thread: {
            source: null,
            value: false,
          },
          know_of: {
            source: '86071',
            value: true,
          },
          leave_thread: {
            source: null,
            value: false,
          },
          manage_pins: {
            source: null,
            value: false,
          },
          membership: {
            source: null,
            value: false,
          },
          react_to_message: {
            source: '86071',
            value: true,
          },
          remove_members: {
            source: null,
            value: false,
          },
          visible: {
            source: '86071',
            value: true,
          },
          voiced: {
            source: '86071',
            value: true,
          },
        },
        role: '86072',
        subscription: {
          home: true,
          pushNotifs: true,
        },
        unread: false,
      },
      description: '',
      id: '86071',
      members: [
        {
          id: '256',
          isSender: false,
          permissions: {},
          role: null,
        },
        {
          id: '84589',
          isSender: true,
          permissions: {},
          role: '86072',
        },
        {
          id: '85999',
          isSender: true,
          permissions: {},
          role: '86072',
        },
      ],
      name: '',
      parentThreadID: '1',
      pinnedCount: 0,
      repliesCount: 0,
      roles: {
        '86072': {
          id: '86072',
          isDefault: true,
          name: 'Members',
          permissions: {},
        },
      },
      type: 6,
    },
    '87789': {
      color: '6d49ab',
      community: '1',
      containingThreadID: '1',
      creationTime: 1682367957349,
      currentUser: {
        permissions: {
          add_members: {
            source: '87789',
            value: true,
          },
          change_role: {
            source: null,
            value: false,
          },
          create_sidebars: {
            source: '87789',
            value: true,
          },
          create_subthreads: {
            source: '87789',
            value: true,
          },
          delete_thread: {
            source: null,
            value: false,
          },
          edit_entries: {
            source: '87789',
            value: true,
          },
          edit_message: {
            source: '87789',
            value: true,
          },
          edit_permissions: {
            source: '87789',
            value: true,
          },
          edit_thread: {
            source: '87789',
            value: true,
          },
          edit_thread_avatar: {
            source: '87789',
            value: true,
          },
          edit_thread_color: {
            source: '87789',
            value: true,
          },
          edit_thread_description: {
            source: '87789',
            value: true,
          },
          join_thread: {
            source: '84656',
            value: true,
          },
          know_of: {
            source: '87789',
            value: true,
          },
          leave_thread: {
            source: '87789',
            value: true,
          },
          manage_pins: {
            source: null,
            value: false,
          },
          membership: {
            source: null,
            value: false,
          },
          react_to_message: {
            source: '87789',
            value: true,
          },
          remove_members: {
            source: '87789',
            value: true,
          },
          visible: {
            source: '87789',
            value: true,
          },
          voiced: {
            source: '87789',
            value: true,
          },
        },
        role: '87790',
        subscription: {
          home: true,
          pushNotifs: true,
        },
        unread: false,
      },
      description: '',
      id: '87789',
      members: [
        {
          id: '256',
          isSender: false,
          permissions: {},
          role: null,
        },
        {
          id: '83809',
          isSender: false,
          permissions: {},
          role: null,
        },
        {
          id: '83969',
          isSender: false,
          permissions: {},
          role: '87790',
        },
        {
          id: '84589',
          isSender: false,
          permissions: {},
          role: '87790',
        },
      ],
      name: 'Subthread',
      parentThreadID: '84656',
      pinnedCount: 0,
      repliesCount: 0,
      roles: {
        '87790': {
          id: '87790',
          isDefault: true,
          name: 'Members',
          permissions: {},
        },
      },
      type: 3,
    },
    '87817': {
      color: '6d49ab',
      community: '1',
      containingThreadID: '1',
      creationTime: 1682368005862,
      currentUser: {
        permissions: {
          add_members: {
            source: '87817',
            value: true,
          },
          change_role: {
            source: null,
            value: false,
          },
          create_sidebars: {
            source: '87817',
            value: true,
          },
          create_subthreads: {
            source: '87817',
            value: true,
          },
          delete_thread: {
            source: null,
            value: false,
          },
          edit_entries: {
            source: '87817',
            value: true,
          },
          edit_message: {
            source: '87817',
            value: true,
          },
          edit_permissions: {
            source: '87817',
            value: true,
          },
          edit_thread: {
            source: '87817',
            value: true,
          },
          edit_thread_avatar: {
            source: '87817',
            value: true,
          },
          edit_thread_color: {
            source: '87817',
            value: true,
          },
          edit_thread_description: {
            source: '87817',
            value: true,
          },
          join_thread: {
            source: '84656',
            value: true,
          },
          know_of: {
            source: '87817',
            value: true,
          },
          leave_thread: {
            source: '87817',
            value: true,
          },
          manage_pins: {
            source: null,
            value: false,
          },
          membership: {
            source: null,
            value: false,
          },
          react_to_message: {
            source: '87817',
            value: true,
          },
          remove_members: {
            source: '87817',
            value: true,
          },
          visible: {
            source: '87817',
            value: true,
          },
          voiced: {
            source: '87817',
            value: true,
          },
        },
        role: '87818',
        subscription: {
          home: true,
          pushNotifs: true,
        },
        unread: false,
      },
      description: '',
      id: '87817',
      members: [
        {
          id: '256',
          isSender: false,
          permissions: {},
          role: null,
        },
        {
          id: '83809',
          isSender: false,
          permissions: {},
          role: null,
        },
        {
          id: '83969',
          isSender: false,
          permissions: {},
          role: '87818',
        },
        {
          id: '84589',
          isSender: true,
          permissions: {},
          role: '87818',
        },
      ],
      name: '',
      parentThreadID: '84656',
      pinnedCount: 0,
      repliesCount: 0,
      roles: {
        '87818': {
          id: '87818',
          isDefault: true,
          name: 'Members',
          permissions: {},
        },
      },
      type: 3,
    },
    '87837': {
      color: '6d49ab',
      community: '1',
      containingThreadID: '86071',
      creationTime: 1682368041060,
      currentUser: {
        permissions: {
          add_members: {
            source: '87837',
            value: true,
          },
          change_role: {
            source: null,
            value: false,
          },
          create_sidebars: {
            source: null,
            value: false,
          },
          create_subthreads: {
            source: null,
            value: false,
          },
          delete_thread: {
            source: null,
            value: false,
          },
          edit_entries: {
            source: null,
            value: false,
          },
          edit_message: {
            source: '87837',
            value: true,
          },
          edit_permissions: {
            source: '87837',
            value: true,
          },
          edit_thread: {
            source: '87837',
            value: true,
          },
          edit_thread_avatar: {
            source: '87837',
            value: true,
          },
          edit_thread_color: {
            source: '87837',
            value: true,
          },
          edit_thread_description: {
            source: '87837',
            value: true,
          },
          join_thread: {
            source: '86071',
            value: true,
          },
          know_of: {
            source: '86071',
            value: true,
          },
          leave_thread: {
            source: '87837',
            value: true,
          },
          manage_pins: {
            source: null,
            value: false,
          },
          membership: {
            source: null,
            value: false,
          },
          react_to_message: {
            source: '87837',
            value: true,
          },
          remove_members: {
            source: '87837',
            value: true,
          },
          visible: {
            source: '86071',
            value: true,
          },
          voiced: {
            source: '87837',
            value: true,
          },
        },
        role: '87838',
        subscription: {
          home: true,
          pushNotifs: true,
        },
        unread: false,
      },
      description: '',
      id: '87837',
      members: [
        {
          id: '256',
          isSender: false,
          permissions: {},
          role: null,
        },
        {
          id: '84589',
          isSender: true,
          permissions: {},
          role: '87838',
        },
        {
          id: '85999',
          isSender: false,
          permissions: {},
          role: '87838',
        },
      ],
      name: 'Hello',
      parentThreadID: '86071',
      pinnedCount: 0,
      repliesCount: 1,
      roles: {
        '87838': {
          id: '87838',
          isDefault: true,
          name: 'Members',
          permissions: {},
        },
      },
      sourceMessageID: '86339',
      type: 5,
    },
  };

// Clear out contents of role permissions AND member permissions
// AND current member permissions to ensure `updateRolesAndPermissions`
// constructs them properly without dependingon anything from existing store.
const threadStoreThreadsWithEmptyRoleAndMemberAndCurrentUserPermissions: ThreadStoreThreadInfos =
  {
    '1': {
      color: 'b8753d',
      community: null,
      containingThreadID: null,
      creationTime: 1679537878106,
      currentUser: {
        permissions: {},
        role: '83795',
        subscription: {
          home: true,
          pushNotifs: true,
        },
        unread: false,
      },
      description:
        'This is the first community on Comm. In the future it will be possible to create chats outside of a community, but for now all of these chats get set with GENESIS as their parent. GENESIS is hosted on Ashoat’s keyserver.',
      id: '1',
      members: [
        {
          id: '256',
          isSender: false,
          permissions: {},
          role: '83796',
        },
        {
          id: '84589',
          isSender: false,
          permissions: {},
          role: '83795',
        },
      ],
      name: 'GENESIS',
      parentThreadID: null,
      pinnedCount: 0,
      repliesCount: 0,
      roles: {
        '83795': {
          id: '83795',
          isDefault: true,
          name: 'Members',
          permissions: {},
        },
        '83796': {
          id: '83796',
          isDefault: false,
          name: 'Admins',
          permissions: {},
        },
      },
      type: 12,
    },
    '84596': {
      color: '575757',
      community: '1',
      containingThreadID: '1',
      creationTime: 1680734420100,
      currentUser: {
        permissions: {},
        role: '84597',
        subscription: {
          home: true,
          pushNotifs: true,
        },
        unread: false,
      },
      description:
        'This is your private chat, where you can set reminders and jot notes in private!',
      id: '84596',
      members: [
        {
          id: '256',
          isSender: false,
          permissions: {},
          role: null,
        },
        {
          id: '84589',
          isSender: false,
          permissions: {},
          role: '84597',
        },
      ],
      name: 'hillary',
      parentThreadID: '1',
      pinnedCount: 0,
      repliesCount: 0,
      roles: {
        '84597': {
          id: '84597',
          isDefault: true,
          name: 'Members',
          permissions: {},
        },
      },
      type: 7,
    },
    '84598': {
      color: '5c9f5f',
      community: '1',
      containingThreadID: '1',
      creationTime: 1680734420159,
      currentUser: {
        permissions: {},
        role: '84599',
        subscription: {
          home: true,
          pushNotifs: true,
        },
        unread: false,
      },
      description: '',
      id: '84598',
      members: [
        {
          id: '256',
          isSender: true,
          permissions: {},
          role: '84599',
        },
        {
          id: '84589',
          isSender: false,
          permissions: {},
          role: '84599',
        },
      ],
      name: '',
      parentThreadID: '1',
      pinnedCount: 0,
      repliesCount: 0,
      roles: {
        '84599': {
          id: '84599',
          isDefault: true,
          name: 'Members',
          permissions: {},
        },
      },
      type: 6,
    },
    '84627': {
      color: 'aa4b4b',
      community: '1',
      containingThreadID: '1',
      creationTime: 1680734427175,
      currentUser: {
        permissions: {},
        role: '84628',
        subscription: {
          home: true,
          pushNotifs: true,
        },
        unread: false,
      },
      description: '',
      id: '84627',
      members: [
        {
          id: '256',
          isSender: false,
          permissions: {},
          role: null,
        },
        {
          id: '83969',
          isSender: false,
          permissions: {},
          role: '84628',
        },
        {
          id: '84589',
          isSender: false,
          permissions: {},
          role: '84628',
        },
      ],
      name: '',
      parentThreadID: '1',
      pinnedCount: 0,
      repliesCount: 0,
      roles: {
        '84628': {
          id: '84628',
          isDefault: true,
          name: 'Members',
          permissions: {},
        },
      },
      type: 6,
    },
    '84656': {
      color: '6d49ab',
      community: '1',
      containingThreadID: '1',
      creationTime: 1680734490721,
      currentUser: {
        permissions: {},
        role: '84657',
        subscription: {
          home: true,
          pushNotifs: true,
        },
        unread: false,
      },
      description: '',
      id: '84656',
      members: [
        {
          id: '256',
          isSender: false,
          permissions: {},
          role: null,
        },
        {
          id: '83809',
          isSender: true,
          permissions: {},
          role: '84657',
        },
        {
          id: '83969',
          isSender: true,
          permissions: {},
          role: '84657',
        },
        {
          id: '84589',
          isSender: false,
          permissions: {},
          role: '84657',
        },
      ],
      name: 'group',
      parentThreadID: '1',
      pinnedCount: 0,
      repliesCount: 0,
      roles: {
        '84657': {
          id: '84657',
          isDefault: true,
          name: 'Members',
          permissions: {},
        },
      },
      type: 4,
    },
    '86071': {
      color: '6d49ab',
      community: '1',
      containingThreadID: '1',
      creationTime: 1681160151827,
      currentUser: {
        permissions: {},
        role: '86072',
        subscription: {
          home: true,
          pushNotifs: true,
        },
        unread: false,
      },
      description: '',
      id: '86071',
      members: [
        {
          id: '256',
          isSender: false,
          permissions: {},
          role: null,
        },
        {
          id: '84589',
          isSender: true,
          permissions: {},
          role: '86072',
        },
        {
          id: '85999',
          isSender: true,
          permissions: {},
          role: '86072',
        },
      ],
      name: '',
      parentThreadID: '1',
      pinnedCount: 0,
      repliesCount: 0,
      roles: {
        '86072': {
          id: '86072',
          isDefault: true,
          name: 'Members',
          permissions: {},
        },
      },
      type: 6,
    },
    '87789': {
      color: '6d49ab',
      community: '1',
      containingThreadID: '1',
      creationTime: 1682367957349,
      currentUser: {
        permissions: {},
        role: '87790',
        subscription: {
          home: true,
          pushNotifs: true,
        },
        unread: false,
      },
      description: '',
      id: '87789',
      members: [
        {
          id: '256',
          isSender: false,
          permissions: {},
          role: null,
        },
        {
          id: '83809',
          isSender: false,
          permissions: {},
          role: null,
        },
        {
          id: '83969',
          isSender: false,
          permissions: {},
          role: '87790',
        },
        {
          id: '84589',
          isSender: false,
          permissions: {},
          role: '87790',
        },
      ],
      name: 'Subthread',
      parentThreadID: '84656',
      pinnedCount: 0,
      repliesCount: 0,
      roles: {
        '87790': {
          id: '87790',
          isDefault: true,
          name: 'Members',
          permissions: {},
        },
      },
      type: 3,
    },
    '87817': {
      color: '6d49ab',
      community: '1',
      containingThreadID: '1',
      creationTime: 1682368005862,
      currentUser: {
        permissions: {},
        role: '87818',
        subscription: {
          home: true,
          pushNotifs: true,
        },
        unread: false,
      },
      description: '',
      id: '87817',
      members: [
        {
          id: '256',
          isSender: false,
          permissions: {},
          role: null,
        },
        {
          id: '83809',
          isSender: false,
          permissions: {},
          role: null,
        },
        {
          id: '83969',
          isSender: false,
          permissions: {},
          role: '87818',
        },
        {
          id: '84589',
          isSender: true,
          permissions: {},
          role: '87818',
        },
      ],
      name: '',
      parentThreadID: '84656',
      pinnedCount: 0,
      repliesCount: 0,
      roles: {
        '87818': {
          id: '87818',
          isDefault: true,
          name: 'Members',
          permissions: {},
        },
      },
      type: 3,
    },
    '87837': {
      color: '6d49ab',
      community: '1',
      containingThreadID: '86071',
      creationTime: 1682368041060,
      currentUser: {
        permissions: {},
        role: '87838',
        subscription: {
          home: true,
          pushNotifs: true,
        },
        unread: false,
      },
      description: '',
      id: '87837',
      members: [
        {
          id: '256',
          isSender: false,
          permissions: {},
          role: null,
        },
        {
          id: '84589',
          isSender: true,
          permissions: {},
          role: '87838',
        },
        {
          id: '85999',
          isSender: false,
          permissions: {},
          role: '87838',
        },
      ],
      name: 'Hello',
      parentThreadID: '86071',
      pinnedCount: 0,
      repliesCount: 1,
      roles: {
        '87838': {
          id: '87838',
          isDefault: true,
          name: 'Members',
          permissions: {},
        },
      },
      sourceMessageID: '86339',
      type: 5,
    },
  };

export {
  threadStoreThreads,
  threadStoreThreadsWithEmptyRolePermissions,
  threadStoreThreadsWithEmptyRolePermissionsAndMemberPermissions,
  threadStoreThreadsWithEmptyRoleAndMemberAndCurrentUserPermissions,
};
