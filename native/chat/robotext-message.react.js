// @flow

import { type ThreadInfo, threadInfoPropType } from 'lib/types/thread-types';
import { chatMessageItemPropType } from 'lib/selectors/chat-selectors';
import type { Dispatch } from 'lib/types/redux-types';
import type { AppState } from '../redux/redux-setup';
import type { RobotextMessageInfo } from 'lib/types/message-types';
import {
  type KeyboardState,
  keyboardStatePropType,
  withKeyboardState,
} from '../keyboard/keyboard-state';
import type { Styles } from '../types/styles';

import * as React from 'react';
import { Text, TouchableWithoutFeedback, View } from 'react-native';
import PropTypes from 'prop-types';
import Hyperlink from 'react-native-hyperlink';

import {
  messageKey,
  splitRobotext,
  parseRobotextEntity,
} from 'lib/shared/message-utils';
import { threadInfoSelector } from 'lib/selectors/thread-selectors';
import { connect } from 'lib/utils/redux-utils';

import { MessageListRouteName } from '../navigation/route-names';
import { Timestamp } from './timestamp.react';
import { styleSelector } from '../themes/colors';

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
  viewerID: ?string,
) {
  return 17 + item.contentHeight; // for padding, margin, and text
}

type Props = {|
  item: ChatRobotextMessageInfoItemWithHeight,
  focused: boolean,
  toggleFocus: (messageKey: string) => void,
  // withKeyboardState
  keyboardState: ?KeyboardState,
  // Redux state
  styles: Styles,
  ...React.ElementProps<typeof View>,
|};
class RobotextMessage extends React.PureComponent<Props> {
  static propTypes = {
    item: chatMessageItemPropType.isRequired,
    focused: PropTypes.bool.isRequired,
    toggleFocus: PropTypes.func.isRequired,
    keyboardState: keyboardStatePropType,
    styles: PropTypes.objectOf(PropTypes.object).isRequired,
  };

  render() {
    const {
      item,
      focused,
      toggleFocus,
      keyboardState,
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
    const { item } = this.props;
    const robotext = item.robotext;
    const robotextParts = splitRobotext(robotext);
    const textParts = [];
    for (let splitPart of robotextParts) {
      if (splitPart === '') {
        continue;
      }
      if (splitPart.charAt(0) !== '<') {
        textParts.push(decodeURI(splitPart));
        continue;
      }

      const { rawText, entityType, id } = parseRobotextEntity(splitPart);

      if (entityType === 't' && id !== this.props.item.messageInfo.threadID) {
        textParts.push(<ThreadEntity key={id} id={id} name={rawText} />);
      } else if (entityType === 'c') {
        textParts.push(<ColorEntity key={id} color={rawText} />);
      } else {
        textParts.push(rawText);
      }
    }
    return (
      <Hyperlink linkDefault={true} linkStyle={this.props.styles.link}>
        <Text style={this.props.styles.robotext}>{textParts}</Text>
      </Hyperlink>
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
}

const WrappedRobotextMessage = connect((state: AppState) => ({
  styles: stylesSelector(state),
}))(withKeyboardState(RobotextMessage));

type InnerThreadEntityProps = {
  id: string,
  name: string,
  // Redux state
  threadInfo: ThreadInfo,
  styles: Styles,
  // Redux dispatch functions
  dispatch: Dispatch,
};
class InnerThreadEntity extends React.PureComponent<InnerThreadEntityProps> {
  static propTypes = {
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    threadInfo: threadInfoPropType.isRequired,
    styles: PropTypes.objectOf(PropTypes.object).isRequired,
    dispatch: PropTypes.func.isRequired,
  };

  render() {
    return (
      <Text style={this.props.styles.link} onPress={this.onPressThread}>
        {this.props.name}
      </Text>
    );
  }

  onPressThread = () => {
    const { id, threadInfo, dispatch } = this.props;
    dispatch({
      type: 'Navigation/NAVIGATE',
      routeName: MessageListRouteName,
      params: { threadInfo },
      key: `${MessageListRouteName}${threadInfo.id}`,
    });
  };
}
const ThreadEntity = connect(
  (state: AppState, ownProps: { id: string }) => ({
    threadInfo: threadInfoSelector(state)[ownProps.id],
    styles: stylesSelector(state),
  }),
  null,
  true,
)(InnerThreadEntity);

function ColorEntity(props: {| color: string |}) {
  const colorStyle = { color: props.color };
  return <Text style={colorStyle}>{props.color}</Text>;
}

const styles = {
  robotext: {
    textAlign: 'center',
    color: 'listForegroundSecondaryLabel',
    paddingVertical: 6,
    marginBottom: 5,
    marginHorizontal: 24,
    fontSize: 15,
    fontFamily: 'Arial',
  },
  link: {
    color: 'link',
  },
};
const stylesSelector = styleSelector(styles);

export { WrappedRobotextMessage as RobotextMessage, robotextMessageItemHeight };
