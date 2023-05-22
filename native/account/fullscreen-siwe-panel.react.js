// @flow

import * as React from 'react';
import { Alert, ActivityIndicator, View } from 'react-native';

import type { SIWEResult } from 'lib/types/siwe-types.js';

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

  const onCloseProp = props.onClose;
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

  const successRef = React.useRef(false);
  const onSuccess = React.useCallback(
    (result: SIWEResult) => {
      successRef.current = true;
      return siweServerCall(result);
    },
    [siweServerCall],
  );

  const onClose = React.useCallback(() => {
    if (!successRef.current) {
      onCloseProp();
    }
  }, [onCloseProp]);

  const { closing } = props;
  return (
    <>
      <View style={activityContainer}>{activity}</View>
      <SIWEPanel
        closing={closing}
        onClosed={onClose}
        onClosing={onClose}
        onSuccessfulWalletSignature={onSuccess}
        setLoading={setLoading}
      />
    </>
  );
}

export default FullscreenSIWEPanel;
