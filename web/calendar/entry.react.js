// @flow

import {
  type EntryInfo,
  entryInfoPropType,
  type CreateEntryRequest,
  type SaveEntryRequest,
  type SaveEntryResponse,
  type DeleteEntryResponse,
} from 'lib/types/entry-types';
import type { ThreadInfo } from 'lib/types/thread-types';
import { threadInfoPropType } from 'lib/types/thread-types';
import type { LoadingStatus } from 'lib/types/loading-types';
import type { AppState } from '../redux-setup';
import type {
  DispatchActionPayload,
  DispatchActionPromise,
} from 'lib/utils/action-utils';

import * as React from 'react';
import classNames from 'classnames';
import invariant from 'invariant';
import PropTypes from 'prop-types';

import { entryKey } from 'lib/shared/entry-utils';
import { colorIsDark } from 'lib/shared/thread-utils';
import { connect } from 'lib/utils/redux-utils';
import {
  createEntryActionTypes,
  createEntry,
  saveEntryActionTypes,
  saveEntry,
  deleteEntryActionTypes,
  deleteEntry,
  concurrentModificationResetActionType,
} from 'lib/actions/entry-actions';
import { ServerError } from 'lib/utils/errors';
import {
  currentSessionID,
  nextSessionID,
  sessionStartingPayload,
} from 'lib/selectors/session-selectors';
import { dateString } from 'lib/utils/date-utils';
import { threadInfoSelector } from 'lib/selectors/thread-selectors';

import css from '../style.css';
import LoadingIndicator from '../loading-indicator.react';
import ConcurrentModificationModal from
  '../modals/concurrent-modification-modal.react';
import HistoryModal from '../modals/history/history-modal.react';
import { HistoryVector, DeleteVector } from '../vectors.react';
import LogInFirstModal from '../modals/account/log-in-first-modal.react';

type Props = {
  innerRef: (key: string, me: Entry) => void,
  entryInfo: EntryInfo,
  focusOnFirstEntryNewerThan: (time: number) => void,
  setModal: (modal: React.Node) => void,
  clearModal: () => void,
  tabIndex: number,
  // Redux state
  threadInfo: ThreadInfo,
  sessionID: () => string,
  nextSessionID: () => ?string,
  sessionStartingPayload: () => { newSessionID?: string },
  loggedIn: bool,
  // Redux dispatch functions
  dispatchActionPayload: DispatchActionPayload,
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  createEntry: (request: CreateEntryRequest) => Promise<SaveEntryResponse>,
  saveEntry: (request: SaveEntryRequest) => Promise<SaveEntryResponse>,
  deleteEntry: (
    entryID: string,
    prevText: string,
    sessionID: string,
  ) => Promise<DeleteEntryResponse>,
};
type State = {
  focused: bool,
  loadingStatus: LoadingStatus,
  text: string,
};

class Entry extends React.PureComponent<Props, State> {

  textarea: ?HTMLTextAreaElement;
  creating: bool;
  needsUpdateAfterCreation: bool;
  needsDeleteAfterCreation: bool;
  nextSaveAttemptIndex: number;
  mounted: bool;

  constructor(props: Props) {
    super(props);
    this.state = {
      focused: false,
      loadingStatus: "inactive",
      text: props.entryInfo.text,
    };
    this.creating = false;
    this.needsUpdateAfterCreation = false;
    this.needsDeleteAfterCreation = false;
    this.nextSaveAttemptIndex = 0;
    this.mounted = true;
  }

  guardedSetState(input) {
    if (this.mounted) {
      this.setState(input);
    }
  }

  componentDidMount() {
    this.props.innerRef(entryKey(this.props.entryInfo), this);
    this.updateHeight();
    // Whenever a new Entry is created, focus on it
    if (!this.props.entryInfo.id) {
      this.focus();
    }
  }

  componentWillReceiveProps(nextProps: Props) {
    if (!this.state.focused && this.state.text !== nextProps.entryInfo.text) {
      this.setState({ text: nextProps.entryInfo.text });
    }
  }

  focus() {
    invariant(
      this.textarea instanceof HTMLTextAreaElement,
      "textarea ref not set",
    );
    this.textarea.focus();
  }

