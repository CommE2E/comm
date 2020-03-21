// @flow

import type { HistoryRevisionInfo } from 'lib/types/history-types';
import { historyRevisionInfoPropType } from 'lib/types/history-types';
import type { ThreadInfo } from 'lib/types/thread-types';
import { threadInfoPropType } from 'lib/types/thread-types';
import type { AppState } from '../../redux-setup';

import * as React from 'react';
import classNames from 'classnames';
import dateFormat from 'dateformat';
import PropTypes from 'prop-types';
import TimeAgo from 'react-timeago';

import { colorIsDark } from 'lib/shared/thread-utils';
import { threadInfoSelector } from 'lib/selectors/thread-selectors';
import { connect } from 'lib/utils/redux-utils';

import css from './history.css';

type Props = {
  revisionInfo: HistoryRevisionInfo,
  threadInfo: ThreadInfo,
  isDeletionOrRestoration: boolean,
};

class HistoryRevision extends React.PureComponent<Props> {
  render() {
    let change;
    if (this.props.isDeletionOrRestoration && this.props.revisionInfo.deleted) {
      change = <div className={css.deleted}>Deleted</div>;
    } else if (this.props.isDeletionOrRestoration) {
      change = <div className={css.restored}>Restored</div>;
    } else {
      const textClasses = classNames({
        [css.entry]: true,
        [css.darkEntry]: colorIsDark(this.props.threadInfo.color),
      });
      const textStyle = { backgroundColor: '#' + this.props.threadInfo.color };
      change = (
        <div className={textClasses} style={textStyle}>
          {this.props.revisionInfo.text}
        </div>
      );
    }

    const author =
      this.props.revisionInfo.author === null ? (
        'Anonymous'
      ) : (
        <span className={css.entryUsername}>
          {this.props.revisionInfo.author}
        </span>
      );

    const date = new Date(this.props.revisionInfo.lastUpdate);
    const hovertext = dateFormat(date, "dddd, mmmm dS, yyyy 'at' h:MM TT");
    return (
      <li>
        {change}
        <span className={css.entryAuthor}>
          {'updated by '}
          {author}
        </span>
        <TimeAgo
          date={date.toISOString()}
          title={hovertext}
          className={css.entryTime}
        />
        <div className={css.clear} />
      </li>
    );
  }
}

HistoryRevision.propTypes = {
  revisionInfo: historyRevisionInfoPropType,
  threadInfo: threadInfoPropType,
  isDeletionOrRestoration: PropTypes.bool.isRequired,
};

type OwnProps = { revisionInfo: HistoryRevisionInfo };
export default connect((state: AppState, ownProps: OwnProps) => ({
  threadInfo: threadInfoSelector(state)[ownProps.revisionInfo.threadID],
}))(HistoryRevision);
