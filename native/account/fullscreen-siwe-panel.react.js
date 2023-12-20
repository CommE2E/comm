// @flow

import * as React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { setDataLoadedActionType } from 'lib/actions/client-db-store-actions.js';
import type { SIWEResult } from 'lib/types/siwe-types.js';
import { useDispatch } from 'lib/utils/redux-utils.js';

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

  const siweServerCall = useSIWEServerCall();
  const successRef = React.useRef(false);
  const dispatch = useDispatch();
  const { goBackToPrompt } = props;
  const onSuccess = React.useCallback(
    async (result: SIWEResult) => {
      successRef.current = true;
      try {
        await siweServerCall({ ...result, doNotRegister: true });
      } catch (e) {
        Alert.alert(
          'Unknown error',
          'Uhh... try again?',
          [{ text: 'OK', onPress: goBackToPrompt }],
          { cancelable: false },
        );
        throw e;
      }
      dispatch({
        type: setDataLoadedActionType,
        payload: {
          dataLoaded: true,
        },
      });
    },
    [siweServerCall, dispatch, goBackToPrompt],
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
