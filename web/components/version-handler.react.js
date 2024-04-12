// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import { allConnectionInfosSelector } from 'lib/selectors/keyserver-selectors.js';
import { isDesktopPlatform } from 'lib/types/device-types.js';
import { getConfig } from 'lib/utils/config.js';

import css from './version-handler.css';
import Modal from '../modals/modal.react.js';
import { useSelector } from '../redux/redux-utils.js';

function VersionUnsupportedModal(): React.Node {
  const { popModal } = useModalContext();

  const actionRequestMessage = isDesktopPlatform(
    getConfig().platformDetails.platform,
  )
    ? 'Please reload the app'
    : 'Please refresh the page';

  return (
    <Modal name="App version unsupported" onClose={popModal} size="large">
      <div className={css.modalContent}>
        Your app version is pretty old, and the server doesn’t know how to speak
        to it anymore. {actionRequestMessage}.
      </div>
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
