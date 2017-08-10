// @flow

import type { VisibilityRules } from 'lib/types/thread-types';
import {
  visibilityRules,
  assertVisibilityRules,
} from 'lib/types/thread-types';
import type { AppState } from '../redux-setup';
import type { DispatchActionPromise } from 'lib/utils/action-utils';
import type { ThreadInfo } from 'lib/types/thread-types';

import React from 'react';
import invariant from 'invariant';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import {
  includeDispatchActionProps,
  bindServerCalls,
} from 'lib/utils/action-utils';
import {
  newThreadActionTypes,
  newThread,
} from 'lib/actions/thread-actions';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';

import css from '../style.css';
import Modal from './modal.react';
import ColorPicker from './color-picker.react';

type Props = {
  onClose: () => void,
  // Redux state
  inputDisabled: bool,
  viewerID: string,
  // Redux dispatch functions
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  newThread: (
    viewerID: string,
    name: string,
    description: string,
    ourVisibilityRules: VisibilityRules,
    password: string,
    color: string,
  ) => Promise<ThreadInfo>,
};
type State = {
  name: string,
  description: string,
  color: string,
  visibilityRules: ?VisibilityRules,
  threadPassword: string,
  confirmThreadPassword: string,
  errorMessage: string,
};

class NewThreadModal extends React.PureComponent {

  props: Props;
  state: State;
  nameInput: ?HTMLInputElement;
  openPrivacyInput: ?HTMLInputElement;
  threadPasswordInput: ?HTMLInputElement;

  constructor(props: Props) {
    super(props);
    this.state = {
      name: "",
      description: "",
      color: "fff8dd",
      visibilityRules: undefined,
      threadPassword: "",
      confirmThreadPassword: "",
      errorMessage: "",
    };
  }

  componentDidMount() {
    invariant(this.nameInput, "nameInput ref unset");
    this.nameInput.focus();
  }

