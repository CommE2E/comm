// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import { policyTypes } from 'lib/facts/policies.js';

import TermsAndPrivacyModal from '../modals/terms-and-privacy-modal.react.js';
import { useSelector } from './redux-utils.js';

function PolicyAcknowledgmentHandler(): null {
  const [policyModalPushed, setPolicyModalPushed] = React.useState(false);
  const needPolicyAcceptance = useSelector(store => store.userPolicies);
  const { pushModal, popModal } = useModalContext();

  React.useEffect(() => {
    const tosAndPrivacyState =
      needPolicyAcceptance?.[policyTypes.tosAndPrivacyPolicy];
    if (!tosAndPrivacyState && policyModalPushed) {
      popModal();
      setPolicyModalPushed(false);
    }
    if (!tosAndPrivacyState) {
      return;
    }
    const { isAcknowledged } = tosAndPrivacyState;
    if (!isAcknowledged && !policyModalPushed) {
      pushModal(<TermsAndPrivacyModal />);
      setPolicyModalPushed(true);
    }
    if (isAcknowledged && policyModalPushed) {
      popModal();
      setPolicyModalPushed(false);
    }
  }, [needPolicyAcceptance, policyModalPushed, popModal, pushModal]);

  return null;
}

export default PolicyAcknowledgmentHandler;
