// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import { policyTypes } from 'lib/facts/policies.js';

import TermsAndPrivacyModal from '../modals/terms-and-privacy-modal.react.js';
import { useSelector } from './redux-utils.js';

function PolicyAcknowledgmentHandler(): null {
  const termsAndPrivacyState = useSelector(
    state => state.userPolicies?.[policyTypes.tosAndPrivacyPolicy],
  );
  const [policyModalKey, setPolicyModalKey] = React.useState(null);
  const { pushModal, popModal, modals } = useModalContext();

  const policyModalVisible = React.useMemo(
    () => modals.some(modalEntry => modalEntry[1] === policyModalKey),
    [modals, policyModalKey],
  );

  React.useEffect(() => {
    if (!termsAndPrivacyState) {
      return;
    }

    const { isAcknowledged } = termsAndPrivacyState;
    if (!isAcknowledged && !policyModalVisible) {
      const modalKey = pushModal(<TermsAndPrivacyModal />);
      setPolicyModalKey(modalKey);
    }
    if (isAcknowledged && policyModalVisible) {
      popModal();
    }
  }, [policyModalVisible, popModal, pushModal, termsAndPrivacyState]);

  return null;
}

export default PolicyAcknowledgmentHandler;
