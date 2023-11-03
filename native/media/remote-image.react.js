// @flow

import invariant from 'invariant';
import * as React from 'react';
import type { ImageSource } from 'react-native/Libraries/Image/ImageSource';

import { connectionSelector } from 'lib/selectors/keyserver-selectors.js';
import { type ConnectionStatus } from 'lib/types/socket-types.js';
import { ashoatKeyserverID } from 'lib/utils/validation-utils.js';

import LoadableImage from './loadable-image.react.js';
import { useSelector } from '../redux/redux-utils.js';
import type { ImageStyle } from '../types/styles.js';

type BaseProps = {
  +uri: string,
  +onLoad?: (uri: string) => void,
  +spinnerColor: string,
  +style: ImageStyle,
  +invisibleLoad: boolean,
  +placeholder?: ?ImageSource,
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
    const { style, spinnerColor, invisibleLoad, uri, placeholder } = this.props;
    const source = { uri };

    return (
      <LoadableImage
        source={source}
        placeholder={placeholder}
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

function ConnectedRemoteImage(props: BaseProps): React.Node {
  const connection = useSelector(connectionSelector(ashoatKeyserverID));
  invariant(connection, 'keyserver missing from keyserverStore');
  const connectionStatus = connection.status;

  const { uri, onLoad, spinnerColor, style, invisibleLoad, placeholder } =
    props;

  const connectedRemoteImage = React.useMemo(
    () => (
      <RemoteImage
        uri={uri}
        onLoad={onLoad}
        spinnerColor={spinnerColor}
        style={style}
        invisibleLoad={invisibleLoad}
        placeholder={placeholder}
        connectionStatus={connectionStatus}
      />
    ),
    [
      connectionStatus,
      invisibleLoad,
      onLoad,
      placeholder,
      spinnerColor,
      style,
      uri,
    ],
  );
  return connectedRemoteImage;
}

export default ConnectedRemoteImage;
