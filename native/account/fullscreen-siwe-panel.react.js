// @flow

import * as React from 'react';
import { ActivityIndicator, View } from 'react-native';

import SIWEPanel from './siwe-panel.react.js';

type Props = {
  +onClose: () => mixed,
  +closing: boolean,
};
function FullscreenSIWEPanel(props: Props): React.Node {
  const [loading, setLoading] = React.useState(true);

  const activity = loading ? <ActivityIndicator size="large" /> : null;

  const activityContainer = React.useMemo(
    () => ({
      flex: 1,
    }),
    [],
  );

  return (
    <>
      <View style={activityContainer}>{activity}</View>
      <SIWEPanel {...props} setLoading={setLoading} />
    </>
  );
}

export default FullscreenSIWEPanel;
