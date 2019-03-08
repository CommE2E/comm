// @flow

import type {
  ChatMessageInfoItemWithHeight,
} from './message-list-container.react';
import { chatMessageItemPropType } from 'lib/selectors/chat-selectors';
import { messageTypes } from 'lib/types/message-types';

import * as React from 'react';
import {
  Text,
  StyleSheet,
  TouchableWithoutFeedback,
} from 'react-native';
import invariant from 'invariant';
import PropTypes from 'prop-types';

import { messageKey } from 'lib/shared/message-utils';

function multimediaMessageItemHeight(
  item: ChatMessageInfoItemWithHeight,
  viewerID: ?string,
) {
  // TODO
  const { messageInfo, contentHeight, startsCluster, endsCluster } = item;
  const { id, creator } = messageInfo;
  const { isViewer } = creator;
  let height = 17 + contentHeight; // for padding, margin, and text
  if (!isViewer && startsCluster) {
    height += 25; // for username
  }
  if (endsCluster) {
    height += 7; // extra padding at the end of a cluster
  }
  if (
    isViewer &&
    id !== null && id !== undefined &&
    item.localMessageInfo &&
    item.localMessageInfo.sendFailed
  ) {
    height += 22; // extra padding at the end of a cluster
  }
  return height;
}

type Props = {|
  item: ChatMessageInfoItemWithHeight,
  toggleFocus: (messageKey: string) => void,
|};
class MultimediaMessage extends React.PureComponent<Props> {

  static propTypes = {
    item: chatMessageItemPropType.isRequired,
    toggleFocus: PropTypes.func.isRequired,
  };

  constructor(props: Props) {
    super(props);
    invariant(
      props.item.messageInfo.type === messageTypes.MULTIMEDIA,
      "MultimediaMessage should only be used for messageTypes.MULTIMEDIA",
    );
  }

  componentWillReceiveProps(nextProps: Props) {
    invariant(
      nextProps.item.messageInfo.type === messageTypes.MULTIMEDIA,
      "MultimediaMessage should only be used for messageTypes.MULTIMEDIA",
    );
  }

  render() {
    return (
      <TouchableWithoutFeedback onPress={this.onPress}>
        <Text style={styles.robotext}>Blah blah image</Text>
      </TouchableWithoutFeedback>
    );
  }

  onPress = () => {
    this.props.toggleFocus(messageKey(this.props.item.messageInfo));
  }

}

const styles = StyleSheet.create({
  robotext: {
    textAlign: 'center',
    color: '#333333',
    paddingVertical: 6,
    marginBottom: 5,
    marginHorizontal: 24,
    fontSize: 15,
    fontFamily: 'Arial',
  },
});

export {
  MultimediaMessage,
  multimediaMessageItemHeight,
};
