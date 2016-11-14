// @flow

import type { SquadInfo } from '../squad-info';
import { squadInfoPropType } from '../squad-info';
import type { LoadingStatus } from '../loading-indicator.react';
import type { AppState, UpdateStore } from '../redux-reducer';

import React from 'react';
import { connect } from 'react-redux';
import update from 'immutability-helper';

import fetchJSON from '../fetch-json';
import LoadingIndicator from '../loading-indicator.react';
import SquadSettingsModal from '../modals/squad-settings-modal.react';
import { mapStateToUpdateStore } from '../redux-utils';

type Props = {
  squadInfo: SquadInfo,
  baseURL: string,
  setModal: (modal: React.Element<any>) => void,
  clearModal: () => void,
  freezeTypeahead: (navID: string) => void,
  unfreezeTypeahead: () => void,
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
    if (!this.props.squadInfo.authorized) {
      return (
        <ul className="squad-nav-option-buttons">
          <li>Closed</li>
        </ul>
      );
    }
    let editButton = null;
    if (this.props.squadInfo.editable) {
      editButton = (
        <li>
          <a href='#' onClick={this.edit.bind(this)}>
            Settings
          </a>
        </li>
      );
    }
    return (
      <ul className="squad-nav-option-buttons">
        {editButton}
        <li>
          <LoadingIndicator
            status={this.state.loadingStatus}
            baseURL={this.props.baseURL}
            className="squad-nav-option-buttons-loading"
          />
          <a href='#' onClick={this.subscribe.bind(this)}>
            {this.props.squadInfo.subscribed ? 'Unsubscribe' : 'Subscribe'}
          </a>
        </li>
      </ul>
    );
  }

  async subscribe(event: SyntheticEvent) {
    event.stopPropagation();
    if (this.state.loadingStatus === "loading") {
      return;
    }
    this.setState({
      loadingStatus: "loading",
    });
    const newSubscribed = !this.props.squadInfo.subscribed;
    const response = await fetchJSON(this.props.baseURL, 'subscribe.php', {
      'squad': this.props.squadInfo.id,
      'subscribe': newSubscribed ? 1 : 0,
    });
    if (response.success) {
      if (this.mounted) {
        this.setState({
          loadingStatus: "inactive",
        });
      }
      this.props.updateStore((prevState: AppState) => {
        const updateParam = { squadInfos: {} };
        updateParam.squadInfos[this.props.squadInfo.id] = {
          subscribed: { $set: newSubscribed },
        };
        return update(prevState, updateParam);
      });
    } else {
      this.setState({
        loadingStatus: "error",
      });
    }
  }

  edit(event: SyntheticEvent) {
    event.stopPropagation();
    this.props.freezeTypeahead(this.props.squadInfo.id);
    const onClose = () => {
      this.props.unfreezeTypeahead();
      this.props.clearModal();
    }
    this.props.setModal(
      <SquadSettingsModal
        squadInfo={this.props.squadInfo}
        onClose={onClose}
      />
    );
  }

}

TypeaheadOptionButtons.propTypes = {
  squadInfo: squadInfoPropType.isRequired,
  baseURL: React.PropTypes.string.isRequired,
  setModal: React.PropTypes.func.isRequired,
  clearModal: React.PropTypes.func.isRequired,
  freezeTypeahead: React.PropTypes.func.isRequired,
  unfreezeTypeahead: React.PropTypes.func.isRequired,
  updateStore: React.PropTypes.func.isRequired,
};

export default connect(
  (state: AppState) => ({
    baseURL: state.navInfo.baseURL,
  }),
  mapStateToUpdateStore,
)(TypeaheadOptionButtons);
