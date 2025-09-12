// @flow

import Icon from '@expo/vector-icons/FontAwesome.js';
import * as React from 'react';
import { View } from 'react-native';

import { getProtocolByName } from 'lib/shared/threads/protocols/thread-protocols.js';
import type { ProtocolName } from 'lib/shared/threads/thread-spec.js';

import FarcasterLogo from '../vectors/farcaster-logo.react.js';

type Props = {
  +icon?: React.Node,
  +protocol?: ProtocolName,
  +size: number,
};

function ProtocolIcon(props: Props): React.Node {
  let iconComponent = null;
  const protocolIcon = getProtocolByName(props.protocol)?.presentationDetails
    ?.protocolIcon;
  const iconSize = props.size * 0.65;
  let iconBackground = '#121826';
  if (props.icon) {
    iconBackground = '#121826';
    iconComponent = props.icon;
  } else if (protocolIcon === 'lock') {
    iconComponent = (
      <Icon name="lock" size={iconSize} style={{ color: '#fff' }} />
    );
  } else if (protocolIcon === 'server') {
    iconComponent = (
      <Icon name="server" size={iconSize} style={{ color: '#fff' }} />
    );
  } else if (protocolIcon === 'farcaster') {
    iconComponent = <FarcasterLogo size={iconSize} />;
    iconBackground = '#855DCD';
  }

  return (
    <View
      style={{
        width: props.size,
        height: props.size,
        borderRadius: props.size,
        backgroundColor: iconBackground,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 5,
      }}
    >
      {iconComponent}
    </View>
  );
}

export default ProtocolIcon;
