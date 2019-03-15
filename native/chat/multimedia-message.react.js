// @flow

import type {
  ChatMessageInfoItemWithHeight,
} from './message-list-container.react';
import { chatMessageItemPropType } from 'lib/selectors/chat-selectors';
import { messageTypes } from 'lib/types/message-types';
import type { Media } from 'lib/types/media-types';
import type { ImageStyle } from '../types/styles';
import type { AppState } from '../redux-setup';
import {
  type ConnectionStatus,
  connectionStatusPropType,
} from 'lib/types/socket-types';

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
import { connect } from 'lib/utils/redux-utils';

import ComposedMessage from './composed-message.react';
import { preloadImage } from '../utils/media-utils';
import { composedMessageMaxWidthSelector } from './composed-message-width';

const multimediaMessageLoadingContentHeight = 100;

function multimediaMessageItemHeight(
  item: ChatMessageInfoItemWithHeight,
  viewerID: ?string,
) {
  const { messageInfo, contentHeight, startsCluster, endsCluster } = item;
  const { id, creator } = messageInfo;
  const { isViewer } = creator;
  let height = 5 + contentHeight; // for margin and image
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
    height += 22; // extra padding for sendFailed
  }
  return height;
}

type Props = {|
  item: ChatMessageInfoItemWithHeight,
  toggleFocus: (messageKey: string) => void,
  updateHeightForMessage: (id: string, contentHeight: number) => void,
  // Redux state
  composedMessageMaxWidth: number,
  connectionStatus: ConnectionStatus,
|};
type State = {|
  preloaded: bool,
|};
class MultimediaMessage extends React.PureComponent<Props, State> {

  static propTypes = {
    item: chatMessageItemPropType.isRequired,
    toggleFocus: PropTypes.func.isRequired,
    updateHeightForMessage: PropTypes.func.isRequired,
    composedMessageMaxWidth: PropTypes.number.isRequired,
    connectionStatus: connectionStatusPropType.isRequired,
  };
  state = {
    preloaded: false,
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

    if (
      !this.state.preloaded &&
      this.props.connectionStatus === "connected" &&
      prevProps.connectionStatus !== "connected"
    ) {
      this.calculateDimensions();
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
    let dimensions;
    try {
      dimensions = await Promise.all(messageInfo.media.map(
        media => preloadImage(media.uri),
      ));
    } catch (e) {
      return;
    }
    this.setState({ preloaded: true });

    const { composedMessageMaxWidth } = this.props;
    let contentHeight;
    if (messageInfo.media.length === 1) {
      const [ mediaDimensions ] = dimensions;
      if (composedMessageMaxWidth >= mediaDimensions.width) {
        contentHeight = mediaDimensions.height;
      } else {
        contentHeight = mediaDimensions.height *
          composedMessageMaxWidth / mediaDimensions.width;
      }
    } else if (messageInfo.media.length === 2) {
      contentHeight = composedMessageMaxWidth / 2;
    } else if (messageInfo.media.length === 3) {
      contentHeight = composedMessageMaxWidth / 3;
    } else if (messageInfo.media.length === 4) {
      contentHeight = composedMessageMaxWidth;
    } else {
      const numRows = Math.ceil(messageInfo.media.length / 3);
      contentHeight = numRows * composedMessageMaxWidth / 3;
    }
    this.props.updateHeightForMessage(messageKey(messageInfo), contentHeight);
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
    if (!this.state.preloaded) {
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
        <View style={styles.grid}>
          <View style={styles.row}>
            {MultimediaMessage.renderImage(one, styles.topLeftImage)}
            {MultimediaMessage.renderImage(two, styles.topRightImage)}
          </View>
          <View style={styles.row}>
            {MultimediaMessage.renderImage(three, styles.bottomLeftImage)}
            {MultimediaMessage.renderImage(four, styles.bottomRightImage)}
          </View>
        </View>
      );
    } else {
      const rows = [];
      for (let i = 0; i < messageInfo.media.length; i += 3) {
        let rowStyle;
        if (i === 0) {
          rowStyle = rowStyles.top;
        } else if (i + 3 >= messageInfo.media.length) {
          rowStyle = rowStyles.bottom;
        } else {
          rowStyle = rowStyles.middle;
        }

        const rowMedia = messageInfo.media.slice(i, i + 3);
        const row = [];
        let j = 0;
        for (; j < rowMedia.length; j++) {
          const media = rowMedia[j];
          const style = rowStyle[j];
          row.push(MultimediaMessage.renderImage(media, style));
        }
        for (; j < 3; j++) {
          const key = `filler${j}`;
          row.push(<View style={styles.image} key={key} />);
        }

        rows.push(
          <View style={styles.row} key={i}>
            {row}
          </View>
        );
      }
      return <View style={styles.grid}>{rows}</View>;
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

const spaceBetweenImages = 2;
const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  grid: {
    flex: 1,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
  },
  image: {
    flex: 1,
  },
  leftImage: {
    marginRight: spaceBetweenImages,
  },
  centerImage: {
    marginLeft: spaceBetweenImages,
    marginRight: spaceBetweenImages,
  },
  rightImage: {
    marginLeft: spaceBetweenImages,
  },
  topLeftImage: {
    marginRight: spaceBetweenImages,
    marginBottom: spaceBetweenImages,
  },
  topCenterImage: {
    marginLeft: spaceBetweenImages,
    marginRight: spaceBetweenImages,
    marginBottom: spaceBetweenImages,
  },
  topRightImage: {
    marginLeft: spaceBetweenImages,
    marginBottom: spaceBetweenImages,
  },
  bottomLeftImage: {
    marginRight: spaceBetweenImages,
    marginTop: spaceBetweenImages,
  },
  bottomCenterImage: {
    marginLeft: spaceBetweenImages,
    marginRight: spaceBetweenImages,
    marginTop: spaceBetweenImages,
  },
  bottomRightImage: {
    marginLeft: spaceBetweenImages,
    marginTop: spaceBetweenImages,
  },
});
const rowStyles = {
  top: [
    styles.topLeftImage,
    styles.topCenterImage,
    styles.topRightImage,
  ],
  bottom: [
    styles.bottomLeftImage,
    styles.bottomCenterImage,
    styles.bottomRightImage,
  ],
  middle: [
    styles.leftImage,
    styles.centerImage,
    styles.rightImage,
  ],
};

const WrappedMultimediaMessage = connect(
  (state: AppState) => ({
    composedMessageMaxWidth: composedMessageMaxWidthSelector(state),
    connectionStatus: state.connection.status,
  }),
)(MultimediaMessage);

export {
  multimediaMessageLoadingContentHeight,
  WrappedMultimediaMessage as MultimediaMessage,
  multimediaMessageItemHeight,
};
