// @flow

import { type MediaInfo, mediaInfoPropType } from 'lib/types/media-types';
import {
  type ChatInputState,
  chatInputStatePropType,
  withChatInputState,
} from '../chat/chat-input-state';

import * as React from 'react';
import PropTypes from 'prop-types';
import { View, Image, StyleSheet } from 'react-native';

import RemoteImage from './remote-image.react';

type Props = {|
  mediaInfo: MediaInfo,
  spinnerColor: string,
  // withChatInputState
  chatInputState: ?ChatInputState,
|};
type State = {|
  currentURI: string,
  departingURI: ?string,
|};
class Multimedia extends React.PureComponent<Props, State> {

  static propTypes = {
    mediaInfo: mediaInfoPropType.isRequired,
    spinnerColor: PropTypes.string.isRequired,
    chatInputState: chatInputStatePropType,
  };
  static defaultProps = {
    spinnerColor: "black",
  };

  constructor(props: Props) {
    super(props);
    this.state = {
      currentURI: props.mediaInfo.uri,
      departingURI: null,
    };
  }

  componentDidUpdate(prevProps: Props) {
    const newURI = this.props.mediaInfo.uri;
    const oldURI = prevProps.mediaInfo.uri;
    if (newURI !== oldURI && !this.state.departingURI) {
      this.setState({ currentURI: newURI, departingURI: oldURI });
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

  onLoad = () => {
    const { departingURI } = this.state;
    if (!departingURI) {
      return;
    }
    this.setState({ departingURI: null });
    if (this.props.chatInputState) {
      this.props.chatInputState.clearURI(departingURI);
    }
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

export default withChatInputState(Multimedia);
