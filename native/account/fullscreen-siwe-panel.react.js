// @flow

import * as React from 'react';
import { Alert, ActivityIndicator, View } from 'react-native';

import { useSIWEServerCall } from './siwe-hooks.js';
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

  const { onClose } = props;
  const siweServerCallParams = React.useMemo(() => {
    const onServerCallFailure = () => {
      Alert.alert(
        'Unknown error',
        'Uhh... try again?',
        [{ text: 'OK', onPress: onClose }],
        { cancelable: false },
      );
    };
    return { onFailure: onServerCallFailure };
  }, [onClose]);
  const siweServerCall = useSIWEServerCall(siweServerCallParams);

  const { closing } = props;
  return (
    <>
      <View style={activityContainer}>{activity}</View>
      <SIWEPanel
        closing={closing}
        onClosed={onClose}
        onClosing={onClose}
        onSuccessfulWalletSignature={siweServerCall}
        setLoading={setLoading}
      />
    </>
  );
}

export default FullscreenSIWEPanel;
