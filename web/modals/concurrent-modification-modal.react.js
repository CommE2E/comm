// @flow

import * as React from 'react';

import css from '../style.css';
import Modal from './modal.react';

type Props = {|
  +onRefresh: () => void,
  +onClose: () => void,
|};

export default function ConcurrentModificationModal(props: Props): React.Node {
  return (
    <Modal name="Concurrent modification" onClose={props.onClose}>
      <div className={css['modal-body']}>
        <p>
          It looks like somebody is attempting to modify that field at the same
          time as you! Please refresh the entry and try again.
        </p>
        <div className={css['form-footer']}>
          <input
            type="submit"
            value="Refresh entry"
            onClick={props.onRefresh}
          />
        </div>
      </div>
    </Modal>
  );
}
