// @flow

import * as React from 'react';
import { protocols } from 'lib/shared/threads/protocols/thread-protocols';
import { View } from 'react-native';
import Icon from '@expo/vector-icons/FontAwesome.js';
import FarcasterLogo from '../vectors/farcaster-logo.react.js';

type Props = {
  +protocol: number,
  +size: number,
};

function ProtocolIcon(props: Props): React.Node {
  let iconComponent = null;
  const { protocolIcon } = protocols()[props.protocol].presentationDetails;
  const iconSize = props.size * 0.65;
  let iconBackground = '#121826';
  if (protocolIcon === 'lock') {
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
        marginHorizontal: 3,
      }}
    >
      {iconComponent}
    </View>
  );
}

export default ProtocolIcon;
