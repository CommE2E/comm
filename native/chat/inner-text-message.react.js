// @flow

import * as React from 'react';
import { View, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import Animated from 'react-native-reanimated';

import { colorIsDark } from 'lib/shared/thread-utils.js';

import { avatarOffset } from './chat-constants.js';
import { useComposedMessageMaxWidth } from './composed-message-width.js';
import { useTextMessageMarkdownRules } from './message-list-types.js';
import {
  allCorners,
  filterCorners,
  getRoundedContainerStyle,
} from './rounded-corners.js';
import {
  TextMessageMarkdownContext,
  useTextMessageMarkdown,
} from './text-message-markdown-context.js';
import GestureTouchableOpacity from '../components/gesture-touchable-opacity.react.js';
import Markdown from '../markdown/markdown.react.js';
import { useSelector } from '../redux/redux-utils.js';
import { useColors, colors } from '../themes/colors.js';
import type { ChatTextMessageInfoItemWithHeight } from '../types/chat-types.js';

/* eslint-disable import/no-named-as-default-member */
const { Node } = Animated;
/* eslint-enable import/no-named-as-default-member */

function dummyNodeForTextMessageHeightMeasurement(
  text: string,
  isViewer: boolean,
): React.Element<typeof DummyTextNode> {
  return <DummyTextNode isViewer={isViewer}>{text}</DummyTextNode>;
}

type DummyTextNodeProps = {
  ...React.ElementConfig<typeof View>,
  +children: string,
  +isViewer: boolean,
};
function DummyTextNode(props: DummyTextNodeProps): React.Node {
  const { children, isViewer, style, ...rest } = props;

  let maxWidth = useComposedMessageMaxWidth();
  if (!isViewer) {
    maxWidth = maxWidth - avatarOffset;
  }

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
  const textMessageMarkdown = useTextMessageMarkdown(item.messageInfo);

  const markdownStyles = React.useMemo(() => {
    const textStyle = {
      color: darkColor
        ? colors.dark.listForegroundLabel
        : colors.light.listForegroundLabel,
    };

    return [styles.text, textStyle];
  }, [darkColor]);

  let maxWidth = useComposedMessageMaxWidth();
  if (!isViewer) {
    maxWidth = maxWidth - avatarOffset;
  }
  const maxWidthStyle = React.useMemo(() => ({ maxWidth }), [maxWidth]);

  // If we need to render a Text with an onPress prop inside, we're going to
  // have an issue: the GestureTouchableOpacity below will trigger too when the
  // the onPress is pressed. We have to use a GestureTouchableOpacity in order
  // for the message touch gesture to play nice with the message swipe gesture,
  // so we need to find a way to disable the GestureTouchableOpacity.
  //
  // Our solution is to keep using the GestureTouchableOpacity for the padding
  // around the text, and to have the Texts inside ALL implement an onPress prop
  // that will default to the message touch gesture. Luckily, Text with onPress
  // plays nice with the message swipe gesture.
  let secondMessage;
  if (textMessageMarkdown.markdownHasPressable) {
    secondMessage = (
      <View
        style={[StyleSheet.absoluteFill, styles.message]}
        pointerEvents="box-none"
      >
        <Markdown style={markdownStyles} rules={rules}>
          {text}
        </Markdown>
      </View>
    );
  }

  const message = (
    <TextMessageMarkdownContext.Provider value={textMessageMarkdown}>
      <TouchableWithoutFeedback>
        <View>
          <GestureTouchableOpacity
            onPress={props.onPress}
            onLongPress={props.onPress}
            activeOpacity={0.6}
            style={[styles.message, cornerStyle, maxWidthStyle]}
            animatedStyle={messageStyle}
          >
            <Markdown style={markdownStyles} rules={rules}>
              {text}
            </Markdown>
          </GestureTouchableOpacity>
          {secondMessage}
        </View>
      </TouchableWithoutFeedback>
    </TextMessageMarkdownContext.Provider>
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
