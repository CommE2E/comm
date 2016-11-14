// @flow

import type { HistoryRevisionInfo } from './history-types';
import { historyRevisionInfoPropType } from './history-types';
import type { SquadInfo } from '../../squad-info';
import { squadInfoPropType } from '../../squad-info';
import type { AppState } from '../../redux-reducer';

import React from 'react';
import classNames from 'classnames';
import $ from 'jquery';
import 'timeago'; // side effect: $.timeago
import invariant from 'invariant';
import dateFormat from 'dateformat';
import { connect } from 'react-redux';

import { colorIsDark } from '../../squad-utils';

type Props = {
  revisionInfo: HistoryRevisionInfo,
  squadInfo: SquadInfo,
  isDeletionOrRestoration: bool,
}

class HistoryRevision extends React.Component {

  time: ?HTMLElement;

  componentDidMount() {
    // TODO investigate React replacement for jQuery timeago plugin
    invariant(this.time instanceof HTMLElement, "time re should be set");
    $(this.time).timeago();
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
        "dark-entry": colorIsDark(this.props.squadInfo.color),
      });
      const textStyle = { backgroundColor: "#" + this.props.squadInfo.color };
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
  squadInfo: squadInfoPropType,
  isDeletionOrRestoration: React.PropTypes.bool.isRequired,
};

type OwnProps = { revisionInfo: HistoryRevisionInfo };
export default connect((state: AppState, ownProps: OwnProps) => ({
  squadInfo: state.squadInfos[ownProps.revisionInfo.squadID],
}))(HistoryRevision);
