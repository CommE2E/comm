// @flow

import React from 'react';
import classNames from 'classnames';
import $ from 'jquery';

import fetchJSON from '../fetch-json';
import NewSquadModal from '../modals/new-squad-modal.react';

type Props = {
  navID: string,
  name: string,
  monthURL: string,
  loggedIn: bool,
  setModal: (modal: React.Element<any>) => void,
  clearModal: () => void,
  freezeTypeahead: (navID: string) => void,
  unfreezeTypeahead: () => void,
  hideTypeahead: () => void,
  frozen?: bool,
};

class TypeaheadOption extends React.Component {

  static defaultProps: { frozen: bool };
  props: Props;

  render() {
    return (
      <div
        className={classNames(
          "squad-nav-option",
          {'squad-nav-frozen-option': this.props.frozen},
        )}
        id={"nav_" + this.props.navID}
        onClick={this.onClick.bind(this)}
      >
        <div className="squad-nav-option-header">
          <div className="squad-nav-option-name">
            {this.props.name}
          </div>
          <div className="clear" />
        </div>
      </div>
    );
  }

  onClick(event: SyntheticEvent) {
    if (this.props.navID == 'new') {
      if (this.props.loggedIn) {
        this.props.freezeTypeahead(this.props.navID);
        const onClose = () => {
          this.props.unfreezeTypeahead();
          this.props.clearModal();
        }
        this.props.setModal(
          <NewSquadModal
            monthURL={this.props.monthURL}
            onClose={onClose}
          />
        );
      } else {
        this.props.hideTypeahead();
        // TODO: React-ify modal code
        $('div#login-to-create-squad-modal-overlay').show();
      }
    } else if (this.props.navID == 'home') {
      window.location.href = this.props.monthURL + "&home";
    } 
  }

}

TypeaheadOption.propTypes = {
  navID: React.PropTypes.string.isRequired,
  name: React.PropTypes.string.isRequired,
  monthURL: React.PropTypes.string.isRequired,
  loggedIn: React.PropTypes.bool.isRequired,
  setModal: React.PropTypes.func.isRequired,
  clearModal: React.PropTypes.func.isRequired,
  freezeTypeahead: React.PropTypes.func.isRequired,
  unfreezeTypeahead: React.PropTypes.func.isRequired,
  hideTypeahead: React.PropTypes.func.isRequired,
  frozen: React.PropTypes.bool,
};

TypeaheadOption.defaultProps = {
  frozen: false,
};

export default TypeaheadOption;
