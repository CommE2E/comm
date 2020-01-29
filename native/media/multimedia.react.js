// @flow

import { type MediaInfo, mediaInfoPropType } from 'lib/types/media-types';

import * as React from 'react';
import PropTypes from 'prop-types';
import { View, Image, StyleSheet } from 'react-native';
import filesystem from 'react-native-fs';

import { pathFromURI } from 'lib/utils/file-utils';

import RemoteImage from './remote-image.react';

type Props = {|
  mediaInfo: MediaInfo,
  spinnerColor: string,
|};
type State = {|
  currentURI: string,
  departingURI: ?string,
  unlinkDepartingURI: bool,
|};
class Multimedia extends React.PureComponent<Props, State> {

  static propTypes = {
    mediaInfo: mediaInfoPropType.isRequired,
    spinnerColor: PropTypes.string.isRequired,
  };
  static defaultProps = {
    spinnerColor: "black",
  };

  constructor(props: Props) {
    super(props);
    this.state = {
      currentURI: props.mediaInfo.uri,
      departingURI: null,
      unlinkDepartingURI: false,
    };
  }

  componentDidUpdate(prevProps: Props) {
    const newURI = this.props.mediaInfo.uri;
    const oldURI = prevProps.mediaInfo.uri;
    if (newURI !== oldURI && !this.state.departingURI) {
      const unlinkDepartingURI = !!prevProps.mediaInfo.unlinkURIAfterRemoving;
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
    return (
      <View style={styles.container}>
        {images}
      </View>
    );
  }

  renderURI(uri: string, invisibleLoad?: bool = false) {
    if (uri.startsWith("http")) {
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

  onLoad = async () => {
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
    } catch (e) { }
  }

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  image: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
});

export default Multimedia;
