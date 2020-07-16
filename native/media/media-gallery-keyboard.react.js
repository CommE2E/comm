// @flow

import type { AppState } from '../redux/redux-setup';
import type { MediaLibrarySelection } from 'lib/types/media-types';
import {
  type DimensionsInfo,
  dimensionsInfoPropType,
} from '../redux/dimensions-updater.react';
import type { ViewToken, LayoutEvent } from '../types/react-native';
import type { ViewStyle } from '../types/styles';

import * as React from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { KeyboardRegistry } from 'react-native-keyboard-input';
import invariant from 'invariant';
import { Provider } from 'react-redux';
import PropTypes from 'prop-types';
import * as MediaLibrary from 'expo-media-library';

import { connect } from 'lib/utils/redux-utils';
import { extensionFromFilename } from 'lib/media/file-utils';

import { store } from '../redux/redux-setup';
import MediaGalleryMedia from './media-gallery-media.react';
import {
  type Colors,
  colorsPropType,
  colorsSelector,
  styleSelector,
} from '../themes/colors';
import SendMediaButton from './send-media-button.react';
import { getCompatibleMediaURI } from './identifier-utils';

const animationSpec = {
  duration: 400,
  easing: Easing.inOut(Easing.ease),
  useNativeDriver: true,
};

type Props = {|
  // Redux state
  dimensions: DimensionsInfo,
  foreground: boolean,
  colors: Colors,
  styles: typeof styles,
|};
type State = {|
  selections: ?$ReadOnlyArray<MediaLibrarySelection>,
  error: ?string,
  containerHeight: ?number,
  // null means end reached; undefined means no fetch yet
  cursor: ?string,
  queuedMediaURIs: ?Set<string>,
  focusedMediaURI: ?string,
  dimensions: DimensionsInfo,
|};
class MediaGalleryKeyboard extends React.PureComponent<Props, State> {
  static propTypes = {
    dimensions: dimensionsInfoPropType.isRequired,
    foreground: PropTypes.bool.isRequired,
    colors: colorsPropType.isRequired,
    styles: PropTypes.objectOf(PropTypes.object).isRequired,
  };
  mounted = false;
  fetchingPhotos = false;
  flatList: ?FlatList<MediaLibrarySelection>;
  viewableIndices: number[] = [];
  queueModeProgress = new Animated.Value(0);
  sendButtonStyle: ViewStyle;
  mediaSelected = false;

