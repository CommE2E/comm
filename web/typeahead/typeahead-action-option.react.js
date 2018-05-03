// @flow

import {
  type AppState,
  type NavInfo,
  navInfoPropType,
} from '../redux-setup';
import type { DispatchActionPayload } from 'lib/utils/action-utils';
import { clearCalendarThreadFilter } from 'lib/types/filter-types';

import * as React from 'react';
import classNames from 'classnames';
import PropTypes from 'prop-types';

import { connect } from 'lib/utils/redux-utils';

import css from '../style.css';
import NewThreadModal from '../modals/threads/new-thread-modal.react';
import LogInFirstModal from '../modals/account/log-in-first-modal.react';
import history from '../router-history';

export type NavID = "home" | "new";
type Props = {
  navID: NavID,
  name: string,
  setModal: (modal: React.Node) => void,
  clearModal: () => void,
  freezeTypeahead: (navID: string) => void,
  unfreezeTypeahead: (navID: string) => void,
  onTransition: () => void,
  frozen?: bool,
  // Redux state
  loggedIn: bool,
  navInfo: NavInfo,
  // Redux dispatch functions
  dispatchActionPayload: DispatchActionPayload,
};
class TypeaheadActionOption extends React.PureComponent<Props> {

  static propTypes = {
    navID: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    setModal: PropTypes.func.isRequired,
    clearModal: PropTypes.func.isRequired,
    freezeTypeahead: PropTypes.func.isRequired,
    unfreezeTypeahead: PropTypes.func.isRequired,
    onTransition: PropTypes.func.isRequired,
    frozen: PropTypes.bool,
    loggedIn: PropTypes.bool.isRequired,
    navInfo: navInfoPropType.isRequired,
    dispatchActionPayload: PropTypes.func.isRequired,
  };
  static defaultProps = { frozen: false };

  render() {
    return (
      <div
        className={classNames(
          css['thread-nav-option'],
          {[css['thread-nav-frozen-option']]: this.props.frozen},
        )}
        onClick={this.onClick}
      >
        <div>
          <div className={css['thread-nav-option-name']}>
            {this.props.name}
          </div>
          <div className={css['clear']} />
        </div>
      </div>
    );
  }

  onClick = (event: SyntheticEvent<HTMLDivElement>) => {
    if (this.props.navID === 'new') {
      this.props.freezeTypeahead(this.props.navID);
      const onClose = () => {
        this.props.unfreezeTypeahead(this.props.navID);
        this.props.onTransition();
        this.props.clearModal();
      }
      if (this.props.loggedIn) {
        this.props.setModal(
          <NewThreadModal
            onClose={onClose}
          />
        );
      } else {
        this.props.setModal(
          <LogInFirstModal
            inOrderTo="create a new thread"
            onClose={onClose}
            setModal={this.props.setModal}
          />
        );
      }
    } else if (this.props.navID == 'home') {
      this.props.dispatchActionPayload(
        clearCalendarThreadFilter,
      );
      this.props.onTransition();
    } 
  }

}

export default connect(
  (state: AppState) => ({
    loggedIn: !!(state.currentUserInfo &&
      !state.currentUserInfo.anonymous && true),
    navInfo: state.navInfo,
  }),
  null,
  true,
)(TypeaheadActionOption);
