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
  View,
  ActivityIndicator,
} from 'react-native';
import invariant from 'invariant';
import PropTypes from 'prop-types';

import { messageKey } from 'lib/shared/message-utils';

const multimediaMessageLoadingContentHeight = 100; // TODO

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
  updateHeightForMessage: (id: string, contentHeight: number) => void,
|};
class MultimediaMessage extends React.PureComponent<Props> {

  static propTypes = {
    item: chatMessageItemPropType.isRequired,
    toggleFocus: PropTypes.func.isRequired,
    updateHeightForMessage: PropTypes.func.isRequired,
  };

  constructor(props: Props) {
    super(props);
    invariant(
      props.item.messageInfo.type === messageTypes.MULTIMEDIA,
      "MultimediaMessage should only be used for messageTypes.MULTIMEDIA",
    );
  }

  componentDidUpdate() {
    invariant(
      this.props.item.messageInfo.type === messageTypes.MULTIMEDIA,
      "MultimediaMessage should only be used for messageTypes.MULTIMEDIA",
    );
  }

  render() {
    const { contentHeight } = this.props.item;
    const style = { height: contentHeight };
    return (
      <TouchableWithoutFeedback onPress={this.onPress}>
        <View>
          <ActivityIndicator
            color="black"
            size="large"
            style={style}
          />
        </View>
      </TouchableWithoutFeedback>
    );
  }

  onPress = () => {
    this.props.toggleFocus(messageKey(this.props.item.messageInfo));
  }

}

const styles = StyleSheet.create({
});

export {
  multimediaMessageLoadingContentHeight,
  MultimediaMessage,
  multimediaMessageItemHeight,
};
