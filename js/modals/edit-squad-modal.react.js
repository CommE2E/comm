// @flow

import type { SquadInfo } from '../squad-info';
import { squadInfoPropType } from '../squad-info';

import React from 'react';
import invariant from 'invariant';
import update from 'immutability-helper';

import $ from 'jquery';
import 'spectrum-colorpicker'; // side effect: $.spectrum

import Modal from './modal.react';

type Props = {
  squadInfo: SquadInfo,
  onClose: () => void,
};
type State = {
  squadInfo: SquadInfo,
};

class EditSquadModal extends React.Component {

  props: Props;
  state: State;
  nameInput: ?HTMLInputElement;

  constructor(props: Props) {
    super(props);
    this.state = {
      squadInfo: props.squadInfo,
    };
  }

  componentDidMount() {
    invariant(this.nameInput, "nameInput ref unset");
    this.nameInput.focus();
    $('input#edit-squad-color').spectrum({
      'cancelText': "Cancel",
      'chooseText': "Choose",
      'preferredFormat': "hex",
      'color': this.state.squadInfo.color,
    });
  }

  render() {
    let squadPasswordInputs = null;
    if (this.state.squadInfo.closed) {
      // Note: these depend on props, not state
      const passwordPlaceholder = this.props.squadInfo.closed
        ? "New squad password (optional)"
        : "New squad password";
      const confirmPlaceholder = this.props.squadInfo.closed
        ? "Confirm squad password (optional)"
        : "Confirm squad password";
      squadPasswordInputs = (
        <div>
          <div
            className="form-enum-password"
            id="edit-squad-new-password-container"
          >
            <input
              type="password"
              id="edit-squad-new-password"
              placeholder={passwordPlaceholder}
            />
          </div>
          <div
            className="form-enum-password"
            id="edit-squad-confirm-password-container"
          >
            <input
              type="password"
              id="edit-squad-confirm-password"
              placeholder={confirmPlaceholder}
            />
          </div>
        </div>
      );
    }
    return (
      <Modal name="Edit squad" onClose={this.props.onClose}>
        <form method="POST">
          <div>
            <div className="form-title">Squad name</div>
            <div className="form-content">
              <input
                type="text"
                id="edit-squad-name"
                defaultValue={this.state.squadInfo.name}
                ref={(nameInput) => this.nameInput = nameInput}
              />
            </div>
          </div>
          <div className="modal-radio-selector">
            <div className="form-title">Privacy</div>
            <div className="form-enum-selector">
              <div className="form-enum-container">
                <input
                  type="radio"
                  name="edit-squad-type"
                  id="edit-squad-open"
                  value={false}
                  checked={!this.state.squadInfo.closed}
                  onChange={this.onChangeClosed.bind(this)}
                />
                <div className="form-enum-option">
                  <label htmlFor="edit-squad-open">
                    Open
                    <span className="form-enum-description">
                      Anybody can view the contents of an open squad.
                    </span>
                  </label>
                </div>
              </div>
              <div className="form-enum-container">
                <input
                  type="radio"
                  name="edit-squad-type"
                  id="edit-squad-closed"
                  value={true}
                  checked={this.state.squadInfo.closed}
                  onChange={this.onChangeClosed.bind(this)}
                />
                <div className="form-enum-option">
                  <label htmlFor="edit-squad-closed">
                    Closed
                    <span className="form-enum-description">
                      Only people with the password can view the contents of
                      a closed squad.
                    </span>
                  </label>
                  {squadPasswordInputs}
                </div>
              </div>
            </div>
          </div>
          <div>
            <div className="form-title" id="color-title">Color</div>
            <div className="form-content">
              <input
                type="text"
                id="edit-squad-color"
              />
            </div>
          </div>
          <div>
            <div className="form-title">Account password</div>
            <div className="form-content">
              <input
                type="password"
                id="edit-squad-personal-password"
                placeholder="Personal account password"
              />
            </div>
          </div>
          <div className="form-footer">
            <span className="modal-form-error"></span>
            <span className="form-submit">
              <input
                type="submit"
                value="Update squad"
                onClick={this.onSubmit.bind(this)}
              />
            </span>
          </div>
        </form>
      </Modal>
    );
  }

  onChangeClosed(event: SyntheticEvent) {
    const target = event.target;
    invariant(target instanceof HTMLInputElement, "target not input");
    this.setState(
      (prevState, props) => {
        return update(prevState, {
          squadInfo: {
            closed: { $set: target.value === "true" },
          }
        });
      },
    );
  }

  onSubmit(event: SyntheticEvent) {
  }

}

EditSquadModal.propTypes = {
  squadInfo: squadInfoPropType.isRequired,
  onClose: React.PropTypes.func.isRequired,
}

export default EditSquadModal;
