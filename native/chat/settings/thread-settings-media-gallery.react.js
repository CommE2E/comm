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
};

function ThreadSettingsMediaGallery(
  props: ThreadSettingsMediaGalleryProps,
): React.Node {
  const styles = useStyles(unboundStyles);
  const galleryItemGap = 8;
  const { width } = useWindowDimensions();

  const galleryItemWidth = (width - galleryItemGap * 3) / 3;
  const { threadID, limit } = props;
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

  const renderMediaContainer = React.useCallback(
    child => (
      <View style={memoizedStyles.mediaContainer}>
        <TouchableOpacity>{child}</TouchableOpacity>
      </View>
    ),
    [memoizedStyles.mediaContainer],
  );

  const renderItem = React.useCallback(
    ({ item }) => {
      if (item.type === 'photo') {
        return renderMediaContainer(
          <FastImage source={{ uri: item.uri }} style={memoizedStyles.media} />,
        );
      }
      return renderMediaContainer(
        <Video
          source={{ uri: item.uri }}
          style={memoizedStyles.media}
          resizeMode="cover"
          repeat={true}
          muted={true}
          paused={false}
        />,
      );
    },
    [renderMediaContainer, memoizedStyles.media],
  );

  return <FlatList data={mediaInfos} numColumns={3} renderItem={renderItem} />;
}

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
