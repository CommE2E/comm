// @flow

import type { CalendarInfo } from 'lib/types/calendar-types';
import { calendarInfoPropType } from 'lib/types/calendar-types';
import type { LoadingStatus } from 'lib/types/loading-types';
import type { AppState } from '../redux-setup';
import type { DispatchActionPromise } from 'lib/utils/action-utils';

import React from 'react';
import classNames from 'classnames';
import TextTruncate from 'react-text-truncate';
import { connect } from 'react-redux';
import invariant from 'invariant';

import { currentNavID } from 'lib/selectors/nav-selectors';
import * as TypeaheadText from 'lib/shared/typeahead-text';
import {
  authCalendarActionType,
  authCalendar,
} from 'lib/actions/calendar-actions';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import { includeDispatchActionProps } from 'lib/utils/action-utils';

import css from '../style.css';
import TypeaheadOptionButtons from './typeahead-option-buttons.react';
import { monthURL } from '../url-utils';
import history from '../router-history';
import LoadingIndicator from '../loading-indicator.react';

type Props = {
  calendarInfo?: CalendarInfo,
  secretCalendarID?: string,
  freezeTypeahead: (navID: string) => void,
  unfreezeTypeahead: (navID: string) => void,
  focusTypeahead: () => void,
  onTransition: () => void,
  frozen?: bool,
  setModal: (modal: React.Element<any>) => void,
  clearModal: () => void,
  typeaheadFocused: bool,
  monthURL: string,
  currentNavID: ?string,
  currentCalendarID: ?string,
  passwordEntryLoadingStatus: LoadingStatus,
  dispatchActionPromise: DispatchActionPromise,
};
type State = {
  passwordEntryValue: string,
  passwordEntryOpen: bool,
};

class TypeaheadCalendarOption extends React.PureComponent {

  static defaultProps = { frozen: false };
  props: Props;
  state: State;

  passwordEntryInput: ?HTMLInputElement;

  constructor(props: Props) {
    super(props);
    this.state = {
      passwordEntryValue: "",
      passwordEntryOpen:
        TypeaheadCalendarOption.forCurrentAndUnauthorizedCalendar(props),
    };
  }

  // This function tells you if the calendar this nav option represents is the
  // one we are currently navigated to, AND we aren't authorized to view it, AND
  // this nav option isn't being shown as part of search results.
  static forCurrentAndUnauthorizedCalendar(props: Props) {
    return !props.currentNavID &&
      props.currentCalendarID === TypeaheadCalendarOption.getID(props) &&
      !props.typeaheadFocused;
  }

  componentDidMount() {
    if (TypeaheadCalendarOption.forCurrentAndUnauthorizedCalendar(this.props)) {
      this.props.freezeTypeahead(TypeaheadCalendarOption.getID(this.props));
      this.focusPasswordEntry();
    }
  }

