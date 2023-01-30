// @flow

import * as React from 'react';
import {
  View,
  TouchableOpacity,
  Image,
  FlatList,
  useWindowDimensions,
} from 'react-native';

import type { Media } from 'lib/types/media-types';

import { useStyles } from '../../themes/colors';

function ThreadSettingsMediaGallery(): React.Node {
  const styles = useStyles(unboundStyles);
  const galleryItemGap = 8;
  const { width } = useWindowDimensions();

  const galleryItemWidth = (width - galleryItemGap * 3) / 3;
  const mediaInfos = [];

  const memoizedStyles = React.useMemo(() => {
    return {
      mediaContainer: {
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
    ({ item }) => {
      return <GalleryItem item={item} memoizedStyles={memoizedStyles} />;
    },
    [memoizedStyles],
  );

  return <FlatList data={mediaInfos} numColumns={3} renderItem={renderItem} />;
}

const GalleryItem: React.ComponentType<{
  item: Media,
  memoizedStyles: Object,
}> = React.memo(({ item, memoizedStyles }) => {
  return (
    <View key={item.id} style={memoizedStyles.mediaContainer}>
      <TouchableOpacity>
        <Image source={item.uri} style={memoizedStyles.media} />
      </TouchableOpacity>
    </View>
  );
});
GalleryItem.displayName = 'GalleryItem';

const unboundStyles = {
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
