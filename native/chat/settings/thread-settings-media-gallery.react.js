// @flow

import * as React from 'react';
import { View, useWindowDimensions } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';

import { fetchThreadMedia } from 'lib/actions/thread-actions.js';
import type { MediaInfo } from 'lib/types/media-types';
import { useServerCall } from 'lib/utils/action-utils.js';

import GestureTouchableOpacity from '../../components/gesture-touchable-opacity.react.js';
import Multimedia from '../../media/multimedia.react.js';
import { useStyles } from '../../themes/colors.js';

const galleryItemGap = 8;
const numColumns = 3;

type ThreadSettingsMediaGalleryProps = {
  +threadID: string,
  +limit: number,
};

function ThreadSettingsMediaGallery(
  props: ThreadSettingsMediaGalleryProps,
): React.Node {
  const styles = useStyles(unboundStyles);
  const { width } = useWindowDimensions();

  // Explanation of galleryItemWidth:
  // The FlatList has a horizontal padding of 16px on each side,
  // and so the width of the actual FlatList is `width - 32px`.
  // With three columns, there will be two gaps in between the items,
  // so the width of each item (with the gaps) will be
  // (width - 32px - (numColumns-1) * galleryItemGap) / numColumns.
  // E.g. 16px, media, galleryItemGap, media, galleryItemGap, media, 16px
  const galleryItemWidth =
    (width - 32 - (numColumns - 1) * galleryItemGap) / numColumns;

  const { threadID, limit } = props;
  const [mediaInfos, setMediaInfos] = React.useState([]);
  const callFetchThreadMedia = useServerCall(fetchThreadMedia);

  React.useEffect(() => {
    const fetchData = async () => {
      const result = await callFetchThreadMedia({
        threadID,
        limit,
        offset: 0,
        currentMediaIDs: [],
      });
      setMediaInfos(result.media);
    };
    fetchData();
  }, [callFetchThreadMedia, threadID, limit]);

  const memoizedStyles = React.useMemo(() => {
    return {
      mediaContainer: {
        marginTop: galleryItemGap,
        width: galleryItemWidth,
        ...styles.mediaContainer,
      },
      mediaContainerWithMargin: {
        marginTop: galleryItemGap,
        marginLeft: galleryItemGap,
        width: galleryItemWidth,
        ...styles.mediaContainer,
      },
      media: {
        width: galleryItemWidth,
        ...styles.media,
      },
    };
  }, [galleryItemWidth, styles.media, styles.mediaContainer]);

  const renderItem = React.useCallback(
    ({ item, index }) => {
      const containerStyle =
        index % numColumns === 0
          ? memoizedStyles.mediaContainer
          : memoizedStyles.mediaContainerWithMargin;

      const mediaInfoItem: MediaInfo = {
        ...item,
        index,
      };

      return (
        <View key={item.id} style={containerStyle}>
          <GestureTouchableOpacity style={memoizedStyles.media}>
            <Multimedia mediaInfo={mediaInfoItem} spinnerColor="black" />
          </GestureTouchableOpacity>
        </View>
      );
    },
    [
      memoizedStyles.media,
      memoizedStyles.mediaContainer,
      memoizedStyles.mediaContainerWithMargin,
    ],
  );

  return (
    <View style={styles.flatListContainer}>
      <FlatList
        data={mediaInfos}
        numColumns={numColumns}
        renderItem={renderItem}
      />
    </View>
  );
}

const unboundStyles = {
  flatListContainer: {
    paddingHorizontal: 16,
  },
  mediaContainer: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  media: {
    height: 180,
  },
};

export default ThreadSettingsMediaGallery;
