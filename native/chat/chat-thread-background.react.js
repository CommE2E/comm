// @flow

import type { ChatTopTabsNavigationProp } from './chat.react';

import * as React from 'react';
import { useSelector } from 'react-redux';
import { StyleSheet, Text } from 'react-native';

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
  const unreadBackgroundThreadsNumber = useSelector(state =>
    unreadBackgroundCount(state),
  );
  const activeTheme = useSelector(state => state.globalThemeInfo.activeTheme);

  const prevUnreadNumber = React.useRef(0);
  React.useEffect(() => {
    if (unreadBackgroundThreadsNumber === prevUnreadNumber.current) {
      return;
    }
    prevUnreadNumber.current = unreadBackgroundThreadsNumber;
    let title = 'Background';
    if (unreadBackgroundThreadsNumber !== 0) {
      title += ` (${unreadBackgroundThreadsNumber})`;
    }
    props.navigation.setOptions({ title });
  }, [props.navigation, unreadBackgroundThreadsNumber]);

  const textStyle =
    activeTheme === 'dark' ? styles.textStyleDark : styles.textStyleLight;

  const emptyItem: React.Node = (
    <Text style={[styles.emptyList, textStyle]}>
      {' '}
      Background threads are just like normal threads, except they appear in
      this tab instead of Home, and they don&apos;t contribute to your unread
      count. {'\n'}
      To move a thread over here, switch the Background option in its settings.
    </Text>
  );

  return (
    <ChatThreadList
      navigation={props.navigation}
      filterThreads={threadInBackgroundChatList}
      emptyItem={emptyItem}
    />
  );
}

const styles = StyleSheet.create({
  emptyList: {
    fontSize: 18,
    margin: 10,
    textAlign: 'center',
  },
  textStyleDark: {
    color: 'white',
  },
  textStyleLight: {
    color: 'black',
  },
});
