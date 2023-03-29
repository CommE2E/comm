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
};
class RemoteImage extends React.PureComponent<Props, State> {
  loaded: boolean = false;
  state: State = {
    attempt: 0,
  };

  componentDidUpdate(prevProps: Props) {
    if (
      !this.loaded &&
      this.props.connectionStatus === 'connected' &&
      prevProps.connectionStatus !== 'connected'
    ) {
      this.setState(otherPrevState => ({
        attempt: otherPrevState.attempt + 1,
      }));
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
    this.loaded = true;
    this.props.onLoad && this.props.onLoad(this.props.uri);
  };
}

const ConnectedRemoteImage: React.ComponentType<BaseProps> =
  React.memo<BaseProps>(function ConnectedRemoteImage(props: BaseProps) {
    const connectionStatus = useSelector(state => state.connection.status);

    return <RemoteImage {...props} connectionStatus={connectionStatus} />;
  });

export default ConnectedRemoteImage;
