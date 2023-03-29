// @flow

import * as React from 'react';

import { type ConnectionStatus } from 'lib/types/socket-types.js';

import LoadableImage from './loadable-image.react.js';
import { useSelector } from '../redux/redux-utils.js';
import type { ImageStyle } from '../types/styles.js';

type BaseProps = {
  +uri: string,
  +onLoad: (uri: string) => void,
  +spinnerColor: string,
  +style: ImageStyle,
  +invisibleLoad: boolean,
};
type Props = {
  ...BaseProps,
  +connectionStatus: ConnectionStatus,
};
type State = {
  +attempt: number,
  +loaded: boolean,
};
class RemoteImage extends React.PureComponent<Props, State> {
  state: State = {
    attempt: 0,
    loaded: false,
  };

  componentDidUpdate(prevProps: Props, prevState: State) {
    if (
      !this.state.loaded &&
      this.props.connectionStatus === 'connected' &&
      prevProps.connectionStatus !== 'connected'
    ) {
      this.setState(otherPrevState => ({
        attempt: otherPrevState.attempt + 1,
      }));
    }
    if (this.state.loaded && !prevState.loaded) {
      this.props.onLoad && this.props.onLoad(this.props.uri);
    }
  }

  render() {
    const { style, spinnerColor, invisibleLoad, uri } = this.props;
    const source = { uri };

    return (
      <LoadableImage
        source={source}
        onLoad={this.onLoad}
        spinnerColor={spinnerColor}
        style={style}
        invisibleLoad={invisibleLoad}
        key={this.state.attempt}
      />
    );
  }

  onLoad = () => {
    this.setState({ loaded: true });
  };
}

const ConnectedRemoteImage: React.ComponentType<BaseProps> =
  React.memo<BaseProps>(function ConnectedRemoteImage(props: BaseProps) {
    const connectionStatus = useSelector(state => state.connection.status);

    return <RemoteImage {...props} connectionStatus={connectionStatus} />;
  });

export default ConnectedRemoteImage;
