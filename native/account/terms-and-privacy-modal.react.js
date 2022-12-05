// @flow

import * as React from 'react';
import { Linking, Text, View } from 'react-native';

import {
  policyAcknowledgment,
  policyAcknowledgmentActionTypes,
} from 'lib/actions/user-actions';
import type { PolicyType } from 'lib/facts/policies';
import { policyTypes } from 'lib/facts/policies';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import {
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils';
import { acknowledgePolicy } from 'lib/utils/policy-acknowledge-utlis';

import LoadingIndicator from '../calendar/loading-indicator.react';
import Button from '../components/button.react';
import Modal from '../components/modal.react';
import type { RootNavigationProp } from '../navigation/root-navigator.react';
import type { NavigationRoute } from '../navigation/route-names';
import { useSelector } from '../redux/redux-utils';
import { useStyles } from '../themes/colors';

export type TermsAndPrivacyModalParams = {
  +policyType: PolicyType,
};

type Props = {
  +navigation: RootNavigationProp<'TermsAndPrivacyModal'>,
  +route: NavigationRoute<'TermsAndPrivacyModal'>,
};

const loadingStatusSelector = createLoadingStatusSelector(
  policyAcknowledgmentActionTypes,
);

function TermsAndPrivacyModal(props: Props): React.Node {
  const loading = useSelector(loadingStatusSelector);
  const [acknowledgmentError, setAcknowledgmentError] = React.useState('');
  const sendAcknowledgmentRequest = useServerCall(policyAcknowledgment);
  const dispatchActionPromise = useDispatchActionPromise();

  const policyType = props.route.params.policyType;
  const policyState = useSelector(store => store.userPolicies);

  React.useEffect(() => {
    if (policyState[policyType]?.isAcknowledged) {
      props.navigation.goBack();
    }
  }, [policyState, policyType, props.navigation]);

  const onAccept = React.useCallback(() => {
    acknowledgePolicy(
      policyTypes.tosAndPrivacyPolicy,
      dispatchActionPromise,
      sendAcknowledgmentRequest,
      e => setAcknowledgmentError(e),
    );
  }, [dispatchActionPromise, sendAcknowledgmentRequest]);

  const styles = useStyles(unboundStyles);

  const buttonContent = React.useMemo(() => {
    if (loading === 'loading') {
      return (
        <LoadingIndicator
          loadingStatus={loading}
          color="#D3D3D3"
          canUseRed={false}
        />
      );
    }
    return <Text style={styles.buttonText}>I accept</Text>;
  }, [loading, styles.buttonText]);

  const safeAreaEdges = ['top', 'bottom'];
  /* eslint-disable react-native/no-raw-text */
  return (
    <Modal
      disableClosing={true}
      modalStyle={styles.modal}
      safeAreaEdges={safeAreaEdges}
    >
      <Text style={styles.header}>Terms of Service and Privacy Policy</Text>
      <Text style={styles.label}>
        {' '}
        We recently updated our&nbsp;
        <Text style={styles.link} onPress={onTermsOfUsePressed}>
          Terms of Service
        </Text>
        {' & '}
        <Text style={styles.link} onPress={onPrivacyPolicyPressed}>
          Privacy Policy
        </Text>
        . We&apos;re asking you accept those to make sure you have a chance to
        acknowledge the updated policies.
      </Text>

      <View style={styles.buttonsContainer}>
        <Button style={styles.button} onPress={onAccept}>
          <Text style={styles.buttonText}>{buttonContent}</Text>
        </Button>
        <Text style={styles.error}>{acknowledgmentError}</Text>
      </View>
    </Modal>
  );
}

const unboundStyles = {
  modal: {
    backgroundColor: 'modalForeground',
    paddingBottom: 10,
    paddingTop: 32,
    paddingHorizontal: 32,
    flex: 0,
    borderColor: 'modalForegroundBorder',
  },
  header: {
    color: 'modalForegroundLabel',
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    paddingBottom: 16,
  },
  label: {
    color: 'modalForegroundSecondaryLabel',
    fontSize: 16,
    lineHeight: 20,
    textAlign: 'center',
  },
  link: {
    color: 'purpleLink',
    fontWeight: 'bold',
  },
  buttonsContainer: {
    flexDirection: 'column',
    marginTop: 24,
    height: 70,
    paddingHorizontal: 16,
  },
  button: {
    borderRadius: 5,
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 48,
    backgroundColor: 'purpleButton',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  error: {
    marginTop: 6,
    fontStyle: 'italic',
    color: 'redText',
    textAlign: 'center',
  },
};

const onTermsOfUsePressed = () => {
  Linking.openURL('https://comm.app/terms');
};

const onPrivacyPolicyPressed = () => {
  Linking.openURL('https://comm.app/privacy');
};

export default TermsAndPrivacyModal;
