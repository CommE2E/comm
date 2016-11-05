// @flow

import type { SquadInfo } from '../squad-info';
import { squadInfoPropType } from '../squad-info';

import React from 'react';
import classNames from 'classnames';
import TextTruncate from 'react-text-truncate';

import TypeaheadOptionButtons from './typeahead-option-buttons.react';

type Props = {
  squadInfo: SquadInfo,
  thisURL: string,
  monthURL: string,
  baseURL: string,
  freezeTypeahead: (navID: string) => void,
  unfreezeTypeahead: () => void,
  frozen?: bool,
  openSquadAuthModal: (squadInfo: SquadInfo) => void,
  updateSubscription: (id: string, subscribed: bool) => void,
  setModal: (modal: React.Element<any>) => void,
  clearModal: () => void,
};

class TypeaheadSquadOption extends React.Component {

  static defaultProps: { frozen: bool };
  props: Props;

  render() {
    let descriptionDiv = null;
    if (this.props.squadInfo.description) {
      descriptionDiv = (
        <div className="squad-nav-option-description">
          <TextTruncate
            line={2}
            text={this.props.squadInfo.description}
          />
        </div>
      );
    }
    return (
      <div
        className={classNames(
          "squad-nav-option",
          {'squad-nav-frozen-option': this.props.frozen},
        )}
        id={"nav_" + this.props.squadInfo.id}
        onClick={this.onClick.bind(this)}
      >
        <div>
          <TypeaheadOptionButtons
            squadInfo={this.props.squadInfo}
            thisURL={this.props.thisURL}
            baseURL={this.props.baseURL}
            monthURL={this.props.monthURL}
            updateSubscription={this.props.updateSubscription}
            setModal={this.props.setModal}
            clearModal={this.props.clearModal}
            freezeTypeahead={this.props.freezeTypeahead}
            unfreezeTypeahead={this.props.unfreezeTypeahead}
          />
          <div className="squad-nav-option-name">
            {this.props.squadInfo.name}
          </div>
        </div>
        {descriptionDiv}
      </div>
    );
  }

  onClick(event: SyntheticEvent) {
    if (this.props.squadInfo.authorized) {
      window.location.href = this.props.monthURL +
        "&squad=" + this.props.squadInfo.id;
    } else {
      // TODO: make the password entry appear inline
      this.props.freezeTypeahead(this.props.squadInfo.id);
      this.props.openSquadAuthModal(this.props.squadInfo);
    }
  }

}

TypeaheadSquadOption.propTypes = {
  squadInfo: squadInfoPropType.isRequired,
  thisURL: React.PropTypes.string.isRequired,
  monthURL: React.PropTypes.string.isRequired,
  baseURL: React.PropTypes.string.isRequired,
  freezeTypeahead: React.PropTypes.func.isRequired,
  unfreezeTypeahead: React.PropTypes.func.isRequired,
  frozen: React.PropTypes.bool,
  openSquadAuthModal: React.PropTypes.func.isRequired,
  updateSubscription: React.PropTypes.func.isRequired,
  setModal: React.PropTypes.func.isRequired,
  clearModal: React.PropTypes.func.isRequired,
};

TypeaheadSquadOption.defaultProps = {
  frozen: false,
};

export default TypeaheadSquadOption;

