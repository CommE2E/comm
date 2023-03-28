// @flow

import invariant from 'invariant';
import * as React from 'react';
import { View, Image, StyleSheet } from 'react-native';

import { type MediaInfo } from 'lib/types/media-types.js';

import EncryptedImage from './encrypted-image.react.js';
import RemoteImage from './remote-image.react.js';
import { type InputState, InputStateContext } from '../input/input-state.js';

type Source =
  | {
      kind: 'uri',
      uri: string,
    }
  | {
      kind: 'encrypted',
      holder: string,
      encryptionKey: string,
    };
type BaseProps = {
  +mediaInfo: MediaInfo,
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
  static defaultProps = {
    spinnerColor: 'black',
  };

  constructor(props: Props) {
    super(props);

    this.state = {
      currentSource: Multimedia.sourceFromMediaInfo(props.mediaInfo),
      departingSource: null,
    };
  }

  get inputState() {
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
    const sourcesEqual = (src1: Source, src2: Source) =>
      src1.kind === src2.kind &&
      (src1.kind === 'uri'
        ? src1.uri === src2.uri
        : src1.holder === src2.holder);

    const newSource = Multimedia.sourceFromMediaInfo(this.props.mediaInfo);
    const oldSource = this.state.currentSource;
    if (!sourcesEqual(newSource, oldSource)) {
      this.reportSourceDisplayed(newSource, true);

      const { departingSource } = this.state;
      if (departingSource && !sourcesEqual(oldSource, departingSource)) {
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
      (!newDepartingSource ||
        !sourcesEqual(oldDepartingSource, newDepartingSource))
    ) {
      this.reportSourceDisplayed(oldDepartingSource, false);
    }
  }

  render() {
    const images = [];
    const { currentSource, departingSource } = this.state;
    if (departingSource) {
      images.push(this.renderSource(currentSource, true));
      images.push(this.renderSource(departingSource, true));
    } else {
      images.push(this.renderSource(currentSource));
    }
    return <View style={styles.container}>{images}</View>;
  }

  renderSource(source: Source, invisibleLoad?: boolean = false) {
    if (source.kind === 'encrypted') {
      return (
        <EncryptedImage
          holder={source.holder}
          encryptionKey={source.encryptionKey}
          onLoad={this.onLoad}
          spinnerColor={this.props.spinnerColor}
          style={styles.image}
          invisibleLoad={invisibleLoad}
          key={source.holder}
        />
      );
    }
    const { uri } = source;
    if (uri.startsWith('http')) {
      return (
        <RemoteImage
          uri={uri}
          onLoad={this.onLoad}
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
          onLoad={this.onLoad}
          style={styles.image}
          key={uri}
        />
      );
    }
  }

  onLoad = () => {
    this.setState({ departingSource: null });
  };

  reportSourceDisplayed = (source: Source, loaded: boolean) => {
    const uri = source.kind === 'uri' ? source.uri : source.holder;
    this.inputState.reportURIDisplayed(uri, loaded);
  };

  static sourceFromMediaInfo(mediaInfo: MediaInfo): Source {
    if (mediaInfo.type === 'photo') {
      return { kind: 'uri', uri: mediaInfo.uri };
    } else if (mediaInfo.type === 'video') {
      return { kind: 'uri', uri: mediaInfo.thumbnailURI };
    } else if (mediaInfo.type === 'encrypted_photo') {
      return {
        kind: 'encrypted',
        holder: mediaInfo.holder,
        encryptionKey: mediaInfo.encryptionKey,
      };
    } else if (mediaInfo.type === 'encrypted_video') {
      return {
        kind: 'encrypted',
        holder: mediaInfo.thumbnailHolder,
        encryptionKey: mediaInfo.thumbnailEncryptionKey,
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

const ConnectedMultimedia: React.ComponentType<BaseProps> =
  React.memo<BaseProps>(function ConnectedMultimedia(props: BaseProps) {
    const inputState = React.useContext(InputStateContext);
    return <Multimedia {...props} inputState={inputState} />;
  });

export default ConnectedMultimedia;