  onMouseDown = (event: SyntheticEvent<HTMLDivElement>) => {
    if (this.state.focused) {
      // Don't lose focus when some non-textarea part is clicked
      event.preventDefault();
    }
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  updateHeight() {
    invariant(
      this.textarea instanceof HTMLTextAreaElement,
      "textarea ref not set",
    );
    this.textarea.style.height = 'auto';
    this.textarea.style.height = (this.textarea.scrollHeight) + 'px';
  }

  render() {
    let actionLinks = null;
    if (this.state.focused) {
      let historyButton = null;
      if (this.props.entryInfo.id) {
        historyButton = (
          <a
            href="#"
            className={css['entry-history-button']}
            onClick={this.onHistory}
          >
            <HistoryVector className={css['history']} />
            <span className={css['action-links-text']}>History</span>
          </a>
        );
      }
      actionLinks = (
        <div className={css['action-links']}>
          <a
            href="#"
            className={css['delete-entry-button']}
            onClick={this.onDelete}
          >
            <DeleteVector className={css['delete']} />
            <span className={css['action-links-text']}>Delete</span>
          </a>
          {historyButton}
          <span className={
            `${css['right-action-links']} ${css['action-links-text']}`
          }>
            {this.props.threadInfo.uiName}
          </span>
          <div className={css['clear']}></div>
        </div>
      );
    }

    const entryClasses = classNames({
      [css['entry']]: true,
      [css['dark-entry']]: colorIsDark(this.props.threadInfo.color),
      [css['focused-entry']]: this.state.focused,
    });
    const style = { backgroundColor: "#" + this.props.threadInfo.color };
    return (
      <div
        className={entryClasses}
        style={style}
        onMouseDown={this.onMouseDown}
      >
        <textarea
          rows="1"
          className={css['entry-text']}
          onChange={this.onChange}
          onKeyDown={this.onKeyDown}
          value={this.state.text}
          onFocus={this.onFocus}
          onBlur={this.onBlur}
          tabIndex={this.props.tabIndex}
          ref={this.textareaRef}
        />
        <LoadingIndicator
          status={this.state.loadingStatus}
          className={css['entry-loading']}
        />
        {actionLinks}
      </div>
    );
  }

  textareaRef = (textarea: ?HTMLTextAreaElement) => {
    this.textarea = textarea;
  }

  onFocus = () => {
    this.setState({ focused: true });
  }

  onBlur = (event: SyntheticEvent<HTMLTextAreaElement>) => {
    this.setState({ focused: false });
    if (this.state.text.trim() === "") {
      this.delete(this.props.entryInfo.id, false);
    } else if (this.props.entryInfo.text !== this.state.text) {
      this.save(this.props.entryInfo.id, this.state.text);
    }
  }

  onChange = (event: SyntheticEvent<HTMLTextAreaElement>) => {
    if (!this.props.loggedIn) {
      this.props.setModal(
        <LogInFirstModal
          inOrderTo="edit this calendar"
          onClose={this.props.clearModal}
          setModal={this.props.setModal}
        />
      );
      return;
    }
    const target = event.target;
    invariant(target instanceof HTMLTextAreaElement, "target not textarea");
    this.setState(
      { text: target.value },
      this.updateHeight.bind(this),
    );
  }

  onKeyDown = (event: SyntheticKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.keyCode === 27) {
      invariant(
        this.textarea instanceof HTMLTextAreaElement,
        "textarea ref not set",
      );
      this.textarea.blur();
    }
  }

  save(serverID: ?string, newText: string) {
    if (newText.trim() === "") {
      // We don't save the empty string, since as soon as the element loses
      // focus it'll get deleted
      return;
    }

    if (!serverID) {
      if (this.creating) {
        // We need the first save call to return so we know the ID of the entry
        // we're updating, so we'll need to handle this save later
        this.needsUpdateAfterCreation = true;
        return;
      } else {
        this.creating = true;
      }
    }

    const startingPayload = this.props.sessionStartingPayload();
    if (!serverID) {
      this.props.dispatchActionPromise(
        createEntryActionTypes,
        this.createAction(newText),
        undefined,
        startingPayload,
      );
    } else {
      this.props.dispatchActionPromise(
        saveEntryActionTypes,
        this.saveAction(serverID, newText),
        undefined,
        startingPayload,
      );
    }
  }

  async createAction(text: string) {
    const localID = this.props.entryInfo.localID;
    invariant(localID, "if there's no serverID, there should be a localID");
    const curSaveAttempt = this.nextSaveAttemptIndex++;
    this.guardedSetState({ loadingStatus: "loading" });
    try {
      const response = await this.props.createEntry({
        text,
        sessionID: this.props.sessionID(),
        timestamp: this.props.entryInfo.creationTime,
        date: dateString(
          this.props.entryInfo.year,
          this.props.entryInfo.month,
          this.props.entryInfo.day,
        ),
        threadID: this.props.entryInfo.threadID,
      });
      if (curSaveAttempt + 1 === this.nextSaveAttemptIndex) {
        this.guardedSetState({ loadingStatus: "inactive" });
      }
      this.creating = false;
      if (this.needsUpdateAfterCreation) {
        this.needsUpdateAfterCreation = false;
        this.save(response.entryID, this.state.text);
      }
      if (this.needsDeleteAfterCreation) {
        this.needsDeleteAfterCreation = false;
        this.delete(response.entryID, false);
      }
      return { ...response, localID };
    } catch(e) {
      if (curSaveAttempt + 1 === this.nextSaveAttemptIndex) {
        this.guardedSetState({ loadingStatus: "error" });
      }
      throw e;
    }
  }

