// @flow

import * as React from 'react';

import { logOutActionTypes, useLogOut } from 'lib/actions/user-actions.js';
import { useModalContext } from 'lib/components/modal-provider.react.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';
import { useSelector } from 'lib/utils/redux-utils.js';
import { usingCommServicesAccessToken } from 'lib/utils/services-utils.js';

import css from './version-handler.css';
import Modal from '../modals/modal.react.js';

function MissingCSATModal(): React.Node {
  const { popModal } = useModalContext();

  return (
    <Modal
      name="We&rsquo;re improving our password security"
      onClose={popModal}
      size="large"
    >
      <div className={css.modalContent}>
        <p>
          Unfortunately, we must log you out in order to generate a PAKE-derived
          secret. You can learn more about PAKEs and the protocol we use
          (OPAQUE){' '}
          <a
            href="https://blog.cryptographyengineering.com/2018/10/19/lets-talk-about-pake/"
            target="_blank"
            rel="noreferrer"
          >
            here
          </a>
          .
        </p>
      </div>
    </Modal>
  );
}

function LogOutIfMissingCSATHandler() {
  const dispatchActionPromise = useDispatchActionPromise();
  const callLogOut = useLogOut();

  const hasAccessToken = useSelector(state => !!state.commServicesAccessToken);
  const dataLoaded = useSelector(state => state.dataLoaded);

  const { pushModal } = useModalContext();

  React.useEffect(() => {
    if (!hasAccessToken && dataLoaded && usingCommServicesAccessToken) {
      void dispatchActionPromise(logOutActionTypes, callLogOut());
      pushModal(<MissingCSATModal />);
    }
  }, [
    callLogOut,
    dataLoaded,
    dispatchActionPromise,
    hasAccessToken,
    pushModal,
  ]);
}

export default LogOutIfMissingCSATHandler;
