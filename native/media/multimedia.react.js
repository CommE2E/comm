// @flow

import { type MediaInfo, mediaInfoPropType } from 'lib/types/media-types';

import * as React from 'react';
import PropTypes from 'prop-types';
import { View, Image, StyleSheet } from 'react-native';
import filesystem from 'react-native-fs';
import invariant from 'invariant';

import { pathFromURI } from 'lib/utils/file-utils';

import RemoteImage from './remote-image.react';

type Props = {|
  mediaInfo: MediaInfo,
  spinnerColor: string,
|};
type State = {|
  currentURI: string,
  departingURI: ?string,
  unlinkDepartingURI: boolean,
|};
class Multimedia extends React.PureComponent<Props, State> {
  static propTypes = {
    mediaInfo: mediaInfoPropType.isRequired,
    spinnerColor: PropTypes.string.isRequired,
  };
  static defaultProps = {
    spinnerColor: 'black',
  };

  constructor(props: Props) {
    super(props);
    this.state = {
      currentURI: props.mediaInfo.uri,
      departingURI: null,
      unlinkDepartingURI: false,
    };
  }

  static shouldUnlinkDepartingURI(props: Props): boolean {
    const { localMediaSelection } = props.mediaInfo;
    if (!localMediaSelection) {
      return false;
    }
    if (
      localMediaSelection.step === 'photo_library' ||
      localMediaSelection.step === 'video_library'
    ) {
      return false;
    }
    invariant(
      localMediaSelection.step === 'photo_capture',
      'selection should be photo_capture if not from library',
    );
    return true;
  }

  componentDidUpdate(prevProps: Props) {
    const newURI = this.props.mediaInfo.uri;
    const oldURI = prevProps.mediaInfo.uri;
    if (newURI !== oldURI && !this.state.departingURI) {
      const unlinkDepartingURI = Multimedia.shouldUnlinkDepartingURI(prevProps);
      this.setState({
        currentURI: newURI,
        departingURI: oldURI,
        unlinkDepartingURI,
      });
    } else if (newURI !== oldURI) {
      this.setState({ currentURI: newURI });
    }
  }

  render() {
    const images = [];
    const { currentURI, departingURI } = this.state;
    if (departingURI) {
      images.push(this.renderURI(currentURI, true));
      images.push(this.renderURI(departingURI, true));
    } else {
      images.push(this.renderURI(currentURI));
    }
    return <View style={styles.container}>{images}</View>;
  }

  renderURI(uri: string, invisibleLoad?: boolean = false) {
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
      const source = { uri };
      return (
        <Image
          source={source}
          onLoad={this.onLoad}
          style={styles.image}
          key={uri}
        />
      );
    }
  }

  onLoad = () => {
    this.onLoadAsync();
  };

  async onLoadAsync() {
    const { departingURI, unlinkDepartingURI } = this.state;
    if (!departingURI && !unlinkDepartingURI) {
      return;
    }
    this.setState({ departingURI: null, unlinkDepartingURI: false });

    if (!departingURI || !unlinkDepartingURI) {
      return;
    }

    const path = pathFromURI(departingURI);
    if (!path) {
      return;
    }

    try {
      await filesystem.unlink(path);
    } catch (e) {}
  };
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

export default Multimedia;
