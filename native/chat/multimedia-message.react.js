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

import * as React from 'react';
import {
  Text,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import PropTypes from 'prop-types';
import invariant from 'invariant';

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
  verticalBounds: ?VerticalBounds,
|};
class MultimediaMessage extends React.PureComponent<Props> {

  static propTypes = {
    item: chatMessageItemPropType.isRequired,
    navigate: PropTypes.func.isRequired,
    toggleFocus: PropTypes.func.isRequired,
    verticalBounds: verticalBoundsPropType,
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
    invariant(messageInfo.media.length > 0, "should have media");
    if (messageInfo.media.length === 1) {
      return this.renderImage(messageInfo.media[0]);
    }

    const mediaPerRow = getMediaPerRow(messageInfo.media.length);
    const numRows = Math.ceil(messageInfo.media.length / mediaPerRow);

    const rows = [];
    for (let i = 0; i < messageInfo.media.length; i += mediaPerRow) {
      const rowMedia = messageInfo.media.slice(i, i + mediaPerRow);
      const row = [];
      let j = 0;
      for (; j < rowMedia.length; j++) {
        const media = rowMedia[j];
        const style = j + 1 < mediaPerRow
          ? styles.imageBeforeImage
          : null;
        row.push(this.renderImage(media, style));
      }
      for (; j < mediaPerRow; j++) {
        const key = `filler${j}`;
        const style = j + 1 < mediaPerRow
          ? [ styles.filler, styles.imageBeforeImage ]
          : styles.filler;
        row.push(<View style={[ style, styles.filler ]} key={key} />);
      }

      const rowStyle = i + mediaPerRow < messageInfo.media.length
        ? [ styles.row, styles.rowAboveRow ]
        : styles.row;
      rows.push(
        <View style={rowStyle} key={i}>
          {row}
        </View>
      );
    }
    return <View style={styles.grid}>{rows}</View>;
  }

  renderImage(media: Media, style?: ?ImageStyle): React.Node {
    return (
      <MultimediaMessageMultimedia
        media={media}
        navigate={this.props.navigate}
        verticalBounds={this.props.verticalBounds}
        style={style}
        key={media.id}
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

export {
  MultimediaMessage,
  multimediaMessageContentHeight,
  multimediaMessageItemHeight,
};
