// @flow

import { type Media, mediaPropType } from 'lib/types/media-types';
import {
  type ConnectionStatus,
  connectionStatusPropType,
} from 'lib/types/socket-types';
import type { AppState } from '../redux/redux-setup';

import * as React from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import FastImage from 'react-native-fast-image';

import { connect } from 'lib/utils/redux-utils';

type Props = {|
  media: Media,
  spinnerColor: "black" | "white",
  // Redux state
  connectionStatus: ConnectionStatus,
|};
type State = {|
  attempt: number,
  loaded: bool,
|};
class Multimedia extends React.PureComponent<Props, State> {

  static propTypes = {
    media: mediaPropType.isRequired,
    spinnerColor: PropTypes.oneOf([ "black", "white" ]).isRequired,
    connectionStatus: connectionStatusPropType.isRequired,
  };
  static defaultProps = {
    spinnerColor: "black",
  };
  state = {
    attempt: 0,
    loaded: false,
  };

  componentDidUpdate(prevProps: Props) {
    if (
      !this.state.loaded &&
      this.props.connectionStatus === "connected" &&
      prevProps.connectionStatus !== "connected"
    ) {
      this.setState(prevState => ({ attempt: prevState.attempt + 1 }));
    }
  }

  render() {
    let spinner = null;
    if (!this.state.loaded) {
      spinner = (
        <View style={styles.spinnerContainer}>
          <ActivityIndicator
            color={this.props.spinnerColor}
            size="large"
          />
        </View>
      );
    }

    const { media } = this.props;
    const { uri } = media;
    const source = { uri };
    return (
      <View style={styles.container}>
        {spinner}
        <FastImage
          source={source}
          onLoad={this.onLoad}
          style={styles.image}
          key={this.state.attempt}
        />
      </View>
    );
  }

  onLoad = () => {
    this.setState({ loaded: true });
  }

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  image: {
    flex: 1,
  },
  spinnerContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default connect(
  (state: AppState) => ({
    connectionStatus: state.connection.status,
  }),
)(Multimedia);
