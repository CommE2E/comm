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
import {
  type VerticalBounds,
  verticalBoundsPropType,
} from '../media/vertical-bounds';
import type { AppState } from '../redux/redux-setup';
import type { MessagePendingUploads } from './chat-input-state';

import * as React from 'react';
import {
  Text,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import PropTypes from 'prop-types';
import invariant from 'invariant';
import Animated from 'react-native-reanimated';

import { messageKey, messageID } from 'lib/shared/message-utils';
import { connect } from 'lib/utils/redux-utils';

import ComposedMessage from './composed-message.react';
import MultimediaMessageMultimedia from './multimedia-message-multimedia.react';
import { modalsClosedSelector } from '../selectors/nav-selectors';
import { withLightboxPositionContext } from '../media/lightbox-navigator.react';
import {
  type Corners,
  allCorners,
  getRoundedContainerStyle,
} from './rounded-message-container.react';

export type ChatMultimediaMessageInfoItem = {|
  itemType: "message",
  messageShapeType: "multimedia",
  messageInfo: MultimediaMessageInfo,
  localMessageInfo: ?LocalMessageInfo,
  threadInfo: ThreadInfo,
  startsConversation: bool,
  startsCluster: bool,
  endsCluster: bool,
  pendingUploads: ?MessagePendingUploads,
  contentHeight: number,
|};

function getMediaPerRow(mediaCount: number) {
  if (mediaCount === 0) {
    return 0; // ???
  } else if (mediaCount === 1) {
    return 1;
  } else if (mediaCount === 2) {
    return 2;
  } else if (mediaCount === 3) {
    return 3;
  } else if (mediaCount === 4) {
    return 2;
  } else {
    return 3;
  }
}

function multimediaMessageContentHeight(
  messageInfo: MultimediaMessageInfo,
  composedMessageMaxWidth: number,
): number {
  invariant(messageInfo.media.length > 0, "should have media");
  if (messageInfo.media.length === 1) {
    const [ media ] = messageInfo.media;
    const { height, width } = media.dimensions;
    let imageHeight = composedMessageMaxWidth >= width
      ? height
      : height * composedMessageMaxWidth / width;
    if (imageHeight < 50) {
      imageHeight = 50;
    }
    return imageHeight;
  }

  const mediaPerRow = getMediaPerRow(messageInfo.media.length);
  const marginSpace = spaceBetweenImages * (mediaPerRow - 1);
  const imageHeight = (composedMessageMaxWidth - marginSpace) / mediaPerRow;

  const numRows = Math.ceil(messageInfo.media.length / mediaPerRow);
  return numRows * imageHeight + (numRows - 1) * spaceBetweenImages;
}

function sendFailed(item: ChatMultimediaMessageInfoItem) {
  const { messageInfo, localMessageInfo, pendingUploads } = item;
  const { id: serverID } = messageInfo;
  if (serverID !== null && serverID !== undefined) {
    return false;
  }

  const { isViewer } = messageInfo.creator;
  if (!isViewer) {
    return false;
  }

  if (localMessageInfo && localMessageInfo.sendFailed) {
    return true;
  }

  for (let media of messageInfo.media) {
    const pendingUpload = pendingUploads && pendingUploads[media.id];
    if (pendingUpload && pendingUpload.failed) {
      return true;
    }
  }

  return !pendingUploads;
}

function multimediaMessageItemHeight(
  item: ChatMultimediaMessageInfoItem,
  viewerID: ?string,
) {
  const { messageInfo, contentHeight, startsCluster, endsCluster } = item;
  const { id, creator } = messageInfo;
  const { isViewer } = creator;
  let height = 5 + contentHeight; // for margin and images
  if (!isViewer && startsCluster) {
    height += 25; // for username
  }
  if (endsCluster) {
    height += 7; // extra padding at the end of a cluster
  }
  if (sendFailed(item)) {
    height += 22; // extra padding for sendFailed
  }
  return height;
}

const borderRadius = 16;

type Props = {|
  item: ChatMultimediaMessageInfoItem,
  navigate: Navigate,
  toggleFocus: (messageKey: string) => void,
  verticalBounds: ?VerticalBounds,
  // Redux state
  modalsClosed: bool,
  // withLightboxPositionContext
  lightboxPosition: ?Animated.Value,
|};
class MultimediaMessage extends React.PureComponent<Props> {

  static propTypes = {
    item: chatMessageItemPropType.isRequired,
    navigate: PropTypes.func.isRequired,
    toggleFocus: PropTypes.func.isRequired,
    verticalBounds: verticalBoundsPropType,
    modalsClosed: PropTypes.bool.isRequired,
    lightboxPosition: PropTypes.instanceOf(Animated.Value),
  };

  render() {
    const heightStyle = { height: this.props.item.contentHeight };
    return (
      <ComposedMessage
        item={this.props.item}
        sendFailed={sendFailed(this.props.item)}
        borderRadius={borderRadius}
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
    invariant(messageInfo.media.length > 0, "should have media");
    if (messageInfo.media.length === 1) {
      return this.renderImage(
        messageInfo.media[0],
        0,
        this.getCornerStyle(allCorners),
      );
    }

    const mediaPerRow = getMediaPerRow(messageInfo.media.length);
    const numRows = Math.ceil(messageInfo.media.length / mediaPerRow);

    const rows = [];
    for (let i = 0; i < messageInfo.media.length; i += mediaPerRow) {
      const rowMedia = messageInfo.media.slice(i, i + mediaPerRow);
      const firstRow = i === 0;
      const lastRow = i + mediaPerRow >= messageInfo.media.length;

      const row = [];
      let j = 0;
      for (; j < rowMedia.length; j++) {
        const media = rowMedia[j];
        const firstInRow = j === 0;
        const lastInRow = j + 1 === rowMedia.length;
        const inLastColumn = j + 1 === mediaPerRow;

        const style = [];
        if (!lastInRow) {
          style.push(styles.imageBeforeImage);
        }
        if (firstRow && firstInRow) {
          style.push(this.getCornerStyle({ topLeft: true }));
        }
        if (firstRow && inLastColumn) {
          style.push(this.getCornerStyle({ topRight: true }));
        }
        if (lastRow && firstInRow) {
          style.push(this.getCornerStyle({ bottomLeft: true }));
        }
        if (lastRow && inLastColumn) {
          style.push(this.getCornerStyle({ bottomRight: true }));
        }

        row.push(this.renderImage(media, i + j, style));
      }
      for (; j < mediaPerRow; j++) {
        const key = `filler${j}`;
        const style = j + 1 < mediaPerRow
          ? [ styles.filler, styles.imageBeforeImage ]
          : styles.filler;
        row.push(<View style={[ style, styles.filler ]} key={key} />);
      }

      const rowStyle = lastRow
        ? styles.row
        : [ styles.row, styles.rowAboveRow ];
      rows.push(
        <View style={rowStyle} key={i}>
          {row}
        </View>
      );
    }
    return <View style={styles.grid}>{rows}</View>;
  }

  getCornerStyle(corners: Corners) {
    return getRoundedContainerStyle(this.props.item, corners, borderRadius);
  }

  renderImage(
    media: Media,
    index: number,
    style: ImageStyle,
  ): React.Node {
    const { pendingUploads, messageInfo } = this.props.item;
    const mediaInfo = {
      ...media,
      messageID: messageID(messageInfo),
      index,
    };
    const pendingUpload = pendingUploads && pendingUploads[media.id];
    return (
      <MultimediaMessageMultimedia
        mediaInfo={mediaInfo}
        navigate={this.props.navigate}
        verticalBounds={this.props.verticalBounds}
        style={style}
        modalsClosed={this.props.modalsClosed}
        lightboxPosition={this.props.lightboxPosition}
        inProgress={!!pendingUploads}
        pendingUpload={pendingUpload}
        key={index}
      />
    );
  }

  onLongPress = () => {
    this.props.toggleFocus(messageKey(this.props.item.messageInfo));
  }

}

const spaceBetweenImages = 4;
const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  grid: {
    flex: 1,
    justifyContent: 'space-between',
  },
  filler: {
    flex: 1,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowAboveRow: {
    marginBottom: spaceBetweenImages,
  },
  imageBeforeImage: {
    marginRight: spaceBetweenImages,
  },
});

const WrappedMultimediaMessage =
  withLightboxPositionContext(
    connect(
      (state: AppState) => ({
        modalsClosed: modalsClosedSelector(state),
      }),
    )(MultimediaMessage),
  );

export {
  WrappedMultimediaMessage as MultimediaMessage,
  multimediaMessageContentHeight,
  multimediaMessageItemHeight,
};
