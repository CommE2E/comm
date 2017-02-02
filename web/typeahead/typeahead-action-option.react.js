// @flow

import type { AppState, UpdateStore } from 'lib/model/redux-reducer';

import React from 'react';
import classNames from 'classnames';
import { connect } from 'react-redux';

import css from '../style.css';
import NewCalendarModal from '../modals/new-calendar-modal.react';
import LogInFirstModal from '../modals/account/log-in-first-modal.react';
import { monthURL } from '../url-utils';
import history from '../router-history';

export type NavID = "home" | "new";
type Props = {
  navID: NavID,
  name: string,
  monthURL: string,
  loggedIn: bool,
  setModal: (modal: React.Element<any>) => void,
  clearModal: () => void,
  freezeTypeahead: (navID: string) => void,
  unfreezeTypeahead: (navID: string) => void,
  onTransition: () => void,
  frozen?: bool,
};

class TypeaheadActionOption extends React.Component {

  static defaultProps = { frozen: false };
  props: Props;

  render() {
    return (
      <div
        className={classNames(
          css['calendar-nav-option'],
          {[css['calendar-nav-frozen-option']]: this.props.frozen},
        )}
        onClick={this.onClick.bind(this)}
      >
        <div>
          <div className={css['calendar-nav-option-name']}>
            {this.props.name}
          </div>
          <div className={css['clear']} />
        </div>
      </div>
    );
  }

  async onClick(event: SyntheticEvent) {
    if (this.props.navID === 'new') {
      this.props.freezeTypeahead(this.props.navID);
      const onClose = () => {
        this.props.unfreezeTypeahead(this.props.navID);
        this.props.onTransition();
        this.props.clearModal();
      }
      if (this.props.loggedIn) {
        this.props.setModal(
          <NewCalendarModal
            onClose={onClose}
          />
        );
      } else {
        this.props.setModal(
          <LogInFirstModal
            inOrderTo="create a new calendar"
            onClose={onClose}
            setModal={this.props.setModal}
          />
        );
      }
    } else if (this.props.navID == 'home') {
      history.push(`home/${this.props.monthURL}`);
      this.props.onTransition();
    } 
  }

}

TypeaheadActionOption.propTypes = {
  navID: React.PropTypes.string.isRequired,
  name: React.PropTypes.string.isRequired,
  monthURL: React.PropTypes.string.isRequired,
  loggedIn: React.PropTypes.bool.isRequired,
  setModal: React.PropTypes.func.isRequired,
  clearModal: React.PropTypes.func.isRequired,
  freezeTypeahead: React.PropTypes.func.isRequired,
  unfreezeTypeahead: React.PropTypes.func.isRequired,
  onTransition: React.PropTypes.func.isRequired,
  frozen: React.PropTypes.bool,
};

export default connect((state: AppState) => ({
  monthURL: monthURL(state),
  loggedIn: state.loggedIn,
}))(TypeaheadActionOption);
