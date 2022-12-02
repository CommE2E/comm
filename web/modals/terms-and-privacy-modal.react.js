// @flow

import * as React from 'react';

import {
  policyAcknowledgment,
  policyAcknowledgmentActionTypes,
} from 'lib/actions/user-actions.js';
import { policyTypes } from 'lib/facts/policies.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import {
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils.js';
import { acknowledgePolicy } from 'lib/utils/policy-acknowledge-utlis.js';

import Button, { buttonThemes } from '../components/button.react.js';
import LoadingIndicator from '../loading-indicator.react.js';
import { useSelector } from '../redux/redux-utils.js';
import Modal from './modal.react';
import css from './terms-and-privacy-modal.css';

const loadingStatusSelector = createLoadingStatusSelector(
  policyAcknowledgmentActionTypes,
);

const disabledOnClose = () => undefined;

function TermsAndPrivacyModal(): React.Node {
  const loading = useSelector(loadingStatusSelector);
  const [acknowledgmentError, setAcknowledgmentError] = React.useState('');
  const sendAcknowledgmentRequest = useServerCall(policyAcknowledgment);
  const dispatchActionPromise = useDispatchActionPromise();

  const onAccept = React.useCallback(() => {
    acknowledgePolicy(
      policyTypes.tosAndPrivacyPolicy,
      dispatchActionPromise,
      sendAcknowledgmentRequest,
      setAcknowledgmentError,
    );
  }, [dispatchActionPromise, sendAcknowledgmentRequest]);

  const buttonContent = React.useMemo(() => {
    if (loading === 'loading') {
      return <LoadingIndicator status="loading" size="medium" />;
    }
    return 'I accept';
  }, [loading]);

  return (
    <Modal
      withCloseButton={false}
      modalHeaderCentered={true}
      onClose={disabledOnClose}
      name="Terms of Service and Privacy Policy"
      size="large"
    >
      <div className={css.container}>
        We recently updated our{' '}
        <a
          href="https://comm.app/privacy"
          target="_blank"
          rel="noreferrer"
          className={css.link}
        >
          Terms of Service
        </a>
        {' & '}
        <a
          href="https://comm.app/terms"
          target="_blank"
          rel="noreferrer"
          className={css.link}
        >
          Privacy Policy
        </a>
        . We&apos;re asking you accept those to make sure you have a chance to
        acknowledge the updated policies.
      </div>

      <div className={css.button}>
        <Button
          variant="filled"
          buttonColor={buttonThemes.standard}
          onClick={onAccept}
        >
          <div className={css.buttonContent}>{buttonContent}</div>
        </Button>
        <div className={css.error}>{acknowledgmentError}</div>
      </div>
    </Modal>
  );
}

export default TermsAndPrivacyModal;
