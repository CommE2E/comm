// @flow

import type { GalleryImageInfo } from './image-gallery-image.react';

import * as React from 'react';
import {
  View,
  Text,
  StyleSheet,
  CameraRoll,
  Platform,
  PermissionsAndroid,
  FlatList,
} from 'react-native';
import { KeyboardRegistry } from 'react-native-keyboard-input';
import invariant from 'invariant';

import { contentBottomOffset } from '../selectors/dimension-selectors';
import ImageGalleryImage from './image-gallery-image.react';

type State = {|
  imageInfos: ?$ReadOnlyArray<GalleryImageInfo>,
  error: ?string,
  containerHeight: ?number,
|};
class ImageGalleryKeyboard extends React.PureComponent<{||}, State> {

  state = {
    imageInfos: null,
    error: null,
    containerHeight: null,
  };

  async componentDidMount() {
    try {
      if (Platform.OS === "android") {
        const hasPermission = await this.getAndroidPermissions();
        if (!hasPermission) {
          return;
        }
      }
      const photoResults = await CameraRoll.getPhotos({
        first: 10,
        groupTypes: "All",
        assetType: "Photos",
      });
      const existingURIs = new Set();
      const imageInfos = photoResults.edges.map(
        ({ node }) => {
          const { uri, height, width } = node.image;
          if (existingURIs.has(uri)) {
            return null;
          }
          existingURIs.add(uri);
          return { uri, height, width };
        },
      ).filter(Boolean);
      this.setState({ imageInfos });
    } catch (e) {
      this.setState({ error: "something went wrong :(" });
    }
  }

  async getAndroidPermissions() {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        {
          title: "Access Your Photos",
          message: "Requesting access to your external storage",
        },
      )
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        throw new Error('android_permissions');
      }
      return true;
    } catch (err) {
      this.setState({ error: "don't have permissions :(" });
      return false;
    }
  }

  renderItem = (row: { item: GalleryImageInfo }) => {
    const { containerHeight } = this.state;
    invariant(containerHeight, "should be set");
    return (
      <ImageGalleryImage
        imageInfo={row.item}
        containerHeight={containerHeight}
        onSelect={this.onSelectImage}
      />
    );
  }

  static keyExtractor(item: GalleryImageInfo) {
    return item.uri;
  }

  render() {
    let content;
    const { imageInfos, error, containerHeight } = this.state;
    if (imageInfos && containerHeight) {
      content = (
        <FlatList
          horizontal={true}
          data={imageInfos}
          renderItem={this.renderItem}
          keyExtractor={ImageGalleryKeyboard.keyExtractor}
          scrollsToTop={false}
          showsHorizontalScrollIndicator={false}
          extraData={this.state.containerHeight}
        />
      );
    } else {
      const message = error ? error : "Loading...";
      content = <Text style={styles.text}>{message}</Text>;
    }
    return (
      <View style={styles.container} onLayout={this.onContainerLayout}>
        {content}
      </View>
    );
  }

  onContainerLayout = (
    event: { nativeEvent: { layout: { height: number } } },
  ) => {
    this.setState({ containerHeight: event.nativeEvent.layout.height });
  }

  onSelectImage = (imageInfo: GalleryImageInfo) => {
    KeyboardRegistry.onItemSelected(imageGalleryKeyboardName, imageInfo);
  }

}

const imageGalleryKeyboardName = 'ImageGalleryKeyboard';
const imageGalleryBackgroundColor = '#EEEEEE';

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    bottom: -contentBottomOffset,
    left: 0,
    right: 0,
    backgroundColor: imageGalleryBackgroundColor,
    flexDirection: 'row',
  },
  text: {
    color: 'red',
  },
});

KeyboardRegistry.registerKeyboard(
  imageGalleryKeyboardName,
  () => ImageGalleryKeyboard,
);

export {
  imageGalleryKeyboardName,
  imageGalleryBackgroundColor,
};
