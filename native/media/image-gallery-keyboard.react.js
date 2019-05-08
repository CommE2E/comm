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
  ActivityIndicator,
} from 'react-native';
import { KeyboardRegistry } from 'react-native-keyboard-input';
import invariant from 'invariant';

import { contentBottomOffset } from '../selectors/dimension-selectors';
import ImageGalleryImage from './image-gallery-image.react';

type State = {|
  imageInfos: ?$ReadOnlyArray<GalleryImageInfo>,
  error: ?string,
  containerHeight: ?number,
  // null means end reached; undefined means no fetch yet
  cursor: ?string,
|};
class ImageGalleryKeyboard extends React.PureComponent<{||}, State> {

  state = {
    imageInfos: null,
    error: null,
    containerHeight: null,
    cursor: undefined,
  };
  mounted = false;
  fetchingPhotos = false;

  componentDidMount() {
    this.mounted = true;
    return this.fetchPhotos();
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  guardedSetState(change) {
    if (this.mounted) {
      this.setState(change);
    }
  }

  async fetchPhotos(after?: ?string) {
    if (this.fetchingPhotos) {
      return;
    }
    this.fetchingPhotos = true;
    try {
      if (Platform.OS === "android") {
        const hasPermission = await this.getAndroidPermissions();
        if (!hasPermission) {
          return;
        }
      }
      const { edges, page_info } = await CameraRoll.getPhotos({
        first: 20,
        after,
        groupTypes: "All",
        assetType: "Photos",
      });
      const imageURIs = this.state.imageInfos
        ? this.state.imageInfos.map(({ uri }) => uri)
        : [];
      const existingURIs = new Set(imageURIs);
      const imageInfos = edges.map(
        ({ node }) => {
          const { uri, height, width } = node.image;
          if (existingURIs.has(uri)) {
            return null;
          }
          existingURIs.add(uri);
          return { uri, height, width };
        },
      ).filter(Boolean);
      this.guardedSetState((prevState: State) => {
        const updatedImageInfos = prevState.imageInfos
          ? [ ...prevState.imageInfos, ...imageInfos ]
          : imageInfos;
        const cursor = page_info.has_next_page
          ? page_info.end_cursor
          : null;
        return {
          imageInfos: updatedImageInfos,
          error: null,
          cursor,
        };
      });
    } catch (e) {
      this.guardedSetState({
        imageInfos: null,
        error: "something went wrong :(",
      });
    }
    this.fetchingPhotos = false;
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
      this.guardedSetState({ error: "don't have permissions :(" });
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

  static renderItemSeparator() {
    return <View style={styles.separator} />;
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
          ItemSeparatorComponent={ImageGalleryKeyboard.renderItemSeparator}
          keyExtractor={ImageGalleryKeyboard.keyExtractor}
          scrollsToTop={false}
          showsHorizontalScrollIndicator={false}
          onEndReached={this.onEndReached}
          onEndReachedThreshold={5}
          extraData={this.state.containerHeight}
        />
      );
    } else if (error) {
      content = <Text style={styles.error}>{error}</Text>;
    } else {
      content = (
        <ActivityIndicator
          color="black"
          size="large"
          style={styles.loadingIndicator}
        />
      );
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
    this.guardedSetState({ containerHeight: event.nativeEvent.layout.height });
  }

  onSelectImage = (imageInfo: GalleryImageInfo) => {
    KeyboardRegistry.onItemSelected(imageGalleryKeyboardName, imageInfo);
  }

  onEndReached = () => {
    const { cursor } = this.state;
    if (cursor !== null) {
      this.fetchPhotos(cursor);
    }
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
    alignItems: 'center',
  },
  error: {
    flex: 1,
    fontSize: 28,
    textAlign: 'center',
    marginBottom: contentBottomOffset,
  },
  separator: {
    width: 2,
  },
  loadingIndicator: {
    flex: 1,
    marginBottom: contentBottomOffset,
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
