// @flow

import type { SquadInfo } from './squad-info';
import { squadInfoPropType } from './squad-info';

import React from 'react';
import fetchJSON from './fetch-json';

type Props = {
  navID: string,
  squadInfo: SquadInfo,
  baseURL: string,
  updateSubscription: (id: string, subscribed: bool) => void,
};
type State = {
  loading: bool,
};

class TypeaheadOptionButtons extends React.Component {

  props: Props;
  state: State;

  constructor(props: Props) {
    super(props);
    this.state = {
      loading: false,
    };
  }

  render() {
    if (!this.props.squadInfo.authorized) {
      return (
        <ul className="squad-nav-option-buttons">
          <li>Closed</li>
        </ul>
      );
    }
    let loadingIndicator = null;
    if (this.state.loading) {
      loadingIndicator = (
        <img
          className="subscribe-loading"
          src={this.props.baseURL + "images/ajax-loader.gif"}
          alt="loading"
        />
      );
    }
    let editButton = null;
    if (this.props.squadInfo.editable) {
      editButton = (
        <li>
          <a href='#'>
            Edit
          </a>
        </li>
      );
    }
    return (
      <ul className="squad-nav-option-buttons">
        {editButton}
        <li>
          {loadingIndicator}
          <a href='#' onClick={this.subscribe.bind(this)}>
            {this.props.squadInfo.subscribed ? 'Unsubscribe' : 'Subscribe'}
          </a>
        </li>
      </ul>
    );
  }

  async subscribe(event: SyntheticEvent) {
    event.stopPropagation();
    if (this.state.loading) {
      return;
    }
    this.setState({
      loading: true,
    });
    const newSubscribed = !this.props.squadInfo.subscribed;
    const response = await fetchJSON('subscribe.php', {
      'squad': this.props.navID,
      'subscribe': newSubscribed ? 1 : 0,
    });
    if (response.success) {
      this.setState({
        loading: false,
      });
      this.props.updateSubscription(this.props.navID, newSubscribed);
    } else {
      // Set state for loading failed :(
      // TODO probably make a LoadingIndicator component, with an enum for state
    }
  }

}

TypeaheadOptionButtons.propTypes = {
  navID: React.PropTypes.string.isRequired,
  squadInfo: squadInfoPropType.isRequired,
  baseURL: React.PropTypes.string.isRequired,
  updateSubscription: React.PropTypes.func.isRequired,
};

export default TypeaheadOptionButtons;
