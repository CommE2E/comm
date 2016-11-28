// @flow

import type { CalendarInfo } from '../calendar-info';
import { calendarInfoPropType } from '../calendar-info';
import type { LoadingStatus } from '../loading-indicator.react';
import type { AppState, UpdateStore } from '../redux-reducer';

import React from 'react';
import { connect } from 'react-redux';
import update from 'immutability-helper';
import _ from 'lodash';

import fetchJSON from '../fetch-json';
import LoadingIndicator from '../loading-indicator.react';
import SquadSettingsModal from '../modals/squad-settings-modal.react';
import { mapStateToUpdateStore } from '../redux-utils';
import { monthURL, fetchEntriesAndUpdateStore } from '../nav-utils';
import history from '../router-history';

type Props = {
  calendarInfo: CalendarInfo,
  setModal: (modal: React.Element<any>) => void,
  clearModal: () => void,
  freezeTypeahead: (navID: string) => void,
  unfreezeTypeahead: () => void,
  year: number,
  month: number,
  calendarInfos: {[id: string]: CalendarInfo},
  monthURL: string,
  home: bool,
  updateStore: UpdateStore,
};
type State = {
  loadingStatus: LoadingStatus,
};

class TypeaheadOptionButtons extends React.Component {

  props: Props;
  state: State;
  mounted: bool;

  constructor(props: Props) {
    super(props);
    this.state = {
      loadingStatus: "inactive",
    };
    this.mounted = true;
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  render() {
    if (!this.props.calendarInfo.authorized) {
      return (
        <ul className="calendar-nav-option-buttons">
          <li>Closed</li>
        </ul>
      );
    }
    let editButton = null;
    if (this.props.calendarInfo.editable) {
      editButton = (
        <li>
          <a href='#' onClick={this.edit.bind(this)}>
            Settings
          </a>
        </li>
      );
    }
    return (
      <ul className="calendar-nav-option-buttons">
        {editButton}
        <li>
          <LoadingIndicator
            status={this.state.loadingStatus}
            className="calendar-nav-option-buttons-loading"
          />
          <a href='#' onClick={this.subscribe.bind(this)}>
            {this.props.calendarInfo.subscribed ? 'Unsubscribe' : 'Subscribe'}
          </a>
        </li>
      </ul>
    );
  }

  async subscribe(event: SyntheticEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (this.state.loadingStatus === "loading") {
      return;
    }
    this.setState({
      loadingStatus: "loading",
    });
    const newSubscribed = !this.props.calendarInfo.subscribed;
    const [ response ] = await Promise.all([
      fetchJSON('subscribe.php', {
        'squad': this.props.calendarInfo.id,
        'subscribe': newSubscribed ? 1 : 0,
      }),
      (async () => {
        if (this.props.home && newSubscribed) {
          // If we are on home and just subscribed to a squad we need to load it
          await fetchEntriesAndUpdateStore(
            this.props.year,
            this.props.month,
            this.props.calendarInfo.id,
            this.props.updateStore,
          );
        }
      })(),
    ]);
    // If we are home and just killed the last subscription, redirect out
    if (this.props.home && !newSubscribed) {
      const subscriptionExists = _.some(
        this.props.calendarInfos,
        (calendarInfo: CalendarInfo) => calendarInfo.subscribed &&
          calendarInfo.id !== this.props.calendarInfo.id,
      );
      if (!subscriptionExists) {
        // TODO fix this special case of default squad 254
        history.replace(`squad/254/${this.props.monthURL}`);
      }
    }
    if (response.success) {
      const updateStoreCallback = () => {
        this.props.updateStore((prevState: AppState) => {
          const updateParam = { calendarInfos: {} };
          updateParam.calendarInfos[this.props.calendarInfo.id] = {
            subscribed: { $set: newSubscribed },
          };
          return update(prevState, updateParam);
        });
      };
      if (this.mounted) {
        this.setState(
          { loadingStatus: "inactive" },
          updateStoreCallback,
        );
      } else {
        updateStoreCallback();
      }
    } else {
      this.setState({
        loadingStatus: "error",
      });
    }
  }

  edit(event: SyntheticEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.props.freezeTypeahead(this.props.calendarInfo.id);
    const onClose = () => {
      this.props.unfreezeTypeahead();
      this.props.clearModal();
    }
    this.props.setModal(
      <SquadSettingsModal
        calendarInfo={this.props.calendarInfo}
        onClose={onClose}
      />
    );
  }

}

TypeaheadOptionButtons.propTypes = {
  calendarInfo: calendarInfoPropType.isRequired,
  setModal: React.PropTypes.func.isRequired,
  clearModal: React.PropTypes.func.isRequired,
  freezeTypeahead: React.PropTypes.func.isRequired,
  unfreezeTypeahead: React.PropTypes.func.isRequired,
  year: React.PropTypes.number.isRequired,
  month: React.PropTypes.number.isRequired,
  calendarInfos: React.PropTypes.objectOf(calendarInfoPropType).isRequired,
  monthURL: React.PropTypes.string.isRequired,
  home: React.PropTypes.bool.isRequired,
  updateStore: React.PropTypes.func.isRequired,
};

export default connect(
  (state: AppState) => ({
    year: state.navInfo.year,
    month: state.navInfo.month,
    calendarInfos: state.calendarInfos,
    monthURL: monthURL(state),
    home: state.navInfo.home,
  }),
  mapStateToUpdateStore,
)(TypeaheadOptionButtons);
