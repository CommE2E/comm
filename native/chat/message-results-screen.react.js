// @flow

import * as React from 'react';

import type { ThreadInfo } from 'lib/types/thread-types.js';

import type { ChatNavigationProp } from './chat.react';
import type { NavigationRoute } from '../navigation/route-names';

export type MessageResultsScreenParams = {
  +threadInfo: ThreadInfo,
};

type MessageResultsScreenProps = {
  +navigation: ChatNavigationProp<'MessageResultsScreen'>,
  +route: NavigationRoute<'MessageResultsScreen'>,
};

// eslint-disable-next-line no-unused-vars
function MessageResultsScreen(props: MessageResultsScreenProps): React.Node {
  return null;
}

export default MessageResultsScreen;
