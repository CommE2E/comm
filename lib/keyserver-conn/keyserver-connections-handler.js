// @flow

import * as React from 'react';

import KeyserverConnectionHandler from './keyserver-connection-handler.js';
import { type BaseSocketProps } from '../socket/socket.react.js';
import { useSelector } from '../utils/redux-utils.js';

type BaseProps = $ReadOnly<Omit<BaseSocketProps, 'keyserverID'>>;

type Props = {
  ...BaseProps,
  +socketComponent: React.ComponentType<BaseSocketProps>,
};
function KeyserverConnectionsHandler(props: Props): React.Node {
  const keyserverIDs = useSelector(state =>
    Object.keys(state.keyserverStore.keyserverInfos),
  );
  return keyserverIDs.map(id => (
    <KeyserverConnectionHandler keyserverID={id} key={id} {...props} />
  ));
}

export default KeyserverConnectionsHandler;
