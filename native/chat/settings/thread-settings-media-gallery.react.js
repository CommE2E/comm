// @flow

import * as React from 'react';
import {
  View,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';

import { useStyles } from '../../themes/colors';

function ThreadSettingsMediaGallery(): React.Node {
  const styles = useStyles(unboundStyles);
  const galleryItemGap = 8;
  const galleryFirstItemGap = 0;

  const galleryItemWidth =
    (Dimensions.get('window').width - galleryItemGap * 3) / 3;
  const mediaInfos = [];

  return (
    <ScrollView>
      <View style={styles.container}>
        {mediaInfos.map((media, i) => {
          return (
            <View
              key={i}
              style={[
                styles.mediaContainer,
                {
                  marginTop: galleryItemGap,
                  marginLeft:
                    i % 3 !== 0 ? galleryItemGap : galleryFirstItemGap,
                  width: galleryItemWidth,
                },
              ]}
            >
              <TouchableOpacity>
                <Image
                  source={media.source}
                  style={[
                    styles.media,
                    {
                      width: galleryItemWidth,
                    },
                  ]}
                />
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    </ScrollView>
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
