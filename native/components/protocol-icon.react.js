// @flow

import Icon from '@expo/vector-icons/FontAwesome.js';
import * as React from 'react';
import { View } from 'react-native';

import { getProtocolByName } from 'lib/shared/threads/protocols/thread-protocols.js';
import type { ProtocolName } from 'lib/shared/threads/thread-spec.js';

import { useStyles } from '../themes/colors.js';
import FarcasterLogo from '../vectors/farcaster-logo.react.js';

type Props = {
  +icon?: React.Node,
  +protocol?: ProtocolName,
  +size: number,
};

function ProtocolIcon(props: Props): React.Node {
  const styles = useStyles(unboundStyles);

  let iconComponent = null;
  const protocolIcon = getProtocolByName(props.protocol)?.presentationDetails
    ?.protocolIcon;
  const iconSize = props.size * 0.65;
  let containerStyle = styles.container;
  if (props.icon) {
    containerStyle = styles.container;
    iconComponent = props.icon;
  } else if (protocolIcon === 'lock') {
    iconComponent = <Icon name="lock" size={iconSize} style={styles.icon} />;
  } else if (protocolIcon === 'server') {
    iconComponent = <Icon name="server" size={iconSize} style={styles.icon} />;
  } else if (protocolIcon === 'farcaster') {
    iconComponent = <FarcasterLogo size={iconSize} />;
    containerStyle = styles.farcasterContainer;
  }

  const viewStyle = React.useMemo(
    () => [
      containerStyle,
      {
        width: props.size,
        height: props.size,
        borderRadius: props.size,
      },
    ],
    [containerStyle, props.size],
  );

  return <View style={viewStyle}>{iconComponent}</View>;
}

const unboundStyles = {
  container: {
    backgroundColor: 'panelBackground',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  farcasterContainer: {
    backgroundColor: '#855DCD',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  icon: {
    color: 'whiteText',
  },
};

export default ProtocolIcon;
