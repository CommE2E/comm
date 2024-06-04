// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import { allConnectionInfosSelector } from 'lib/selectors/keyserver-selectors.js';

import VersionUnsupportedModal from '../modals/version-unsupported-modal.react.js';
import { useSelector } from '../redux/redux-utils.js';

function MinVersionHandler(): React.Node {
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
