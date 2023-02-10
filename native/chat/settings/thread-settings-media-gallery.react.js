// @flow

import * as React from 'react';
import {
  View,
  TouchableOpacity,
  FlatList,
  useWindowDimensions,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import Video from 'react-native-video';

import { fetchThreadMedia } from 'lib/actions/thread-actions';
import { useServerCall } from 'lib/utils/action-utils';

import { useStyles } from '../../themes/colors';

type ThreadSettingsMediaGalleryProps = {
  +threadID: string,
  +limit: number,
  +offset?: number,
  +activeTab?: string,
};

function ThreadSettingsMediaGallery(
  props: ThreadSettingsMediaGalleryProps,
): React.Node {
  const styles = useStyles(unboundStyles);
  const galleryItemGap = 8;
  const { width } = useWindowDimensions();

  // Explanation of galleryItemWidth:
  // The FlatList has a horizontal padding of 16px on each side,
  // and so the width of the actual FlatList is `width - 32px`.
  // With three columns, there will be two gaps in between the items,
  // so the width of each item (with the gaps) will be
  // (width - 32px - 2 * galleryItemGap) / 3. Consider the component:
  // 16px, media, galleryItemGap, media, galleryItemGap, media, 16px
  const galleryItemWidth = (width - 2 * 16 - 2 * galleryItemGap) / 3;
  const { threadID, limit, offset, activeTab } = props;
  const [mediaInfos, setMediaInfos] = React.useState([]);
  const callFetchThreadMedia = useServerCall(fetchThreadMedia);

  React.useEffect(() => {
    const fetchData = async () => {
      const result = await callFetchThreadMedia({ threadID, limit, offset: 0 });
      setMediaInfos(result.media);
    };
    fetchData();
  }, [callFetchThreadMedia, threadID, limit, offset]);

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
  }, [galleryItemGap, galleryItemWidth, styles.media, styles.mediaContainer]);

  const renderItem = React.useCallback(
    ({ item, index }) => {
      const containerStyle =
        index % 3 === 0
          ? memoizedStyles.mediaContainer
          : memoizedStyles.mediaContainerWithMargin;

      if (item.type === 'photo') {
        return (
          <View key={item.id} style={containerStyle}>
            <TouchableOpacity>
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
          <TouchableOpacity>
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

  const onEndReached = React.useCallback(() => {
    // Offset will be undefined if the media gallery is rendered in the
    // thread settings (since no offset prop is passed in). If rendered in
    // the full screen media gallery, offset will be defined and we will
    // render the FlatList with an onEndReached prop.
    if (offset === undefined) {
      return;
    }

    // As the FlatList fetches more media, we set the offset to be the length
    // of mediaInfos. This will ensure that the next set of media is retrieved
    // from the starting point.
    callFetchThreadMedia({ threadID, limit, offset: mediaInfos.length }).then(
      result => {
        setMediaInfos([...mediaInfos, ...result.media]);
      },
    );
  }, [callFetchThreadMedia, mediaInfos, threadID, limit, offset]);

  return (
    <View style={styles.flatListContainer}>
      <FlatList
        data={filteredMediaInfos}
        numColumns={3}
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
