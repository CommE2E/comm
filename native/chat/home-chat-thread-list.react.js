// @flow

import * as React from 'react';

import { threadInHomeChatList } from 'lib/shared/thread-utils.js';

import type { NavigationRoute } from '../navigation/route-names.js';
import ChatThreadList from './chat-thread-list.react.js';
import type { ChatTopTabsNavigationProp } from './chat.react.js';

type HomeChatThreadListProps = {
  navigation: ChatTopTabsNavigationProp<'HomeChatThreadList'>,
  route: NavigationRoute<'HomeChatThreadList'>,
};
export default function HomeChatThreadList(
  props: HomeChatThreadListProps,
): React.Node {
  return (
    <ChatThreadList
      navigation={props.navigation}
      route={props.route}
      filterThreads={threadInHomeChatList}
    />
  );
}
