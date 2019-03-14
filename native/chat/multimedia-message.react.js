// @flow

import type {
  ChatMessageInfoItemWithHeight,
} from './message-list-container.react';
import { chatMessageItemPropType } from 'lib/selectors/chat-selectors';
import { messageTypes } from 'lib/types/message-types';
import type { Media } from 'lib/types/media-types';

import * as React from 'react';
import {
  Text,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
  Image,
  ActivityIndicator,
} from 'react-native';
import invariant from 'invariant';
import PropTypes from 'prop-types';

import { messageKey } from 'lib/shared/message-utils';
import { promiseAll } from 'lib/utils/promises';

import { type Dimensions, preloadImage } from '../utils/media-utils';

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
type State = {|
  dimensions: ?{[id: string]: Dimensions},
|};
class MultimediaMessage extends React.PureComponent<Props, State> {

  static propTypes = {
    item: chatMessageItemPropType.isRequired,
    toggleFocus: PropTypes.func.isRequired,
    updateHeightForMessage: PropTypes.func.isRequired,
  };
  state = {
    dimensions: null,
  };

  componentDidMount() {
    this.calculateDimensions();
  }

  componentDidUpdate(prevProps: Props) {
    const { messageInfo } = this.props.item;
    const oldMessageInfo = prevProps.item.messageInfo;
    invariant(
      messageInfo.type === messageTypes.MULTIMEDIA &&
        oldMessageInfo.type === messageTypes.MULTIMEDIA,
      "MultimediaMessage should only be used for messageTypes.MULTIMEDIA",
    );
    if (messageInfo.media.length !== oldMessageInfo.media.length) {
      this.calculateDimensions();
      return;
    }
    for (let i = 0; i < messageInfo.media.length; i++) {
      if (messageInfo.media[i].uri !== oldMessageInfo.media[i].uri) {
        this.calculateDimensions();
        return;
      }
    }
  }

  async calculateDimensions() {
    const { messageInfo } = this.props.item;
    invariant(
      messageInfo.type === messageTypes.MULTIMEDIA,
      "MultimediaMessage should only be used for messageTypes.MULTIMEDIA",
    );

    const promises = {};
    for (let media of messageInfo.media) {
      promises[media.id] = preloadImage(media.uri);
    }
    const dimensions = await promiseAll(promises);
    this.setState({ dimensions });
  }

  render() {
    const { messageInfo, contentHeight } = this.props.item;
    invariant(
      messageInfo.type === messageTypes.MULTIMEDIA,
      "MultimediaMessage should only be used for messageTypes.MULTIMEDIA",
    );
    const heightStyle = { height: contentHeight };

    let content;
    if (!this.state.dimensions) {
      content = (
        <View style={heightStyle}>
          <ActivityIndicator
            color="black"
            size="large"
            style={heightStyle}
          />
        </View>
      );
    } else {
      content = (
        <View style={heightStyle}>
          {this.renderContent()}
        </View>
      );
    }

    return (
      <TouchableWithoutFeedback onPress={this.onPress}>
        {content}
      </TouchableWithoutFeedback>
    );
  }

  renderContent(): React.Node {
    const { messageInfo } = this.props.item;
    invariant(
      messageInfo.type === messageTypes.MULTIMEDIA,
      "MultimediaMessage should only be used for messageTypes.MULTIMEDIA",
    );
    if (messageInfo.media.length === 1) {
      return MultimediaMessage.renderImage(messageInfo.media[0]);
    } else if (messageInfo.media.length < 4) {
      const images = messageInfo.media.map(MultimediaMessage.renderImage);
      return (
        <View style={styles.row}>
          {images}
        </View>
      );
    } else if (messageInfo.media.length === 4) {
      const [ one, two, three, four ] = messageInfo.media;
      return (
        <View>
          <View style={styles.row}>
            {MultimediaMessage.renderImage(one)}
            {MultimediaMessage.renderImage(two)}
          </View>
          <View style={styles.row}>
            {MultimediaMessage.renderImage(three)}
            {MultimediaMessage.renderImage(four)}
          </View>
        </View>
      );
    } else {
      const rows = [];
      for (let i = 0; i < messageInfo.media.length; i += 3) {
        const media = messageInfo.media.slice(i, i + 3);
        const images = media.map(MultimediaMessage.renderImage);
        rows.push(
          <View style={styles.row} key={i}>
            {images}
          </View>
        );
      }
      return <View>{rows}</View>;
    }
  }

  static renderImage(media: Media): React.Node {
    const { id, uri } = media;
    const source = { uri };
    return (
      <Image
        source={source}
        key={id}
        style={styles.image}
      />
    );
  }

  onPress = () => {
    this.props.toggleFocus(messageKey(this.props.item.messageInfo));
  }

}

const styles = StyleSheet.create({
  row: {
    flex: 1,
    flexDirection: 'row',
  },
  image: {
    flex: 1,
  },
});

export {
  multimediaMessageLoadingContentHeight,
  MultimediaMessage,
  multimediaMessageItemHeight,
};
