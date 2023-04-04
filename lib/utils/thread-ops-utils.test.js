// @flow

import {
  convertClientDBThreadInfoToRawThreadInfo,
  convertRawThreadInfoToClientDBThreadInfo,
} from './thread-ops-utils.js';
import type {
  ClientDBThreadInfo,
  RawThreadInfo,
} from '../types/thread-types.js';

const rawThreadInfo: RawThreadInfo = {
  id: '84015',
  type: 6,
  name: 'atul_web',
  description: 'Hello world!',
  color: '4b87aa',
  creationTime: 1679595843051,
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
        membership: {
          value: false,
          source: null,
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
      },
      isSender: false,
    },
    {
      id: '83809',
      role: '84016',
      permissions: {
        know_of: {
          value: true,
          source: '84015',
        },
        membership: {
          value: false,
          source: null,
        },
        visible: {
          value: true,
          source: '84015',
        },
        voiced: {
          value: true,
          source: '84015',
        },
        edit_entries: {
          value: true,
          source: '84015',
        },
        edit_thread: {
          value: true,
          source: '84015',
        },
        edit_thread_description: {
          value: true,
          source: '84015',
        },
        edit_thread_color: {
          value: true,
          source: '84015',
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
          source: '84015',
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
          source: '84015',
        },
        edit_message: {
          value: true,
          source: '84015',
        },
      },
      isSender: true,
    },
    {
      id: '83969',
      role: '84016',
      permissions: {
        know_of: {
          value: true,
          source: '84015',
        },
        membership: {
          value: false,
          source: null,
        },
        visible: {
          value: true,
          source: '84015',
        },
        voiced: {
          value: true,
          source: '84015',
        },
        edit_entries: {
          value: true,
          source: '84015',
        },
        edit_thread: {
          value: true,
          source: '84015',
        },
        edit_thread_description: {
          value: true,
          source: '84015',
        },
        edit_thread_color: {
          value: true,
          source: '84015',
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
          source: '84015',
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
          source: '84015',
        },
        edit_message: {
          value: true,
          source: '84015',
        },
      },
      isSender: true,
    },
  ],
  roles: {
    '84016': {
      id: '84016',
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
    role: '84016',
    permissions: {
      know_of: {
        value: true,
        source: '84015',
      },
      membership: {
        value: false,
        source: null,
      },
      visible: {
        value: true,
        source: '84015',
      },
      voiced: {
        value: true,
        source: '84015',
      },
      edit_entries: {
        value: true,
        source: '84015',
      },
      edit_thread: {
        value: true,
        source: '84015',
      },
      edit_thread_description: {
        value: true,
        source: '84015',
      },
      edit_thread_color: {
        value: true,
        source: '84015',
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
        source: '84015',
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
        source: '84015',
      },
      edit_message: {
        value: true,
        source: '84015',
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

const clientDBThreadInfo: ClientDBThreadInfo = {
  id: '84015',
  type: 6,
  name: 'atul_web',
  description: 'Hello world!',
  color: '4b87aa',
  creationTime: '1679595843051',
  parentThreadID: '1',
  members:
    '[{"id":"256","role":null,"permissions":{"know_of":{"value":true,"source":"1"},"membership":{"value":false,"source":null},"visible":{"value":true,"source":"1"},"voiced":{"value":true,"source":"1"},"edit_entries":{"value":true,"source":"1"},"edit_thread":{"value":true,"source":"1"},"edit_thread_description":{"value":true,"source":"1"},"edit_thread_color":{"value":true,"source":"1"},"delete_thread":{"value":true,"source":"1"},"create_subthreads":{"value":true,"source":"1"},"create_sidebars":{"value":true,"source":"1"},"join_thread":{"value":true,"source":"1"},"edit_permissions":{"value":true,"source":"1"},"add_members":{"value":true,"source":"1"},"remove_members":{"value":true,"source":"1"},"change_role":{"value":true,"source":"1"},"leave_thread":{"value":false,"source":null},"react_to_message":{"value":false,"source":null},"edit_message":{"value":false,"source":null}},"isSender":false},{"id":"83809","role":"84016","permissions":{"know_of":{"value":true,"source":"84015"},"membership":{"value":false,"source":null},"visible":{"value":true,"source":"84015"},"voiced":{"value":true,"source":"84015"},"edit_entries":{"value":true,"source":"84015"},"edit_thread":{"value":true,"source":"84015"},"edit_thread_description":{"value":true,"source":"84015"},"edit_thread_color":{"value":true,"source":"84015"},"delete_thread":{"value":false,"source":null},"create_subthreads":{"value":false,"source":null},"create_sidebars":{"value":true,"source":"84015"},"join_thread":{"value":false,"source":null},"edit_permissions":{"value":false,"source":null},"add_members":{"value":false,"source":null},"remove_members":{"value":false,"source":null},"change_role":{"value":false,"source":null},"leave_thread":{"value":false,"source":null},"react_to_message":{"value":true,"source":"84015"},"edit_message":{"value":true,"source":"84015"}},"isSender":true},{"id":"83969","role":"84016","permissions":{"know_of":{"value":true,"source":"84015"},"membership":{"value":false,"source":null},"visible":{"value":true,"source":"84015"},"voiced":{"value":true,"source":"84015"},"edit_entries":{"value":true,"source":"84015"},"edit_thread":{"value":true,"source":"84015"},"edit_thread_description":{"value":true,"source":"84015"},"edit_thread_color":{"value":true,"source":"84015"},"delete_thread":{"value":false,"source":null},"create_subthreads":{"value":false,"source":null},"create_sidebars":{"value":true,"source":"84015"},"join_thread":{"value":false,"source":null},"edit_permissions":{"value":false,"source":null},"add_members":{"value":false,"source":null},"remove_members":{"value":false,"source":null},"change_role":{"value":false,"source":null},"leave_thread":{"value":false,"source":null},"react_to_message":{"value":true,"source":"84015"},"edit_message":{"value":true,"source":"84015"}},"isSender":true}]',
  roles:
    '{"84016":{"id":"84016","name":"Members","permissions":{"know_of":true,"visible":true,"voiced":true,"react_to_message":true,"edit_message":true,"edit_entries":true,"edit_thread":true,"edit_thread_color":true,"edit_thread_description":true,"create_sidebars":true,"descendant_open_know_of":true,"descendant_open_visible":true,"child_open_join_thread":true},"isDefault":true}}',
  currentUser:
    '{"role":"84016","permissions":{"know_of":{"value":true,"source":"84015"},"membership":{"value":false,"source":null},"visible":{"value":true,"source":"84015"},"voiced":{"value":true,"source":"84015"},"edit_entries":{"value":true,"source":"84015"},"edit_thread":{"value":true,"source":"84015"},"edit_thread_description":{"value":true,"source":"84015"},"edit_thread_color":{"value":true,"source":"84015"},"delete_thread":{"value":false,"source":null},"create_subthreads":{"value":false,"source":null},"create_sidebars":{"value":true,"source":"84015"},"join_thread":{"value":false,"source":null},"edit_permissions":{"value":false,"source":null},"add_members":{"value":false,"source":null},"remove_members":{"value":false,"source":null},"change_role":{"value":false,"source":null},"leave_thread":{"value":false,"source":null},"react_to_message":{"value":true,"source":"84015"},"edit_message":{"value":true,"source":"84015"}},"subscription":{"home":true,"pushNotifs":true},"unread":false}',
  repliesCount: 0,
  containingThreadID: '1',
  community: '1',
  avatar: null,
};

describe('convertRawThreadInfoToClientDBThreadInfo', () => {
  it('should successfuly convert RawThreadInfo to ClientDBThreadInfo', () => {
    expect(
      convertRawThreadInfoToClientDBThreadInfo(rawThreadInfo),
    ).toStrictEqual(clientDBThreadInfo);
  });
});

describe('convertClientDBThreadInfoToRawThreadInfo', () => {
  it('should successfuly convert ClientDBThreadInfo to RawThreadInfo', () => {
    expect(
      convertClientDBThreadInfoToRawThreadInfo(
        convertRawThreadInfoToClientDBThreadInfo(rawThreadInfo),
      ),
    ).toStrictEqual(rawThreadInfo);
  });
});

const rawThreadInfoWithAvatar: RawThreadInfo = {
  ...rawThreadInfo,
  avatar: { type: 'emoji', color: '4b87aa', emoji: '😀' },
};

describe('convertRawThreadInfoToClientDBThreadInfo', () => {
  it('should NOT convert rawThreadInfoWithAvatar to clientDBThreadInfo (without avatar)', () => {
    expect(
      convertRawThreadInfoToClientDBThreadInfo(rawThreadInfoWithAvatar),
    ).not.toStrictEqual(clientDBThreadInfo);
  });
});

describe('convertClientDBThreadInfoToRawThreadInfo', () => {
  it('should successfuly recreate original rawThreadInfoWithAvatar', () => {
    expect(
      convertClientDBThreadInfoToRawThreadInfo(
        convertRawThreadInfoToClientDBThreadInfo(rawThreadInfoWithAvatar),
      ),
    ).toStrictEqual(rawThreadInfoWithAvatar);
  });
});
