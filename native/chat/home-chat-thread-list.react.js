// @flow

import * as React from 'react';

import { threadInHomeChatList } from 'lib/shared/thread-utils';

import type { NavigationRoute } from '../navigation/route-names';
import ChatThreadList from './chat-thread-list.react';
import type { ChatTopTabsNavigationProp } from './chat.react';

type HomeChatThreadListProps = {|
  navigation: ChatTopTabsNavigationProp<'HomeChatThreadList'>,
  route: NavigationRoute<'HomeChatThreadList'>,
|};
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
