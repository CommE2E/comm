// @flow

import * as React from 'react';

import type { BaseSocketProps } from '../socket/socket.react.js';
import { ashoatKeyserverID } from '../utils/validation-utils.js';

type Props = {
  ...BaseSocketProps,
  +keyserverID: string,
  +socketComponent: React.ComponentType<BaseSocketProps>,
};
function KeyserverConnectionHandler(props: Props) {
  const { socketComponent: Socket, keyserverID, ...rest } = props;
  if (keyserverID !== ashoatKeyserverID) {
    return null;
  }
  return <Socket {...rest} />;
}

const Handler: React.ComponentType<Props> = React.memo<Props>(
  KeyserverConnectionHandler,
);

export default Handler;
