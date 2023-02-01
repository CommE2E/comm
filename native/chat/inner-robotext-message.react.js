// @flow

import invariant from 'invariant';
import * as React from 'react';
import { Text, TouchableWithoutFeedback, View } from 'react-native';

import { threadInfoSelector } from 'lib/selectors/thread-selectors';
import {
  splitRobotext,
  parseRobotextEntity,
  robotextToRawString,
} from 'lib/shared/message-utils';

import Markdown from '../markdown/markdown.react';
import { inlineMarkdownRules } from '../markdown/rules.react';
import { useSelector } from '../redux/redux-utils';
import { useOverlayStyles } from '../themes/colors';
import type { ChatRobotextMessageInfoItemWithHeight } from '../types/chat-types';
import { useNavigateToThread } from './message-list-types';

function dummyNodeForRobotextMessageHeightMeasurement(
  robotext: string,
): React.Element<typeof View> {
  return (
    <View style={unboundStyles.robotextContainer}>
      <Text style={unboundStyles.dummyRobotext}>
        {robotextToRawString(robotext)}
      </Text>
    </View>
  );
}

type InnerRobotextMessageProps = {
  +item: ChatRobotextMessageInfoItemWithHeight,
  +onPress: () => void,
  +onLongPress?: () => void,
};
function InnerRobotextMessage(props: InnerRobotextMessageProps): React.Node {
  const { item, onLongPress, onPress } = props;
  const activeTheme = useSelector(state => state.globalThemeInfo.activeTheme);
  const styles = useOverlayStyles(unboundStyles);

  const { messageInfo, robotext } = item;
  const { threadID } = messageInfo;
  const textParts = React.useMemo(() => {
    const robotextParts = splitRobotext(robotext);
    const result = [];
    let keyIndex = 0;

    for (const splitPart of robotextParts) {
      if (splitPart === '') {
        continue;
      }
      if (splitPart.charAt(0) !== '<') {
        const darkColor = activeTheme === 'dark';
        const key = `text${keyIndex++}`;
        result.push(
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

      if (entityType === 't' && id !== threadID) {
        result.push(<ThreadEntity key={id} id={id} name={rawText} />);
      } else if (entityType === 'c') {
        result.push(<ColorEntity key={id} color={rawText} />);
      } else {
        result.push(rawText);
      }
    }

    return result;
  }, [robotext, activeTheme, threadID, styles.robotext]);

  const viewStyle = [styles.robotextContainer];
  if (!__DEV__) {
    // We don't force view height in dev mode because we
    // want to measure it in Message to see if it's correct
    viewStyle.push({ height: item.contentHeight });
  }

  return (
    <TouchableWithoutFeedback onPress={onPress} onLongPress={onLongPress}>
      <View style={viewStyle}>
        <Text style={styles.robotext}>{textParts}</Text>
      </View>
    </TouchableWithoutFeedback>
  );
}

type ThreadEntityProps = {
  +id: string,
  +name: string,
};
function ThreadEntity(props: ThreadEntityProps) {
  const threadID = props.id;
  const threadInfo = useSelector(state => threadInfoSelector(state)[threadID]);

  const styles = useOverlayStyles(unboundStyles);

  const navigateToThread = useNavigateToThread();
  const onPressThread = React.useCallback(() => {
    invariant(threadInfo, 'onPressThread should have threadInfo');
    navigateToThread({ threadInfo });
  }, [threadInfo, navigateToThread]);

  if (!threadInfo) {
    return <Text>{props.name}</Text>;
  }
  return (
    <Text style={styles.link} onPress={onPressThread}>
      {props.name}
    </Text>
  );
}

function ColorEntity(props: { +color: string }) {
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

const MemoizedInnerRobotextMessage: React.ComponentType<InnerRobotextMessageProps> = React.memo<InnerRobotextMessageProps>(
  InnerRobotextMessage,
);

export {
  dummyNodeForRobotextMessageHeightMeasurement,
  MemoizedInnerRobotextMessage as InnerRobotextMessage,
};
