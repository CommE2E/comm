// @flow

import type { ThreadInfo } from 'lib/types/thread-types';
import { threadInfoPropType } from 'lib/types/thread-types';
import type { LoadingStatus } from 'lib/types/loading-types';
import type { AppState, NavInfo } from '../redux-setup';
import { navInfoPropType } from '../redux-setup';
import type {
  DispatchActionPayload,
  DispatchActionPromise,
} from 'lib/utils/action-utils';
import type { JoinThreadResult } from 'lib/actions/thread-actions';

import React from 'react';
import classNames from 'classnames';
import TextTruncate from 'react-text-truncate';
import { connect } from 'react-redux';
import invariant from 'invariant';
import PropTypes from 'prop-types';

import { currentNavID } from 'lib/selectors/nav-selectors';
import * as TypeaheadText from 'lib/shared/typeahead-text';
import {
  joinThreadActionTypes,
  joinThread,
} from 'lib/actions/thread-actions';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import {
  includeDispatchActionProps,
  bindServerCalls,
} from 'lib/utils/action-utils';

import css from '../style.css';
import TypeaheadOptionButtons from './typeahead-option-buttons.react';
import { monthURL } from '../url-utils';
import history from '../router-history';
import LoadingIndicator from '../loading-indicator.react';

type Props = {
  threadInfo?: ThreadInfo,
  secretThreadID?: string,
  freezeTypeahead: (navID: string) => void,
  unfreezeTypeahead: (navID: string) => void,
  focusTypeahead: () => void,
  onTransition: () => void,
  frozen?: bool,
  setModal: (modal: React.Element<any>) => void,
  clearModal: () => void,
  typeaheadFocused: bool,
  // Redux state
  monthURL: string,
  currentNavID: ?string,
  currentThreadID: ?string,
  passwordEntryLoadingStatus: LoadingStatus,
  navInfo: NavInfo,
  // Redux dispatch functions
  dispatchActionPayload: DispatchActionPayload,
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  joinThread: (
    threadID: string,
    threadPassword: string,
  ) => Promise<JoinThreadResult>;
};
type State = {
  passwordEntryValue: string,
  passwordEntryOpen: bool,
};

class TypeaheadThreadOption extends React.PureComponent {

  static defaultProps = { frozen: false };
  props: Props;
  state: State;

  passwordEntryInput: ?HTMLInputElement;

  constructor(props: Props) {
    super(props);
    this.state = {
      passwordEntryValue: "",
      passwordEntryOpen:
        TypeaheadThreadOption.forCurrentAndUnauthorizedThread(props),
    };
  }

  // This function tells you if the thread this nav option represents is the one
  // we are currently navigated to, AND we aren't authorized to view it, AND
  // this nav option isn't being shown as part of search results.
  static forCurrentAndUnauthorizedThread(props: Props) {
    return !props.currentNavID &&
      props.currentThreadID === TypeaheadThreadOption.getID(props) &&
      !props.typeaheadFocused;
  }

  componentDidMount() {
    if (TypeaheadThreadOption.forCurrentAndUnauthorizedThread(this.props)) {
      this.props.freezeTypeahead(TypeaheadThreadOption.getID(this.props));
      this.focusPasswordEntry();
    }
  }

  componentWillUnmount() {
    this.props.unfreezeTypeahead(TypeaheadThreadOption.getID(this.props));
  }

  focusPasswordEntry = () => {
    invariant(
      this.passwordEntryInput instanceof HTMLInputElement,
      "passwordEntryInput ref not set",
    );
    this.passwordEntryInput.focus();
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    if (this.state.passwordEntryOpen && !prevState.passwordEntryOpen) {
      this.focusPasswordEntry();
    }
  }

  render() {
    let descriptionDiv = null;
    if (this.props.threadInfo && this.props.threadInfo.description) {
      descriptionDiv = (
        <div className={css['thread-nav-option-description']}>
          <TextTruncate
            line={2}
            text={this.props.threadInfo.description}
          />
        </div>
      );
    }
    let passwordEntry = null;
    if (this.state.passwordEntryOpen) {
      passwordEntry =
        <div className={css['thread-password-entry']}>
          <input
            type="submit"
            value="Enter"
            className={css['thread-password-entry-submit']}
            onClick={this.onSubmitPassword}
            disabled={this.props.passwordEntryLoadingStatus === "loading"}
          />
          <LoadingIndicator
            status={this.props.passwordEntryLoadingStatus}
            className={css['thread-pasword-entry-loading']}
          />
          <div className={css['thread-password-entry-input-container']}>
            <input
              type="password"
              className={css['thread-password-entry-input']}
              value={this.state.passwordEntryValue}
              onChange={this.onPasswordEntryChange}
              onBlur={this.onPasswordEntryBlur}
              onKeyDown={this.onPasswordEntryKeyDown}
              onMouseDown={this.onPasswordEntryMouseDown}
              placeholder="Password"
              ref={this.passwordEntryInputRef}
            />
          </div>
        </div>;
    }
    let colorPreview = null;
    let optionButtons = null;
    let name = null;
    if (this.props.threadInfo) {
      const colorPreviewStyle = {
        backgroundColor: "#" + this.props.threadInfo.color,
      };
      colorPreview = (
        <div
          className={css['thread-nav-color-preview']}
          style={colorPreviewStyle}
        />
      );
      optionButtons = (
        <TypeaheadOptionButtons
          threadInfo={this.props.threadInfo}
          setModal={this.props.setModal}
          clearModal={this.props.clearModal}
          freezeTypeahead={this.props.freezeTypeahead}
          unfreezeTypeahead={this.props.unfreezeTypeahead}
          focusTypeahead={this.props.focusTypeahead}
        />
      );
      name = this.props.threadInfo.name;
    } else {
      name = TypeaheadText.secretText;
    }
    return (
      <div
        className={classNames({
          [css['thread-nav-option']]: true,
          [css['thread-nav-open-option']]: this.state.passwordEntryOpen,
          [css['thread-nav-frozen-option']]: this.props.frozen ||
            this.state.passwordEntryOpen,
        })}
        onClick={this.onClick}
      >
        {colorPreview}
        <div>
          {optionButtons}
          <div className={css['thread-nav-option-name']}>
            {name}
          </div>
        </div>
        {descriptionDiv}
        {passwordEntry}
      </div>
    );
  }

