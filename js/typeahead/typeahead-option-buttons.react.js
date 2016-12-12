// @flow

import type { CalendarInfo } from '../calendar-info';
import { calendarInfoPropType } from '../calendar-info';
import type { LoadingStatus } from '../loading-indicator.react';
import type { AppState, UpdateStore } from '../redux-reducer';

import React from 'react';
import { connect } from 'react-redux';
import update from 'immutability-helper';

import fetchJSON from '../fetch-json';
import LoadingIndicator from '../loading-indicator.react';
import CalendarSettingsModal from '../modals/calendar-settings-modal.react';
import { mapStateToUpdateStore } from '../redux-utils';
import { fetchEntriesAndUpdateStore, currentNavID } from '../nav-utils';

type Props = {
  calendarInfo: CalendarInfo,
  setModal: (modal: React.Element<any>) => void,
  clearModal: () => void,
  freezeTypeahead: (navID: string) => void,
  unfreezeTypeahead: (navID: string) => void,
  year: number,
  month: number,
  home: bool,
  currentNavID: ?string,
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
    if (this.props.calendarInfo.editable && this.props.currentNavID) {
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
        'calendar': this.props.calendarInfo.id,
        'subscribe': newSubscribed ? 1 : 0,
      }),
      (async () => {
        if (this.props.home && newSubscribed) {
          // If we are on home and just subscribed to a calendar,
          // we need to load it
          await fetchEntriesAndUpdateStore(
            this.props.year,
            this.props.month,
            this.props.calendarInfo.id,
            this.props.updateStore,
          );
        }
      })(),
    ]);
    if (!response.success) {
      this.setState({
        loadingStatus: "error",
      });
      return;
    }

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
  }

  edit(event: SyntheticEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.props.freezeTypeahead(this.props.calendarInfo.id);
    const onClose = () => {
      this.props.unfreezeTypeahead(this.props.calendarInfo.id);
      this.props.clearModal();
    }
    this.props.setModal(
      <CalendarSettingsModal
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
  home: React.PropTypes.bool.isRequired,
  currentNavID: React.PropTypes.string,
  updateStore: React.PropTypes.func.isRequired,
};

export default connect(
  (state: AppState) => ({
    year: state.navInfo.year,
    month: state.navInfo.month,
    home: state.navInfo.home,
    currentNavID: currentNavID(state),
  }),
  mapStateToUpdateStore,
)(TypeaheadOptionButtons);
