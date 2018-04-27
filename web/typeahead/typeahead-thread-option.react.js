// @flow

import {
  type ThreadInfo,
  threadInfoPropType,
  threadPermissions,
  type ThreadJoinPayload,
} from 'lib/types/thread-types';
import type { LoadingStatus } from 'lib/types/loading-types';
import type { AppState, NavInfo } from '../redux-setup';
import { navInfoPropType } from '../redux-setup';
import type {
  DispatchActionPayload,
  DispatchActionPromise,
} from 'lib/utils/action-utils';

import * as React from 'react';
import classNames from 'classnames';
import TextTruncate from 'react-text-truncate';
import invariant from 'invariant';
import PropTypes from 'prop-types';

import { currentNavID } from 'lib/selectors/nav-selectors';
import {
  joinThreadActionTypes,
  joinThread,
} from 'lib/actions/thread-actions';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import { connect } from 'lib/utils/redux-utils';
import { threadHasPermission } from 'lib/shared/thread-utils';

import css from '../style.css';
import TypeaheadOptionButtons from './typeahead-option-buttons.react';
import { monthURL } from '../url-utils';
import history from '../router-history';
import LoadingIndicator from '../loading-indicator.react';
import { reflectRouteChangeActionType } from '../redux-setup';

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
  monthURL: string,
  currentNavID: ?string,
  currentThreadID: ?string,
  passwordEntryLoadingStatus: LoadingStatus,
  navInfo: NavInfo,
  // Redux dispatch functions
  dispatchActionPayload: DispatchActionPayload,
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  joinThread: (threadID: string) => Promise<ThreadJoinPayload>,
};

class TypeaheadThreadOption extends React.PureComponent<Props> {

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
    const id = this.props.threadInfo.id;
    history.push(`/thread/${id}/${this.props.monthURL}`);
    this.props.onTransition();
  }

}

TypeaheadThreadOption.propTypes = {
  threadInfo: threadInfoPropType.isRequired,
  freezeTypeahead: PropTypes.func.isRequired,
  unfreezeTypeahead: PropTypes.func.isRequired,
  focusTypeahead: PropTypes.func.isRequired,
  onTransition: PropTypes.func.isRequired,
  frozen: PropTypes.bool,
  setModal: PropTypes.func.isRequired,
  clearModal: PropTypes.func.isRequired,
  monthURL: PropTypes.string.isRequired,
  currentNavID: PropTypes.string,
  currentThreadID: PropTypes.string,
  passwordEntryLoadingStatus: PropTypes.string.isRequired,
  navInfo: navInfoPropType.isRequired,
  dispatchActionPayload: PropTypes.func.isRequired,
  dispatchActionPromise: PropTypes.func.isRequired,
  joinThread: PropTypes.func.isRequired,
};

type OwnProps = { threadInfo: ThreadInfo };
export default connect(
  (state: AppState, ownProps: OwnProps) => ({
    monthURL: monthURL(state),
    currentNavID: currentNavID(state),
    currentThreadID: state.navInfo.threadID,
    passwordEntryLoadingStatus: createLoadingStatusSelector(
      joinThreadActionTypes,
      `${joinThreadActionTypes.started}:${ownProps.threadInfo.id}`,
    )(state),
    navInfo: state.navInfo,
  }),
  { joinThread },
)(TypeaheadThreadOption);
