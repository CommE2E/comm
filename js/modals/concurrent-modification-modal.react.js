// @flow

import React from 'react';

import Modal from './modal.react';

type Props = {
  onRefresh: () => void,
  onClose: () => void,
};

export default function ConcurrentModificationModal(props: Props) {
  return (
    <Modal name="Concurrent modification" onClose={props.onClose}>
      <div className="modal-body">
        <p>
          It looks like somebody is attempting to modify that field at the
          same time as you! Please refresh the entry and try again.
        </p>
        <div className="form-footer">
          <span className="form-submit">
            <input
              type="submit"
              value="Refresh entry"
              onClick={props.onRefresh}
            />
          </span>
        </div>
      </div>
    </Modal>
  );
}
