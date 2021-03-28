// @flow

import classNames from 'classnames';
import invariant from 'invariant';
import _some from 'lodash/fp/some';
import * as React from 'react';
import { useDispatch } from 'react-redux';

import {
  createLocalEntry,
  createLocalEntryActionType,
} from 'lib/actions/entry-actions';
import { onScreenThreadInfos as onScreenThreadInfosSelector } from 'lib/selectors/thread-selectors';
import { entryKey } from 'lib/shared/entry-utils';
import type { EntryInfo } from 'lib/types/entry-types';
import type { Dispatch } from 'lib/types/redux-types';
import type { ThreadInfo } from 'lib/types/thread-types';
import {
  dateString,
  dateFromString,
  currentDateInTimeZone,
} from 'lib/utils/date-utils';

import LogInFirstModal from '../modals/account/log-in-first-modal.react';
import HistoryModal from '../modals/history/history-modal.react';
import { useSelector } from '../redux/redux-utils';
import { htmlTargetFromEvent } from '../vector-utils';
import { AddVector, HistoryVector } from '../vectors.react';
import css from './calendar.css';
import type { InnerEntry } from './entry.react';
import Entry from './entry.react';
import ThreadPicker from './thread-picker.react';

type BaseProps = {|
  +dayString: string,
  +entryInfos: $ReadOnlyArray<EntryInfo>,
  +setModal: (modal: ?React.Node) => void,
  +startingTabIndex: number,
|};
type Props = {|
  ...BaseProps,
  +onScreenThreadInfos: $ReadOnlyArray<ThreadInfo>,
  +viewerID: ?string,
  +loggedIn: boolean,
  +nextLocalID: number,
  +timeZone: ?string,
  +dispatch: Dispatch,
|};
type State = {|
  +pickerOpen: boolean,
  +hovered: boolean,
|};
class Day extends React.PureComponent<Props, State> {
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
      .filter(entryInfo =>
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
    this.props.dispatch({
      type: createLocalEntryActionType,
      payload: createLocalEntry(
        threadID,
        this.props.nextLocalID,
        this.props.dayString,
        viewerID,
      ),
    });
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
      candidate => candidate.creationTime > time,
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

const ConnectedDay: React.AbstractComponent<BaseProps, mixed> = React.memo<BaseProps>(function ConnectedDay(props) {
  const onScreenThreadInfos = useSelector(onScreenThreadInfosSelector);
  const viewerID = useSelector(state => state.currentUserInfo?.id);
  const loggedIn = useSelector(
    state =>
      !!(state.currentUserInfo && !state.currentUserInfo.anonymous && true),
  );
  const nextLocalID = useSelector(state => state.nextLocalID);
  const timeZone = useSelector(state => state.timeZone);
  const dispatch = useDispatch();

  return (
    <Day
      {...props}
      onScreenThreadInfos={onScreenThreadInfos}
      viewerID={viewerID}
      loggedIn={loggedIn}
      nextLocalID={nextLocalID}
      timeZone={timeZone}
      dispatch={dispatch}
    />
  );
});

export default ConnectedDay;
