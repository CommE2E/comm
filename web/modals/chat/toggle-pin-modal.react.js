// @flow

import * as React from 'react';

import type { ChatMessageInfoItem } from 'lib/selectors/chat-selectors.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';

type TogglePinModalProps = {
  +item: ChatMessageInfoItem,
  +threadInfo: ThreadInfo,
};

// eslint-disable-next-line no-unused-vars
function TogglePinModal(props: TogglePinModalProps): React.Node {
  return <></>;
}

export default TogglePinModal;
