// @flow

import invariant from 'invariant';
import * as React from 'react';

import { IdentityClientContext } from 'lib/shared/identity-client-context.js';

import css from './backup-test-restore-modal.css';
import Button from '../components/button.react.js';
import Input from '../modals/input.react.js';
import Modal from '../modals/modal.react.js';
import { getCommSharedWorker } from '../shared-worker/shared-worker-provider.js';
import { workerRequestMessageTypes } from '../types/worker-types.js';

type Props = {
  +onClose: () => void,
};

function BackupTestRestoreModal(props: Props): React.Node {
  const { onClose } = props;
  const [backupID, setBackupID] = React.useState('');
  const [backupDataKey, setBackupDataKey] = React.useState('');
  const [backupLogDataKey, setBackupLogDataKey] = React.useState('');
  const [inProgress, setInProgress] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');

  const client = React.useContext(IdentityClientContext);

  const onSubmit = React.useCallback(
    async (event: SyntheticEvent<HTMLButtonElement>) => {
      event.preventDefault();

      setInProgress(true);
      void (async () => {
        try {
          if (!client) {
            throw new Error('No identity client');
          }

          const authMetadata = await client.getAuthMetadata();

          const sharedWorker = await getCommSharedWorker();
          await sharedWorker.schedule({
            type: workerRequestMessageTypes.BACKUP_RESTORE,
            authMetadata,
            backupID,
            backupDataKey,
            backupLogDataKey,
          });
        } catch (e) {
          setErrorMessage(e.message);
        }
        setInProgress(false);
      })();
    },
    [backupDataKey, backupID, backupLogDataKey, client],
  );

  let errorMsg;
  if (errorMessage) {
    errorMsg = <div className={css.modalError}>{errorMessage}</div>;
  }

  return (
    <Modal name="Test backup restore" onClose={onClose} size="large">
      <div className={css.modalBody}>
        <div className={css.content}>
          <Input
            type="text"
            value={backupID}
            onChange={(event: SyntheticEvent<HTMLInputElement>) => {
              const target = event.target;
              invariant(target instanceof HTMLInputElement, 'target not input');
              setBackupID(target.value);
            }}
            disabled={inProgress}
            label="Backup ID"
          />
          <Input
            type="text"
            value={backupDataKey}
            onChange={(event: SyntheticEvent<HTMLInputElement>) => {
              const target = event.target;
              invariant(target instanceof HTMLInputElement, 'target not input');
              setBackupDataKey(target.value);
            }}
            disabled={inProgress}
            label="Backup Data Encryption Key"
          />
          <Input
            type="text"
            value={backupLogDataKey}
            onChange={(event: SyntheticEvent<HTMLInputElement>) => {
              const target = event.target;
              invariant(target instanceof HTMLInputElement, 'target not input');
              setBackupLogDataKey(target.value);
            }}
            disabled={inProgress}
            label="Backup Logs Encryption Key"
          />
        </div>
        <div className={css.footer}>
          <Button
            type="submit"
            variant="filled"
            onClick={onSubmit}
            disabled={!backupID || !backupDataKey || inProgress}
          >
            Restore
          </Button>
          {errorMsg}
        </div>
      </div>
    </Modal>
  );
}

export default BackupTestRestoreModal;
