// @flow

import { Image } from 'expo-image';
import invariant from 'invariant';
import _isEqual from 'lodash/fp/isEqual.js';
import * as React from 'react';
import { View, StyleSheet } from 'react-native';

import {
  encryptedMediaBlobURI,
  encryptedVideoThumbnailBlobURI,
} from 'lib/media/media-utils.js';
import type { MediaInfo, AvatarMediaInfo } from 'lib/types/media-types.js';

import EncryptedImage from './encrypted-image.react.js';
import RemoteImage from './remote-image.react.js';
import { type InputState, InputStateContext } from '../input/input-state.js';

type Source =
  | {
      +kind: 'uri',
      +uri: string,
      +thumbHash?: ?string,
    }
  | {
      +kind: 'encrypted',
      +blobURI: string,
      +encryptionKey: string,
      +thumbHash?: ?string,
    };
type BaseProps = {
  +mediaInfo: MediaInfo | AvatarMediaInfo,
  +spinnerColor: string,
};
type Props = {
  ...BaseProps,
  // withInputState
  +inputState: ?InputState,
};
type State = {
  +currentSource: Source,
  +departingSource: ?Source,
};
class Multimedia extends React.PureComponent<Props, State> {
  static defaultProps: Partial<Props> = {
    spinnerColor: 'black',
  };

  constructor(props: Props) {
    super(props);

    this.state = {
      currentSource: Multimedia.sourceFromMediaInfo(props.mediaInfo),
      departingSource: null,
    };
  }

  get inputState(): InputState {
    const { inputState } = this.props;
    invariant(inputState, 'inputState should be set in Multimedia');
    return inputState;
  }

  componentDidMount() {
    this.reportSourceDisplayed(this.state.currentSource, true);
  }

  componentWillUnmount() {
    const { currentSource, departingSource } = this.state;
    this.reportSourceDisplayed(currentSource, false);
    if (departingSource) {
      this.reportSourceDisplayed(departingSource, false);
    }
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    const newSource = Multimedia.sourceFromMediaInfo(this.props.mediaInfo);
    const oldSource = this.state.currentSource;
    if (!_isEqual(newSource)(oldSource)) {
      this.reportSourceDisplayed(newSource, true);

      const { departingSource } = this.state;
      if (departingSource && !_isEqual(oldSource)(departingSource)) {
        // If there's currently an existing departingSource, that means that
        // oldSource hasn't loaded yet. Since it's being replaced anyways
        // we don't need to display it anymore, so we can unlink it now
        this.reportSourceDisplayed(oldSource, false);
        this.setState({ currentSource: newSource });
      } else {
        this.setState({ currentSource: newSource, departingSource: oldSource });
      }
    }

    const newDepartingSource = this.state.departingSource;
    const oldDepartingSource = prevState.departingSource;
    if (
      oldDepartingSource &&
      !_isEqual(oldDepartingSource)(newDepartingSource)
    ) {
      this.reportSourceDisplayed(oldDepartingSource, false);
    }
  }

  render(): React.Node {
    const images = [];
    const { currentSource, departingSource } = this.state;
    if (departingSource) {
      images.push(this.renderSource(currentSource, true));
      images.push(this.renderSource(departingSource, false, false));
    } else {
      images.push(this.renderSource(currentSource));
    }
    return <View style={styles.container}>{images}</View>;
  }

  renderSource(
    source: Source,
    invisibleLoad?: boolean = false,
    triggerOnLoad?: boolean = true,
  ): React.Node {
    const onLoadProp = triggerOnLoad ? this.onLoad : undefined;
    if (source.kind === 'encrypted') {
      return (
        <EncryptedImage
          thumbHash={source.thumbHash}
          blobURI={source.blobURI}
          encryptionKey={source.encryptionKey}
          onLoad={onLoadProp}
          spinnerColor={this.props.spinnerColor}
          style={styles.image}
          invisibleLoad={invisibleLoad}
          key={source.blobURI}
        />
      );
    }
    const { uri, thumbHash } = source;
    const placeholder = thumbHash ? { thumbhash: thumbHash } : null;
    if (uri.startsWith('http')) {
      return (
        <RemoteImage
          uri={uri}
          onLoad={onLoadProp}
          placeholder={placeholder}
          spinnerColor={this.props.spinnerColor}
          style={styles.image}
          invisibleLoad={invisibleLoad}
          key={uri}
        />
      );
    } else {
      return (
        <Image
          source={{ uri }}
          onLoad={onLoadProp}
          placeholder={placeholder}
          style={styles.image}
          key={uri}
        />
      );
    }
  }

  onLoad = () => {
    this.setState({ departingSource: null });
  };

  reportSourceDisplayed = (source: Source, isLoaded: boolean) => {
    if (source.kind === 'uri') {
      this.inputState.reportURIDisplayed(source.uri, isLoaded);
    }
  };

  // ESLint doesn't recognize that invariant always throws
  // eslint-disable-next-line consistent-return
  static sourceFromMediaInfo(mediaInfo: MediaInfo | AvatarMediaInfo): Source {
    if (mediaInfo.type === 'photo') {
      return {
        kind: 'uri',
        uri: mediaInfo.uri,
        thumbHash: mediaInfo.thumbHash,
      };
    } else if (mediaInfo.type === 'video') {
      return {
        kind: 'uri',
        uri: mediaInfo.thumbnailURI,
        thumbHash: mediaInfo.thumbnailThumbHash,
      };
    } else if (mediaInfo.type === 'encrypted_photo') {
      // destructuring needed for Flow
      const { index, ...media } = mediaInfo;
      return {
        kind: 'encrypted',
        blobURI: encryptedMediaBlobURI(media),
        encryptionKey: mediaInfo.encryptionKey,
        thumbHash: mediaInfo.thumbHash,
      };
    } else if (mediaInfo.type === 'encrypted_video') {
      // destructuring needed for Flow
      const { index, ...media } = mediaInfo;
      return {
        kind: 'encrypted',
        blobURI: encryptedVideoThumbnailBlobURI(media),
        encryptionKey: mediaInfo.thumbnailEncryptionKey,
        thumbHash: mediaInfo.thumbnailThumbHash,
      };
    } else if (mediaInfo.type === 'encrypted_image') {
      const { blobURI, encryptionKey, thumbHash } = mediaInfo;
      return {
        kind: 'encrypted',
        blobURI,
        encryptionKey,
        thumbHash,
      };
    } else {
      invariant(false, 'Invalid mediaInfo type');
    }
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  image: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
});

const ConnectedMultimedia: React.ComponentType<BaseProps> = React.memo(
  function ConnectedMultimedia(props: BaseProps) {
    const inputState = React.useContext(InputStateContext);
    return <Multimedia {...props} inputState={inputState} />;
  },
);

export default ConnectedMultimedia;
