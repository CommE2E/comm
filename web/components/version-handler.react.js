// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';
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

type Props = {
  +keyserverID: string,
};

function SingleKeyserverMinVersionHandler(props: Props): null {
  const { keyserverID } = props;

  const connectionIssue = useSelector(
    state =>
      state.keyserverStore.keyserverInfos[keyserverID].connection
        .connectionIssue,
  );

  const { pushModal } = useModalContext();

  const prevConnectionIssueRef = React.useRef<?string>(null);

  React.useEffect(() => {
    if (
      connectionIssue === 'client_version_unsupported' &&
      connectionIssue !== prevConnectionIssueRef.current
    ) {
      prevConnectionIssueRef.current = connectionIssue;
      pushModal(<VersionUnsupportedModal />);
    }
  }, [connectionIssue, keyserverID, pushModal]);

  return null;
}
const MemoizedSingleKeyserverMinVersionHandler: React.ComponentType<Props> =
  React.memo<Props>(SingleKeyserverMinVersionHandler);

function MinVersionHandler(): React.Node {
  const keyserverIDs = useSelector(state =>
    Object.keys(state.keyserverStore.keyserverInfos),
  );

  return React.useMemo(
    () =>
      keyserverIDs.map(id => (
        <MemoizedSingleKeyserverMinVersionHandler keyserverID={id} key={id} />
      )),
    [keyserverIDs],
  );
}

export default MinVersionHandler;
