// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';

import Modal from './modal.react.js';
import css from './update-modal.css';
import Button from '../components/button.react.js';
import electron from '../electron.js';

type Props = {
  +title: string,
  +text: string,
  +confirmText: string,
  +onConfirm: () => void,
};
function UpdateModal(props: Props): React.Node {
  const { title, text, confirmText, onConfirm } = props;

  const { popModal } = useModalContext();

  return (
    <Modal
      size="fit-content"
      name={title}
      icon="download"
      withCloseButton={false}
      onClose={popModal}
    >
      <div className={css.container}>
        <p className={css.text}>{text}</p>
        <div className={css.buttonContainer}>
          <Button variant="outline" onClick={popModal}>
            Later
          </Button>
          <Button variant="filled" onClick={onConfirm} type="submit">
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function UpdateModalHandler(): React.Node {
  const { pushModal, popModal } = useModalContext();

  // This modal is only for the update from the first version (0.0.1)
  // to the self-updating version
  React.useEffect(() => {
    if (electron === null || electron.version !== undefined) {
      return;
    }

    pushModal(
      <UpdateModal
        title="New version is available!"
        text="Click here to download a new version."
        confirmText="Download"
        onConfirm={() => {
          window.open(
            'https://electron-update.commtechnologies.org/download',
            '_blank',
            'noopener noreferrer',
          );
          popModal();
        }}
      />,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(
    () =>
      electron?.onNewVersionAvailable?.(version => {
        // On these versions we want to update immediately because there's
        // an issue if the user decides to update 10min after showing the modal
        if (electron?.version === '1.0.0' || electron?.version === '2.0.0') {
          electron?.updateToNewVersion?.();
        }

        pushModal(
          <UpdateModal
            title={`Version ${version} is available!`}
            text="Please restart to update."
            confirmText="Restart"
            onConfirm={() => electron?.updateToNewVersion?.()}
          />,
        );
      }),
    [pushModal],
  );

  return null;
}

export default UpdateModalHandler;
