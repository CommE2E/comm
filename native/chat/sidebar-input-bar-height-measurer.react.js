// @flow

import * as React from 'react';
import { View, StyleSheet } from 'react-native';

import { useLoggedInUserInfo } from 'lib/hooks/account-hooks.js';

import { DummyChatInputBar } from './chat-input-bar.react.js';
import { useMessageListScreenWidth } from './composed-message-width.js';
import { getUnresolvedSidebarThreadInfo } from './sidebar-navigation.js';
import type { ChatMessageInfoItemWithHeight } from '../types/chat-types.js';

type Props = {
  +sourceMessage: ChatMessageInfoItemWithHeight,
  +onInputBarMeasured: (height: number) => mixed,
};

function SidebarInputBarHeightMeasurer(props: Props): React.Node {
  const { sourceMessage, onInputBarMeasured } = props;

  const width = useMessageListScreenWidth();

  const loggedInUserInfo = useLoggedInUserInfo();
  const sidebarThreadInfo = React.useMemo(
    () => getUnresolvedSidebarThreadInfo({ sourceMessage, loggedInUserInfo }),
    [sourceMessage, loggedInUserInfo],
  );
  if (!sidebarThreadInfo) {
    return null;
  }

  return (
    <View style={[styles.dummy, { width }]}>
      <DummyChatInputBar
        threadInfo={sidebarThreadInfo}
        onHeightMeasured={onInputBarMeasured}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  dummy: {
    opacity: 0,
    position: 'absolute',
  },
});

export default SidebarInputBarHeightMeasurer;
