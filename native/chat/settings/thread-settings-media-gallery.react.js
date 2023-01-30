// @flow

import * as React from 'react';
import {
  View,
  TouchableOpacity,
  Image,
  FlatList,
  useWindowDimensions,
} from 'react-native';

import { useStyles } from '../../themes/colors';

function ThreadSettingsMediaGallery(): React.Node {
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
  const mediaInfos = React.useMemo(() => [], []);

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

      return (
        <View key={item.id} style={containerStyle}>
          <TouchableOpacity>
            <Image source={item.source} style={memoizedStyles.media} />
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

  return (
    <View style={styles.flatListContainer}>
      <FlatList data={mediaInfos} numColumns={3} renderItem={renderItem} />
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
