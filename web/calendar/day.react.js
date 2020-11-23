// @flow

import type { EntryInfo } from 'lib/types/entry-types';
import { entryInfoPropType } from 'lib/types/entry-types';
import type { ThreadInfo } from 'lib/types/thread-types';
import { threadInfoPropType } from 'lib/types/thread-types';
import type { AppState } from '../redux/redux-setup';
import type { InnerEntry } from './entry.react';

import * as React from 'react';
import classNames from 'classnames';
import _some from 'lodash/fp/some';
import invariant from 'invariant';
import PropTypes from 'prop-types';

import { entryKey } from 'lib/shared/entry-utils';
import { onScreenThreadInfos } from 'lib/selectors/thread-selectors';
import {
  createLocalEntry,
  createLocalEntryActionType,
} from 'lib/actions/entry-actions';
import {
  dateString,
  dateFromString,
  currentDateInTimeZone,
} from 'lib/utils/date-utils';
import { connect } from 'lib/utils/redux-utils';

import css from './calendar.css';
import Entry from './entry.react';
import HistoryModal from '../modals/history/history-modal.react';
import ThreadPicker from './thread-picker.react';
import { htmlTargetFromEvent } from '../vector-utils';
import { AddVector, HistoryVector } from '../vectors.react';
import LogInFirstModal from '../modals/account/log-in-first-modal.react';

type Props = {
  dayString: string,
  entryInfos: EntryInfo[],
  setModal: (modal: ?React.Node) => void,
  startingTabIndex: number,
  // Redux state
  onScreenThreadInfos: ThreadInfo[],
  viewerID: ?string,
  loggedIn: boolean,
  nextLocalID: number,
  timeZone: ?string,
  // Redux dispatch functions
  dispatchActionPayload: (actionType: string, payload: *) => void,
};
type State = {
  pickerOpen: boolean,
  hovered: boolean,
};
class Day extends React.PureComponent<Props, State> {
  static propTypes = {
    dayString: PropTypes.string.isRequired,
    entryInfos: PropTypes.arrayOf(entryInfoPropType).isRequired,
    setModal: PropTypes.func.isRequired,
    startingTabIndex: PropTypes.number.isRequired,
    onScreenThreadInfos: PropTypes.arrayOf(threadInfoPropType).isRequired,
    viewerID: PropTypes.string,
    loggedIn: PropTypes.bool.isRequired,
    nextLocalID: PropTypes.number.isRequired,
    timeZone: PropTypes.string,
    dispatchActionPayload: PropTypes.func.isRequired,
  };
  state: State = {
    pickerOpen: false,
    hovered: false,
  };
  entryContainer: ?HTMLDivElement;
  entryContainerSpacer: ?HTMLDivElement;
  actionLinks: ?HTMLDivElement;
  entries: Map<string, InnerEntry> = new Map();

  static getDerivedStateFromProps(props: Props) {
    if (props.onScreenThreadInfos.length === 0) {
      return { pickerOpen: false };
    }
    return null;
  }

  componentDidUpdate(prevProps: Props) {
    if (this.props.entryInfos.length > prevProps.entryInfos.length) {
      invariant(this.entryContainer, 'entryContainer ref not set');
      this.entryContainer.scrollTop = this.entryContainer.scrollHeight;
    }
  }

  render() {
    const now = currentDateInTimeZone(this.props.timeZone);
    const isToday = dateString(now) === this.props.dayString;
    const tdClasses = classNames(css.day, { [css.currentDay]: isToday });

    let actionLinks = null;
    const hovered = this.state.hovered;
    if (hovered) {
      const actionLinksClassName = `${css.actionLinks} ${css.dayActionLinks}`;
      actionLinks = (
        <div className={actionLinksClassName} ref={this.actionLinksRef}>
          <a href="#" onClick={this.onAddEntry}>
            <AddVector />
            <span className={css.actionLinksText}>Add</span>
          </a>
          <a href="#" onClick={this.onHistory}>
            <HistoryVector className={css.history} />
            <span className={css.actionLinksText}>History</span>
          </a>
        </div>
      );
    }

    const entries = this.props.entryInfos
      .filter((entryInfo) =>
        _some(['id', entryInfo.threadID])(this.props.onScreenThreadInfos),
      )
      .map((entryInfo, i) => {
        const key = entryKey(entryInfo);
        return (
          <Entry
            entryInfo={entryInfo}
            focusOnFirstEntryNewerThan={this.focusOnFirstEntryNewerThan}
            setModal={this.props.setModal}
            tabIndex={this.props.startingTabIndex + i}
            key={key}
            innerRef={this.entryRef}
          />
        );
      });

    let threadPicker = null;
    if (this.state.pickerOpen) {
      invariant(
        this.props.onScreenThreadInfos.length > 0,
        'onScreenThreadInfos should exist if pickerOpen',
      );
      threadPicker = (
        <ThreadPicker
          createNewEntry={this.createNewEntry}
          closePicker={this.closePicker}
        />
      );
    }

    const entryContainerClasses = classNames(css.entryContainer, {
      [css.focusedEntryContainer]: hovered,
    });
    const date = dateFromString(this.props.dayString);
    return (
      <td
        className={tdClasses}
        onClick={this.onClick}
        onMouseEnter={this.onMouseEnter}
        onMouseLeave={this.onMouseLeave}
      >
        <h2>{date.getDate()}</h2>
        <div className={entryContainerClasses} ref={this.entryContainerRef}>
          {entries}
          <div
            className={css.entryContainerSpacer}
            ref={this.entryContainerSpacerRef}
          />
        </div>
        {actionLinks}
        {threadPicker}
      </td>
    );
  }

