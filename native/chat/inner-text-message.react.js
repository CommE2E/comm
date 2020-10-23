// @flow

import type { ChatTextMessageInfoItemWithHeight } from './text-message.react';
import type { RelativeMemberInfo } from 'lib/types/thread-types';

import * as React from 'react';
import { View, StyleSheet } from 'react-native';

import { colorIsDark } from 'lib/shared/thread-utils';
import { relativeMemberInfoSelectorForMembersOfThread } from 'lib/selectors/user-selectors';

import {
  allCorners,
  filterCorners,
  getRoundedContainerStyle,
} from './rounded-corners';
import { useColors, colors } from '../themes/colors';
import Markdown from '../markdown/markdown.react';
import { textMessageRules } from '../markdown/rules.react';
import { composedMessageMaxWidthSelector } from './composed-message-width';
import GestureTouchableOpacity from '../components/gesture-touchable-opacity.react';
import { useSelector } from '../redux/redux-utils';

function dummyNodeForTextMessageHeightMeasurement(
  text: string,
  members: $ReadOnlyArray<RelativeMemberInfo>,
) {
  return <DummyTextNode members={members}>{text}</DummyTextNode>;
}

type DummyTextNodeProps = {|
  ...React.ElementConfig<typeof View>,
  +members: $ReadOnlyArray<RelativeMemberInfo>,
  +children: string,
|};
function DummyTextNode(props: DummyTextNodeProps) {
  const { members, children, style, ...rest } = props;
  const maxWidth = useSelector(state => composedMessageMaxWidthSelector(state));
  const viewStyle = [props.style, styles.dummyMessage, { maxWidth }];
  return (
    <View {...rest} style={viewStyle}>
      <Markdown style={styles.text} rules={textMessageRules(false, members)}>
        {children}
      </Markdown>
    </View>
  );
}

type Props = {|
  +item: ChatTextMessageInfoItemWithHeight,
  +onPress: () => void,
  +messageRef?: (message: ?React.ElementRef<typeof View>) => void,
|};
function InnerTextMessage(props: Props) {
  const { item } = props;
  const { text, creator } = item.messageInfo;
  const { isViewer } = creator;

  const activeTheme = useSelector(state => state.globalThemeInfo.activeTheme);
  const boundColors = useColors();

  let messageStyle = {},
    textStyle = { ...styles.text },
    darkColor;
  if (isViewer) {
    const threadColor = item.threadInfo.color;
    messageStyle.backgroundColor = `#${threadColor}`;
    darkColor = colorIsDark(threadColor);
  } else {
    messageStyle.backgroundColor = boundColors.listChatBubble;
    darkColor = activeTheme === 'dark';
  }
  textStyle.color = darkColor
    ? colors.dark.listForegroundLabel
    : colors.light.listForegroundLabel;

  const cornerStyle = getRoundedContainerStyle(filterCorners(allCorners, item));

  if (!__DEV__) {
    // We don't force view height in dev mode because we
    // want to measure it in Message to see if it's correct
    messageStyle.height = item.contentHeight;
  }

  const threadID = item.threadInfo.id;
  const threadMembers = useSelector(
    relativeMemberInfoSelectorForMembersOfThread(threadID),
  );

  const message = (
    <GestureTouchableOpacity
      onPress={props.onPress}
      onLongPress={props.onPress}
      activeOpacity={0.6}
      style={[styles.message, messageStyle, cornerStyle]}
    >
      <Markdown
        style={textStyle}
        rules={textMessageRules(darkColor, threadMembers)}
      >
        {text}
      </Markdown>
    </GestureTouchableOpacity>
  );

  // We need to set onLayout in order to allow .measure() to be on the ref
  const onLayout = React.useCallback(() => {}, []);

  const { messageRef } = props;
  if (!messageRef) {
    return message;
  }

  return (
    <View onLayout={onLayout} ref={messageRef}>
      {message}
    </View>
  );
}

const styles = StyleSheet.create({
  dummyMessage: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  message: {
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  text: {
    fontFamily: 'Arial',
    fontSize: 18,
  },
});

export { InnerTextMessage, dummyNodeForTextMessageHeightMeasurement };
