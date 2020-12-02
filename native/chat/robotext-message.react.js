// @flow

import invariant from 'invariant';
import { threadInfoSelector } from 'lib/selectors/thread-selectors';
import {
  messageKey,
  splitRobotext,
  parseRobotextEntity,
  robotextToRawString,
} from 'lib/shared/message-utils';
import type { RobotextMessageInfo } from 'lib/types/message-types';
import type { ThreadInfo } from 'lib/types/thread-types';
import * as React from 'react';
import { Text, TouchableWithoutFeedback, View } from 'react-native';

import { KeyboardContext } from '../keyboard/keyboard-state';
import Markdown from '../markdown/markdown.react';
import { inlineMarkdownRules } from '../markdown/rules.react';
import { MessageListRouteName } from '../navigation/route-names';
import { useSelector } from '../redux/redux-utils';
import { useStyles } from '../themes/colors';

import type { ChatNavigationProp } from './chat.react';
import { Timestamp } from './timestamp.react';

export type ChatRobotextMessageInfoItemWithHeight = {|
  itemType: 'message',
  messageShapeType: 'robotext',
  messageInfo: RobotextMessageInfo,
  threadInfo: ThreadInfo,
  startsConversation: boolean,
  startsCluster: boolean,
  endsCluster: boolean,
  robotext: string,
  contentHeight: number,
|};

function robotextMessageItemHeight(
  item: ChatRobotextMessageInfoItemWithHeight,
) {
  return item.contentHeight;
}

function dummyNodeForRobotextMessageHeightMeasurement(robotext: string) {
  return (
    <View style={unboundStyles.robotextContainer}>
      <Text style={unboundStyles.dummyRobotext}>
        {robotextToRawString(robotext)}
      </Text>
    </View>
  );
}

type Props = {|
  ...React.ElementConfig<typeof View>,
  +item: ChatRobotextMessageInfoItemWithHeight,
  +navigation: ChatNavigationProp<'MessageList'>,
  +focused: boolean,
  +toggleFocus: (messageKey: string) => void,
|};
function RobotextMessage(props: Props) {
  const { item, navigation, focused, toggleFocus, ...viewProps } = props;

  const activeTheme = useSelector((state) => state.globalThemeInfo.activeTheme);
  const styles = useStyles(unboundStyles);

  let timestamp = null;
  if (focused || item.startsConversation) {
    timestamp = (
      <Timestamp time={item.messageInfo.time} display="lowContrast" />
    );
  }

  const robotext = item.robotext;
  const robotextParts = splitRobotext(robotext);
  const textParts = [];
  let keyIndex = 0;
  for (let splitPart of robotextParts) {
    if (splitPart === '') {
      continue;
    }
    if (splitPart.charAt(0) !== '<') {
      const darkColor = activeTheme === 'dark';
      const key = `text${keyIndex++}`;
      textParts.push(
        <Markdown
          style={styles.robotext}
          key={key}
          rules={inlineMarkdownRules(darkColor)}
        >
          {decodeURI(splitPart)}
        </Markdown>,
      );
      continue;
    }

    const { rawText, entityType, id } = parseRobotextEntity(splitPart);

    if (entityType === 't' && id !== item.messageInfo.threadID) {
      textParts.push(
        <ThreadEntity
          key={id}
          id={id}
          name={rawText}
          navigation={navigation}
        />,
      );
    } else if (entityType === 'c') {
      textParts.push(<ColorEntity key={id} color={rawText} />);
    } else {
      textParts.push(rawText);
    }
  }

  const viewStyle = [styles.robotextContainer];
  if (!__DEV__) {
    // We don't force view height in dev mode because we
    // want to measure it in Message to see if it's correct
    viewStyle.push({ height: item.contentHeight });
  }

  const keyboardState = React.useContext(KeyboardContext);
  const key = messageKey(item.messageInfo);
  const onPress = React.useCallback(() => {
    const didDismiss =
      keyboardState && keyboardState.dismissKeyboardIfShowing();
    if (!didDismiss) {
      toggleFocus(key);
    }
  }, [keyboardState, toggleFocus, key]);

  return (
    <View {...viewProps}>
      {timestamp}
      <TouchableWithoutFeedback onPress={onPress}>
        <View style={viewStyle}>
          <Text style={styles.robotext}>{textParts}</Text>
        </View>
      </TouchableWithoutFeedback>
    </View>
  );
}

type ThreadEntityProps = {|
  +id: string,
  +name: string,
  +navigation: ChatNavigationProp<'MessageList'>,
|};
function ThreadEntity(props: ThreadEntityProps) {
  const threadID = props.id;
  const threadInfo = useSelector(
    (state) => threadInfoSelector(state)[threadID],
  );

  const styles = useStyles(unboundStyles);

  const { navigate } = props.navigation;
  const onPressThread = React.useCallback(() => {
    invariant(threadInfo, 'onPressThread should have threadInfo');
    navigate({
      name: MessageListRouteName,
      params: { threadInfo },
      key: `${MessageListRouteName}${threadInfo.id}`,
    });
  }, [threadInfo, navigate]);

  if (!threadInfo) {
    return <Text>{props.name}</Text>;
  }
  return (
    <Text style={styles.link} onPress={onPressThread}>
      {props.name}
    </Text>
  );
}

function ColorEntity(props: {| +color: string |}) {
  const colorStyle = { color: props.color };
  return <Text style={colorStyle}>{props.color}</Text>;
}

const unboundStyles = {
  link: {
    color: 'link',
  },
  robotextContainer: {
    paddingTop: 6,
    paddingBottom: 11,
    paddingHorizontal: 24,
  },
  robotext: {
    color: 'listForegroundSecondaryLabel',
    fontFamily: 'Arial',
    fontSize: 15,
    textAlign: 'center',
  },
  dummyRobotext: {
    fontFamily: 'Arial',
    fontSize: 15,
    textAlign: 'center',
  },
};

export {
  robotextMessageItemHeight,
  dummyNodeForRobotextMessageHeightMeasurement,
  RobotextMessage,
};
