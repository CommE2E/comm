// @flow

import { useNavigation, useRoute } from '@react-navigation/native';
import invariant from 'invariant';
import * as React from 'react';
import { View, useWindowDimensions } from 'react-native';
import type { ViewStyleProp } from 'react-native/Libraries/StyleSheet/StyleSheet';
import { FlatList } from 'react-native-gesture-handler';

import { useFetchThreadMedia } from 'lib/hooks/thread-hooks.js';
import type { MediaInfo, Media } from 'lib/types/media-types';

import {
  ThreadSettingsCategoryActionHeader,
  ThreadSettingsCategoryFooter,
} from './thread-settings-category.react.js';
import GestureTouchableOpacity from '../../components/gesture-touchable-opacity.react.js';
import type { ImageModalParams } from '../../media/image-modal.react.js';
import Multimedia from '../../media/multimedia.react.js';
import type { VideoPlaybackModalParams } from '../../media/video-playback-modal.react.js';
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
  +onPressSeeMore?: () => mixed,
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
  const { threadID, limit, verticalBounds, offset, activeTab, onPressSeeMore } =
    props;
  const [mediaInfos, setMediaInfos] = React.useState<$ReadOnlyArray<Media>>([]);
  const callFetchThreadMedia = useFetchThreadMedia();

  React.useEffect(() => {
    const fetchData = async () => {
      const result = await callFetchThreadMedia({
        threadID,
        limit,
        offset: 0,
      });
      setMediaInfos(result.media);
    };
    void fetchData();
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
      return mediaInfos.filter(
        mediaInfo =>
          mediaInfo.type === 'photo' || mediaInfo.type === 'encrypted_photo',
      );
    } else if (activeTab === 'VIDEOS') {
      return mediaInfos.filter(
        mediaInfo =>
          mediaInfo.type === 'video' || mediaInfo.type === 'encrypted_video',
      );
    }
    return mediaInfos;
  }, [activeTab, mediaInfos]);

  const renderItem = React.useCallback(
    ({ item, index }: { +item: Media, +index: number, ... }) => (
      <MediaGalleryItem
        item={item}
        index={index}
        memoizedStyles={memoizedStyles}
        threadID={threadID}
        verticalBounds={verticalBounds}
      />
    ),
    [threadID, verticalBounds, memoizedStyles],
  );

  const onEndReached = React.useCallback(async () => {
    // As the FlatList fetches more media, we set the offset to be the length
    // of mediaInfos. This will ensure that the next set of media is retrieved
    // from the starting point.
    const result = await callFetchThreadMedia({
      threadID,
      limit,
      offset: mediaInfos.length,
    });
    setMediaInfos([...mediaInfos, ...result.media]);
  }, [callFetchThreadMedia, mediaInfos, threadID, limit]);

  const { header, footer } = React.useMemo(() => {
    if (mediaInfos.length === 0 || !onPressSeeMore) {
      return {
        header: null,
        footer: null,
      };
    }

    const threadSettingsHeader = (
      <ThreadSettingsCategoryActionHeader
        title="Media Gallery"
        actionText="See more"
        onPress={onPressSeeMore}
      />
    );

    const threadSettingsFooter = (
      <ThreadSettingsCategoryFooter type="outline" />
    );

    return {
      header: threadSettingsHeader,
      footer: threadSettingsFooter,
    };
  }, [mediaInfos.length, onPressSeeMore]);

  const threadSettingsMediaGallery = React.useMemo(() => {
    if (mediaInfos.length === 0) {
      return null;
    }

    return (
      <>
        {header}
        <View style={styles.flatListContainer}>
          <FlatList
            data={filteredMediaInfos}
            numColumns={numColumns}
            renderItem={renderItem}
            onEndReached={offset !== undefined ? onEndReached : null}
            onEndReachedThreshold={1}
          />
        </View>
        {footer}
      </>
    );
  }, [
    filteredMediaInfos,
    footer,
    header,
    mediaInfos.length,
    offset,
    onEndReached,
    renderItem,
    styles.flatListContainer,
  ]);

  return threadSettingsMediaGallery;
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
  const ref = React.useRef<?React.ElementRef<typeof View>>(null);
  const onLayout = React.useCallback(() => {}, []);
  const { threadID, verticalBounds, memoizedStyles, item, index } = props;

  const mediaInfo: MediaInfo = React.useMemo(
    () => ({
      ...(item: Media),
      index,
    }),
    [item, index],
  );

  const navigateToMedia = React.useCallback(() => {
    ref.current?.measure((x, y, width, height, pageX, pageY) => {
      const initialCoordinates: LayoutCoordinates = {
        x: pageX,
        y: pageY,
        width,
        height,
      };

      invariant(
        verticalBounds,
        'verticalBounds should be set in navigateToMedia',
      );
      const params: ImageModalParams | VideoPlaybackModalParams = {
        presentedFrom: route.key,
        mediaInfo,
        initialCoordinates,
        verticalBounds,
      };
      navigation.navigate<'VideoPlaybackModal' | 'ImageModal'>({
        name:
          mediaInfo.type === 'video' || mediaInfo.type === 'encrypted_video'
            ? VideoPlaybackModalRouteName
            : ImageModalRouteName,
        key: `multimedia|${threadID}|${mediaInfo.id}`,
        params,
      });
    });
  }, [navigation, route, threadID, mediaInfo, verticalBounds]);

  const containerStyle =
    index % numColumns === 0
      ? memoizedStyles.mediaContainer
      : memoizedStyles.mediaContainerWithMargin;

  return (
    <View key={item.id} style={containerStyle} onLayout={onLayout} ref={ref}>
      <GestureTouchableOpacity
        onPress={navigateToMedia}
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
