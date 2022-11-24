// @flow

import * as React from 'react';
import { View, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import Animated from 'react-native-reanimated';

import { colorIsDark } from 'lib/shared/thread-utils';

import GestureTouchableOpacity from '../components/gesture-touchable-opacity.react';
import Markdown from '../markdown/markdown.react';
import { useSelector } from '../redux/redux-utils';
import { useColors, colors } from '../themes/colors';
import type { ChatTextMessageInfoItemWithHeight } from '../types/chat-types';
import { useComposedMessageMaxWidth } from './composed-message-width';
import { useTextMessageMarkdownRules } from './message-list-types';
import {
  allCorners,
  filterCorners,
  getRoundedContainerStyle,
} from './rounded-corners';

/* eslint-disable import/no-named-as-default-member */
const { Node } = Animated;
/* eslint-enable import/no-named-as-default-member */

function dummyNodeForTextMessageHeightMeasurement(
  text: string,
): React.Element<typeof DummyTextNode> {
  return <DummyTextNode>{text}</DummyTextNode>;
}

type DummyTextNodeProps = {
  ...React.ElementConfig<typeof View>,
  +children: string,
};
function DummyTextNode(props: DummyTextNodeProps): React.Node {
  const { children, style, ...rest } = props;
  const maxWidth = useComposedMessageMaxWidth();
  const viewStyle = [props.style, styles.dummyMessage, { maxWidth }];
  const rules = useTextMessageMarkdownRules(false);
  return (
    <View {...rest} style={viewStyle}>
      <Markdown style={styles.text} rules={rules}>
        {children}
      </Markdown>
    </View>
  );
}

type Props = {
  +item: ChatTextMessageInfoItemWithHeight,
  +onPress: () => void,
  +messageRef?: (message: ?React.ElementRef<typeof View>) => void,
  +threadColorOverride?: ?Node,
  +isThreadColorDarkOverride?: ?boolean,
};
function InnerTextMessage(props: Props): React.Node {
  const { item } = props;
  const { text, creator } = item.messageInfo;
  const { isViewer } = creator;

  const activeTheme = useSelector(state => state.globalThemeInfo.activeTheme);
  const boundColors = useColors();

  const messageStyle = {};
  let darkColor;
  if (isViewer) {
    const threadColor = item.threadInfo.color;
    messageStyle.backgroundColor =
      props.threadColorOverride ?? `#${threadColor}`;
    darkColor = props.isThreadColorDarkOverride ?? colorIsDark(threadColor);
  } else {
    messageStyle.backgroundColor = boundColors.listChatBubble;
    darkColor = activeTheme === 'dark';
  }

  const cornerStyle = getRoundedContainerStyle(filterCorners(allCorners, item));

  if (!__DEV__) {
    // We don't force view height in dev mode because we
    // want to measure it in Message to see if it's correct
    messageStyle.height = item.contentHeight;
  }

  const rules = useTextMessageMarkdownRules(darkColor);

  const markdownStyles = React.useMemo(() => {
    const textStyle = {
      color: darkColor
        ? colors.dark.listForegroundLabel
        : colors.light.listForegroundLabel,
    };

    return [styles.text, textStyle];
  }, [darkColor]);

  const message = (
    <TouchableWithoutFeedback>
      <View>
        <GestureTouchableOpacity
          onPress={props.onPress}
          onLongPress={props.onPress}
          activeOpacity={0.6}
          style={[styles.message, cornerStyle]}
          animatedStyle={messageStyle}
        >
          <Markdown style={markdownStyles} rules={rules}>
            {text}
          </Markdown>
        </GestureTouchableOpacity>
      </View>
    </TouchableWithoutFeedback>
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
