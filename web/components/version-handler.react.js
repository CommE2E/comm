// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import ashoat from 'lib/facts/ashoat.js';

import KeyserverPill from './keyserver-pill.react.js';
import css from './version-handler.css';
import Modal from '../modals/modal.react.js';
import { useSelector } from '../redux/redux-utils.js';

type ModalProps = {
  +keyserverName: string,
};

function VersionUnsupportedModal(props: ModalProps): React.Node {
  const { popModal } = useModalContext();

  const subheader = React.useMemo(
    () => (
      <div className={css.ancestryContainer}>
        <KeyserverPill keyserverAdminUsername={props.keyserverName} />
      </div>
    ),
    [props.keyserverName],
  );

  return (
    <Modal
      name="App version unsupported"
      onClose={popModal}
      size="large"
      subheader={subheader}
    >
      <div className={css.modalContent}>
        Your app version is pretty old, and the server doesn’t know how to speak
        to it anymore. Please reload the app.
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

  const admin = useSelector(state => state.userStore[keyserverID]);
  let keyserverName = admin?.username;
  if (!keyserverName) {
    keyserverName = keyserverID === ashoat.id ? ashoat.username : keyserverID;
  }

  const { pushModal } = useModalContext();

  React.useEffect(() => {
    if (connectionIssue === 'client_version_unsupported') {
      pushModal(<VersionUnsupportedModal keyserverName={keyserverName} />);
    }
  }, [keyserverName, connectionIssue, keyserverID, pushModal]);

  return null;
}
const MemoizedSingleKeyserverMinVersionHandler: React.ComponentType<Props> =
  React.memo<Props>(SingleKeyserverMinVersionHandler);

function MinVersionHandler(): React.Node {
  const keyserverIDs = useSelector(state =>
    Object.keys(state.keyserverStore.keyserverInfos),
  );

  return keyserverIDs.map(id => (
    <MemoizedSingleKeyserverMinVersionHandler keyserverID={id} key={id} />
  ));
}

export default MinVersionHandler;
