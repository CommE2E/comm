// @flow

import React from 'react';

import Modal from './modal.react';

type Props = {
  thisURL: string,
  onClose: () => void,
};

export default function ConcurrentModificationModal(props: Props) {
  return (
    <Modal name="Concurrent modification" onClose={props.onClose}>
      <div className="modal-body">
        <p>
          It looks like somebody is attempting to modify that field at the
          same time as you! Please refresh the page and try again.
        </p>
        <div className="form-footer">
          <span className="form-submit">
            <input
              type="submit"
              value="Refresh"
              onClick={(e) => window.location.href = props.thisURL}
            />
          </span>
        </div>
      </div>
    </Modal>
  );
}