  render() {
    let threadPasswordInputs = null;
    if (
      this.state.visibilityRules !== undefined &&
      this.state.visibilityRules !== null &&
      this.state.visibilityRules >= visibilityRules.CLOSED
    ) {
      threadPasswordInputs = (
        <div>
          <div className={css['form-enum-password']}>
            <input
              type="password"
              placeholder="New thread password"
              value={this.state.threadPassword}
              onChange={this.onChangeThreadPassword}
              disabled={this.props.inputDisabled}
              ref={this.threadPasswordInputRef}
            />
          </div>
          <div className={css['form-enum-password']}>
            <input
              type="password"
              placeholder="Confirm thread password"
              value={this.state.confirmThreadPassword}
              onChange={this.onChangeConfirmThreadPassword}
              disabled={this.props.inputDisabled}
            />
          </div>
        </div>
      );
    }
    const closedPasswordEntry =
      this.state.visibilityRules === visibilityRules.CLOSED
        ? threadPasswordInputs
        : null;
    const secretPasswordEntry =
      this.state.visibilityRules === visibilityRules.SECRET
        ? threadPasswordInputs
        : null;
    return (
      <Modal name="New thread" onClose={this.props.onClose} size="large">
        <div className={css['modal-body']}>
          <form method="POST">
            <div>
              <div className={css['form-title']}>Thread name</div>
              <div className={css['form-content']}>
                <input
                  type="text"
                  value={this.state.name}
                  placeholder="Thread name"
                  onChange={this.onChangeName}
                  disabled={this.props.inputDisabled}
                  ref={this.nameInputRef}
                />
              </div>
            </div>
            <div className={css['form-textarea-container']}>
              <div className={css['form-title']}>Description</div>
              <div className={css['form-content']}>
                <textarea
                  value={this.state.description}
                  placeholder="Thread description"
                  onChange={this.onChangeDescription}
                  disabled={this.props.inputDisabled}
                />
              </div>
            </div>
            <div className={css['new-thread-privacy-container']}>
              <div className={css['modal-radio-selector']}>
                <div className={css['form-title']}>Visibility</div>
                <div className={css['form-enum-selector']}>
                  <div className={css['form-enum-container']}>
                    <input
                      type="radio"
                      name="new-thread-type"
                      id="new-thread-open"
                      value={visibilityRules.OPEN}
                      checked={
                        this.state.visibilityRules === visibilityRules.OPEN
                      }
                      onChange={this.onChangeClosed}
                      disabled={this.props.inputDisabled}
                      ref={this.openPrivacyInputRef}
                    />
                    <div className={css['form-enum-option']}>
                      <label htmlFor="new-thread-open">
                        Open
                        <span className={css['form-enum-description']}>
                          Anybody can view the contents of an open thread.
                        </span>
                      </label>
                    </div>
                  </div>
                  <div className={css['form-enum-container']}>
                    <input
                      type="radio"
                      name="new-thread-type"
                      id="new-thread-closed"
                      value={visibilityRules.CLOSED}
                      checked={
                        this.state.visibilityRules === visibilityRules.CLOSED
                      }
                      onChange={this.onChangeClosed}
                      disabled={this.props.inputDisabled}
                    />
                    <div className={css['form-enum-option']}>
                      <label htmlFor="new-thread-closed">
                        Closed
                        <span className={css['form-enum-description']}>
                          Only people with the password can view the contents of
                          a closed thread.
                        </span>
                      </label>
                      {closedPasswordEntry}
                    </div>
                  </div>
                  <div className={css['form-enum-container']}>
                    <input
                      type="radio"
                      name="new-thread-type"
                      id="new-thread-secret"
                      value={visibilityRules.SECRET}
                      checked={
                        this.state.visibilityRules === visibilityRules.SECRET
                      }
                      onChange={this.onChangeClosed}
                      disabled={this.props.inputDisabled}
                    />
                    <div className={css['form-enum-option']}>
                      <label htmlFor="new-thread-secret">
                        Secret
                        <span className={css['form-enum-description']}>
                          Only people with the password can view the thread,
                          and it won't appear in search results or
                          recommendations. Share the URL and password with your
                          friends to add them.
                        </span>
                      </label>
                      {secretPasswordEntry}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <div className={`${css['form-title']} ${css['color-title']}`}>
                Color
              </div>
              <div className={css['form-content']}>
                <ColorPicker
                  id="new-thread-color"
                  value={this.state.color}
                  disabled={this.props.inputDisabled}
                  onChange={this.onChangeColor}
                />
              </div>
            </div>
            <div className={css['form-footer']}>
              <span className={css['modal-form-error']}>
                {this.state.errorMessage}
              </span>
              <span className={css['form-submit']}>
                <input
                  type="submit"
                  value="Save"
                  onClick={this.onSubmit}
                  disabled={this.props.inputDisabled}
                />
              </span>
            </div>
          </form>
        </div>
      </Modal>
    );
  }

  nameInputRef = (nameInput: ?HTMLInputElement) => {
    this.nameInput = nameInput;
  }

  openPrivacyInputRef = (openPrivacyInput: ?HTMLInputElement) => {
    this.openPrivacyInput = openPrivacyInput;
  }

  threadPasswordInputRef = (threadPasswordInput: ?HTMLInputElement) => {
    this.threadPasswordInput = threadPasswordInput;
  }

  onChangeName = (event: SyntheticEvent) => {
    const target = event.target;
    invariant(target instanceof HTMLInputElement, "target not input");
    this.setState({ name: target.value });
  }

  onChangeDescription = (event: SyntheticEvent) => {
    const target = event.target;
    invariant(target instanceof HTMLTextAreaElement, "target not textarea");
    this.setState({ description: target.value });
  }

  onChangeColor = (color: string) => {
    this.setState({ color: color });
  }

