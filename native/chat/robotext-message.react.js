// @flow

import { type ThreadInfo, threadInfoPropType } from 'lib/types/thread-types';
import { chatMessageItemPropType } from 'lib/selectors/chat-selectors';
import type { AppState } from '../redux/redux-setup';
import type { RobotextMessageInfo } from 'lib/types/message-types';
import {
  type KeyboardState,
  keyboardStatePropType,
  withKeyboardState,
} from '../keyboard/keyboard-state';
import { messageListNavPropType } from './message-list-types';
import type { ChatNavigationProp } from './chat.react';
import { type GlobalTheme, globalThemePropType } from '../types/themes';
import type { LayoutEvent } from '../types/react-native';

import * as React from 'react';
import { Text, TouchableWithoutFeedback, View } from 'react-native';
import PropTypes from 'prop-types';
import invariant from 'invariant';

import {
  messageKey,
  splitRobotext,
  parseRobotextEntity,
  robotextToRawString,
} from 'lib/shared/message-utils';
import { threadInfoSelector } from 'lib/selectors/thread-selectors';
import { connect } from 'lib/utils/redux-utils';

import { MessageListRouteName } from '../navigation/route-names';
import { Timestamp } from './timestamp.react';
import { styleSelector } from '../themes/colors';
import Markdown from '../markdown/markdown.react';
import { inlineMarkdownRules } from '../markdown/rules.react';

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
    <View style={styles.robotextContainer}>
      <Text style={styles.dummyRobotext}>{robotextToRawString(robotext)}</Text>
    </View>
  );
}

type Props = {|
  item: ChatRobotextMessageInfoItemWithHeight,
  navigation: ChatNavigationProp<'MessageList'>,
  focused: boolean,
  toggleFocus: (messageKey: string) => void,
  // withKeyboardState
  keyboardState: ?KeyboardState,
  // Redux state
  styles: typeof styles,
  activeTheme: ?GlobalTheme,
  ...React.ElementProps<typeof View>,
|};
class RobotextMessage extends React.PureComponent<Props> {
  static propTypes = {
    item: chatMessageItemPropType.isRequired,
    navigation: messageListNavPropType.isRequired,
    focused: PropTypes.bool.isRequired,
    toggleFocus: PropTypes.func.isRequired,
    keyboardState: keyboardStatePropType,
    styles: PropTypes.objectOf(PropTypes.object).isRequired,
    activeTheme: globalThemePropType,
  };

  render() {
    const {
      item,
      navigation,
      focused,
      toggleFocus,
      keyboardState,
      styles,
      activeTheme,
      ...viewProps
    } = this.props;
    let timestamp = null;
    if (focused || item.startsConversation) {
      timestamp = (
        <Timestamp time={item.messageInfo.time} display="lowContrast" />
      );
    }
    return (
      <View {...viewProps}>
        {timestamp}
        <TouchableWithoutFeedback onPress={this.onPress}>
          {this.linkedRobotext()}
        </TouchableWithoutFeedback>
      </View>
    );
  }

  linkedRobotext() {
    const { item, navigation } = this.props;
    const robotext = item.robotext;
    const robotextParts = splitRobotext(robotext);
    const textParts = [];
    let keyIndex = 0;
    for (let splitPart of robotextParts) {
      if (splitPart === '') {
        continue;
      }
      if (splitPart.charAt(0) !== '<') {
        const darkColor = this.props.activeTheme === 'dark';
        const key = `text${keyIndex++}`;
        textParts.push(
          <Markdown
            style={this.props.styles.robotext}
            key={key}
            useDarkStyle={darkColor}
            rules={inlineMarkdownRules}
          >
            {decodeURI(splitPart)}
          </Markdown>,
        );
        continue;
      }

      const { rawText, entityType, id } = parseRobotextEntity(splitPart);

      if (entityType === 't' && id !== this.props.item.messageInfo.threadID) {
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

    const viewStyle = [this.props.styles.robotextContainer];
    let onLayout;
    if (__DEV__) {
      ({ onLayout } = this);
    } else {
      viewStyle.push({ height: item.contentHeight });
    }

    return (
      <View onLayout={onLayout} style={viewStyle}>
        <Text style={this.props.styles.robotext}>{textParts}</Text>
      </View>
    );
  }

  onPress = () => {
    const { keyboardState } = this.props;
    const didDismiss =
      keyboardState && keyboardState.dismissKeyboardIfShowing();
    if (!didDismiss) {
      this.props.toggleFocus(messageKey(this.props.item.messageInfo));
    }
  };

  onLayout = (event: LayoutEvent) => {
    const approxMeasuredHeight =
      Math.round(event.nativeEvent.layout.height * 1000) / 1000;
    const approxExpectedHeight =
      Math.round(this.props.item.contentHeight * 1000) / 1000;
    if (approxMeasuredHeight !== approxExpectedHeight) {
      console.log(
        `RobotextMessage height for ` +
          `${messageKey(this.props.item.messageInfo)} was expected to be ` +
          `${approxExpectedHeight} but is actually ${approxMeasuredHeight}. ` +
          "This means MessageList's FlatList isn't getting the right item " +
          'height for some of its nodes, which is guaranteed to cause ' +
          'glitchy behavior. Please investigate!!',
      );
    }
  };
}

const WrappedRobotextMessage = connect((state: AppState) => ({
  styles: stylesSelector(state),
  activeTheme: state.globalThemeInfo.activeTheme,
}))(withKeyboardState(RobotextMessage));

type InnerThreadEntityProps = {
  id: string,
  name: string,
  navigation: ChatNavigationProp<'MessageList'>,
  // Redux state
  threadInfo: ?ThreadInfo,
  styles: typeof styles,
};
class InnerThreadEntity extends React.PureComponent<InnerThreadEntityProps> {
  static propTypes = {
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    navigation: messageListNavPropType.isRequired,
    threadInfo: threadInfoPropType,
    styles: PropTypes.objectOf(PropTypes.object).isRequired,
  };

  render() {
    if (!this.props.threadInfo) {
      return <Text>{this.props.name}</Text>;
    }
    return (
      <Text style={this.props.styles.link} onPress={this.onPressThread}>
        {this.props.name}
      </Text>
    );
  }

  onPressThread = () => {
    const { threadInfo, navigation } = this.props;
    invariant(threadInfo, 'onPressThread should have threadInfo');
    navigation.navigate({
      name: MessageListRouteName,
      params: { threadInfo },
      key: `${MessageListRouteName}${threadInfo.id}`,
    });
  };
}
const ThreadEntity = connect((state: AppState, ownProps: { id: string }) => ({
  threadInfo: threadInfoSelector(state)[ownProps.id],
  styles: stylesSelector(state),
}))(InnerThreadEntity);

function ColorEntity(props: {| color: string |}) {
  const colorStyle = { color: props.color };
  return <Text style={colorStyle}>{props.color}</Text>;
}

const styles = {
  link: {
    color: 'link',
  },
  robotextContainer: {
    marginBottom: 5,
    marginHorizontal: 24,
    paddingVertical: 6,
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
const stylesSelector = styleSelector(styles);

export {
  robotextMessageItemHeight,
  dummyNodeForRobotextMessageHeightMeasurement,
  WrappedRobotextMessage as RobotextMessage,
};
