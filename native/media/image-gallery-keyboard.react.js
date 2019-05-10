// @flow

import type { GalleryImageInfo } from './image-gallery-image.react';
import type { AppState } from '../redux/redux-setup';
import { type Dimensions, dimensionsPropType } from 'lib/types/media-types';

import * as React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  PermissionsAndroid,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { KeyboardRegistry } from 'react-native-keyboard-input';
import invariant from 'invariant';
import { Provider } from 'react-redux';
import CameraRoll from '@react-native-community/cameraroll';

import { connect } from 'lib/utils/redux-utils';

import { store } from '../redux/redux-setup';
import {
  dimensionsSelector,
  contentBottomOffset,
} from '../selectors/dimension-selectors';
import ImageGalleryImage from './image-gallery-image.react';

type Props = {|
  // Redux state
  screenDimensions: Dimensions,
|};
type State = {|
  imageInfos: ?$ReadOnlyArray<GalleryImageInfo>,
  error: ?string,
  containerHeight: ?number,
  // null means end reached; undefined means no fetch yet
  cursor: ?string,
  queuedImageURIs: Set<string>,
  focusedImageURI: ?string,
  screenWidth: number,
|};
class ImageGalleryKeyboard extends React.PureComponent<Props, State> {

  static propTypes = {
    screenDimensions: dimensionsPropType.isRequired,
  };
  mounted = false;
  fetchingPhotos = false;

  constructor(props: Props) {
    super(props);
    this.state = {
      imageInfos: null,
      error: null,
      containerHeight: null,
      cursor: undefined,
      queuedImageURIs: new Set(),
      focusedImageURI: null,
      screenWidth: props.screenDimensions.width,
    };
  }

  componentDidMount() {
    this.mounted = true;
    return this.fetchPhotos();
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  componentDidUpdate(prevProps: Props) {
    const { width } = this.props.screenDimensions;
    if (width !== prevProps.screenDimensions.width) {
      // We keep screenWidth in this.state since that's what we pass in as
      // FlatList's extraData
      this.setState({ screenWidth: width });
    }
  }

  guardedSetState(change) {
    if (this.mounted) {
      this.setState(change);
    }
  }

  static getPhotosQuery(after: ?string) {
    const base = {};
    base.first = 20;
    base.assetType = "Photos";
    if (Platform.OS !== "android") {
      base.groupTypes = "All";
    }
    if (after) {
      base.after = after;
    }
    return base;
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
      const { edges, page_info } = await CameraRoll.getPhotos(
        ImageGalleryKeyboard.getPhotosQuery(after),
      );
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

  get queueModeActive() {
    return this.state.queuedImageURIs.size > 0;
  }

  renderItem = (row: { item: GalleryImageInfo }) => {
    const { containerHeight, queuedImageURIs } = this.state;
    invariant(containerHeight, "should be set");
    const { uri } = row.item;
    const isQueued = queuedImageURIs.has(uri);
    const { queueModeActive } = this;
    return (
      <ImageGalleryImage
        imageInfo={row.item}
        containerHeight={containerHeight}
        queueModeActive={queueModeActive}
        isQueued={isQueued}
        setImageQueued={this.setImageQueued}
        sendImage={this.sendImage}
        isFocused={this.state.focusedImageURI === uri}
        setFocus={this.setFocus}
        screenWidth={this.state.screenWidth}
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
          extraData={this.state}
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

  onEndReached = () => {
    const { cursor } = this.state;
    if (cursor !== null) {
      this.fetchPhotos(cursor);
    }
  }

  setImageQueued = (imageInfo: GalleryImageInfo, isQueued: bool) => {
    this.setState((prevState: State) => {
      const prevQueuedImageURIs = [ ...prevState.queuedImageURIs ];
      if (isQueued) {
        return {
          queuedImageURIs: new Set([
            ...prevQueuedImageURIs,
            imageInfo.uri,
          ]),
        };
      }
      const queuedImageURIs = prevQueuedImageURIs.filter(
        uri => uri !== imageInfo.uri,
      );
      if (queuedImageURIs.length < prevQueuedImageURIs.length) {
        return { queuedImageURIs: new Set(queuedImageURIs) };
      }
      return null;
    });
  }

  setFocus = (imageInfo: GalleryImageInfo) => {
    this.setState({ focusedImageURI: imageInfo.uri });
  }

  sendImage = (imageInfo: GalleryImageInfo) => {
    this.sendImages([ imageInfo ]);
  }

  sendQueuedImages = () => {
    const { imageInfos, queuedImageURIs } = this.state;
    invariant(imageInfos, "should be set");
    const queuedImageInfos = [];
    for (let uri of this.state.queuedImageURIs) {
      for (let imageInfo of imageInfos) {
        if (imageInfo.uri === uri) {
          queuedImageInfos.push(imageInfo);
          break;
        }
      }
    }
    this.sendImages(queuedImageInfos);
  }

  sendImages(imageInfos: $ReadOnlyArray<GalleryImageInfo>) {
    KeyboardRegistry.onItemSelected(imageGalleryKeyboardName, imageInfos);
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

const ReduxConnectedImageGalleryKeyboard = connect(
  (state: AppState) => ({
    screenDimensions: dimensionsSelector(state)
  }),
)(ImageGalleryKeyboard);

function ReduxImageGalleryKeyboard(props: {||}) {
  return (
    <Provider store={store}>
      <ReduxConnectedImageGalleryKeyboard />
    </Provider>
  );
}

KeyboardRegistry.registerKeyboard(
  imageGalleryKeyboardName,
  () => ReduxImageGalleryKeyboard,
);

export {
  imageGalleryKeyboardName,
  imageGalleryBackgroundColor,
};
