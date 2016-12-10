// @flow

import type { CalendarInfo } from '../calendar-info';
import { calendarInfoPropType } from '../calendar-info';
import type { AppState, UpdateStore } from '../redux-reducer';
import type { LoadingStatus } from '../loading-indicator.react';

import React from 'react';
import classNames from 'classnames';
import TextTruncate from 'react-text-truncate';
import { connect } from 'react-redux';
import invariant from 'invariant';
import update from 'immutability-helper';

import TypeaheadOptionButtons from './typeahead-option-buttons.react';
import { monthURL, fetchEntriesAndUpdateStore } from '../nav-utils';
import { mapStateToUpdateStore } from '../redux-utils'
import history from '../router-history';
import LoadingIndicator from '../loading-indicator.react';
import fetchJSON from '../fetch-json';

type Props = {
  calendarInfo: CalendarInfo,
  monthURL: string,
  year: number,
  month: number,
  freezeTypeahead: (navID: string) => void,
  unfreezeTypeahead: (navID: string) => void,
  onTransition: () => void,
  frozen?: bool,
  setModal: (modal: React.Element<any>) => void,
  clearModal: () => void,
  updateStore: UpdateStore,
};
type State = {
  passwordEntryValue: string,
  passwordEntryOpen: bool,
  passwordEntryLoadingStatus: LoadingStatus,
};

class TypeaheadCalendarOption extends React.Component {

  static defaultProps: { frozen: bool };
  props: Props;
  state: State;

  passwordEntryInput: ?HTMLInputElement;

  constructor(props: Props) {
    super(props);
    this.state = {
      passwordEntryValue: "",
      passwordEntryOpen: false,
      passwordEntryLoadingStatus: "inactive",
    };
  }

  openAndFocusPasswordEntry() {
    this.setState({ passwordEntryOpen: true });
  }

  focusPasswordEntry() {
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
    if (this.props.calendarInfo.description) {
      descriptionDiv = (
        <div className="calendar-nav-option-description">
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
        <div className="calendar-password-entry">
          <input
            type="submit"
            value="Enter"
            className="calendar-password-entry-submit"
            onClick={this.onSubmitPassword.bind(this)}
            disabled={this.state.passwordEntryLoadingStatus === "loading"}
          />
          <LoadingIndicator
            status={this.state.passwordEntryLoadingStatus}
            className="calendar-pasword-entry-loading"
          />
          <div className="calendar-password-entry-input-container">
            <input
              type="password"
              className="calendar-password-entry-input"
              value={this.state.passwordEntryValue}
              onChange={this.onPasswordEntryChange.bind(this)}
              onBlur={this.onPasswordEntryBlur.bind(this)}
              onKeyDown={this.onPasswordEntryKeyDown.bind(this)}
              onMouseDown={this.onPasswordEntryMouseDown.bind(this)}
              placeholder="Password"
              ref={(input) => this.passwordEntryInput = input}
            />
          </div>
        </div>;
    }
    const colorPreviewStyle = {
      backgroundColor: "#" + this.props.calendarInfo.color,
    };
    return (
      <div
        className={classNames({
          'calendar-nav-option': true,
          'calendar-nav-open-option': this.state.passwordEntryOpen,
          'calendar-nav-frozen-option': this.props.frozen,
        })}
        onClick={this.onClick.bind(this)}
      >
        <div className="calendar-nav-color-preview" style={colorPreviewStyle} />
        <div>
          <TypeaheadOptionButtons
            calendarInfo={this.props.calendarInfo}
            setModal={this.props.setModal}
            clearModal={this.props.clearModal}
            freezeTypeahead={this.props.freezeTypeahead}
            unfreezeTypeahead={this.props.unfreezeTypeahead}
          />
          <div className="calendar-nav-option-name">
            {this.props.calendarInfo.name}
          </div>
        </div>
        {descriptionDiv}
        {passwordEntry}
      </div>
    );
  }

  async onClick(event: SyntheticEvent) {
    if (this.props.calendarInfo.authorized) {
      this.props.onTransition();
      history.push(
        `calendar/${this.props.calendarInfo.id}/${this.props.monthURL}`,
      );
      await fetchEntriesAndUpdateStore(
        this.props.year,
        this.props.month,
        this.props.calendarInfo.id,
        this.props.updateStore,
      );
    } else {
      this.props.freezeTypeahead(this.props.calendarInfo.id);
      this.setState({ passwordEntryOpen: true });
    }
  }

  onPasswordEntryChange(event: SyntheticEvent) {
    const target = event.target;
    invariant(target instanceof HTMLInputElement, "target not input");
    this.setState({ passwordEntryValue: target.value });
  }

  onPasswordEntryBlur(event: SyntheticEvent) {
    this.setState({ passwordEntryOpen: false });
    this.props.unfreezeTypeahead(this.props.calendarInfo.id);
  }

  // Throw away typechecking here because SyntheticEvent isn't typed
  async onPasswordEntryKeyDown(event: any) {
    if (event.keyCode === 27) {
      invariant(
        this.passwordEntryInput instanceof HTMLInputElement,
        "passwordEntryInput ref not set",
      );
      this.passwordEntryInput.blur();
    } else if (event.keyCode === 13) {
      await this.onSubmitPassword(event);
    }
  }

  onPasswordEntryMouseDown(event: SyntheticEvent) {
    event.stopPropagation();
  }

  async onSubmitPassword(event: SyntheticEvent) {
    event.preventDefault();

    this.setState({ passwordEntryLoadingStatus: "loading" });
    const response = await fetchJSON('auth_calendar.php', {
      'calendar': this.props.calendarInfo.id,
      'password': this.state.passwordEntryValue,
    });
    if (response.success) {
      this.setState({ passwordEntryLoadingStatus: "inactive" });
      this.props.updateStore((prevState: AppState) => {
        const updateObj = {};
        updateObj[this.props.calendarInfo.id] = {
          authorized: { $set: true },
        };
        return update(prevState, {
          calendarInfos: updateObj,
        });
      });
      this.props.onTransition();
      history.push(
        `calendar/${this.props.calendarInfo.id}/${this.props.monthURL}`,
      );
      await fetchEntriesAndUpdateStore(
        this.props.year,
        this.props.month,
        this.props.calendarInfo.id,
        this.props.updateStore,
      );
    } else {
      this.setState(
        {
          passwordEntryLoadingStatus: "error",
          passwordEntryValue: "",
        },
        this.focusPasswordEntry.bind(this),
      );
    }
  }

}

TypeaheadCalendarOption.propTypes = {
  calendarInfo: calendarInfoPropType.isRequired,
  monthURL: React.PropTypes.string.isRequired,
  year: React.PropTypes.number.isRequired,
  month: React.PropTypes.number.isRequired,
  freezeTypeahead: React.PropTypes.func.isRequired,
  unfreezeTypeahead: React.PropTypes.func.isRequired,
  onTransition: React.PropTypes.func.isRequired,
  frozen: React.PropTypes.bool,
  setModal: React.PropTypes.func.isRequired,
  clearModal: React.PropTypes.func.isRequired,
  updateStore: React.PropTypes.func.isRequired,
};

TypeaheadCalendarOption.defaultProps = {
  frozen: false,
};

type OwnProps = { calendarInfo: CalendarInfo };
export default connect(
  (state: AppState, ownProps: OwnProps) => ({
    monthURL: monthURL(state),
    year: state.navInfo.year,
    month: state.navInfo.month,
  }),
  mapStateToUpdateStore,
  undefined,
  { 'withRef': true },
)(TypeaheadCalendarOption);
