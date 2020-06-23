// @flow

import type { ChatTopTabsNavigationProp } from './chat.react';

import * as React from 'react';
import { useSelector } from 'react-redux';

import { threadInBackgroundChatList } from 'lib/shared/thread-utils';
import { unreadBackgroundCount } from 'lib/selectors/thread-selectors';

import ChatThreadList from './chat-thread-list.react';

type BackgroundChatThreadListProps = {
  navigation: ChatTopTabsNavigationProp<'BackgroundChatThreadList'>,
  ...
};
export default function BackgroundChatThreadList(
  props: BackgroundChatThreadListProps,
) {
  const unreadBackgroundThreadsCount = useSelector(state =>
    unreadBackgroundCount(state),
  );

  const prevUnreadNumber = React.useRef(0);
  const unreadBackgroundThreadsNumber = React.useMemo(() => {
    return unreadBackgroundThreadsCount;
  }, [unreadBackgroundThreadsCount]);

  React.useEffect(() => {
    if (unreadBackgroundThreadsNumber === prevUnreadNumber.current) {
      return;
    }
    prevUnreadNumber.current = unreadBackgroundThreadsNumber;
    let title = 'Background';
    if (unreadBackgroundThreadsNumber !== 0)
      title += ` (${unreadBackgroundThreadsNumber})`;
    props.navigation.setOptions({ title });
  }, [props.navigation, unreadBackgroundThreadsNumber]);

  return (
    <ChatThreadList
      navigation={props.navigation}
      filterThreads={threadInBackgroundChatList}
    />
  );
}
