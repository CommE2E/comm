// @flow

import type { SquadInfo } from './squad-info';
import { squadInfoPropType } from './squad-info';

import React from 'react';
import classNames from 'classnames';
import TextTruncate from 'react-text-truncate';

import TypeaheadOptionButtons from './typeahead-option-buttons.react';

type Props = {
  navID: string,
  squadInfo: SquadInfo,
  monthURL: string,
  baseURL: string,
  freezeTypeahead: (navID: string) => void,
  frozen: bool,
  openSquadAuthModal: (id: string, name: string) => void,
  updateSubscription: (id: string, subscribed: bool) => void,
};

class TypeaheadSquadOption extends React.Component {

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
            <TextTruncate line={1} text={this.props.squadInfo.name} />
          </div>
          <TypeaheadOptionButtons
            navID={this.props.navID}
            squadInfo={this.props.squadInfo}
            baseURL={this.props.baseURL}
            updateSubscription={this.props.updateSubscription}
          />
        </div>
        <div className="squad-nav-option-description">
          <TextTruncate
            line={2}
            text="This is an example possible squad description that goes on for
            long enough and explains the purpose of the squad pretty well I hope."
          />
        </div>
      </div>
    );
  }

  onClick(event: SyntheticEvent) {
    if (this.props.squadInfo.authorized) {
      window.location.href = this.props.monthURL + "&squad=" + this.props.navID;
    } else {
      // TODO: make the password entry appear inline
      this.props.freezeTypeahead(this.props.navID);
      this.props.openSquadAuthModal(
        this.props.navID,
        this.props.squadInfo.name
      );
    }
  }

}

TypeaheadSquadOption.propTypes = {
  navID: React.PropTypes.string.isRequired,
  squadInfo: squadInfoPropType.isRequired,
  monthURL: React.PropTypes.string.isRequired,
  baseURL: React.PropTypes.string.isRequired,
  freezeTypeahead: React.PropTypes.func.isRequired,
  frozen: React.PropTypes.bool,
  openSquadAuthModal: React.PropTypes.func.isRequired,
  updateSubscription: React.PropTypes.func.isRequired,
};

TypeaheadSquadOption.defaultProps = {
  frozen: false,
};

export default TypeaheadSquadOption;

