// @flow

import { chatMessageItemPropType } from 'lib/selectors/chat-selectors';
import type {
  MultimediaMessageInfo,
  LocalMessageInfo,
} from 'lib/types/message-types';
import type { Media } from 'lib/types/media-types';
import type { ImageStyle } from '../types/styles';
import type { ThreadInfo } from 'lib/types/thread-types';
import type { Navigate } from '../navigation/route-names';

import * as React from 'react';
import {
  Text,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import PropTypes from 'prop-types';

import { messageKey } from 'lib/shared/message-utils';

import ComposedMessage from './composed-message.react';
import MultimediaMessageMultimedia from './multimedia-message-multimedia.react';

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
    if (contentHeight < 50) {
      contentHeight = 50;
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
  navigate: Navigate,
  toggleFocus: (messageKey: string) => void,
|};
class MultimediaMessage extends React.PureComponent<Props> {

  static propTypes = {
    item: chatMessageItemPropType.isRequired,
    navigate: PropTypes.func.isRequired,
    toggleFocus: PropTypes.func.isRequired,
  };

  render() {
    const { messageInfo, contentHeight } = this.props.item;
    const { id, creator } = messageInfo;
    const { isViewer } = creator;
    const heightStyle = { height: contentHeight };

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
        <TouchableWithoutFeedback onLongPress={this.onLongPress}>
          <View style={[heightStyle, styles.container]}>
            {this.renderContent()}
          </View>
        </TouchableWithoutFeedback>
      </ComposedMessage>
    );
  }

  renderContent(): React.Node {
    const { messageInfo } = this.props.item;
    if (messageInfo.media.length === 1) {
      return this.renderImage(messageInfo.media[0]);
    } else if (messageInfo.media.length === 2) {
      const [ one, two ] = messageInfo.media;
      return (
        <View style={styles.row}>
          {this.renderImage(one, styles.leftImage)}
          {this.renderImage(two, styles.rightImage)}
        </View>
      );
    } else if (messageInfo.media.length === 3) {
      const [ one, two, three ] = messageInfo.media;
      return (
        <View style={styles.row}>
          {this.renderImage(one, styles.leftImage)}
          {this.renderImage(two, styles.centerImage)}
          {this.renderImage(three, styles.rightImage)}
        </View>
      );
    } else if (messageInfo.media.length === 4) {
      const [ one, two, three, four ] = messageInfo.media;
      return (
        <View style={styles.grid}>
          <View style={styles.row}>
            {this.renderImage(one, styles.topLeftImage)}
            {this.renderImage(two, styles.topRightImage)}
          </View>
          <View style={styles.row}>
            {this.renderImage(three, styles.leftImage)}
            {this.renderImage(four, styles.rightImage)}
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
          row.push(this.renderImage(media, style));
        }
        for (; j < 3; j++) {
          const key = `filler${j}`;
          row.push(<View style={styles.filler} key={key} />);
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

  renderImage(media: Media, style?: ImageStyle): React.Node {
    return (
      <MultimediaMessageMultimedia
        media={media}
        navigate={this.props.navigate}
        style={style}
        key={media.id}
      />
    );
  }

  onLongPress = () => {
    this.props.toggleFocus(messageKey(this.props.item.messageInfo));
  }

}

const horizontalSpaceBetweenImages = 2;
const verticalSpaceBetweenImages = 4;
const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  grid: {
    flex: 1,
  },
  filler: {
    flex: 1,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
  },
  leftImage: {
    marginRight: horizontalSpaceBetweenImages,
  },
  centerImage: {
    marginLeft: horizontalSpaceBetweenImages,
    marginRight: horizontalSpaceBetweenImages,
  },
  rightImage: {
    marginLeft: horizontalSpaceBetweenImages,
  },
  topLeftImage: {
    marginRight: horizontalSpaceBetweenImages,
    marginBottom: verticalSpaceBetweenImages,
  },
  topCenterImage: {
    marginLeft: horizontalSpaceBetweenImages,
    marginRight: horizontalSpaceBetweenImages,
    marginBottom: verticalSpaceBetweenImages,
  },
  topRightImage: {
    marginLeft: horizontalSpaceBetweenImages,
    marginBottom: verticalSpaceBetweenImages,
  },
  middleLeftImage: {
    marginRight: horizontalSpaceBetweenImages,
    marginBottom: verticalSpaceBetweenImages,
  },
  middleCenterImage: {
    marginRight: horizontalSpaceBetweenImages,
    marginLeft: horizontalSpaceBetweenImages,
    marginBottom: verticalSpaceBetweenImages,
  },
  middleRightImage: {
    marginLeft: horizontalSpaceBetweenImages,
    marginBottom: verticalSpaceBetweenImages,
  },
});
const rowStyles = {
  top: [
    styles.topLeftImage,
    styles.topCenterImage,
    styles.topRightImage,
  ],
  middle: [
    styles.middleLeftImage,
    styles.middleCenterImage,
    styles.middleRightImage,
  ],
  bottom: [
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
