// @flow

import type { GalleryImageInfo } from './image-gallery-image.react';
import type { AppState } from '../redux/redux-setup';
import { type Dimensions, dimensionsPropType } from 'lib/types/media-types';
import type { ViewToken } from 'react-native/Libraries/Lists/ViewabilityHelper';
import type { ViewStyle } from '../types/styles';

import * as React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  PermissionsAndroid,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { KeyboardRegistry } from 'react-native-keyboard-input';
import invariant from 'invariant';
import { Provider } from 'react-redux';
import CameraRoll from '@react-native-community/cameraroll';
import Icon from 'react-native-vector-icons/FontAwesome';
import PropTypes from 'prop-types';

import { connect } from 'lib/utils/redux-utils';
import { mimeTypesToMediaTypes } from 'lib/utils/file-utils';

import { store } from '../redux/redux-setup';
import {
  dimensionsSelector,
  contentBottomOffset,
} from '../selectors/dimension-selectors';
import ImageGalleryImage from './image-gallery-image.react';
import Animated, { Easing } from 'react-native-reanimated';

const animationSpec = {
  duration: 400,
  easing: Easing.inOut(Easing.ease),
};

type Props = {|
  // Redux state
  screenDimensions: Dimensions,
  foreground: bool,
|};
type State = {|
  imageInfos: ?$ReadOnlyArray<GalleryImageInfo>,
  error: ?string,
  containerHeight: ?number,
  // null means end reached; undefined means no fetch yet
  cursor: ?string,
  queuedImageURIs: ?Set<string>,
  focusedImageURI: ?string,
  screenWidth: number,
|};
class ImageGalleryKeyboard extends React.PureComponent<Props, State> {

  static propTypes = {
    screenDimensions: dimensionsPropType.isRequired,
    foreground: PropTypes.bool.isRequired,
  };
  mounted = false;
  fetchingPhotos = false;
  flatList: ?FlatList;
  viewableIndices: number[] = [];
  queueModeProgress = new Animated.Value(0);
  sendButtonStyle: ViewStyle;
  imagesSelected = false;
  androidPermissionsGranted: bool | void;