  async saveAction(entryID: string, newText: string) {
    const curSaveAttempt = this.nextSaveAttemptIndex++;
    this.guardedSetState({ loadingStatus: "loading" });
    try {
      const response = await this.props.saveEntry({
        entryID,
        text: newText,
        prevText: this.props.entryInfo.text,
        sessionID: this.props.sessionID(),
        timestamp: Date.now(),
      });
      if (curSaveAttempt + 1 === this.nextSaveAttemptIndex) {
        this.guardedSetState({ loadingStatus: "inactive" });
      }
      return { ...response, threadID: this.props.entryInfo.threadID };
    } catch(e) {
      if (curSaveAttempt + 1 === this.nextSaveAttemptIndex) {
        this.guardedSetState({ loadingStatus: "error" });
      }
      if (e instanceof ServerError && e.message === 'concurrent_modification') {
        const onRefresh = () => {
          this.setState(
            { loadingStatus: "inactive" },
            this.updateHeight.bind(this),
          );
          this.props.dispatchActionPayload(
            concurrentModificationResetActionType,
            { id: entryID, dbText: e.payload.db },
          );
          this.props.clearModal();
        };
        this.props.setModal(
          <ConcurrentModificationModal
            onClose={this.props.clearModal}
            onRefresh={onRefresh}
          />
        );
      }
      throw e;
    }
  }

  onDelete = (event: SyntheticEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (!this.props.loggedIn) {
      this.props.setModal(
        <LogInFirstModal
          inOrderTo="edit this calendar"
          onClose={this.props.clearModal}
          setModal={this.props.setModal}
        />
      );
      return;
    }
    this.delete(this.props.entryInfo.id, true);
  }

  delete(serverID: ?string, focusOnNextEntry: bool) {
    const startingPayload: {[key: string]: ?string} = {
      localID: this.props.entryInfo.localID,
      serverID: serverID,
    };
    const nextSessionID = this.props.nextSessionID();
    if (nextSessionID) {
      startingPayload.newSessionID = nextSessionID;
    }
    this.props.dispatchActionPromise(
      deleteEntryActionTypes,
      this.deleteAction(serverID, focusOnNextEntry),
      undefined,
      startingPayload,
    );
  }

  async deleteAction(serverID: ?string, focusOnNextEntry: bool) {
    invariant(
      this.props.loggedIn,
      "user should be logged in if delete triggered",
    );
    if (focusOnNextEntry) {
      this.props.focusOnFirstEntryNewerThan(this.props.entryInfo.creationTime);
    }
    if (serverID) {
      return await this.props.deleteEntry(
        serverID,
        this.props.entryInfo.text,
        this.props.sessionID(),
      );
    } else if (this.creating) {
      this.needsDeleteAfterCreation = true;
    }
    return null;
  }

  onHistory = (event: SyntheticEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    this.props.setModal(
      <HistoryModal
        mode="entry"
        dayString={dateString(
          this.props.entryInfo.year,
          this.props.entryInfo.month,
          this.props.entryInfo.day,
        )}
        onClose={this.props.clearModal}
        currentEntryID={this.props.entryInfo.id}
      />
    );
  }

}

export type InnerEntry = Entry;

Entry.propTypes = {
  innerRef: PropTypes.func.isRequired,
  entryInfo: entryInfoPropType.isRequired,
  focusOnFirstEntryNewerThan: PropTypes.func.isRequired,
  setModal: PropTypes.func.isRequired,
  clearModal: PropTypes.func.isRequired,
  tabIndex: PropTypes.number.isRequired,
  threadInfo: threadInfoPropType.isRequired,
  sessionID: PropTypes.func.isRequired,
  nextSessionID: PropTypes.func.isRequired,
  sessionStartingPayload: PropTypes.func.isRequired,
  loggedIn: PropTypes.bool.isRequired,
  dispatchActionPayload: PropTypes.func.isRequired,
  dispatchActionPromise: PropTypes.func.isRequired,
  createEntry: PropTypes.func.isRequired,
  saveEntry: PropTypes.func.isRequired,
  deleteEntry: PropTypes.func.isRequired,
}

type OwnProps = {
  entryInfo: EntryInfo,
};
export default connect(
  (state: AppState, ownProps: OwnProps) => ({
    threadInfo: threadInfoSelector(state)[ownProps.entryInfo.threadID],
    sessionID: currentSessionID(state),
    nextSessionID: nextSessionID(state),
    sessionStartingPayload: sessionStartingPayload(state),
    loggedIn: !!(state.currentUserInfo &&
      !state.currentUserInfo.anonymous && true),
  }),
  { createEntry, saveEntry, deleteEntry },
)(Entry);
