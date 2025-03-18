// @flow

import type { RawThreadInfo } from '../types/minimally-encoded-thread-permissions-types.js';
import { threadTypes } from '../types/thread-types-enum.js';
import type { LegacyRawThreadInfo } from '../types/thread-types.js';

const exampleRawThreadInfoA: LegacyRawThreadInfo = {
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
        voiced_in_announcement_channels: {
          value: false,
          source: null,
        },
        manage_farcaster_channel_tags: {
          value: false,
          source: null,
        },
        delete_own_messages: {
          value: false,
          source: null,
        },
        delete_all_messages: {
          value: false,
          source: null,
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
        voiced_in_announcement_channels: {
          value: false,
          source: null,
        },
        manage_farcaster_channel_tags: {
          value: false,
          source: null,
        },
        delete_own_messages: {
          value: false,
          source: null,
        },
        delete_all_messages: {
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
      voiced_in_announcement_channels: {
        value: false,
        source: null,
      },
      manage_farcaster_channel_tags: {
        value: false,
        source: null,
      },
      delete_own_messages: {
        value: false,
        source: null,
      },
      delete_all_messages: {
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

const exampleMinimallyEncodedRawThreadInfoA: RawThreadInfo = {
  minimallyEncoded: true,
  id: '85171',
  type: threadTypes.GENESIS_PERSONAL,
  name: '',
  description: '',
  color: '6d49ab',
  creationTime: 1675887298557,
  parentThreadID: '1',
  members: [
    {
      minimallyEncoded: true,
      id: '256',
      role: null,
      isSender: false,
    },
    {
      minimallyEncoded: true,
      id: '83853',
      role: '85172',
      isSender: true,
    },
  ],
  roles: {
    '85172': {
      minimallyEncoded: true,
      id: '85172',
      name: 'Members',
      permissions: [
        '000',
        '010',
        '020',
        '100',
        '110',
        '030',
        '040',
        '060',
        '050',
        '090',
        '005',
        '015',
        '0a9',
      ],
    },
  },
  currentUser: {
    minimallyEncoded: true,
    role: '85172',
    permissions: '3027f',
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

const expectedDecodedExampleRawThreadInfoA: LegacyRawThreadInfo = {
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
          source: 'null',
        },
        visible: {
          value: true,
          source: 'null',
        },
        voiced: {
          value: true,
          source: 'null',
        },
        edit_entries: {
          value: true,
          source: 'null',
        },
        edit_thread: {
          value: true,
          source: 'null',
        },
        edit_thread_description: {
          value: true,
          source: 'null',
        },
        edit_thread_color: {
          value: true,
          source: 'null',
        },
        delete_thread: {
          value: true,
          source: 'null',
        },
        create_subthreads: {
          value: true,
          source: 'null',
        },
        create_sidebars: {
          value: true,
          source: 'null',
        },
        join_thread: {
          value: true,
          source: 'null',
        },
        edit_permissions: {
          value: true,
          source: 'null',
        },
        add_members: {
          value: true,
          source: 'null',
        },
        remove_members: {
          value: true,
          source: 'null',
        },
        change_role: {
          value: true,
          source: 'null',
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
          source: 'null',
        },
        manage_invite_links: {
          source: null,
          value: false,
        },
        edit_thread_avatar: {
          source: null,
          value: false,
        },
        voiced_in_announcement_channels: {
          value: false,
          source: null,
        },
        manage_farcaster_channel_tags: {
          value: false,
          source: null,
        },
        delete_own_messages: {
          value: false,
          source: null,
        },
        delete_all_messages: {
          value: false,
          source: null,
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
          source: 'null',
        },
        visible: {
          value: true,
          source: 'null',
        },
        voiced: {
          value: true,
          source: 'null',
        },
        edit_entries: {
          value: true,
          source: 'null',
        },
        edit_thread: {
          value: true,
          source: 'null',
        },
        edit_thread_description: {
          value: true,
          source: 'null',
        },
        edit_thread_color: {
          value: true,
          source: 'null',
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
          source: 'null',
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
          source: 'null',
        },
        edit_message: {
          value: true,
          source: 'null',
        },
        manage_pins: {
          value: false,
          source: null,
        },
        manage_invite_links: {
          source: null,
          value: false,
        },
        edit_thread_avatar: {
          source: null,
          value: false,
        },
        voiced_in_announcement_channels: {
          value: false,
          source: null,
        },
        manage_farcaster_channel_tags: {
          value: false,
          source: null,
        },
        delete_own_messages: {
          value: false,
          source: null,
        },
        delete_all_messages: {
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
        source: 'null',
      },
      visible: {
        value: true,
        source: 'null',
      },
      voiced: {
        value: true,
        source: 'null',
      },
      edit_entries: {
        value: true,
        source: 'null',
      },
      edit_thread: {
        value: true,
        source: 'null',
      },
      edit_thread_description: {
        value: true,
        source: 'null',
      },
      edit_thread_color: {
        value: true,
        source: 'null',
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
        source: 'null',
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
        source: 'null',
      },
      edit_message: {
        value: true,
        source: 'null',
      },
      manage_pins: {
        value: false,
        source: null,
      },
      manage_invite_links: {
        source: null,
        value: false,
      },
      edit_thread_avatar: {
        source: null,
        value: false,
      },
      voiced_in_announcement_channels: {
        value: false,
        source: null,
      },
      manage_farcaster_channel_tags: {
        value: false,
        source: null,
      },
      delete_own_messages: {
        value: false,
        source: null,
      },
      delete_all_messages: {
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

export {
  exampleRawThreadInfoA,
  exampleMinimallyEncodedRawThreadInfoA,
  expectedDecodedExampleRawThreadInfoA,
};
