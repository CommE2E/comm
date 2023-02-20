// @flow

import invariant from 'invariant';
import * as React from 'react';
import { Text, TouchableWithoutFeedback, View } from 'react-native';

import { threadInfoSelector } from 'lib/selectors/thread-selectors.js';
import {
  entityTextToReact,
  entityTextToRawString,
  useENSNamesForEntityText,
  type EntityText,
} from 'lib/utils/entity-text.js';

import { useNavigateToThread } from './message-list-types.js';
import Markdown from '../markdown/markdown.react.js';
import { inlineMarkdownRules } from '../markdown/rules.react.js';
import { useSelector } from '../redux/redux-utils.js';
import { useOverlayStyles } from '../themes/colors.js';
import type { ChatRobotextMessageInfoItemWithHeight } from '../types/chat-types.js';

function dummyNodeForRobotextMessageHeightMeasurement(
  robotext: EntityText,
  threadID: string,
): React.Element<typeof View> {
  return (
    <View style={unboundStyles.robotextContainer}>
      <Text style={unboundStyles.dummyRobotext}>
        {entityTextToRawString(robotext, { threadID })}
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
  const robotextWithENSNames = useENSNamesForEntityText(robotext);
  invariant(
    robotextWithENSNames,
    'useENSNamesForEntityText only returns falsey when passed falsey',
  );
  const textParts = React.useMemo(() => {
    const darkColor = activeTheme === 'dark';
    return entityTextToReact(robotextWithENSNames, threadID, {
      // eslint-disable-next-line react/display-name
      renderText: ({ text }) => (
        <Markdown
          style={styles.robotext}
          rules={inlineMarkdownRules(darkColor)}
        >
          {text}
        </Markdown>
      ),
      // eslint-disable-next-line react/display-name
      renderThread: ({ id, name }) => <ThreadEntity id={id} name={name} />,
      // eslint-disable-next-line react/display-name
      renderColor: ({ hex }) => <ColorEntity color={hex} />,
    });
  }, [robotextWithENSNames, activeTheme, threadID, styles.robotext]);

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

const MemoizedInnerRobotextMessage: React.ComponentType<InnerRobotextMessageProps> =
  React.memo<InnerRobotextMessageProps>(InnerRobotextMessage);

export {
  dummyNodeForRobotextMessageHeightMeasurement,
  MemoizedInnerRobotextMessage as InnerRobotextMessage,
};
