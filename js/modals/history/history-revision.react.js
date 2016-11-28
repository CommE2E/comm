// @flow

import type { HistoryRevisionInfo } from './history-types';
import { historyRevisionInfoPropType } from './history-types';
import type { CalendarInfo } from '../../calendar-info';
import { calendarInfoPropType } from '../../calendar-info';
import type { AppState } from '../../redux-reducer';

import React from 'react';
import classNames from 'classnames';
import $ from 'jquery';
import 'timeago'; // side effect: $.timeago
import invariant from 'invariant';
import dateFormat from 'dateformat';
import { connect } from 'react-redux';

import { colorIsDark } from '../../calendar-utils';

type Props = {
  revisionInfo: HistoryRevisionInfo,
  calendarInfo: CalendarInfo,
  isDeletionOrRestoration: bool,
}

class HistoryRevision extends React.Component {

  time: ?HTMLElement;

  componentDidMount() {
    // TODO investigate React replacement for jQuery timeago plugin
    invariant(this.time instanceof HTMLElement, "time ref should be set");
    $(this.time).timeago();
  }

  componentDidUpdate(prevProps: Props) {
    if (
      this.props.revisionInfo.lastUpdate !== prevProps.revisionInfo.lastUpdate
    ) {
      invariant(this.time instanceof HTMLElement, "time ref should be set");
      $(this.time).timeago();
    }
  }

  render() {
    let change;
    if (this.props.isDeletionOrRestoration && this.props.revisionInfo.deleted) {
      change = <div className="entry-history-deleted">Deleted</div>;
    } else if (this.props.isDeletionOrRestoration) {
      change = <div className="entry-history-restored">Restored</div>;
    } else {
      const textClasses = classNames({
        "entry": true,
        "entry-history-entry": true,
        "dark-entry": colorIsDark(this.props.calendarInfo.color),
      });
      const textStyle = { backgroundColor: "#" + this.props.calendarInfo.color };
      change = (
        <div className={textClasses} style={textStyle}>
          {this.props.revisionInfo.text}
        </div>
      );
    }

    const author = this.props.revisionInfo.author === null
      ? "Anonymous"
      : <span className="entry-username">
          {this.props.revisionInfo.author}
        </span>;

    const date = new Date(this.props.revisionInfo.lastUpdate);
    const hovertext = dateFormat(date, "dddd, mmmm dS, yyyy 'at' h:MM TT");
    return (
      <li>
        {change}
        <span className="entry-author">
          {"updated by "}
          {author}
        </span>
        <time
          className="timeago entry-time"
          dateTime={date.toISOString()}
          ref={(elem) => this.time = elem}
        >
          {hovertext}
        </time>
        <div className="clear" />
      </li>
    );
  }

}

HistoryRevision.propTypes = {
  revisionInfo: historyRevisionInfoPropType,
  calendarInfo: calendarInfoPropType,
  isDeletionOrRestoration: React.PropTypes.bool.isRequired,
};

type OwnProps = { revisionInfo: HistoryRevisionInfo };
export default connect((state: AppState, ownProps: OwnProps) => ({
  calendarInfo: state.calendarInfos[ownProps.revisionInfo.squadID],
}))(HistoryRevision);
