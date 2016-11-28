// @flow

import type { CalendarInfo } from '../calendar-info';
import { calendarInfoPropType } from '../calendar-info';
import type { AppState, UpdateStore } from '../redux-reducer';

import React from 'react';
import classNames from 'classnames';
import TextTruncate from 'react-text-truncate';
import { connect } from 'react-redux';

import TypeaheadOptionButtons from './typeahead-option-buttons.react';
import SquadLoginModal from '../modals/squad-login-modal.react';
import { monthURL, fetchEntriesAndUpdateStore } from '../nav-utils';
import { mapStateToUpdateStore } from '../redux-utils'
import history from '../router-history';

type Props = {
  calendarInfo: CalendarInfo,
  monthURL: string,
  year: number,
  month: number,
  freezeTypeahead: (navID: string) => void,
  unfreezeTypeahead: () => void,
  frozen?: bool,
  setModal: (modal: React.Element<any>) => void,
  clearModal: () => void,
  updateStore: UpdateStore,
};

class TypeaheadCalendarOption extends React.Component {

  static defaultProps: { frozen: bool };
  props: Props;

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
    return (
      <div
        className={classNames(
          "calendar-nav-option",
          {'calendar-nav-frozen-option': this.props.frozen},
        )}
        onClick={this.onClick.bind(this)}
      >
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
      </div>
    );
  }

  async onClick(event: SyntheticEvent) {
    if (this.props.calendarInfo.authorized) {
      this.props.unfreezeTypeahead();
      history.push(
        `squad/${this.props.calendarInfo.id}/${this.props.monthURL}`,
      );
      await fetchEntriesAndUpdateStore(
        this.props.year,
        this.props.month,
        this.props.calendarInfo.id,
        this.props.updateStore,
      );
    } else {
      // TODO: make the password entry appear inline
      this.props.freezeTypeahead(this.props.calendarInfo.id);
      const onClose = () => {
        this.props.unfreezeTypeahead();
        this.props.clearModal();
      }
      this.props.setModal(
        <SquadLoginModal
          calendarInfo={this.props.calendarInfo}
          setModal={this.props.setModal}
          onClose={onClose}
        />
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
  frozen: React.PropTypes.bool,
  setModal: React.PropTypes.func.isRequired,
  clearModal: React.PropTypes.func.isRequired,
  updateStore: React.PropTypes.func.isRequired,
};

TypeaheadCalendarOption.defaultProps = {
  frozen: false,
};

export default connect(
  (state: AppState) => ({
    monthURL: monthURL(state),
    year: state.navInfo.year,
    month: state.navInfo.month,
  }),
  mapStateToUpdateStore,
)(TypeaheadCalendarOption);
