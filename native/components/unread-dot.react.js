// @flow

import * as React from 'react';
import { View } from 'react-native';

import ColorSplotch from './color-splotch.react.js';
import { useColors } from '../themes/colors.js';

type Props = {
  +unread: ?boolean,
};
function UnreadDot(props: Props): React.Node {
  const { unread } = props;
  const colors = useColors();

  const colorSplotch = React.useMemo(
    () => (
      <ColorSplotch
        color={`${colors.listForegroundSecondaryLabel.slice(1)}`}
        size="micro"
      />
    ),
    [colors.listForegroundSecondaryLabel],
  );

  const unreadDotStyle = React.useMemo(
    () => ({ opacity: unread ? 1 : 0 }),
    [unread],
  );

  const unreadDot = React.useMemo(
    () => <View style={unreadDotStyle}>{colorSplotch}</View>,
    [colorSplotch, unreadDotStyle],
  );

  return unreadDot;
}

export default UnreadDot;
