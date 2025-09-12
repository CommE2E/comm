// @flow

import {
  faServer as server,
  faLock as lock,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as React from 'react';

import { getProtocolByName } from 'lib/shared/threads/protocols/thread-protocols.js';
import type { ProtocolName } from 'lib/shared/threads/thread-spec.js';

import CommIcon from '../comm-icon.react.js';

type Props = {
  +icon?: React.Node,
  +protocol?: ProtocolName,
  +size: number,
};

function ProtocolIcon(props: Props): React.Node {
  let iconComponent = null;
  const protocolIcon = getProtocolByName(props.protocol)?.presentationDetails
    ?.protocolIcon;
  const iconSize = props.size * 0.5;
  let iconBackground = '#121826';
  if (props.icon) {
    iconComponent = props.icon;
  } else if (protocolIcon === 'lock') {
    iconComponent = (
      <FontAwesomeIcon
        icon={lock}
        style={{ color: '#fff', fontSize: `${iconSize}px` }}
      />
    );
  } else if (protocolIcon === 'server') {
    iconComponent = (
      <FontAwesomeIcon
        icon={server}
        style={{ color: '#fff', fontSize: `${iconSize}px` }}
      />
    );
  } else if (protocolIcon === 'farcaster') {
    iconComponent = <CommIcon icon="farcaster" size={iconSize} color="#fff" />;
    iconBackground = '#855DCD';
  }

  return (
    <div
      style={{
        width: props.size,
        height: props.size,
        borderRadius: props.size,
        backgroundColor: iconBackground,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 3,
        marginRight: 3,
      }}
    >
      {iconComponent}
    </div>
  );
}

export default ProtocolIcon;