  constructor(props: Props) {
    super(props);
    const sendButtonScale = this.queueModeProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [1.3, 1],
    });
    this.sendButtonStyle = {
      opacity: this.queueModeProgress,
      transform: [{ scale: sendButtonScale }],
    };
    this.state = {
      selections: null,
      error: null,
      containerHeight: null,
      cursor: undefined,
      queuedMediaURIs: null,
      focusedMediaURI: null,
      dimensions: props.dimensions,
    };
  }

  static getDerivedStateFromProps(props: Props) {
    // We keep this in state since we pass this.state as
    // FlatList's extraData prop
    return { dimensions: props.dimensions };
  }

  componentDidMount() {
    this.mounted = true;
    return this.fetchPhotos();
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    const { queuedMediaURIs } = this.state;
    const prevQueuedMediaURIs = prevState.queuedMediaURIs;
    if (queuedMediaURIs && !prevQueuedMediaURIs) {
      Animated.timing(this.queueModeProgress, {
        ...animationSpec,
        toValue: 1,
      }).start();
    } else if (!queuedMediaURIs && prevQueuedMediaURIs) {
      Animated.timing(this.queueModeProgress, {
        ...animationSpec,
        toValue: 0,
      }).start();
    }

    const { flatList, viewableIndices } = this;
    const { selections, focusedMediaURI } = this.state;
    let scrollingSomewhere = false;
    if (flatList && selections) {
      let newURI;
      if (focusedMediaURI && focusedMediaURI !== prevState.focusedMediaURI) {
        newURI = focusedMediaURI;
      } else if (
        queuedMediaURIs &&
        (!prevQueuedMediaURIs ||
          queuedMediaURIs.size > prevQueuedMediaURIs.size)
      ) {
        const flowMadeMeDoThis = queuedMediaURIs;
        for (let queuedMediaURI of flowMadeMeDoThis) {
          if (prevQueuedMediaURIs && prevQueuedMediaURIs.has(queuedMediaURI)) {
            continue;
          }
          newURI = queuedMediaURI;
          break;
        }
      }
      let index;
      if (newURI !== null && newURI !== undefined) {
        index = selections.findIndex(({ uri }) => uri === newURI);
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
      this.state.selections &&
      prevState.selections &&
      this.state.selections.length > 0 &&
      prevState.selections.length > 0 &&
      this.state.selections[0].uri !== prevState.selections[0].uri
    ) {
      this.flatList.scrollToIndex({ index: 0 });
    }
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
      const hasPermission = await this.getPermissions();
      if (!hasPermission) {
        return;
      }
      const {
        assets,
        endCursor,
        hasNextPage,
      } = await MediaLibrary.getAssetsAsync({
        first: 20,
        after,
        mediaType: [MediaLibrary.MediaType.photo],
        sortBy: [MediaLibrary.SortBy.creationTime],
      });

      let firstRemoved = false,
        lastRemoved = false;

      const mediaURIs = this.state.selections
        ? this.state.selections.map(({ uri }) => uri)
        : [];
      const existingURIs = new Set(mediaURIs);
      let first = true;
      const selections = assets
        .map(asset => {
          const { id, height, width, filename, mediaType, duration } = asset;
          const isVideo = mediaType === MediaLibrary.MediaType.video;
          const uri = getCompatibleMediaURI(
            asset.uri,
            extensionFromFilename(filename),
          );

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

          if (isVideo) {
            return {
              step: 'video_library',
              dimensions: { height, width },
              uri,
              filename,
              mediaNativeID: id,
              duration,
              selectTime: 0,
              sendTime: 0,
              retries: 0,
            };
          } else {
            return {
              step: 'photo_library',
              dimensions: { height, width },
              uri,
              filename,
              mediaNativeID: id,
              selectTime: 0,
              sendTime: 0,
              retries: 0,
            };
          }
        })
        .filter(Boolean);

      let appendOrPrepend = after ? 'append' : 'prepend';
      if (firstRemoved && !lastRemoved) {
        appendOrPrepend = 'append';
      } else if (!firstRemoved && lastRemoved) {
        appendOrPrepend = 'prepend';
      }

      let newSelections = selections;
      if (this.state.selections) {
        if (appendOrPrepend === 'prepend') {
          newSelections = [...newSelections, ...this.state.selections];
        } else {
          newSelections = [...this.state.selections, ...newSelections];
        }
      }

      this.guardedSetState({
        selections: newSelections,
        error: null,
        cursor: hasNextPage ? endCursor : null,
      });
    } catch (e) {
      this.guardedSetState({
        selections: null,
        error: 'something went wrong :(',
      });
    }
    this.fetchingPhotos = false;
  }

  async getPermissions(): Promise<boolean> {
    const { granted } = await MediaLibrary.requestPermissionsAsync();
    if (!granted) {
      this.guardedSetState({ error: "don't have permission :(" });
    }
    return granted;
  }

  get queueModeActive() {
    return !!this.state.queuedMediaURIs;
  }

  renderItem = (row: { item: MediaLibrarySelection }) => {
    const { containerHeight, queuedMediaURIs } = this.state;
    invariant(containerHeight, 'should be set');
    const { uri } = row.item;
    const isQueued = !!(queuedMediaURIs && queuedMediaURIs.has(uri));
    const { queueModeActive } = this;
    return (
      <MediaGalleryMedia
        selection={row.item}
        containerHeight={containerHeight}
        queueModeActive={queueModeActive}
        isQueued={isQueued}
        setMediaQueued={this.setMediaQueued}
        sendMedia={this.sendSingleMedia}
        isFocused={this.state.focusedMediaURI === uri}
        setFocus={this.setFocus}
        dimensions={this.state.dimensions}
        colors={this.props.colors}
      />
    );
  };

  ItemSeparator = () => {
    return <View style={this.props.styles.separator} />;
  };

  static keyExtractor(item: MediaLibrarySelection) {
    return item.uri;
  }

  render() {
    let content;
    const { selections, error, containerHeight } = this.state;
    const bottomOffsetStyle = {
      marginBottom: this.props.dimensions.bottomInset,
    };
    if (selections && selections.length > 0 && containerHeight) {
      content = (
        <FlatList
          horizontal={true}
          data={selections}
          renderItem={this.renderItem}
          ItemSeparatorComponent={this.ItemSeparator}
          keyExtractor={MediaGalleryKeyboard.keyExtractor}
          scrollsToTop={false}
          showsHorizontalScrollIndicator={false}
          onEndReached={this.onEndReached}
          onEndReachedThreshold={5}
          onViewableItemsChanged={this.onViewableItemsChanged}
          extraData={this.state}
          ref={this.flatListRef}
        />
      );
    } else if (selections && containerHeight) {
      content = (
        <Text style={this.props.styles.error}>no media was found!</Text>
      );
    } else if (error) {
      content = (
        <Text style={[this.props.styles.error, bottomOffsetStyle]}>
          {error}
        </Text>
      );
    } else {
      content = (
        <ActivityIndicator
          color={this.props.colors.listSeparatorLabel}
          size="large"
          style={[this.props.styles.loadingIndicator, bottomOffsetStyle]}
        />
      );
    }

    const { queuedMediaURIs } = this.state;
    const queueCount = queuedMediaURIs ? queuedMediaURIs.size : 0;
    const bottomInset = Platform.select({
      ios: -1 * this.props.dimensions.bottomInset,
      default: 0,
    });
    const containerStyle = { bottom: bottomInset };
    return (
      <View
        style={[this.props.styles.container, containerStyle]}
        onLayout={this.onContainerLayout}
      >
        {content}
        <SendMediaButton
          onPress={this.sendQueuedMedia}
          queueCount={queueCount}
          pointerEvents={queuedMediaURIs ? 'auto' : 'none'}
          containerStyle={[
            this.props.styles.sendButtonContainer,
            bottomOffsetStyle,
          ]}
          style={this.sendButtonStyle}
        />
      </View>
    );
  }

  flatListRef = (flatList: ?FlatList<MediaLibrarySelection>) => {
    this.flatList = flatList;
  };

  onContainerLayout = (event: LayoutEvent) => {
    this.guardedSetState({ containerHeight: event.nativeEvent.layout.height });
  };

  onEndReached = () => {
    const { cursor } = this.state;
    if (cursor !== null) {
      this.fetchPhotos(cursor);
    }
  };

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
  };

  setMediaQueued = (selection: MediaLibrarySelection, isQueued: boolean) => {
    this.setState((prevState: State) => {
      const prevQueuedMediaURIs = prevState.queuedMediaURIs
        ? [...prevState.queuedMediaURIs]
        : [];
      if (isQueued) {
        return {
          queuedMediaURIs: new Set([...prevQueuedMediaURIs, selection.uri]),
          focusedMediaURI: null,
        };
      }
      const queuedMediaURIs = prevQueuedMediaURIs.filter(
        uri => uri !== selection.uri,
      );
      if (queuedMediaURIs.length < prevQueuedMediaURIs.length) {
        return {
          queuedMediaURIs: new Set(queuedMediaURIs),
          focusedMediaURI: null,
        };
      }
      return null;
    });
  };

  setFocus = (selection: MediaLibrarySelection, isFocused: boolean) => {
    const { uri } = selection;
    if (isFocused) {
      this.setState({ focusedMediaURI: uri });
    } else if (this.state.focusedMediaURI === uri) {
      this.setState({ focusedMediaURI: null });
    }
  };

  sendSingleMedia = (selection: MediaLibrarySelection) => {
    this.sendMedia([selection]);
  };

  sendQueuedMedia = () => {
    const { selections, queuedMediaURIs } = this.state;
    if (!selections || !queuedMediaURIs) {
      return;
    }
    const queuedSelections = [];
    for (let uri of queuedMediaURIs) {
      for (let selection of selections) {
        if (selection.uri === uri) {
          queuedSelections.push(selection);
          break;
        }
      }
    }
    this.sendMedia(queuedSelections);
  };

  sendMedia(selections: $ReadOnlyArray<MediaLibrarySelection>) {
    if (this.mediaSelected) {
      return;
    }
    this.mediaSelected = true;

    const now = Date.now();
    const timeProps = {
      selectTime: now,
      sendTime: now,
    };
    const selectionsWithTime = selections.map(selection => ({
      ...selection,
      ...timeProps,
    }));

    KeyboardRegistry.onItemSelected(
      mediaGalleryKeyboardName,
      selectionsWithTime,
    );
  }
}

const mediaGalleryKeyboardName = 'MediaGalleryKeyboard';

const styles = {
  container: {
    alignItems: 'center',
    backgroundColor: 'listBackground',
    flexDirection: 'row',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  error: {
    color: 'listBackgroundLabel',
    flex: 1,
    fontSize: 28,
    textAlign: 'center',
  },
  loadingIndicator: {
    flex: 1,
  },
  sendButtonContainer: {
    bottom: 20,
    position: 'absolute',
    right: 30,
  },
  separator: {
    width: 2,
  },
};
const stylesSelector = styleSelector(styles);

const ReduxConnectedMediaGalleryKeyboard = connect((state: AppState) => ({
  dimensions: state.dimensions,
  foreground: state.foreground,
  colors: colorsSelector(state),
  styles: stylesSelector(state),
}))(MediaGalleryKeyboard);

function ReduxMediaGalleryKeyboard() {
  return (
    <Provider store={store}>
      <ReduxConnectedMediaGalleryKeyboard />
    </Provider>
  );
}

KeyboardRegistry.registerKeyboard(
  mediaGalleryKeyboardName,
  () => ReduxMediaGalleryKeyboard,
);

export { mediaGalleryKeyboardName };
