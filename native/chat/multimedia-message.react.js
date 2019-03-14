// @flow

import type {
  ChatMessageInfoItemWithHeight,
} from './message-list-container.react';
import { chatMessageItemPropType } from 'lib/selectors/chat-selectors';
import { messageTypes } from 'lib/types/message-types';
import type { Media } from 'lib/types/media-types';
import type { ImageStyle } from '../types/styles';

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

import ComposedMessage from './composed-message.react';
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
    const { id, creator } = messageInfo;
    const { isViewer } = creator;
    const heightStyle = { height: contentHeight };

    let content;
    if (!this.state.dimensions) {
      content = (
        <View style={[heightStyle, styles.container]}>
          <ActivityIndicator
            color="black"
            size="large"
            style={heightStyle}
          />
        </View>
      );
    } else {
      content = (
        <View style={[heightStyle, styles.container]}>
          {this.renderContent()}
        </View>
      );
    }

    const sendFailed =
      isViewer &&
      (id === null || id === undefined) &&
      this.props.item.localMessageInfo &&
      this.props.item.localMessageInfo.sendFailed;

    return (
      <ComposedMessage
        item={this.props.item}
        sendFailed={!!sendFailed}
        borderRadius={16}
        style={styles.row}
      >
        <TouchableWithoutFeedback onPress={this.onPress}>
          {content}
        </TouchableWithoutFeedback>
      </ComposedMessage>
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
    } else if (messageInfo.media.length === 2) {
      const [ one, two ] = messageInfo.media;
      return (
        <View style={styles.row}>
          {MultimediaMessage.renderImage(one, styles.leftImage)}
          {MultimediaMessage.renderImage(two, styles.rightImage)}
        </View>
      );
    } else if (messageInfo.media.length === 3) {
      const [ one, two, three ] = messageInfo.media;
      return (
        <View style={styles.row}>
          {MultimediaMessage.renderImage(one, styles.leftImage)}
          {MultimediaMessage.renderImage(two, styles.centerImage)}
          {MultimediaMessage.renderImage(three, styles.rightImage)}
        </View>
      );
    } else if (messageInfo.media.length === 4) {
      const [ one, two, three, four ] = messageInfo.media;
      return (
        <React.Fragment>
          <View style={styles.row}>
            {MultimediaMessage.renderImage(one, styles.topLeftImage)}
            {MultimediaMessage.renderImage(two, styles.topRightImage)}
          </View>
          <View style={styles.row}>
            {MultimediaMessage.renderImage(three, styles.bottomLeftImage)}
            {MultimediaMessage.renderImage(four, styles.bottomRightImage)}
          </View>
        </React.Fragment>
      );
    } else {
      const rows = [];
      for (let i = 0; i < messageInfo.media.length; i += 3) {
        const media = messageInfo.media.slice(i, i + 3);
        const [ one, two, three ] = media;
        if (i === 0) {
          rows.push(
            <View style={styles.row} key={i}>
              {MultimediaMessage.renderImage(one, styles.topLeftImage)}
              {MultimediaMessage.renderImage(two, styles.topCenterImage)}
              {MultimediaMessage.renderImage(three, styles.topRightImage)}
            </View>
          );
        } else if (i + 3 >= messageInfo.media.length) {
          rows.push(
            <View style={styles.row} key={i}>
              {MultimediaMessage.renderImage(one, styles.bottomLeftImage)}
              {MultimediaMessage.renderImage(two, styles.bottomCenterImage)}
              {MultimediaMessage.renderImage(three, styles.bottomRightImage)}
            </View>
          );
        } else {
          rows.push(
            <View style={styles.row} key={i}>
              {MultimediaMessage.renderImage(one, styles.leftImage)}
              {MultimediaMessage.renderImage(two, styles.centerImage)}
              {MultimediaMessage.renderImage(three, styles.rightImage)}
            </View>
          );
        }
      }
      return rows;
    }
  }

  static renderImage(media: Media, style?: ImageStyle): React.Node {
    const { id, uri } = media;
    const source = { uri };
    return (
      <Image
        source={source}
        key={id}
        style={[styles.image, style]}
      />
    );
  }

  onPress = () => {
    this.props.toggleFocus(messageKey(this.props.item.messageInfo));
  }

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  row: {
    flex: 1,
    flexDirection: 'row',
  },
  image: {
    flex: 1,
  },
  leftImage: {
    marginRight: 3,
  },
  centerImage: {
    marginLeft: 3,
    marginRight: 3,
  },
  rightImage: {
    marginLeft: 3,
  },
  topLeftImage: {
    marginRight: 3,
    marginBottom: 3,
  },
  topCenterImage: {
    marginLeft: 3,
    marginRight: 3,
    marginBottom: 3,
  },
  topRightImage: {
    marginLeft: 3,
    marginBottom: 3,
  },
  bottomLeftImage: {
    marginRight: 3,
    marginTop: 3,
  },
  bottomCenterImage: {
    marginLeft: 3,
    marginRight: 3,
    marginTop: 3,
  },
  bottomRightImage: {
    marginLeft: 3,
    marginTop: 3,
  },
});

export {
  multimediaMessageLoadingContentHeight,
  MultimediaMessage,
  multimediaMessageItemHeight,
};
