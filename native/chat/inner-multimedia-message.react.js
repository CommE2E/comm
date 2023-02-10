// @flow
import invariant from 'invariant';
import * as React from 'react';
import { StyleSheet, TouchableWithoutFeedback, View } from 'react-native';

import type { Corners, Media, MediaInfo } from 'lib/types/media-types.js';

import MultimediaMessageMultimedia from './multimedia-message-multimedia.react.js';
import {
  getMediaPerRow,
  spaceBetweenImages,
} from './multimedia-message-utils.js';
import {
  allCorners,
  filterCorners,
  getRoundedContainerStyle,
} from './rounded-corners.js';
import type { ChatMultimediaMessageInfoItem } from '../types/chat-types.js';
import type {
  LayoutCoordinates,
  VerticalBounds,
} from '../types/layout-types.js';
import type { ViewStyle } from '../types/styles.js';

const borderRadius = 16;

type Props = {
  +item: ChatMultimediaMessageInfoItem,
  +verticalBounds: ?VerticalBounds,
  +onPressMultimedia?: (
    mediaInfo: MediaInfo,
    initialCoordinates: LayoutCoordinates,
  ) => void,
  +clickable: boolean,
  +setClickable: boolean => void,
  +onPress?: () => void,
  +onLongPress?: () => void,
};
class InnerMultimediaMessage extends React.PureComponent<Props> {
  render(): React.Node {
    const { item } = this.props;
    const containerStyle = {
      height: item.contentHeight,
      width: item.contentWidth,
    };
    return (
      <TouchableWithoutFeedback
        onPress={this.props.onPress}
        onLongPress={this.props.onLongPress}
      >
        <View style={containerStyle}>{this.renderContent()}</View>
      </TouchableWithoutFeedback>
    );
  }

  renderContent(): React.Node {
    const { messageInfo } = this.props.item;
    invariant(messageInfo.media.length > 0, 'should have media');
    if (messageInfo.media.length === 1) {
      return this.renderImage(messageInfo.media[0], 0, allCorners);
    }

    const mediaPerRow = getMediaPerRow(messageInfo.media.length);

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
        const corners = {
          topLeft: firstRow && firstInRow,
          topRight: firstRow && inLastColumn,
          bottomLeft: lastRow && firstInRow,
          bottomRight: lastRow && inLastColumn,
        };
        const style = lastInRow ? null : styles.imageBeforeImage;
        row.push(this.renderImage(media, i + j, corners, style));
      }
      for (; j < mediaPerRow; j++) {
        const key = `filler${j}`;
        const style =
          j + 1 < mediaPerRow
            ? [styles.filler, styles.imageBeforeImage]
            : styles.filler;
        row.push(<View style={style} key={key} />);
      }

      const rowStyle = lastRow ? styles.row : [styles.row, styles.rowAboveRow];
      rows.push(
        <View style={rowStyle} key={i}>
          {row}
        </View>,
      );
    }

    return <View style={styles.grid}>{rows}</View>;
  }

  renderImage(
    media: Media,
    index: number,
    corners: Corners,
    style?: ViewStyle,
  ): React.Node {
    const filteredCorners = filterCorners(corners, this.props.item);
    const roundedStyle = getRoundedContainerStyle(
      filteredCorners,
      borderRadius,
    );
    const { pendingUploads } = this.props.item;
    const mediaInfo = {
      ...media,
      index,
    };
    const pendingUpload = pendingUploads && pendingUploads[media.id];
    return (
      <MultimediaMessageMultimedia
        mediaInfo={mediaInfo}
        verticalBounds={this.props.verticalBounds}
        style={[style, roundedStyle]}
        postInProgress={!!pendingUploads}
        pendingUpload={pendingUpload}
        item={this.props.item}
        key={index}
        onPressMultimedia={this.props.onPressMultimedia}
        clickable={this.props.clickable}
        setClickable={this.props.setClickable}
      />
    );
  }
}

const styles = StyleSheet.create({
  filler: {
    flex: 1,
  },
  grid: {
    flex: 1,
    justifyContent: 'space-between',
  },
  imageBeforeImage: {
    marginRight: spaceBetweenImages,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowAboveRow: {
    marginBottom: spaceBetweenImages,
  },
});

export {
  InnerMultimediaMessage,
  borderRadius as multimediaMessageBorderRadius,
};