  componentWillUnmount() {
    this.props.unfreezeTypeahead(TypeaheadCalendarOption.getID(this.props));
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
    if (this.props.calendarInfo && this.props.calendarInfo.description) {
      descriptionDiv = (
        <div className={css['calendar-nav-option-description']}>
          <TextTruncate
            line={2}
            text={this.props.calendarInfo.description}
          />
        </div>
      );
    }
    let passwordEntry = null;
    if (this.state.passwordEntryOpen) {
      passwordEntry =
        <div className={css['calendar-password-entry']}>
          <input
            type="submit"
            value="Enter"
            className={css['calendar-password-entry-submit']}
            onClick={this.onSubmitPassword}
            disabled={this.props.passwordEntryLoadingStatus === "loading"}
          />
          <LoadingIndicator
            status={this.props.passwordEntryLoadingStatus}
            className={css['calendar-pasword-entry-loading']}
          />
          <div className={css['calendar-password-entry-input-container']}>
            <input
              type="password"
              className={css['calendar-password-entry-input']}
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
    if (this.props.calendarInfo) {
      const colorPreviewStyle = {
        backgroundColor: "#" + this.props.calendarInfo.color,
      };
      colorPreview = (
        <div
          className={css['calendar-nav-color-preview']}
          style={colorPreviewStyle}
        />
      );
      optionButtons = (
        <TypeaheadOptionButtons
          calendarInfo={this.props.calendarInfo}
          setModal={this.props.setModal}
          clearModal={this.props.clearModal}
          freezeTypeahead={this.props.freezeTypeahead}
          unfreezeTypeahead={this.props.unfreezeTypeahead}
          focusTypeahead={this.props.focusTypeahead}
        />
      );
      name = this.props.calendarInfo.name;
    } else {
      name = TypeaheadText.secretText;
    }
    return (
      <div
        className={classNames({
          [css['calendar-nav-option']]: true,
          [css['calendar-nav-open-option']]: this.state.passwordEntryOpen,
          [css['calendar-nav-frozen-option']]: this.props.frozen ||
            this.state.passwordEntryOpen,
        })}
        onClick={this.onClick}
      >
        {colorPreview}
        <div>
          {optionButtons}
          <div className={css['calendar-nav-option-name']}>
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
    const id = props.calendarInfo
      ? props.calendarInfo.id
      : props.secretCalendarID;
    invariant(id, "id should exist");
    return id;
  }

  onClick = (event: SyntheticEvent) => {
    const id = TypeaheadCalendarOption.getID(this.props);
    if (this.props.calendarInfo && this.props.calendarInfo.authorized) {
      history.push(`calendar/${id}/${this.props.monthURL}`);
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
    this.props.unfreezeTypeahead(TypeaheadCalendarOption.getID(this.props));
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
    const id = TypeaheadCalendarOption.getID(this.props);
    this.props.dispatchActionPromise(
      authCalendarActionType,
      this.authCalendarAction(),
      { customKeyName: `${authCalendarActionType}:${id}` },
    );
  }

  async authCalendarAction() {
    const id = TypeaheadCalendarOption.getID(this.props);
    try {
      const response = await authCalendar(id, this.state.passwordEntryValue);
      this.props.unfreezeTypeahead(id);
      this.props.onTransition();
      return response;
    } catch (e) {
      this.setState({ passwordEntryValue: "" }, this.focusPasswordEntry);
      throw e;
    }
  }

}

TypeaheadCalendarOption.propTypes = {
  calendarInfo: calendarInfoPropType,
  secretCalendarID: React.PropTypes.string,
  freezeTypeahead: React.PropTypes.func.isRequired,
  unfreezeTypeahead: React.PropTypes.func.isRequired,
  focusTypeahead: React.PropTypes.func.isRequired,
  onTransition: React.PropTypes.func.isRequired,
  frozen: React.PropTypes.bool,
  setModal: React.PropTypes.func.isRequired,
  clearModal: React.PropTypes.func.isRequired,
  typeaheadFocused: React.PropTypes.bool.isRequired,
  monthURL: React.PropTypes.string.isRequired,
  currentNavID: React.PropTypes.string,
  currentCalendarID: React.PropTypes.string,
  passwordEntryLoadingStatus: React.PropTypes.string.isRequired,
  dispatchActionPromise: React.PropTypes.func.isRequired,
};

type OwnProps = { calendarInfo?: CalendarInfo, secretCalendarID?: string };
export default connect(
  (state: AppState, ownProps: OwnProps) => {
    const id = TypeaheadCalendarOption.getID(ownProps);
    return {
      monthURL: monthURL(state),
      currentNavID: currentNavID(state),
      currentCalendarID: state.navInfo.calendarID,
      passwordEntryLoadingStatus: createLoadingStatusSelector(
        authCalendarActionType,
        `${authCalendarActionType}:${id}`,
      )(state),
    };
  },
  includeDispatchActionProps({ dispatchActionPromise: true }),
)(TypeaheadCalendarOption);
