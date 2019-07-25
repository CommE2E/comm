// @flow

import { chatMessageItemPropType } from 'lib/selectors/chat-selectors';
import type {
  MultimediaMessageInfo,
  LocalMessageInfo,
} from 'lib/types/message-types';
import type { Media, Corners } from 'lib/types/media-types';
import type { ImageStyle } from '../types/styles';
import type { ThreadInfo } from 'lib/types/thread-types';
import {
  type VerticalBounds,
  verticalBoundsPropType,
} from '../types/lightbox-types';
import type { MessagePendingUploads } from './chat-input-state';
import {
  type MessageListNavProp,
  messageListNavPropType,
} from './message-list-types';

import * as React from 'react';
import { Text, StyleSheet, View } from 'react-native';
import PropTypes from 'prop-types';
import invariant from 'invariant';
import Animated from 'react-native-reanimated';

import ComposedMessage from './composed-message.react';
import MultimediaMessageMultimedia from './multimedia-message-multimedia.react';
import {
  withLightboxPositionContext,
} from '../navigation/lightbox-navigator.react';
import {
  allCorners,
  filterCorners,
  getRoundedContainerStyle,
} from './rounded-message-container.react';

type ContentHeights = {|
  imageHeight: number,
  contentHeight: number,
|};
export type ChatMultimediaMessageInfoItem = {|
  ...ContentHeights,
  itemType: "message",
  messageShapeType: "multimedia",
  messageInfo: MultimediaMessageInfo,
  localMessageInfo: ?LocalMessageInfo,
  threadInfo: ThreadInfo,
  startsConversation: bool,
  startsCluster: bool,
  endsCluster: bool,
  pendingUploads: ?MessagePendingUploads,
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

// Called by MessageListContainer
// The results are merged into ChatMultimediaMessageInfoItem
function multimediaMessageContentHeights(
  messageInfo: MultimediaMessageInfo,
  composedMessageMaxWidth: number,
): ContentHeights {
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
    return { imageHeight, contentHeight: imageHeight };
  }

  const mediaPerRow = getMediaPerRow(messageInfo.media.length);
  const marginSpace = spaceBetweenImages * (mediaPerRow - 1);
  const imageHeight = (composedMessageMaxWidth - marginSpace) / mediaPerRow;

  const numRows = Math.ceil(messageInfo.media.length / mediaPerRow);
  const contentHeight = numRows * imageHeight
    + (numRows - 1) * spaceBetweenImages;

  return { imageHeight, contentHeight };
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

// Called by Message
// Given a ChatMultimediaMessageInfoItem, determines exact height of row
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
  navigation: MessageListNavProp,
  focused: bool,
  toggleFocus: (messageKey: string) => void,
  verticalBounds: ?VerticalBounds,
  keyboardShowing: bool,
  // withLightboxPositionContext
  lightboxPosition: ?Animated.Value,
|};
class MultimediaMessage extends React.PureComponent<Props> {

  static propTypes = {
    item: chatMessageItemPropType.isRequired,
    navigation: messageListNavPropType.isRequired,
    focused: PropTypes.bool.isRequired,
    toggleFocus: PropTypes.func.isRequired,
    verticalBounds: verticalBoundsPropType,
    keyboardShowing: PropTypes.bool.isRequired,
    lightboxPosition: PropTypes.instanceOf(Animated.Value),
  };

  render() {
    const heightStyle = { height: this.props.item.contentHeight };
    return (
      <ComposedMessage
        item={this.props.item}
        sendFailed={sendFailed(this.props.item)}
        focused={this.props.focused}
      >
        <View style={[heightStyle, styles.container]}>
          {this.renderContent()}
        </View>
      </ComposedMessage>
    );
  }

  renderContent(): React.Node {
    const { messageInfo, imageHeight } = this.props.item;
    invariant(messageInfo.media.length > 0, "should have media");
    if (messageInfo.media.length === 1) {
      return this.renderImage(
        messageInfo.media[0],
        0,
        0,
        allCorners,
      );
    }

    const mediaPerRow = getMediaPerRow(messageInfo.media.length);
    const numRows = Math.ceil(messageInfo.media.length / mediaPerRow);
    const rowHeight = imageHeight + spaceBetweenImages;

    const rows = [];
    let verticalOffset = 0;
    for (
      let i = 0, verticalOffset = 0;
      i < messageInfo.media.length;
      i += mediaPerRow, verticalOffset += rowHeight
    ) {
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
        const corners = {
          topLeft: firstRow && firstInRow,
          topRight: firstRow && inLastColumn,
          bottomLeft: lastRow && firstInRow,
          bottomRight: lastRow && inLastColumn,
        };
        const style = lastInRow ? null : styles.imageBeforeImage;
        row.push(this.renderImage(
          media,
          i + j,
          verticalOffset,
          corners,
          style,
        ));
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

  renderImage(
    media: Media,
    index: number,
    verticalOffset: number,
    corners: Corners,
    style?: ImageStyle,
  ): React.Node {
    const filteredCorners = filterCorners(corners, this.props.item);
    const roundedStyle = getRoundedContainerStyle(
      filteredCorners,
      borderRadius,
    );
    const { pendingUploads } = this.props.item;
    const mediaInfo = {
      ...media,
      corners: filteredCorners,
      index,
    };
    const pendingUpload = pendingUploads && pendingUploads[media.id];
    return (
      <MultimediaMessageMultimedia
        mediaInfo={mediaInfo}
        navigation={this.props.navigation}
        verticalBounds={this.props.verticalBounds}
        verticalOffset={verticalOffset}
        style={[ style, roundedStyle ]}
        lightboxPosition={this.props.lightboxPosition}
        postInProgress={!!pendingUploads}
        pendingUpload={pendingUpload}
        keyboardShowing={this.props.keyboardShowing}
        messageFocused={this.props.focused}
        toggleMessageFocus={this.props.toggleFocus}
        item={this.props.item}
        key={index}
      />
    );
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

const WrappedMultimediaMessage = withLightboxPositionContext(MultimediaMessage);

export {
  borderRadius as multimediaMessageBorderRadius,
  WrappedMultimediaMessage as MultimediaMessage,
  multimediaMessageContentHeights,
  multimediaMessageItemHeight,
};
