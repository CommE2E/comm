// @flow

import * as React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useDispatch } from 'react-redux';

import { setDataLoadedActionType } from 'lib/actions/client-db-store-actions.js';
import type { SIWEResult } from 'lib/types/siwe-types.js';

import { useSIWEServerCall } from './siwe-hooks.js';
import SIWEPanel from './siwe-panel.react.js';
import Alert from '../utils/alert.js';

type Props = {
  +goBackToPrompt: () => mixed,
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

  const { goBackToPrompt } = props;
  const siweServerCallParams = React.useMemo(() => {
    const onServerCallFailure = () => {
      Alert.alert(
        'Unknown error',
        'Uhh... try again?',
        [{ text: 'OK', onPress: goBackToPrompt }],
        { cancelable: false },
      );
    };
    return { onFailure: onServerCallFailure };
  }, [goBackToPrompt]);
  const siweServerCall = useSIWEServerCall(siweServerCallParams);

  const successRef = React.useRef(false);
  const dispatch = useDispatch();
  const onSuccess = React.useCallback(
    async (result: SIWEResult) => {
      successRef.current = true;
      await siweServerCall(result);
      dispatch({
        type: setDataLoadedActionType,
        payload: {
          dataLoaded: true,
        },
      });
    },
    [siweServerCall, dispatch],
  );

  const ifBeforeSuccessGoBackToPrompt = React.useCallback(() => {
    if (!successRef.current) {
      goBackToPrompt();
    }
  }, [goBackToPrompt]);

  const { closing } = props;
  return (
    <>
      <View style={activityContainer}>{activity}</View>
      <SIWEPanel
        closing={closing}
        onClosed={ifBeforeSuccessGoBackToPrompt}
        onClosing={ifBeforeSuccessGoBackToPrompt}
        onSuccessfulWalletSignature={onSuccess}
        setLoading={setLoading}
      />
    </>
  );
}

export default FullscreenSIWEPanel;
