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

  const galleryItemWidth = (width - galleryItemGap * 3) / 3;
  const mediaInfos = [];

  const memoizedStyles = React.useMemo(() => {
    return {
      mediaContainer: {
        marginTop: galleryItemGap,
        marginLeft: galleryItemGap,
        width: galleryItemWidth,
      },
      media: {
        width: galleryItemWidth,
      },
    };
  }, [galleryItemGap, galleryItemWidth]);

  return (
    <FlatList
      data={mediaInfos}
      numColumns={3}
      renderItem={({ item, index }) => (
        <View
          key={index}
          style={[styles.mediaContainer, memoizedStyles.mediaContainer]}
        >
          <TouchableOpacity>
            <Image
              source={item.source}
              style={[styles.media, memoizedStyles.media]}
            />
          </TouchableOpacity>
        </View>
      )}
    />
  );
}

const unboundStyles = {
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginBottom: 20,
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
