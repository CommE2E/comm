// @flow

import { chatMessageItemPropType } from 'lib/selectors/chat-selectors';
import {
  messageTypes,
  type MultimediaMessageInfo,
  type LocalMessageInfo,
} from 'lib/types/message-types';
import type { Media } from 'lib/types/media-types';
import type { ImageStyle } from '../types/styles';
import type { ThreadInfo } from 'lib/types/thread-types';

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

import ComposedMessage from './composed-message.react';

export type ChatMultimediaMessageInfoItem = {|
  itemType: "message",
  messageShapeType: "multimedia",
  messageInfo: MultimediaMessageInfo,
  localMessageInfo: ?LocalMessageInfo,
  threadInfo: ThreadInfo,
  startsConversation: bool,
  startsCluster: bool,
  endsCluster: bool,
  contentHeight: number,
|};

function multimediaMessageContentHeight(
  messageInfo: MultimediaMessageInfo,
  composedMessageMaxWidth: number,
) {
  let contentHeight;
  if (messageInfo.media.length === 1) {
    const [ media ] = messageInfo.media;
    const mediaDimensions = media.dimensions;
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
  return contentHeight;
}

function multimediaMessageItemHeight(
  item: ChatMultimediaMessageInfoItem,
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
  item: ChatMultimediaMessageInfoItem,
  toggleFocus: (messageKey: string) => void,
|};
type State = {|
  preloaded: bool,
|};
class MultimediaMessage extends React.PureComponent<Props, State> {

  static propTypes = {
    item: chatMessageItemPropType.isRequired,
    toggleFocus: PropTypes.func.isRequired,
  };
  state = {
    preloaded: true,
  };

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

export {
  MultimediaMessage,
  multimediaMessageContentHeight,
  multimediaMessageItemHeight,
};