  passwordEntryInputRef = (passwordEntryInput: ?HTMLInputElement) => {
    this.passwordEntryInput = passwordEntryInput;
  }

  static getID(props: OwnProps) {
    const id = props.threadInfo
      ? props.threadInfo.id
      : props.secretThreadID;
    invariant(id, "id should exist");
    return id;
  }

  onClick = (event: SyntheticEvent) => {
    const id = TypeaheadThreadOption.getID(this.props);
    if (this.props.threadInfo && this.props.threadInfo.authorized) {
      history.push(`/thread/${id}/${this.props.monthURL}`);
      this.props.onTransition();
    } else {
      this.props.freezeTypeahead(id);
      this.setState({ passwordEntryOpen: true });
    }
  }

  onPasswordEntryChange = (event: SyntheticEvent) => {
    const target = event.target;
    invariant(target instanceof HTMLInputElement, "target not input");
    this.setState({ passwordEntryValue: target.value });
  }

  onPasswordEntryBlur = (event: SyntheticEvent) => {
    this.setState({ passwordEntryOpen: false });
    this.props.unfreezeTypeahead(TypeaheadThreadOption.getID(this.props));
  }

  // Throw away typechecking here because SyntheticEvent isn't typed
  onPasswordEntryKeyDown = (event: any) => {
    if (event.keyCode === 27) {
      invariant(
        this.passwordEntryInput instanceof HTMLInputElement,
        "passwordEntryInput ref not set",
      );
      this.passwordEntryInput.blur();
    } else if (event.keyCode === 13) {
      this.onSubmitPassword(event);
    }
  }

  onPasswordEntryMouseDown = (event: SyntheticEvent) => {
    event.stopPropagation();
  }

  onSubmitPassword = (event: SyntheticEvent) => {
    event.preventDefault();
    const id = TypeaheadThreadOption.getID(this.props);
    this.props.dispatchActionPromise(
      joinThreadActionTypes,
      this.joinThreadAction(),
      { customKeyName: `${joinThreadActionTypes.started}:${id}` },
    );
  }

  async joinThreadAction() {
    const id = TypeaheadThreadOption.getID(this.props);
    try {
      const response = await this.props.joinThread(
        id,
        this.state.passwordEntryValue,
      );
      this.props.dispatchActionPayload("REFLECT_ROUTE_CHANGE", {
        startDate: this.props.navInfo.startDate,
        endDate: this.props.navInfo.endDate,
        home: false,
        threadID: response.threadID,
        verify: this.props.navInfo.verify,
      });
      this.props.unfreezeTypeahead(id);
      this.props.onTransition();
      return response;
    } catch (e) {
      this.setState({ passwordEntryValue: "" }, this.focusPasswordEntry);
      throw e;
    }
  }

}

TypeaheadThreadOption.propTypes = {
  threadInfo: threadInfoPropType,
  secretThreadID: PropTypes.string,
  freezeTypeahead: PropTypes.func.isRequired,
  unfreezeTypeahead: PropTypes.func.isRequired,
  focusTypeahead: PropTypes.func.isRequired,
  onTransition: PropTypes.func.isRequired,
  frozen: PropTypes.bool,
  setModal: PropTypes.func.isRequired,
  clearModal: PropTypes.func.isRequired,
  typeaheadFocused: PropTypes.bool.isRequired,
  monthURL: PropTypes.string.isRequired,
  currentNavID: PropTypes.string,
  currentThreadID: PropTypes.string,
  passwordEntryLoadingStatus: PropTypes.string.isRequired,
  navInfo: navInfoPropType.isRequired,
  dispatchActionPayload: PropTypes.func.isRequired,
  dispatchActionPromise: PropTypes.func.isRequired,
  joinThread: PropTypes.func.isRequired,
};

type OwnProps = { threadInfo?: ThreadInfo, secretThreadID?: string };
export default connect(
  (state: AppState, ownProps: OwnProps) => {
    const id = TypeaheadThreadOption.getID(ownProps);
    return {
      monthURL: monthURL(state),
      currentNavID: currentNavID(state),
      currentThreadID: state.navInfo.threadID,
      passwordEntryLoadingStatus: createLoadingStatusSelector(
        joinThreadActionTypes,
        `${joinThreadActionTypes.started}:${id}`,
      )(state),
      navInfo: state.navInfo,
      cookie: state.cookie,
    };
  },
  includeDispatchActionProps,
  bindServerCalls({ joinThread }),
)(TypeaheadThreadOption);
