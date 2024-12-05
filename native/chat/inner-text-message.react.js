// @flow

import * as React from 'react';
import { StyleSheet, TouchableWithoutFeedback, View } from 'react-native';
import { type SharedValue, useAnimatedStyle } from 'react-native-reanimated';

import type { ReactionInfo } from 'lib/selectors/chat-selectors.js';
import { colorIsDark } from 'lib/shared/color-utils.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';

import { useComposedMessageMaxWidth } from './composed-message-width.js';
import { DummyInlineEngagementNode } from './inline-engagement.react.js';
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
import { colors, useColors } from '../themes/colors.js';
import type { ChatTextMessageInfoItemWithHeight } from '../types/chat-types.js';

function dummyNodeForTextMessageHeightMeasurement(
  text: string,
  editedLabel?: ?string,
  sidebarInfo: ?ThreadInfo,
  reactions: ReactionInfo,
): React.Element<typeof View> {
  return (
    <View>
      <DummyTextNode>{text}</DummyTextNode>
      <DummyInlineEngagementNode
        editedLabel={editedLabel}
        sidebarInfo={sidebarInfo}
        reactions={reactions}
      />
    </View>
  );
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
  +threadColorOverride?: SharedValue<string | null>,
  +isThreadColorDarkOverride?: ?boolean,
};
function InnerTextMessage(props: Props): React.Node {
  const { item } = props;
  const { text, creator } = item.messageInfo;
  const { isViewer } = creator;

  const activeTheme = useSelector(state => state.globalThemeInfo.activeTheme);
  const boundColors = useColors();

  const darkColor = !isViewer
    ? activeTheme === 'dark'
    : props.isThreadColorDarkOverride ?? colorIsDark(item.threadInfo.color);

  const messageStyle = useAnimatedStyle(
    () => ({
      backgroundColor: !isViewer
        ? boundColors.listChatBubble
        : props.threadColorOverride?.value ?? `#${item.threadInfo.color}`,
    }),
    [boundColors.listChatBubble, isViewer, item.threadInfo.color],
  );

  const cornerStyle = React.useMemo(
    () => getRoundedContainerStyle(filterCorners(allCorners, item)),
    [item],
  );

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
  const secondMessageStyle = React.useMemo(
    () => [StyleSheet.absoluteFill, styles.message],
    [],
  );
  const secondMessage = React.useMemo(() => {
    if (!textMessageMarkdown.markdownHasPressable) {
      return undefined;
    }
    return (
      <View style={secondMessageStyle} pointerEvents="box-none">
        <Markdown style={markdownStyles} rules={rules}>
          {text}
        </Markdown>
      </View>
    );
  }, [
    markdownStyles,
    rules,
    secondMessageStyle,
    text,
    textMessageMarkdown.markdownHasPressable,
  ]);

  const gestureTouchableOpacityStyle = React.useMemo(
    () => [styles.message, cornerStyle],
    [cornerStyle],
  );
  const message = React.useMemo(
    () => (
      <TextMessageMarkdownContext.Provider value={textMessageMarkdown}>
        <TouchableWithoutFeedback>
          <View>
            <GestureTouchableOpacity
              onPress={props.onPress}
              onLongPress={props.onPress}
              activeOpacity={0.6}
              style={gestureTouchableOpacityStyle}
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
    ),
    [
      gestureTouchableOpacityStyle,
      markdownStyles,
      messageStyle,
      props.onPress,
      rules,
      secondMessage,
      text,
      textMessageMarkdown,
    ],
  );

  // We need to set onLayout in order to allow .measure() to be on the ref
  const onLayout = React.useCallback(() => {}, []);
  const { messageRef } = props;

  const innerTextMessage = React.useMemo(() => {
    if (!messageRef) {
      return message;
    }
    return (
      <View onLayout={onLayout} ref={messageRef}>
        {message}
      </View>
    );
  }, [message, messageRef, onLayout]);

  return innerTextMessage;
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
