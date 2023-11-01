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

const threadStoreThreadsWithDescendantOpenVoiced: ThreadStoreThreadInfos = {
  '256|84852': {
    id: '256|84852',
    type: 9,
    name: 'Announcement Community',
    description: '',
    color: '648caa',
    creationTime: 1698337006124,
    parentThreadID: null,
    members: [
      {
        id: '256',
        role: '256|84854',
        permissions: {
          know_of: {
            value: true,
            source: '256|84852',
          },
          visible: {
            value: true,
            source: '256|84852',
          },
          voiced: {
            value: true,
            source: '256|84852',
          },
          edit_entries: {
            value: true,
            source: '256|84852',
          },
          edit_thread: {
            value: true,
            source: '256|84852',
          },
          edit_thread_description: {
            value: true,
            source: '256|84852',
          },
          edit_thread_color: {
            value: true,
            source: '256|84852',
          },
          delete_thread: {
            value: true,
            source: '256|84852',
          },
          create_subthreads: {
            value: true,
            source: '256|84852',
          },
          create_sidebars: {
            value: true,
            source: '256|84852',
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
            value: true,
            source: '256|84852',
          },
          remove_members: {
            value: true,
            source: '256|84852',
          },
          change_role: {
            value: true,
            source: '256|84852',
          },
          leave_thread: {
            value: true,
            source: '256|84852',
          },
          react_to_message: {
            value: true,
            source: '256|84852',
          },
          edit_message: {
            value: true,
            source: '256|84852',
          },
          edit_thread_avatar: {
            value: true,
            source: '256|84852',
          },
          manage_pins: {
            value: true,
            source: '256|84852',
          },
          manage_invite_links: {
            value: true,
            source: '256|84852',
          },
        },
        isSender: false,
      },
      {
        id: '83813',
        role: '256|84853',
        permissions: {
          know_of: {
            value: true,
            source: '256|84852',
          },
          visible: {
            value: true,
            source: '256|84852',
          },
          voiced: {
            value: true,
            source: '256|84852',
          },
          edit_entries: {
            value: false,
            source: null,
          },
          edit_thread: {
            value: false,
            source: null,
          },
          edit_thread_description: {
            value: false,
            source: null,
          },
          edit_thread_color: {
            value: false,
            source: null,
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
            source: '256|84852',
          },
          join_thread: {
            value: true,
            source: '256|84852',
          },
          edit_permissions: {
            value: false,
            source: null,
          },
          add_members: {
            value: true,
            source: '256|84852',
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
            value: true,
            source: '256|84852',
          },
          react_to_message: {
            value: true,
            source: '256|84852',
          },
          edit_message: {
            value: true,
            source: '256|84852',
          },
          edit_thread_avatar: {
            value: false,
            source: null,
          },
          manage_pins: {
            value: false,
            source: null,
          },
          manage_invite_links: {
            value: false,
            source: null,
          },
        },
        isSender: false,
      },
      {
        id: '83858',
        role: '256|84853',
        permissions: {
          know_of: {
            value: true,
            source: '256|84852',
          },
          visible: {
            value: true,
            source: '256|84852',
          },
          voiced: {
            value: true,
            source: '256|84852',
          },
          edit_entries: {
            value: false,
            source: null,
          },
          edit_thread: {
            value: false,
            source: null,
          },
          edit_thread_description: {
            value: false,
            source: null,
          },
          edit_thread_color: {
            value: false,
            source: null,
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
            source: '256|84852',
          },
          join_thread: {
            value: true,
            source: '256|84852',
          },
          edit_permissions: {
            value: false,
            source: null,
          },
          add_members: {
            value: true,
            source: '256|84852',
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
            value: true,
            source: '256|84852',
          },
          react_to_message: {
            value: true,
            source: '256|84852',
          },
          edit_message: {
            value: true,
            source: '256|84852',
          },
          edit_thread_avatar: {
            value: false,
            source: null,
          },
          manage_pins: {
            value: false,
            source: null,
          },
          manage_invite_links: {
            value: false,
            source: null,
          },
        },
        isSender: false,
      },
      {
        id: '83906',
        role: '256|84853',
        permissions: {
          know_of: {
            value: true,
            source: '256|84852',
          },
          visible: {
            value: true,
            source: '256|84852',
          },
          voiced: {
            value: true,
            source: '256|84852',
          },
          edit_entries: {
            value: false,
            source: null,
          },
          edit_thread: {
            value: false,
            source: null,
          },
          edit_thread_description: {
            value: false,
            source: null,
          },
          edit_thread_color: {
            value: false,
            source: null,
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
            source: '256|84852',
          },
          join_thread: {
            value: true,
            source: '256|84852',
          },
          edit_permissions: {
            value: false,
            source: null,
          },
          add_members: {
            value: true,
            source: '256|84852',
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
            value: true,
            source: '256|84852',
          },
          react_to_message: {
            value: true,
            source: '256|84852',
          },
          edit_message: {
            value: true,
            source: '256|84852',
          },
          edit_thread_avatar: {
            value: false,
            source: null,
          },
          manage_pins: {
            value: false,
            source: null,
          },
          manage_invite_links: {
            value: false,
            source: null,
          },
        },
        isSender: false,
      },
      {
        id: '83953',
        role: '256|84853',
        permissions: {
          know_of: {
            value: true,
            source: '256|84852',
          },
          visible: {
            value: true,
            source: '256|84852',
          },
          voiced: {
            value: true,
            source: '256|84852',
          },
          edit_entries: {
            value: false,
            source: null,
          },
          edit_thread: {
            value: false,
            source: null,
          },
          edit_thread_description: {
            value: false,
            source: null,
          },
          edit_thread_color: {
            value: false,
            source: null,
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
            source: '256|84852',
          },
          join_thread: {
            value: true,
            source: '256|84852',
          },
          edit_permissions: {
            value: false,
            source: null,
          },
          add_members: {
            value: true,
            source: '256|84852',
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
            value: true,
            source: '256|84852',
          },
          react_to_message: {
            value: true,
            source: '256|84852',
          },
          edit_message: {
            value: true,
            source: '256|84852',
          },
          edit_thread_avatar: {
            value: false,
            source: null,
          },
          manage_pins: {
            value: false,
            source: null,
          },
          manage_invite_links: {
            value: false,
            source: null,
          },
        },
        isSender: false,
      },
      {
        id: '84003',
        role: '256|84853',
        permissions: {
          know_of: {
            value: true,
            source: '256|84852',
          },
          visible: {
            value: true,
            source: '256|84852',
          },
          voiced: {
            value: true,
            source: '256|84852',
          },
          edit_entries: {
            value: false,
            source: null,
          },
          edit_thread: {
            value: false,
            source: null,
          },
          edit_thread_description: {
            value: false,
            source: null,
          },
          edit_thread_color: {
            value: false,
            source: null,
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
            source: '256|84852',
          },
          join_thread: {
            value: true,
            source: '256|84852',
          },
          edit_permissions: {
            value: false,
            source: null,
          },
          add_members: {
            value: true,
            source: '256|84852',
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
            value: true,
            source: '256|84852',
          },
          react_to_message: {
            value: true,
            source: '256|84852',
          },
          edit_message: {
            value: true,
            source: '256|84852',
          },
          edit_thread_avatar: {
            value: false,
            source: null,
          },
          manage_pins: {
            value: false,
            source: null,
          },
          manage_invite_links: {
            value: false,
            source: null,
          },
        },
        isSender: false,
      },
    ],
    roles: {
      '256|84853': {
        id: '256|84853',
        name: 'Members',
        permissions: {
          know_of: true,
          descendant_open_know_of: true,
          visible: true,
          descendant_open_visible: true,
          join_thread: true,
          child_open_join_thread: true,
          descendant_opentoplevel_join_thread: true,
          create_sidebars: true,
          leave_thread: true,
          react_to_message: true,
          descendant_react_to_message: true,
          edit_message: true,
          descendant_edit_message: true,
          add_members: true,
          descendant_add_members: true,
          child_open_add_members: true,
          voiced: true,
        },
        isDefault: true,
      },
      '256|84854': {
        id: '256|84854',
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
          edit_thread_avatar: true,
          create_subthreads: true,
          create_sidebars: true,
          add_members: true,
          delete_thread: true,
          remove_members: true,
          change_role: true,
          manage_pins: true,
          manage_invite_links: true,
          descendant_know_of: true,
          descendant_visible: true,
          descendant_toplevel_join_thread: true,
          child_join_thread: true,
          descendant_voiced: true,
          descendant_edit_entries: true,
          descendant_edit_thread: true,
          descendant_edit_thread_color: true,
          descendant_edit_thread_description: true,
          descendant_edit_thread_avatar: true,
          descendant_toplevel_create_subthreads: true,
          descendant_toplevel_create_sidebars: true,
          descendant_add_members: true,
          descendant_delete_thread: true,
          descendant_edit_permissions: true,
          descendant_remove_members: true,
          descendant_change_role: true,
          descendant_manage_pins: true,
          leave_thread: true,
        },
        isDefault: false,
      },
    },
    currentUser: {
      role: '256|84853',
      permissions: {
        know_of: {
          value: true,
          source: '256|84852',
        },
        visible: {
          value: true,
          source: '256|84852',
        },
        voiced: {
          value: true,
          source: '256|84852',
        },
        edit_entries: {
          value: false,
          source: null,
        },
        edit_thread: {
          value: false,
          source: null,
        },
        edit_thread_description: {
          value: false,
          source: null,
        },
        edit_thread_color: {
          value: false,
          source: null,
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
          source: '256|84852',
        },
        join_thread: {
          value: true,
          source: '256|84852',
        },
        edit_permissions: {
          value: false,
          source: null,
        },
        add_members: {
          value: true,
          source: '256|84852',
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
          value: true,
          source: '256|84852',
        },
        react_to_message: {
          value: true,
          source: '256|84852',
        },
        edit_message: {
          value: true,
          source: '256|84852',
        },
        edit_thread_avatar: {
          value: false,
          source: null,
        },
        manage_pins: {
          value: false,
          source: null,
        },
        manage_invite_links: {
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
    containingThreadID: null,
    community: null,
    pinnedCount: 0,
  },
  '256|85022': {
    id: '256|85022',
    type: 8,
    name: 'Communications',
    description: '',
    color: 'aa4b4b',
    creationTime: 1698341268486,
    parentThreadID: null,
    members: [
      {
        id: '256',
        role: '256|85023',
        permissions: {
          know_of: {
            value: true,
            source: '256|85022',
          },
          visible: {
            value: true,
            source: '256|85022',
          },
          voiced: {
            value: true,
            source: '256|85022',
          },
          edit_entries: {
            value: true,
            source: '256|85022',
          },
          edit_thread: {
            value: true,
            source: '256|85022',
          },
          edit_thread_description: {
            value: true,
            source: '256|85022',
          },
          edit_thread_color: {
            value: true,
            source: '256|85022',
          },
          delete_thread: {
            value: false,
            source: null,
          },
          create_subthreads: {
            value: true,
            source: '256|85022',
          },
          create_sidebars: {
            value: true,
            source: '256|85022',
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
            value: true,
            source: '256|85022',
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
            value: true,
            source: '256|85022',
          },
          react_to_message: {
            value: true,
            source: '256|85022',
          },
          edit_message: {
            value: true,
            source: '256|85022',
          },
          edit_thread_avatar: {
            value: true,
            source: '256|85022',
          },
          manage_pins: {
            value: false,
            source: null,
          },
          manage_invite_links: {
            value: false,
            source: null,
          },
        },
        isSender: false,
      },
      {
        id: '83953',
        role: '256|85024',
        permissions: {
          know_of: {
            value: true,
            source: '256|85022',
          },
          visible: {
            value: true,
            source: '256|85022',
          },
          voiced: {
            value: true,
            source: '256|85022',
          },
          edit_entries: {
            value: true,
            source: '256|85022',
          },
          edit_thread: {
            value: true,
            source: '256|85022',
          },
          edit_thread_description: {
            value: true,
            source: '256|85022',
          },
          edit_thread_color: {
            value: true,
            source: '256|85022',
          },
          delete_thread: {
            value: true,
            source: '256|85022',
          },
          create_subthreads: {
            value: true,
            source: '256|85022',
          },
          create_sidebars: {
            value: true,
            source: '256|85022',
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
            value: true,
            source: '256|85022',
          },
          remove_members: {
            value: true,
            source: '256|85022',
          },
          change_role: {
            value: true,
            source: '256|85022',
          },
          leave_thread: {
            value: true,
            source: '256|85022',
          },
          react_to_message: {
            value: true,
            source: '256|85022',
          },
          edit_message: {
            value: true,
            source: '256|85022',
          },
          edit_thread_avatar: {
            value: true,
            source: '256|85022',
          },
          manage_pins: {
            value: true,
            source: '256|85022',
          },
          manage_invite_links: {
            value: true,
            source: '256|85022',
          },
        },
        isSender: false,
      },
    ],
    roles: {
      '256|85023': {
        id: '256|85023',
        name: 'Members',
        permissions: {
          know_of: true,
          visible: true,
          descendant_open_know_of: true,
          descendant_open_visible: true,
          descendant_opentoplevel_join_thread: true,
          react_to_message: true,
          edit_message: true,
          leave_thread: true,
          create_sidebars: true,
          add_members: true,
          child_open_join_thread: true,
          child_open_add_members: true,
          voiced: true,
          edit_entries: true,
          edit_thread: true,
          edit_thread_color: true,
          edit_thread_description: true,
          edit_thread_avatar: true,
          create_subthreads: true,
        },
        isDefault: true,
      },
      '256|85024': {
        id: '256|85024',
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
          edit_thread_avatar: true,
          create_subthreads: true,
          create_sidebars: true,
          add_members: true,
          delete_thread: true,
          remove_members: true,
          change_role: true,
          manage_pins: true,
          manage_invite_links: true,
          descendant_know_of: true,
          descendant_visible: true,
          descendant_toplevel_join_thread: true,
          child_join_thread: true,
          descendant_voiced: true,
          descendant_edit_entries: true,
          descendant_edit_thread: true,
          descendant_edit_thread_color: true,
          descendant_edit_thread_description: true,
          descendant_edit_thread_avatar: true,
          descendant_toplevel_create_subthreads: true,
          descendant_toplevel_create_sidebars: true,
          descendant_add_members: true,
          descendant_delete_thread: true,
          descendant_edit_permissions: true,
          descendant_remove_members: true,
          descendant_change_role: true,
          descendant_manage_pins: true,
          leave_thread: true,
        },
        isDefault: false,
      },
      '256|85027': {
        id: '256|85027',
        name: 'Moderators',
        permissions: {
          know_of: true,
          descendant_open_know_of: true,
          descendant_open_voiced: true,
          visible: true,
          descendant_open_visible: true,
          join_thread: true,
          child_open_join_thread: true,
          descendant_opentoplevel_join_thread: true,
          create_sidebars: true,
          leave_thread: true,
          voiced: true,
        },
        isDefault: false,
      },
    },
    currentUser: {
      role: '256|85024',
      permissions: {
        know_of: {
          value: true,
          source: '256|85022',
        },
        visible: {
          value: true,
          source: '256|85022',
        },
        voiced: {
          value: true,
          source: '256|85022',
        },
        edit_entries: {
          value: true,
          source: '256|85022',
        },
        edit_thread: {
          value: true,
          source: '256|85022',
        },
        edit_thread_description: {
          value: true,
          source: '256|85022',
        },
        edit_thread_color: {
          value: true,
          source: '256|85022',
        },
        delete_thread: {
          value: true,
          source: '256|85022',
        },
        create_subthreads: {
          value: true,
          source: '256|85022',
        },
        create_sidebars: {
          value: true,
          source: '256|85022',
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
          value: true,
          source: '256|85022',
        },
        remove_members: {
          value: true,
          source: '256|85022',
        },
        change_role: {
          value: true,
          source: '256|85022',
        },
        leave_thread: {
          value: true,
          source: '256|85022',
        },
        react_to_message: {
          value: true,
          source: '256|85022',
        },
        edit_message: {
          value: true,
          source: '256|85022',
        },
        edit_thread_avatar: {
          value: true,
          source: '256|85022',
        },
        manage_pins: {
          value: true,
          source: '256|85022',
        },
        manage_invite_links: {
          value: true,
          source: '256|85022',
        },
      },
      subscription: {
        home: true,
        pushNotifs: true,
      },
      unread: false,
    },
    repliesCount: 0,
    containingThreadID: null,
    community: null,
    pinnedCount: 0,
  },
  '256|85034': {
    id: '256|85034',
    type: 3,
    name: 'Upcoming Events',
    description: '',
    color: 'aa4b4b',
    creationTime: 1698341321824,
    parentThreadID: '256|85022',
    members: [
      {
        id: '256',
        role: '256|85035',
        permissions: {
          know_of: {
            value: true,
            source: '256|85034',
          },
          visible: {
            value: true,
            source: '256|85034',
          },
          voiced: {
            value: true,
            source: '256|85034',
          },
          edit_entries: {
            value: true,
            source: '256|85034',
          },
          edit_thread: {
            value: true,
            source: '256|85034',
          },
          edit_thread_description: {
            value: true,
            source: '256|85034',
          },
          edit_thread_color: {
            value: true,
            source: '256|85034',
          },
          delete_thread: {
            value: false,
            source: null,
          },
          create_subthreads: {
            value: true,
            source: '256|85034',
          },
          create_sidebars: {
            value: true,
            source: '256|85034',
          },
          join_thread: {
            value: true,
            source: '256|85022',
          },
          edit_permissions: {
            value: true,
            source: '256|85034',
          },
          add_members: {
            value: true,
            source: '256|85034',
          },
          remove_members: {
            value: true,
            source: '256|85034',
          },
          change_role: {
            value: false,
            source: null,
          },
          leave_thread: {
            value: true,
            source: '256|85034',
          },
          react_to_message: {
            value: true,
            source: '256|85034',
          },
          edit_message: {
            value: true,
            source: '256|85034',
          },
          edit_thread_avatar: {
            value: true,
            source: '256|85034',
          },
          manage_pins: {
            value: false,
            source: null,
          },
          manage_invite_links: {
            value: false,
            source: null,
          },
        },
        isSender: false,
      },
      {
        id: '83953',
        role: '256|85035',
        permissions: {
          know_of: {
            value: true,
            source: '256|85034',
          },
          visible: {
            value: true,
            source: '256|85034',
          },
          voiced: {
            value: true,
            source: '256|85034',
          },
          edit_entries: {
            value: true,
            source: '256|85034',
          },
          edit_thread: {
            value: true,
            source: '256|85034',
          },
          edit_thread_description: {
            value: true,
            source: '256|85034',
          },
          edit_thread_color: {
            value: true,
            source: '256|85034',
          },
          delete_thread: {
            value: true,
            source: '256|85022',
          },
          create_subthreads: {
            value: true,
            source: '256|85034',
          },
          create_sidebars: {
            value: true,
            source: '256|85034',
          },
          join_thread: {
            value: true,
            source: '256|85022',
          },
          edit_permissions: {
            value: true,
            source: '256|85034',
          },
          add_members: {
            value: true,
            source: '256|85034',
          },
          remove_members: {
            value: true,
            source: '256|85034',
          },
          change_role: {
            value: true,
            source: '256|85022',
          },
          leave_thread: {
            value: true,
            source: '256|85034',
          },
          react_to_message: {
            value: true,
            source: '256|85034',
          },
          edit_message: {
            value: true,
            source: '256|85034',
          },
          edit_thread_avatar: {
            value: true,
            source: '256|85034',
          },
          manage_pins: {
            value: true,
            source: '256|85022',
          },
          manage_invite_links: {
            value: false,
            source: null,
          },
        },
        isSender: false,
      },
    ],
    roles: {
      '256|85035': {
        id: '256|85035',
        name: 'Members',
        permissions: {
          remove_members: true,
          edit_permissions: true,
          know_of: true,
          visible: true,
          react_to_message: true,
          edit_message: true,
          create_sidebars: true,
          leave_thread: true,
          descendant_open_know_of: true,
          descendant_open_visible: true,
          descendant_opentoplevel_join_thread: true,
          child_open_join_thread: true,
          voiced: true,
          edit_entries: true,
          edit_thread: true,
          edit_thread_color: true,
          edit_thread_description: true,
          edit_thread_avatar: true,
          create_subthreads: true,
          add_members: true,
        },
        isDefault: true,
      },
    },
    currentUser: {
      role: '256|85035',
      permissions: {
        know_of: {
          value: true,
          source: '256|85034',
        },
        visible: {
          value: true,
          source: '256|85034',
        },
        voiced: {
          value: true,
          source: '256|85034',
        },
        edit_entries: {
          value: true,
          source: '256|85034',
        },
        edit_thread: {
          value: true,
          source: '256|85034',
        },
        edit_thread_description: {
          value: true,
          source: '256|85034',
        },
        edit_thread_color: {
          value: true,
          source: '256|85034',
        },
        delete_thread: {
          value: true,
          source: '256|85022',
        },
        create_subthreads: {
          value: true,
          source: '256|85034',
        },
        create_sidebars: {
          value: true,
          source: '256|85034',
        },
        join_thread: {
          value: true,
          source: '256|85022',
        },
        edit_permissions: {
          value: true,
          source: '256|85034',
        },
        add_members: {
          value: true,
          source: '256|85034',
        },
        remove_members: {
          value: true,
          source: '256|85034',
        },
        change_role: {
          value: true,
          source: '256|85022',
        },
        leave_thread: {
          value: true,
          source: '256|85034',
        },
        react_to_message: {
          value: true,
          source: '256|85034',
        },
        edit_message: {
          value: true,
          source: '256|85034',
        },
        edit_thread_avatar: {
          value: true,
          source: '256|85034',
        },
        manage_pins: {
          value: true,
          source: '256|85022',
        },
        manage_invite_links: {
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
    containingThreadID: '256|85022',
    community: '256|85022',
    pinnedCount: 0,
  },
};

export {
  threadStoreThreads,
  threadStoreThreadsWithEmptyRolePermissions,
  threadStoreThreadsWithEmptyRolePermissionsAndMemberPermissions,
  threadStoreThreadsWithEmptyRoleAndMemberAndCurrentUserPermissions,
  threadStoreThreadsWithDescendantOpenVoiced,
};
