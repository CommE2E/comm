// @flow

import { useNavigation, useRoute } from '@react-navigation/native';
import * as React from 'react';
import { View, useWindowDimensions } from 'react-native';
import type { ViewStyleProp } from 'react-native/Libraries/StyleSheet/StyleSheet';
import { FlatList } from 'react-native-gesture-handler';

import { fetchThreadMedia } from 'lib/actions/thread-actions.js';
import type { MediaInfo, Media } from 'lib/types/media-types';
import { useServerCall } from 'lib/utils/action-utils.js';

import GestureTouchableOpacity from '../../components/gesture-touchable-opacity.react.js';
import Multimedia from '../../media/multimedia.react.js';
import {
  ImageModalRouteName,
  VideoPlaybackModalRouteName,
} from '../../navigation/route-names.js';
import { useStyles } from '../../themes/colors.js';
import type {
  LayoutCoordinates,
  VerticalBounds,
} from '../../types/layout-types.js';

const galleryItemGap = 8;
const numColumns = 3;

type ThreadSettingsMediaGalleryProps = {
  +threadID: string,
  +limit: number,
  +verticalBounds: ?VerticalBounds,
  +offset?: number,
  +activeTab?: string,
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
  const { threadID, limit, verticalBounds, offset, activeTab } = props;
  const [mediaInfos, setMediaInfos] = React.useState([]);
  const [adjustedOffset, setAdjustedOffset] = React.useState(offset || 0);
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
      setAdjustedOffset(result.adjustedOffset);
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

  const filteredMediaInfos = React.useMemo(() => {
    if (activeTab === 'ALL') {
      return mediaInfos;
    } else if (activeTab === 'IMAGES') {
      return mediaInfos.filter(mediaInfo => mediaInfo.type === 'photo');
    } else if (activeTab === 'VIDEOS') {
      return mediaInfos.filter(mediaInfo => mediaInfo.type === 'video');
    }
    return mediaInfos;
  }, [activeTab, mediaInfos]);

  const renderItem = React.useCallback(
    ({ item, index }) => {
      return (
        <MediaGalleryItem
          item={item}
          index={index}
          memoizedStyles={memoizedStyles}
          threadID={threadID}
          verticalBounds={verticalBounds}
        />
      );
    },
    [threadID, verticalBounds, memoizedStyles],
  );

  const onEndReached = React.useCallback(async () => {
    // We need to provide the existing media and thumbnail IDs with the request
    // in order to ensure that we don't get duplicate media. Coerce the IDs to
    // strings because the server returns them as either strings or numbers.
    const mediaIDs = mediaInfos.map(mediaInfo => String(mediaInfo.id));
    const thumbnailIDs = mediaInfos.map(
      mediaInfo => String(mediaInfo.thumbnailID) || '',
    );
    const currentMediaIDs = [...mediaIDs, ...thumbnailIDs];

    // As the FlatList fetches more media, we set the offset to be the length
    // of mediaInfos. This will ensure that the next set of media is retrieved
    // from the starting point.
    const result = await callFetchThreadMedia({
      threadID,
      limit,
      offset: adjustedOffset,
      currentMediaIDs,
    });
    setMediaInfos([...mediaInfos, ...result.media]);
    setAdjustedOffset(result.adjustedOffset);
  }, [callFetchThreadMedia, mediaInfos, threadID, limit, adjustedOffset]);

  return (
    <View style={styles.flatListContainer}>
      <FlatList
        data={filteredMediaInfos}
        numColumns={numColumns}
        renderItem={renderItem}
        onEndReached={offset !== undefined ? onEndReached : null}
        onEndReachedThreshold={1}
      />
    </View>
  );
}

type MediaGalleryItemProps = {
  +item: Media,
  +index: number,
  +memoizedStyles: {
    +mediaContainer: ViewStyleProp,
    +mediaContainerWithMargin: ViewStyleProp,
    +media: ViewStyleProp,
  },
  +threadID: string,
  +verticalBounds: ?VerticalBounds,
};

function MediaGalleryItem(props: MediaGalleryItemProps): React.Node {
  const navigation = useNavigation();
  const route = useRoute();
  const ref = React.useRef(null);
  const onLayout = React.useCallback(() => {}, []);
  const { threadID, verticalBounds, memoizedStyles, item, index } = props;

  const navigateToMedia = React.useCallback(
    (mediaInfo: MediaInfo, media: Media) => {
      ref.current?.measure((x, y, width, height, pageX, pageY) => {
        const initialCoordinates: LayoutCoordinates = {
          x: pageX,
          y: pageY,
          width,
          height,
        };

        navigation.navigate<'VideoPlaybackModal' | 'ImageModal'>({
          name:
            mediaInfo.type === 'video'
              ? VideoPlaybackModalRouteName
              : ImageModalRouteName,
          key: `multimedia|${threadID}|${mediaInfo.index}`,
          params: {
            presentedFrom: route.key,
            mediaInfo,
            item: media,
            initialCoordinates,
            verticalBounds,
          },
        });
      });
    },
    [navigation, route, threadID, verticalBounds],
  );

  const containerStyle =
    index % numColumns === 0
      ? memoizedStyles.mediaContainer
      : memoizedStyles.mediaContainerWithMargin;

  const mediaInfo: MediaInfo = {
    ...(item: Media),
    index,
  };

  return (
    <View key={item.id} style={containerStyle} onLayout={onLayout} ref={ref}>
      <GestureTouchableOpacity
        onPress={() => navigateToMedia(mediaInfo, item)}
        style={memoizedStyles.media}
      >
        <Multimedia mediaInfo={mediaInfo} spinnerColor="black" />
      </GestureTouchableOpacity>
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
