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
import { useModalContext } from '../modals/modal-provider.react';
import ThreadPickerModal from '../modals/threads/thread-picker-modal.react';
import { useSelector } from '../redux/redux-utils';
import { htmlTargetFromEvent } from '../vector-utils';
import { AddVector, HistoryVector } from '../vectors.react';
import css from './calendar.css';
import type { InnerEntry } from './entry.react';
import Entry from './entry.react';

type BaseProps = {
  +dayString: string,
  +entryInfos: $ReadOnlyArray<EntryInfo>,
  +startingTabIndex: number,
};
type Props = {
  ...BaseProps,
  +onScreenThreadInfos: $ReadOnlyArray<ThreadInfo>,
  +viewerID: ?string,
  +loggedIn: boolean,
  +nextLocalID: number,
  +timeZone: ?string,
  +dispatch: Dispatch,
  +pushModal: (modal: React.Node) => void,
  +popModal: () => void,
};
type State = {
  +hovered: boolean,
};
class Day extends React.PureComponent<Props, State> {
  state: State = {
    hovered: false,
  };
  entryContainer: ?HTMLDivElement;
  entryContainerSpacer: ?HTMLDivElement;
  actionLinks: ?HTMLDivElement;
  entries: Map<string, InnerEntry> = new Map();

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
            tabIndex={this.props.startingTabIndex + i}
            key={key}
            innerRef={this.entryRef}
          />
        );
      });

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
      this.props.pushModal(
        <ThreadPickerModal
          name="Chats"
          onClose={this.props.popModal}
          createNewEntry={this.createNewEntry}
        />,
      );
    }
  };

  createNewEntry = (threadID: string) => {
    if (!this.props.loggedIn) {
      this.props.pushModal(<LogInFirstModal inOrderTo="edit this calendar" />);
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
    this.props.pushModal(
      <HistoryModal mode="day" dayString={this.props.dayString} />,
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
}

const ConnectedDay: React.ComponentType<BaseProps> = React.memo<BaseProps>(
  function ConnectedDay(props) {
    const onScreenThreadInfos = useSelector(onScreenThreadInfosSelector);
    const viewerID = useSelector(state => state.currentUserInfo?.id);
    const loggedIn = useSelector(
      state =>
        !!(state.currentUserInfo && !state.currentUserInfo.anonymous && true),
    );
    const nextLocalID = useSelector(state => state.nextLocalID);
    const timeZone = useSelector(state => state.timeZone);
    const dispatch = useDispatch();
    const { pushModal, popModal } = useModalContext();

    return (
      <Day
        {...props}
        onScreenThreadInfos={onScreenThreadInfos}
        viewerID={viewerID}
        loggedIn={loggedIn}
        nextLocalID={nextLocalID}
        timeZone={timeZone}
        dispatch={dispatch}
        pushModal={pushModal}
        popModal={popModal}
      />
    );
  },
);

export default ConnectedDay;
