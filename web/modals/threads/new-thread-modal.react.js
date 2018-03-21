// @flow

import {
  type ThreadInfo,
  threadInfoPropType,
  visibilityRules,
  assertVisibilityRules,
  type VisibilityRules,
  type NewThreadRequest,
  type NewThreadResult,
} from 'lib/types/thread-types';
import type { AppState } from '../../redux-setup';
import type { DispatchActionPromise } from 'lib/utils/action-utils';

import * as React from 'react';
import invariant from 'invariant';
import PropTypes from 'prop-types';

import { connect } from 'lib/utils/redux-utils';
import {
  newThreadActionTypes,
  newThread,
} from 'lib/actions/thread-actions';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import {
  generateRandomColor,
  threadTypeDescriptions,
} from 'lib/shared/thread-utils';
import { threadInfoSelector } from 'lib/selectors/thread-selectors';

import css from '../../style.css';
import Modal from '../modal.react';
import ColorPicker from './color-picker.react';

type Props = {
  onClose: () => void,
  parentThreadID?: ?string,
  // Redux state
  inputDisabled: bool,
  parentThreadInfo: ?ThreadInfo,
  // Redux dispatch functions
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  newThread: (request: NewThreadRequest) => Promise<NewThreadResult>,
};
type State = {
  name: string,
  description: string,
  color: string,
  visibilityRules: ?VisibilityRules,
  errorMessage: string,
};

class NewThreadModal extends React.PureComponent<Props, State> {

  static propTypes = {
    onClose: PropTypes.func.isRequired,
    parentThreadID: PropTypes.string,
    inputDisabled: PropTypes.bool.isRequired,
    parentThreadInfo: threadInfoPropType,
    dispatchActionPromise: PropTypes.func.isRequired,
    newThread: PropTypes.func.isRequired,
  };
  nameInput: ?HTMLInputElement;
  openPrivacyInput: ?HTMLInputElement;
  threadPasswordInput: ?HTMLInputElement;

  constructor(props: Props) {
    super(props);
    this.state = {
      name: "",
      description: "",
      color: props.parentThreadInfo
        ? props.parentThreadInfo.color
        : generateRandomColor(),
      visibilityRules: props.parentThreadID
        ? undefined
        : visibilityRules.CHAT_SECRET,
      errorMessage: "",
    };
  }

  componentDidMount() {
    invariant(this.nameInput, "nameInput ref unset");
    this.nameInput.focus();
  }

  render() {
    let threadTypes = null;
    if (this.props.parentThreadID) {
      threadTypes = (
        <div className={css['new-thread-privacy-container']}>
          <div className={css['modal-radio-selector']}>
            <div className={css['form-title']}>Thread type</div>
            <div className={css['form-enum-selector']}>
              <div className={css['form-enum-container']}>
                <input
                  type="radio"
                  name="new-thread-type"
                  id="new-thread-open"
                  value={visibilityRules.CHAT_NESTED_OPEN}
                  checked={
                    this.state.visibilityRules ===
                      visibilityRules.CHAT_NESTED_OPEN
                  }
                  onChange={this.onChangeThreadType}
                  disabled={this.props.inputDisabled}
                  ref={this.openPrivacyInputRef}
                />
                <div className={css['form-enum-option']}>
                  <label htmlFor="new-thread-open">
                    Open
                    <span className={css['form-enum-description']}>
                      {threadTypeDescriptions[visibilityRules.CHAT_NESTED_OPEN]}
                    </span>
                  </label>
                </div>
              </div>
              <div className={css['form-enum-container']}>
                <input
                  type="radio"
                  name="new-thread-type"
                  id="new-thread-closed"
                  value={visibilityRules.CHAT_SECRET}
                  checked={
                    this.state.visibilityRules ===
                      visibilityRules.CHAT_SECRET
                  }
                  onChange={this.onChangeThreadType}
                  disabled={this.props.inputDisabled}
                />
                <div className={css['form-enum-option']}>
                  <label htmlFor="new-thread-closed">
                    Secret
                    <span className={css['form-enum-description']}>
                      {threadTypeDescriptions[visibilityRules.CHAT_SECRET]}
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }
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
            {threadTypes}
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

  onChangeName = (event: SyntheticEvent<HTMLInputElement>) => {
    const target = event.target;
    invariant(target instanceof HTMLInputElement, "target not input");
    this.setState({ name: target.value });
  }

  onChangeDescription = (event: SyntheticEvent<HTMLTextAreaElement>) => {
    const target = event.target;
    invariant(target instanceof HTMLTextAreaElement, "target not textarea");
    this.setState({ description: target.value });
  }

  onChangeColor = (color: string) => {
    this.setState({ color: color });
  }

  onChangeThreadType = (event: SyntheticEvent<HTMLInputElement>) => {
    const target = event.target;
    invariant(target instanceof HTMLInputElement, "target not input");
    this.setState({
      visibilityRules: assertVisibilityRules(parseInt(target.value)),
    });
  }

  onSubmit = (event: SyntheticEvent<HTMLInputElement>) => {
    event.preventDefault();

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

    this.props.dispatchActionPromise(
      newThreadActionTypes,
      this.newThreadAction(ourVisibilityRules),
    );
  }

  async newThreadAction(ourVisibilityRules: VisibilityRules) {
    const name = this.state.name.trim();
    try {
      const response = await this.props.newThread({
        name,
        description: this.state.description,
        visibilityRules: ourVisibilityRules,
        color: this.state.color,
      });
      this.props.onClose();
      return response;
    } catch (e) {
      this.setState(
        {
          name: "",
          description: "",
          color: "",
          visibilityRules: undefined,
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

const loadingStatusSelector
  = createLoadingStatusSelector(newThreadActionTypes);

export default connect(
  (state: AppState, ownProps: { parentThreadID?: ?string }) => {
    let parentThreadInfo = null;
    const parentThreadID = ownProps.parentThreadID;
    if (parentThreadID) {
      parentThreadInfo = threadInfoSelector(state)[parentThreadID];
      invariant(parentThreadInfo, "parent thread should exist");
    }
    return {
      parentThreadInfo,
      inputDisabled: loadingStatusSelector(state) === "loading",
    };
  },
  { newThread },
)(NewThreadModal);
