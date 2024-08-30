// @flow

import type { ClientDBThreadInfo } from 'lib/types/thread-types.js';

import {
  clientDBThreadInfoToWebThread,
  webThreadToClientDBThreadInfo,
} from './entities.js';

const clientDBThreadInfo: ClientDBThreadInfo = {
  id: '84015',
  type: 6,
  name: 'atul_web',
  description: 'Hello world!',
  color: '4b87aa',
  creationTime: '1679595843051',
  parentThreadID: '1',
  members:
    '[{"id":"256","role":null,"permissions":{"know_of":{"value":true,"source":"1"},"visible":{"value":true,"source":"1"},"voiced":{"value":true,"source":"1"},"edit_entries":{"value":true,"source":"1"},"edit_thread":{"value":true,"source":"1"},"edit_thread_description":{"value":true,"source":"1"},"edit_thread_color":{"value":true,"source":"1"},"delete_thread":{"value":true,"source":"1"},"create_subthreads":{"value":true,"source":"1"},"create_sidebars":{"value":true,"source":"1"},"join_thread":{"value":true,"source":"1"},"edit_permissions":{"value":true,"source":"1"},"add_members":{"value":true,"source":"1"},"remove_members":{"value":true,"source":"1"},"change_role":{"value":true,"source":"1"},"leave_thread":{"value":false,"source":null},"react_to_message":{"value":false,"source":null},"edit_message":{"value":false,"source":null}},"isSender":false},{"id":"83809","role":"84016","permissions":{"know_of":{"value":true,"source":"84015"},"visible":{"value":true,"source":"84015"},"voiced":{"value":true,"source":"84015"},"edit_entries":{"value":true,"source":"84015"},"edit_thread":{"value":true,"source":"84015"},"edit_thread_description":{"value":true,"source":"84015"},"edit_thread_color":{"value":true,"source":"84015"},"delete_thread":{"value":false,"source":null},"create_subthreads":{"value":false,"source":null},"create_sidebars":{"value":true,"source":"84015"},"join_thread":{"value":false,"source":null},"edit_permissions":{"value":false,"source":null},"add_members":{"value":false,"source":null},"remove_members":{"value":false,"source":null},"change_role":{"value":false,"source":null},"leave_thread":{"value":false,"source":null},"react_to_message":{"value":true,"source":"84015"},"edit_message":{"value":true,"source":"84015"}},"isSender":true},{"id":"83969","role":"84016","permissions":{"know_of":{"value":true,"source":"84015"},"visible":{"value":true,"source":"84015"},"voiced":{"value":true,"source":"84015"},"edit_entries":{"value":true,"source":"84015"},"edit_thread":{"value":true,"source":"84015"},"edit_thread_description":{"value":true,"source":"84015"},"edit_thread_color":{"value":true,"source":"84015"},"delete_thread":{"value":false,"source":null},"create_subthreads":{"value":false,"source":null},"create_sidebars":{"value":true,"source":"84015"},"join_thread":{"value":false,"source":null},"edit_permissions":{"value":false,"source":null},"add_members":{"value":false,"source":null},"remove_members":{"value":false,"source":null},"change_role":{"value":false,"source":null},"leave_thread":{"value":false,"source":null},"react_to_message":{"value":true,"source":"84015"},"edit_message":{"value":true,"source":"84015"}},"isSender":true}]',
  roles:
    '{"84016":{"id":"84016","name":"Members","permissions":{"know_of":true,"visible":true,"voiced":true,"react_to_message":true,"edit_message":true,"edit_entries":true,"edit_thread":true,"edit_thread_color":true,"edit_thread_description":true,"create_sidebars":true,"descendant_open_know_of":true,"descendant_open_visible":true,"child_open_join_thread":true},"isDefault":true}}',
  currentUser:
    '{"role":"84016","permissions":{"know_of":{"value":true,"source":"84015"},"visible":{"value":true,"source":"84015"},"voiced":{"value":true,"source":"84015"},"edit_entries":{"value":true,"source":"84015"},"edit_thread":{"value":true,"source":"84015"},"edit_thread_description":{"value":true,"source":"84015"},"edit_thread_color":{"value":true,"source":"84015"},"delete_thread":{"value":false,"source":null},"create_subthreads":{"value":false,"source":null},"create_sidebars":{"value":true,"source":"84015"},"join_thread":{"value":false,"source":null},"edit_permissions":{"value":false,"source":null},"add_members":{"value":false,"source":null},"remove_members":{"value":false,"source":null},"change_role":{"value":false,"source":null},"leave_thread":{"value":false,"source":null},"react_to_message":{"value":true,"source":"84015"},"edit_message":{"value":true,"source":"84015"}},"subscription":{"home":true,"pushNotifs":true},"unread":false}',
  repliesCount: 0,
  containingThreadID: '1',
  community: '1',
  avatar: null,
  pinnedCount: 0,
  timestamps: null,
};

const clientDBThreadInfoWithAvatar: ClientDBThreadInfo = {
  ...clientDBThreadInfo,
  avatar: '{"type":"emoji","color":"4b87aa","emoji":"😀"}',
};

const clientDBThreadInfoWithSourceMessageID: ClientDBThreadInfo = {
  ...clientDBThreadInfo,
  sourceMessageID: '123',
};

describe('ClientDBThreadInfo <> WebClientDBThreadInfo', () => {
  it('should successfully convert clientDBThreadInfo', () => {
    const webThread = clientDBThreadInfoToWebThread(clientDBThreadInfo);
    expect(clientDBThreadInfo).toStrictEqual(
      webThreadToClientDBThreadInfo(webThread),
    );
  });
  it('should successfully convert clientDBThreadInfo with nullable field (field: ?type)', () => {
    const webThread = clientDBThreadInfoToWebThread(
      clientDBThreadInfoWithAvatar,
    );
    expect(clientDBThreadInfoWithAvatar).toStrictEqual(
      webThreadToClientDBThreadInfo(webThread),
    );
  });
  it('should successfully convert clientDBThreadInfo with not existing field (field?: type)', () => {
    const webThread = clientDBThreadInfoToWebThread(
      clientDBThreadInfoWithSourceMessageID,
    );
    expect(clientDBThreadInfoWithSourceMessageID).toStrictEqual(
      webThreadToClientDBThreadInfo(webThread),
    );
  });
});