  constructor(props: Props) {
    super(props);
    const sendButtonScale = Animated.interpolate(
      this.queueModeProgress,
      {
        inputRange: [ 0, 1 ],
        outputRange: [ 1.3, 1 ],
      },
    );
    this.sendButtonStyle = {
      ...styles.sendButton,
      opacity: this.queueModeProgress,
      transform: [
        { scale: sendButtonScale },
      ],
    };
    this.state = {
      imageInfos: null,
      error: null,
      containerHeight: null,
      cursor: undefined,
      queuedImageURIs: null,
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

  componentDidUpdate(prevProps: Props, prevState: State) {
    const { width } = this.props.screenDimensions;
    if (width !== prevProps.screenDimensions.width) {
      // We keep screenWidth in this.state since that's what we pass in as
      // FlatList's extraData
      this.setState({ screenWidth: width });
    }

    const { queuedImageURIs } = this.state;
    const prevQueuedImageURIs = prevState.queuedImageURIs;
    if (queuedImageURIs && !prevQueuedImageURIs) {
      Animated.timing(
        this.queueModeProgress,
        { ...animationSpec, toValue: 1 },
      ).start();
    } else if (!queuedImageURIs && prevQueuedImageURIs) {
      Animated.timing(
        this.queueModeProgress,
        { ...animationSpec, toValue: 0 },
      ).start();
    }

    const { flatList, viewableIndices } = this;
    const { imageInfos, focusedImageURI } = this.state;
    let scrollingSomewhere = false;
    if (flatList && imageInfos) {
      let newURI;
      if (focusedImageURI && focusedImageURI !== prevState.focusedImageURI) {
        newURI = focusedImageURI;
      } else if (
        queuedImageURIs &&
        (!prevQueuedImageURIs ||
          queuedImageURIs.size > prevQueuedImageURIs.size)
      ) {
        for (let queuedImageURI of queuedImageURIs) {
          if (prevQueuedImageURIs && prevQueuedImageURIs.has(queuedImageURI)) {
            continue;
          }
          newURI = queuedImageURI;
          break;
        }
      }
      let index;
      if (newURI !== null && newURI !== undefined) {
        index = imageInfos.findIndex(({ uri }) => uri === newURI);
      }
      if (index !== null && index !== undefined) {
        if (index === viewableIndices[0]) {
          scrollingSomewhere = true;
          flatList.scrollToIndex({ index });
        } else if (index === viewableIndices[viewableIndices.length - 1]) {
          scrollingSomewhere = true;
          flatList.scrollToIndex({ index, viewPosition: 1 });
        }
      }
    }

    if (this.props.foreground && !prevProps.foreground) {
      this.fetchPhotos();
    }

    if (
      !scrollingSomewhere &&
      this.flatList &&
      this.state.imageInfos &&
      prevState.imageInfos &&
      this.state.imageInfos.length > 0 &&
      prevState.imageInfos.length > 0 &&
      this.state.imageInfos[0].uri !== prevState.imageInfos[0].uri
    ) {
      this.flatList.scrollToIndex({ index: 0 });
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
    base.mimeTypes = Object.keys(mimeTypesToMediaTypes);
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

      let firstRemoved = false, lastRemoved = false;

      const imageURIs = this.state.imageInfos
        ? this.state.imageInfos.map(({ uri }) => uri)
        : [];
      const existingURIs = new Set(imageURIs);
      let first = true;
      const imageInfos = edges.map(
        ({ node }) => {
          const { uri, height, width } = node.image;
          if (existingURIs.has(uri)) {
            if (first) {
              firstRemoved = true;
            }
            lastRemoved = true;
            first = false;
            return null;
          }
          first = false;
          lastRemoved = false;
          existingURIs.add(uri);
          return { uri, height, width };
        },
      ).filter(Boolean);

      let appendOrPrepend = after ? "append" : "prepend";
      if (firstRemoved && !lastRemoved) {
        appendOrPrepend = "append";
      } else if (!firstRemoved && lastRemoved) {
        appendOrPrepend = "prepend";
      }

      let newImageInfos = imageInfos;
      if (this.state.imageInfos) {
        if (appendOrPrepend === "prepend") {
          newImageInfos = [ ...newImageInfos, ...this.state.imageInfos ];
        } else {
          newImageInfos = [ ...this.state.imageInfos, ...newImageInfos ];
        }
      }

      this.guardedSetState({
        imageInfos: newImageInfos,
        error: null,
        cursor: page_info.has_next_page
          ? page_info.end_cursor
          : null,
      });
    } catch (e) {
      this.guardedSetState({
        imageInfos: null,
        error: "something went wrong :(",
      });
    }
    this.fetchingPhotos = false;
  }

  async getAndroidPermissions(): Promise<bool> {
    if (this.androidPermissionsGranted !== undefined) {
      return this.androidPermissionsGranted;
    }
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
      this.androidPermissionsGranted = true;
    } catch (err) {
      this.guardedSetState({ error: "don't have permissions :(" });
      this.androidPermissionsGranted = false;
    }
    return this.androidPermissionsGranted;
  }

  get queueModeActive() {
    // On old Android 4.4 devices, we get a stack overflow just trying to draw
    // the buttons for standard mode, so we force queue mode on always.
    return !!this.state.queuedImageURIs ||
      (Platform.OS === "android" && Platform.Version < 21);
  }

  renderItem = (row: { item: GalleryImageInfo }) => {
    const { containerHeight, queuedImageURIs } = this.state;
    invariant(containerHeight, "should be set");
    const { uri } = row.item;
    const isQueued = !!(queuedImageURIs && queuedImageURIs.has(uri));
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
    if (imageInfos && imageInfos.length > 0 && containerHeight) {
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
          onViewableItemsChanged={this.onViewableItemsChanged}
          extraData={this.state}
          ref={this.flatListRef}
        />
      );
    } else if (imageInfos && containerHeight) {
      content = <Text style={styles.error}>no media was found!</Text>;
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

    const { queuedImageURIs } = this.state;
    const queueCount = queuedImageURIs ? queuedImageURIs.size : 0;
    return (
      <View style={styles.container} onLayout={this.onContainerLayout}>
        {content}
        <TouchableOpacity
          onPress={this.sendQueuedImages}
          activeOpacity={0.6}
          style={styles.sendButtonContainer}
        >
          <Animated.View style={this.sendButtonStyle}>
            <Icon name="send" style={styles.sendIcon} />
            <View style={styles.queueCountBubble}>
              <Text style={styles.queueCountText}>
                {queueCount}
              </Text>
            </View>
          </Animated.View>
        </TouchableOpacity>
      </View>
    );
  }

  flatListRef = (flatList: ?FlatList) => {
    this.flatList = flatList;
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

  onViewableItemsChanged = (info: {
    viewableItems: ViewToken[],
    changed: ViewToken[],
  }) => {
    const viewableIndices = [];
    for (let { index } of info.viewableItems) {
      if (index !== null && index !== undefined) {
        viewableIndices.push(index);
      }
    }
    this.viewableIndices = viewableIndices;
  }

  setImageQueued = (imageInfo: GalleryImageInfo, isQueued: bool) => {
    this.setState((prevState: State) => {
      const prevQueuedImageURIs = prevState.queuedImageURIs
        ? [ ...prevState.queuedImageURIs ]
        : [];
      if (isQueued) {
        return {
          queuedImageURIs: new Set([
            ...prevQueuedImageURIs,
            imageInfo.uri,
          ]),
          focusedImageURI: null,
        };
      }
      const queuedImageURIs = prevQueuedImageURIs.filter(
        uri => uri !== imageInfo.uri,
      );
      if (queuedImageURIs.length < prevQueuedImageURIs.length) {
        return {
          queuedImageURIs: new Set(queuedImageURIs),
          focusedImageURI: null,
        };
      }
      return null;
    });
  }

  setFocus = (imageInfo: GalleryImageInfo, isFocused: bool) => {
    const { uri } = imageInfo;
    if (isFocused) {
      this.setState({ focusedImageURI: uri });
    } else if (this.state.focusedImageURI === uri) {
      this.setState({ focusedImageURI: null });
    }
  }

  sendImage = (imageInfo: GalleryImageInfo) => {
    this.sendImages([ imageInfo ]);
  }

  sendQueuedImages = () => {
    const { imageInfos, queuedImageURIs } = this.state;
    invariant(imageInfos && queuedImageURIs, "should be set");
    const queuedImageInfos = [];
    for (let uri of queuedImageURIs) {
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
    if (this.imagesSelected) {
      return;
    }
    this.imagesSelected = true;
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
  sendButtonContainer: {
    position: 'absolute',
    bottom: 30,
    right: 30,
  },
  sendButton: {
    backgroundColor: '#7ED321',
    borderRadius: 30,
    paddingLeft: 14,
    paddingRight: 16,
    paddingTop: 14,
    paddingBottom: 16,
    borderWidth: 4,
    borderColor: 'white',
  },
  sendIcon: {
    color: 'white',
    fontSize: 22,
  },
  queueCountBubble: {
    backgroundColor: '#222222',
    position: 'absolute',
    top: -8,
    right: -8,
    width: 25,
    height: 25,
    paddingLeft: 1,
    paddingBottom: Platform.OS === "android" ? 2 : 0,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  queueCountText: {
    textAlign: 'center',
    color: 'white',
  },
});

const ReduxConnectedImageGalleryKeyboard = connect(
  (state: AppState) => ({
    screenDimensions: dimensionsSelector(state),
    foreground: state.foreground,
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
