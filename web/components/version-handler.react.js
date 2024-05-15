// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import { allConnectionInfosSelector } from 'lib/selectors/keyserver-selectors.js';

import css from './version-handler.css';
import Modal from '../modals/modal.react.js';
import { useSelector } from '../redux/redux-utils.js';
import { getVersionUnsupportedError } from '../utils/version-utils.js';

function VersionUnsupportedModal(): React.Node {
  const { popModal } = useModalContext();
  const message = getVersionUnsupportedError();
  return (
    <Modal name="App version unsupported" onClose={popModal} size="large">
      <div className={css.modalContent}>{message}</div>
    </Modal>
  );
}

function MinVersionHandler(): null {
  const connections = useSelector(allConnectionInfosSelector);

  const isClientVersionUnsupported = React.useMemo(() => {
    const connectionIssues = Object.values(connections).map(
      connection => connection?.connectionIssue,
    );
    return connectionIssues.includes('client_version_unsupported');
  }, [connections]);

  const hasShownModalRef = React.useRef(false);
  const { pushModal } = useModalContext();

  React.useEffect(() => {
    if (isClientVersionUnsupported && !hasShownModalRef.current) {
      hasShownModalRef.current = true;
      pushModal(<VersionUnsupportedModal />);
    }
  }, [isClientVersionUnsupported, pushModal]);

  return null;
}

export default MinVersionHandler;
