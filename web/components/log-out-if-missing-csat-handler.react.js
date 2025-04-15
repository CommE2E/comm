// @flow

import * as React from 'react';

import { logOutActionTypes, useLogOut } from 'lib/actions/user-actions.js';
import { useModalContext } from 'lib/components/modal-provider.react.js';
import { accountHasPassword } from 'lib/shared/account-utils.js';
import { securityUpdateLogoutText } from 'lib/types/alert-types.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';
import { useSelector } from 'lib/utils/redux-utils.js';

import css from './missing-csat-modal.css';
import Modal from '../modals/modal.react.js';

type Props = {
  +isAccountWithPassword: boolean,
};

function MissingCSATModal(props: Props): React.Node {
  const { popModal } = useModalContext();
  const { isAccountWithPassword } = props;

  let modalContent;
  if (isAccountWithPassword) {
    modalContent = (
      <p>
        Unfortunately, we must log you out in order to generate a PAKE-derived
        secret. You can learn more about PAKEs and the protocol we use (OPAQUE){' '}
        <a
          href="https://blog.cryptographyengineering.com/2018/10/19/lets-talk-about-pake/"
          target="_blank"
          rel="noreferrer"
        >
          here
        </a>
        .
      </p>
    );
  } else {
    modalContent = <p>{securityUpdateLogoutText}</p>;
  }

  return (
    <Modal
      name="We&rsquo;re improving our security"
      onClose={popModal}
      size="large"
    >
      <div className={css.modalContent}>{modalContent}</div>
    </Modal>
  );
}

function LogOutIfMissingCSATHandler() {
  const dispatchActionPromise = useDispatchActionPromise();
  const callLogOut = useLogOut();
  const isAccountWithPassword = useSelector(state =>
    accountHasPassword(state.currentUserInfo),
  );

  const hasAccessToken = useSelector(state => !!state.commServicesAccessToken);
  const dataLoaded = useSelector(state => state.dataLoaded);

  const { pushModal } = useModalContext();

  React.useEffect(() => {
    if (!hasAccessToken && dataLoaded) {
      void dispatchActionPromise(logOutActionTypes, callLogOut());
      pushModal(
        <MissingCSATModal isAccountWithPassword={isAccountWithPassword} />,
      );
    }
  }, [
    callLogOut,
    dataLoaded,
    dispatchActionPromise,
    hasAccessToken,
    isAccountWithPassword,
    pushModal,
  ]);
}

export default LogOutIfMissingCSATHandler;
