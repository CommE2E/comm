// @flow

import type { HistoryRevisionInfo } from 'lib/types/history-types';
import { historyRevisionInfoPropType } from 'lib/types/history-types';
import type { ThreadInfo } from 'lib/types/thread-types';
import { threadInfoPropType } from 'lib/types/thread-types';
import type { AppState } from '../../redux-setup';

import * as React from 'react';
import classNames from 'classnames';
import $ from 'jquery';
import 'timeago'; // side effect: $.timeago
import invariant from 'invariant';
import dateFormat from 'dateformat';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import { colorIsDark } from 'lib/shared/thread-utils';
import { threadInfoSelector } from 'lib/selectors/thread-selectors';

import css from '../../style.css';

type Props = {
  revisionInfo: HistoryRevisionInfo,
  threadInfo: ThreadInfo,
  isDeletionOrRestoration: bool,
}

class HistoryRevision extends React.PureComponent<Props> {

  time: ?HTMLElement;

  componentDidMount() {
    // TODO investigate React replacement for jQuery timeago plugin
    invariant(this.time instanceof HTMLElement, "time ref should be set");
    // $FlowFixMe
    $(this.time).timeago();
  }

  componentDidUpdate(prevProps: Props) {
    if (
      this.props.revisionInfo.lastUpdate !== prevProps.revisionInfo.lastUpdate
    ) {
      invariant(this.time instanceof HTMLElement, "time ref should be set");
      // $FlowFixMe
      $(this.time).timeago();
    }
  }

  render() {
    let change;
    if (this.props.isDeletionOrRestoration && this.props.revisionInfo.deleted) {
      change = <div className={css['entry-history-deleted']}>Deleted</div>;
    } else if (this.props.isDeletionOrRestoration) {
      change = <div className={css['entry-history-restored']}>Restored</div>;
    } else {
      const textClasses = classNames({
        [css['entry']]: true,
        [css['entry-history-entry']]: true,
        [css['dark-entry']]: colorIsDark(this.props.threadInfo.color),
      });
      const textStyle = { backgroundColor: "#" + this.props.threadInfo.color };
      change = (
        <div className={textClasses} style={textStyle}>
          {this.props.revisionInfo.text}
        </div>
      );
    }

    const author = this.props.revisionInfo.author === null
      ? "Anonymous"
      : <span className={css['entry-username']}>
          {this.props.revisionInfo.author}
        </span>;

    const date = new Date(this.props.revisionInfo.lastUpdate);
    const hovertext = dateFormat(date, "dddd, mmmm dS, yyyy 'at' h:MM TT");
    return (
      <li>
        {change}
        <span className={css['entry-author']}>
          {"updated by "}
          {author}
        </span>
        <time
          className={css['entry-time']}
          dateTime={date.toISOString()}
          ref={this.timeRef}
        >
          {hovertext}
        </time>
        <div className={css['clear']} />
      </li>
    );
  }

  timeRef = (time: ?HTMLElement) => {
    this.time = time;
  }

}

HistoryRevision.propTypes = {
  revisionInfo: historyRevisionInfoPropType,
  threadInfo: threadInfoPropType,
  isDeletionOrRestoration: PropTypes.bool.isRequired,
};

type OwnProps = { revisionInfo: HistoryRevisionInfo };
export default connect((state: AppState, ownProps: OwnProps): * => ({
  threadInfo: threadInfoSelector(state)[ownProps.revisionInfo.threadID],
}))(HistoryRevision);
