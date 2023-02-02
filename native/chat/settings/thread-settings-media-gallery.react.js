// @flow

import * as React from 'react';
import {
  View,
  TouchableOpacity,
  Image,
  FlatList,
  useWindowDimensions,
} from 'react-native';
import Video from 'react-native-video';

import { fetchThreadMedia } from 'lib/actions/thread-actions';
import { useServerCall } from 'lib/utils/action-utils';

import { useStyles } from '../../themes/colors';
import { defaultURLPrefix } from '../../utils/url-utils';

type ThreadSettingsMediaGalleryProps = {
  +threadID: string,
};

function ThreadSettingsMediaGallery(
  props: ThreadSettingsMediaGalleryProps,
): React.Node {
  const styles = useStyles(unboundStyles);
  const galleryItemGap = 8;
  const { width } = useWindowDimensions();
  const galleryItemWidth = (width - galleryItemGap * 3) / 3;

  const { threadID } = props;
  const [mediaInfos, setMediaInfos] = React.useState([]);
  const callFetchThreadMedia = useServerCall(fetchThreadMedia);

  React.useEffect(() => {
    const fetchData = async () => {
      const result = await callFetchThreadMedia(threadID);
      setMediaInfos(result);
    };
    fetchData();
  }, [callFetchThreadMedia, threadID]);

  // We create this array to handle both production and dev environments.
  // Within the dev environment, the `http://localhost:3000/comm` prefix is
  // fine for the iOS simulator, but not for Android. So we replace it with
  // `defaultURLPrefix` which is `http://localhost:3000/comm` for iOS and
  // `http://10.0.2.2:3000/comm` for Android. Within production, we don't need
  // to do anything (in theory).
  let mediaInfosForEnvironment = [];
  if (mediaInfos.length > 0) {
    mediaInfosForEnvironment = mediaInfos.map(media => {
      if (__DEV__) {
        const uri = media.uri.replace(
          'http://localhost:3000/comm',
          defaultURLPrefix,
        );
        return { ...media, uri };
      }
      return media;
    });
  }

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
      return (
        <View key={item.id} style={memoizedStyles.mediaContainer}>
          <TouchableOpacity>
            {item.type === 'photo' ? (
              <Image source={{ uri: item.uri }} style={memoizedStyles.media} />
            ) : (
              <Video
                source={{ uri: item.uri }}
                style={memoizedStyles.media}
                resizeMode="cover"
                repeat={true}
                muted={true}
                paused={false}
              />
            )}
          </TouchableOpacity>
        </View>
      );
    },
    [memoizedStyles.media, memoizedStyles.mediaContainer],
  );

  return (
    <FlatList
      data={mediaInfosForEnvironment}
      numColumns={3}
      renderItem={renderItem}
    />
  );
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
