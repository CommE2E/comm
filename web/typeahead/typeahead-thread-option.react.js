// @flow

import {
  type ThreadInfo,
  threadInfoPropType,
  threadPermissions,
  type ThreadJoinPayload,
} from 'lib/types/thread-types';
import {
  type AppState,
  type NavInfo,
  navInfoPropType,
} from '../redux-setup';
import type { DispatchActionPayload } from 'lib/utils/action-utils';
import { updateCalendarThreadFilter } from 'lib/types/filter-types';

import * as React from 'react';
import classNames from 'classnames';
import TextTruncate from 'react-text-truncate';
import PropTypes from 'prop-types';

import { connect } from 'lib/utils/redux-utils';
import { threadHasPermission } from 'lib/shared/thread-utils';

import css from '../style.css';
import TypeaheadOptionButtons from './typeahead-option-buttons.react';

type Props = {
  threadInfo: ThreadInfo,
  freezeTypeahead: (navID: string) => void,
  unfreezeTypeahead: (navID: string) => void,
  focusTypeahead: () => void,
  onTransition: () => void,
  frozen?: bool,
  setModal: (modal: React.Node) => void,
  clearModal: () => void,
  // Redux state
  navInfo: NavInfo,
  // Redux dispatch functions
  dispatchActionPayload: DispatchActionPayload,
};
class TypeaheadThreadOption extends React.PureComponent<Props> {

  static propTypes = {
    threadInfo: threadInfoPropType.isRequired,
    freezeTypeahead: PropTypes.func.isRequired,
    unfreezeTypeahead: PropTypes.func.isRequired,
    focusTypeahead: PropTypes.func.isRequired,
    onTransition: PropTypes.func.isRequired,
    frozen: PropTypes.bool,
    setModal: PropTypes.func.isRequired,
    clearModal: PropTypes.func.isRequired,
    navInfo: navInfoPropType.isRequired,
    dispatchActionPayload: PropTypes.func.isRequired,
  };
  static defaultProps = { frozen: false };

  render() {
    let descriptionDiv = null;
    if (this.props.threadInfo.description) {
      descriptionDiv = (
        <div className={css['thread-nav-option-description']}>
          <TextTruncate
            line={2}
            text={this.props.threadInfo.description}
          />
        </div>
      );
    }
    const colorPreviewStyle = {
      backgroundColor: "#" + this.props.threadInfo.color,
    };
    return (
      <div
        className={classNames({
          [css['thread-nav-option']]: true,
          [css['thread-nav-frozen-option']]: this.props.frozen,
        })}
        onClick={this.onClick}
      >
        <div
          className={css['thread-nav-color-preview']}
          style={colorPreviewStyle}
        />
        <div>
          <TypeaheadOptionButtons
            threadInfo={this.props.threadInfo}
            setModal={this.props.setModal}
            clearModal={this.props.clearModal}
            freezeTypeahead={this.props.freezeTypeahead}
            unfreezeTypeahead={this.props.unfreezeTypeahead}
            focusTypeahead={this.props.focusTypeahead}
          />
          <div className={css['thread-nav-option-name']}>
            {this.props.threadInfo.uiName}
          </div>
        </div>
        {descriptionDiv}
      </div>
    );
  }

  onClick = (event: SyntheticEvent<HTMLDivElement>) => {
    const threadIsVisible = threadHasPermission(
      this.props.threadInfo,
      threadPermissions.VISIBLE,
    );
    if (!threadIsVisible) {
      return;
    }
    this.props.dispatchActionPayload(
      updateCalendarThreadFilter,
      {
        type: "threads",
        threadIDs: [this.props.threadInfo.id],
      },
    );
    this.props.onTransition();
  }

}

export default connect(
  (state: AppState) => ({ navInfo: state.navInfo, }),
  null,
  true,
)(TypeaheadThreadOption);
