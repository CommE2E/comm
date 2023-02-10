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

  const unreadDotStyle = React.useMemo(() => {
    return { opacity: unread ? 1 : 0 };
  }, [unread]);

  return (
    <View style={unreadDotStyle}>
      <ColorSplotch
        color={`${colors.listForegroundSecondaryLabel.slice(1)}`}
        size="micro"
      />
    </View>
  );
}

export default UnreadDot;
