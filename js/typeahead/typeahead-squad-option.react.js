// @flow

import type { SquadInfo } from '../squad-info';
import { squadInfoPropType } from '../squad-info';

import React from 'react';
import classNames from 'classnames';
import TextTruncate from 'react-text-truncate';
import { connect } from 'react-redux';

import TypeaheadOptionButtons from './typeahead-option-buttons.react';
import SquadLoginModal from '../modals/squad-login-modal.react';
import { mapStateToPropsByName } from '../redux-utils';

type Props = {
  squadInfo: SquadInfo,
  monthURL: string,
  freezeTypeahead: (navID: string) => void,
  unfreezeTypeahead: () => void,
  frozen?: bool,
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
        onClick={this.onClick.bind(this)}
      >
        <div>
          <TypeaheadOptionButtons
            squadInfo={this.props.squadInfo}
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
      const onClose = () => {
        this.props.unfreezeTypeahead();
        this.props.clearModal();
      }
      this.props.setModal(
        <SquadLoginModal
          squadInfo={this.props.squadInfo}
          setModal={this.props.setModal}
          onClose={onClose}
        />
      );
    }
  }

}

TypeaheadSquadOption.propTypes = {
  squadInfo: squadInfoPropType.isRequired,
  monthURL: React.PropTypes.string.isRequired,
  freezeTypeahead: React.PropTypes.func.isRequired,
  unfreezeTypeahead: React.PropTypes.func.isRequired,
  frozen: React.PropTypes.bool,
  setModal: React.PropTypes.func.isRequired,
  clearModal: React.PropTypes.func.isRequired,
};

TypeaheadSquadOption.defaultProps = {
  frozen: false,
};

const mapStateToProps = mapStateToPropsByName([
  "monthURL",
]);
export default connect(mapStateToProps)(TypeaheadSquadOption);