  actionLinksRef = (actionLinks: ?HTMLDivElement) => {
    this.actionLinks = actionLinks;
  };

  entryContainerRef = (entryContainer: ?HTMLDivElement) => {
    this.entryContainer = entryContainer;
  };

  entryContainerSpacerRef = (entryContainerSpacer: ?HTMLDivElement) => {
    this.entryContainerSpacer = entryContainerSpacer;
  };

  entryRef = (key: string, entry: InnerEntry) => {
    this.entries.set(key, entry);
  };

  closePicker = () => {
    this.setState({ pickerOpen: false });
  };

  onMouseEnter = () => {
    this.setState({ hovered: true });
  };

  onMouseLeave = () => {
    this.setState({ hovered: false });
  };

  onClick = (event: SyntheticEvent<HTMLTableCellElement>) => {
    const target = htmlTargetFromEvent(event);
    invariant(
      this.entryContainer instanceof HTMLDivElement,
      "entryContainer isn't div",
    );
    invariant(
      this.entryContainerSpacer instanceof HTMLDivElement,
      "entryContainerSpacer isn't div",
    );
    if (
      target === this.entryContainer ||
      target === this.entryContainerSpacer ||
      (this.actionLinks && target === this.actionLinks)
    ) {
      this.onAddEntry(event);
    }
  };

  onAddEntry = (event: SyntheticEvent<*>) => {
    event.preventDefault();
    invariant(
      this.props.onScreenThreadInfos.length > 0,
      "onAddEntry shouldn't be clicked if no onScreenThreadInfos",
    );
    if (this.props.onScreenThreadInfos.length === 1) {
      this.createNewEntry(this.props.onScreenThreadInfos[0].id);
    } else if (this.props.onScreenThreadInfos.length > 1) {
      this.setState({ pickerOpen: true });
    }
  };

  createNewEntry = (threadID: string) => {
    if (!this.props.loggedIn) {
      this.props.setModal(
        <LogInFirstModal
          inOrderTo="edit this calendar"
          setModal={this.props.setModal}
        />,
      );
      return;
    }
    const viewerID = this.props.viewerID;
    invariant(viewerID, 'should have viewerID in order to create thread');
    this.props.dispatchActionPayload(
      createLocalEntryActionType,
      createLocalEntry(
        threadID,
        this.props.nextLocalID,
        this.props.dayString,
        viewerID,
      ),
    );
  };

  onHistory = (event: SyntheticEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    this.props.setModal(
      <HistoryModal
        mode="day"
        dayString={this.props.dayString}
        onClose={this.clearModal}
      />,
    );
  };

  focusOnFirstEntryNewerThan = (time: number) => {
    const entryInfo = this.props.entryInfos.find(
      (candidate) => candidate.creationTime > time,
    );
    if (entryInfo) {
      const entry = this.entries.get(entryKey(entryInfo));
      invariant(entry, 'entry for entryinfo should be defined');
      entry.focus();
    }
  };

  clearModal = () => {
    this.props.setModal(null);
  };
}

export default connect(
  (state: AppState) => ({
    onScreenThreadInfos: onScreenThreadInfos(state),
    viewerID: state.currentUserInfo && state.currentUserInfo.id,
    loggedIn: !!(
      state.currentUserInfo &&
      !state.currentUserInfo.anonymous &&
      true
    ),
    nextLocalID: state.nextLocalID,
    timeZone: state.timeZone,
  }),
  null,
  true,
)(Day);