  onChangeClosed = (event: SyntheticEvent) => {
    const target = event.target;
    invariant(target instanceof HTMLInputElement, "target not input");
    this.setState({
      visibilityRules: assertVisibilityRules(parseInt(target.value)),
    });
  }

  onChangeThreadPassword = (event: SyntheticEvent) => {
    const target = event.target;
    invariant(target instanceof HTMLInputElement, "target not input");
    this.setState({ threadPassword: target.value });
  }

  onChangeConfirmThreadPassword = (event: SyntheticEvent) => {
    const target = event.target;
    invariant(target instanceof HTMLInputElement, "target not input");
    this.setState({ confirmThreadPassword: target.value });
  }

  onSubmit = (event: SyntheticEvent) => {
    event.preventDefault();

    const name = this.state.name.trim();
    if (name === '') {
      this.setState(
        {
          name: "",
          errorMessage: "empty thread name",
        },
        () => {
          invariant(this.nameInput, "nameInput ref unset");
          this.nameInput.focus();
        },
      );
      return;
    }

    const ourVisibilityRules = this.state.visibilityRules;
    invariant(
      ourVisibilityRules !== null,
      "visibilityRules state should never be set to null",
    );
    if (ourVisibilityRules === undefined) {
      this.setState(
        {
          errorMessage: "visibility unspecified",
        },
        () => {
          invariant(this.openPrivacyInput, "openPrivacyInput ref unset");
          this.openPrivacyInput.focus();
        },
      );
      return;
    }

    if (ourVisibilityRules >= visibilityRules.CLOSED) {
      if (this.state.threadPassword === '') {
        this.setState(
          {
            threadPassword: "",
            confirmThreadPassword: "",
            errorMessage: "empty password",
          },
          () => {
            invariant(
              this.threadPasswordInput,
              "threadPasswordInput ref unset",
            );
            this.threadPasswordInput.focus();
          },
        );
        return;
      }
      if (this.state.threadPassword !== this.state.confirmThreadPassword) {
        this.setState(
          {
            threadPassword: "",
            confirmThreadPassword: "",
            errorMessage: "passwords don't match",
          },
          () => {
            invariant(
              this.threadPasswordInput,
              "threadPasswordInput ref unset",
            );
            this.threadPasswordInput.focus();
          },
        );
        return;
      }
    }

    this.props.dispatchActionPromise(
      newThreadActionTypes,
      this.newThreadAction(name, ourVisibilityRules),
    );
  }

  async newThreadAction(name: string, ourVisibilityRules: VisibilityRules) {
    try {
      const response = await this.props.newThread(
        this.props.viewerID,
        name,
        this.state.description,
        ourVisibilityRules,
        this.state.threadPassword,
        this.state.color,
      );
      this.props.onClose();
      return response;
    } catch (e) {
      this.setState(
        {
          name: "",
          description: "",
          color: "",
          visibilityRules: undefined,
          threadPassword: "",
          confirmThreadPassword: "",
          errorMessage: "unknown error",
        },
        () => {
          invariant(this.nameInput, "nameInput ref unset");
          this.nameInput.focus();
        },
      );
      throw e;
    }
  }

}

NewThreadModal.propTypes = {
  onClose: PropTypes.func.isRequired,
  inputDisabled: PropTypes.bool.isRequired,
  viewerID: PropTypes.string.isRequired,
  dispatchActionPromise: PropTypes.func.isRequired,
  newThread: PropTypes.func.isRequired,
}

const loadingStatusSelector
  = createLoadingStatusSelector(newThreadActionTypes);

export default connect(
  (state: AppState) => {
    const viewerID = state.currentUserInfo && state.currentUserInfo.id;
    invariant(viewerID, "must be logged in to create new thread");
    return {
      inputDisabled: loadingStatusSelector(state) === "loading",
      viewerID,
      cookie: state.cookie,
    };
  },
  includeDispatchActionProps,
  bindServerCalls({ newThread }),
)(NewThreadModal);
