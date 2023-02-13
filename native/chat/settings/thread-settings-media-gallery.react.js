// @flow

import { useNavigation, useRoute } from '@react-navigation/native';
import * as React from 'react';
import { View, TouchableOpacity, useWindowDimensions } from 'react-native';
import FastImage from 'react-native-fast-image';
import { FlatList } from 'react-native-gesture-handler';
import Video from 'react-native-video';

import { fetchThreadMedia } from 'lib/actions/thread-actions.js';
import type { Corners, MediaInfo } from 'lib/types/media-types.js';
import { useServerCall } from 'lib/utils/action-utils.js';

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
  const navigation = useNavigation();
  const route = useRoute();

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
  const callFetchThreadMedia = useServerCall(fetchThreadMedia);

  React.useEffect(() => {
    const fetchData = async () => {
      const result = await callFetchThreadMedia({ threadID, limit, offset: 0 });
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

  const navigateToMedia = React.useCallback(
    (nativeEvent, item, index) => {
      const { pageX, pageY } = nativeEvent;

      const initialCoordinates: LayoutCoordinates = {
        x: pageX,
        y: pageY,
        width: galleryItemWidth,
        height: 180,
      };

      const corners: Corners = {
        topLeft: index === 0,
        topRight: index === numColumns - 1,
        bottomLeft: index === mediaInfos.length - numColumns,
        bottomRight: index === mediaInfos.length - 1,
      };

      const mediaInfo: MediaInfo = {
        ...item,
        index,
        corners,
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
          item,
          initialCoordinates,
          verticalBounds,
        },
      });
    },
    [
      galleryItemWidth,
      mediaInfos.length,
      navigation,
      route.key,
      threadID,
      verticalBounds,
    ],
  );

  const renderItem = React.useCallback(
    ({ item, index }) => {
      const containerStyle =
        index % numColumns === 0
          ? memoizedStyles.mediaContainer
          : memoizedStyles.mediaContainerWithMargin;

      if (item.type === 'photo') {
        return (
          <View key={item.id} style={containerStyle}>
            <TouchableOpacity
              onPress={e => navigateToMedia(e.nativeEvent, item, index)}
            >
              <FastImage
                source={{ uri: item.uri }}
                style={memoizedStyles.media}
              />
            </TouchableOpacity>
          </View>
        );
      }
      return (
        <View key={item.id} style={containerStyle}>
          <TouchableOpacity
            onPress={e => navigateToMedia(e.nativeEvent, item, index)}
          >
            <Video
              source={{ uri: item.uri }}
              style={memoizedStyles.media}
              resizeMode="cover"
              repeat={true}
              muted={true}
              paused={false}
            />
          </TouchableOpacity>
        </View>
      );
    },
    [
      memoizedStyles.media,
      memoizedStyles.mediaContainer,
      memoizedStyles.mediaContainerWithMargin,
      navigateToMedia,
    ],
  );

  const filteredMediaInfos = React.useMemo(() => {
    if (!activeTab || activeTab === 'ALL') {
      return mediaInfos;
    } else if (activeTab === 'IMAGES') {
      return mediaInfos.filter(mediaInfo => mediaInfo.type === 'photo');
    } else if (activeTab === 'VIDEOS') {
      return mediaInfos.filter(mediaInfo => mediaInfo.type === 'video');
    }
  }, [activeTab, mediaInfos]);

  const onEndReached = React.useCallback(async () => {
    // Offset will be undefined if the media gallery is rendered in the
    // thread settings (since no offset prop is passed in). If rendered in
    // the full screen media gallery, offset will be defined and onEndReached
    // will actually do something.
    if (offset === undefined) {
      return;
    }

    // As the FlatList fetches more media, we set the offset to be the length
    // of mediaInfos. This will ensure that the next set of media is retrieved
    // from the starting point.
    const result = await callFetchThreadMedia({
      threadID,
      limit,
      offset: mediaInfos.length,
    });
    setMediaInfos([...mediaInfos, ...result.media]);
  }, [callFetchThreadMedia, mediaInfos, threadID, limit, offset]);

  return (
    <View style={styles.flatListContainer}>
      <FlatList
        data={filteredMediaInfos}
        numColumns={numColumns}
        renderItem={renderItem}
        onEndReached={onEndReached}
        onEndReachedThreshold={1}
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
