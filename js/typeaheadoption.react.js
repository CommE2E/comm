// @flow

import React from 'react';
import classNames from 'classnames';
import $ from 'jquery';

type Props = {
  navID: string,
  navName: string,
  monthURL: string,
  authorizedSquads: {[id: string]: bool},
  loggedIn: bool,
  freezeTypeahead: (navID: string) => void,
  hideTypeahead: () => void,
  frozen: bool,
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
        onMouseDown={this.onClick.bind(this)}
      >
        {this.props.navName}
      </div>
    );
  }

  onClick(event: SyntheticEvent) {
    event.stopPropagation(); 
    if (this.props.navID == 'new') {
      if (this.props.loggedIn) {
        this.props.freezeTypeahead(this.props.navID);
        // TODO: React-ify modal code
        $('div#new-squad-modal-overlay').show();
        $('div#new-squad-modal input:visible')
          .filter(function() { return this.value === ""; })
          .first()
          .focus();
      } else {
        this.props.hideTypeahead();
        // TODO: React-ify modal code
        $('div#login-to-create-squad-modal-overlay').show();
      }
    } else if (this.props.navID == 'home') {
      window.location.href = this.props.monthURL + "&home";
    } else if (this.props.authorizedSquads[this.props.navID] !== true) {
      this.props.freezeTypeahead(this.props.navID);
      // TODO: React-ify modal code
      $('div#squad-login-name > div.form-content').text(this.props.navName);
      $('div#squad-login-modal-overlay').show();
      $('div#squad-login-modal input:visible')
        .filter(function() { return this.value === ""; })
        .first()
        .focus();
    } else {
      window.location.href = this.props.monthURL + "&squad=" + this.props.navID;
    }
  }

}

TypeaheadOption.propTypes = {
  navID: React.PropTypes.string.isRequired,
  navName: React.PropTypes.string.isRequired,
  monthURL: React.PropTypes.string.isRequired,
  authorizedSquads: React.PropTypes.objectOf(React.PropTypes.bool).isRequired,
  loggedIn: React.PropTypes.bool.isRequired,
  freezeTypeahead: React.PropTypes.func.isRequired,
  hideTypeahead: React.PropTypes.func.isRequired,
  frozen: React.PropTypes.bool,
};

TypeaheadOption.defaultProps = {
  frozen: false,
};

export default TypeaheadOption;
