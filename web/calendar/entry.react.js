// @flow

import type { EntryInfo } from 'lib/model/entry-info';
import { entryInfoPropType } from 'lib/model/entry-info';
import type { CalendarInfo } from 'lib/model/calendar-info';
import { calendarInfoPropType } from 'lib/model/calendar-info';
import type { UpdateStore, LoadingStatus } from 'lib/model/redux-reducer';
import type { AppState } from '../redux-types';

import React from 'react';
import classNames from 'classnames';
import invariant from 'invariant';
import update from 'immutability-helper';
import { connect } from 'react-redux';
import _ from 'lodash';

import { colorIsDark } from 'lib/shared/calendar-utils';
import fetchJSON from 'lib/utils/fetch-json';
import { mapStateToUpdateStore } from 'lib/shared/redux-utils';

import css from '../style.css';
import LoadingIndicator from '../loading-indicator.react';
import ConcurrentModificationModal from
  '../modals/concurrent-modification-modal.react';
import HistoryModal from '../modals/history/history-modal.react';
import { HistoryVector, DeleteVector } from '../vectors.react';
import LogInFirstModal from '../modals/account/log-in-first-modal.react';

type Props = {
  entryInfo: EntryInfo,
  calendarInfo: CalendarInfo,
  sessionID: string,
  loggedIn: bool,
  focusOnFirstEntryNewerThan: (time: number) => void,
  setModal: (modal: React.Element<any>) => void,
  clearModal: () => void,
  tabIndex: number,
  updateStore: UpdateStore<AppState>,
};
type State = {
  focused: bool,
  loadingStatus: LoadingStatus,
  text: string,
};

class Entry extends React.Component {

  props: Props;
  state: State;
  textarea: ?HTMLTextAreaElement;
  creating: bool;
  needsUpdateAfterCreation: bool;
  saveAttemptIndex: number;
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
    this.saveAttemptIndex = 0;
    this.mounted = true;
  }

  componentDidMount() {
    this.updateHeight();
    // Whenever a new Entry is created, focus on it
    if (!this.props.entryInfo.id) {
      this.focus();
    }
  }

  componentWillReceiveProps(nextProps: Props) {
    if (this.props.entryInfo.text !== nextProps.entryInfo.text) {
      this.setState({ text: nextProps.entryInfo.text });
    }
  }

  componentDidUpdate(prevProps: Props) {
    if (this.mounted && !prevProps.entryInfo.id && this.props.entryInfo.id) {
      this.creating = false;
      if (this.needsUpdateAfterCreation) {
        this.needsUpdateAfterCreation = false;
        invariant(
          this.textarea instanceof HTMLTextAreaElement,
          "textarea ref not set",
        );
        this.save(this.props.entryInfo.id, this.textarea.value).then();
      }
    }
  }

  focus() {
    invariant(
      this.textarea instanceof HTMLTextAreaElement,
      "textarea ref not set",
    );
    this.textarea.focus();
  }

  onMouseDown(event: SyntheticEvent) {
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
            onClick={this.onHistory.bind(this)}
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
            onClick={this.onDelete.bind(this)}
          >
            <DeleteVector className={css['delete']} />
            <span className={css['action-links-text']}>Delete</span>
          </a>
          {historyButton}
          <span className={
            `${css['right-action-links']} ${css['action-links-text']}`
          }>
            {this.props.calendarInfo.name}
          </span>
          <div className={css['clear']}></div>
        </div>
      );
    }

    const entryClasses = classNames({
      [css['entry']]: true,
      [css['dark-entry']]: colorIsDark(this.props.calendarInfo.color),
      [css['focused-entry']]: this.state.focused,
    });
    const style = { backgroundColor: "#" + this.props.calendarInfo.color };
    return (
      <div
        className={entryClasses}
        style={style}
        onMouseDown={this.onMouseDown.bind(this)}
      >
        <textarea
          rows="1"
          className={css['entry-text']}
          onChange={this.onChange.bind(this)}
          onKeyDown={this.onKeyDown.bind(this)}
          value={this.state.text}
          onFocus={() => this.setState({ focused: true })}
          onBlur={this.onBlur.bind(this)}
          tabIndex={this.props.tabIndex}
          ref={(textarea) => this.textarea = textarea}
        />
        <LoadingIndicator
          status={this.state.loadingStatus}
          className={css['entry-loading']}
        />
        {actionLinks}
      </div>
    );
  }

  async onBlur(event: SyntheticEvent) {
    this.setState({ focused: false });
    invariant(
      this.textarea instanceof HTMLTextAreaElement,
      "textarea ref not set",
    );
    if (this.textarea.value.trim() === "") {
      await this.delete(this.props.entryInfo.id, false);
    }
  }

  async onChange(event: SyntheticEvent) {
    if (this.props.calendarInfo.editRules >= 1 && !this.props.loggedIn) {
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
      { "text": target.value },
      this.updateHeight.bind(this),
    );
    await this.save(this.props.entryInfo.id, target.value);
  }

  // Throw away typechecking here because SyntheticEvent isn't typed
  onKeyDown(event: any) {
    if (event.keyCode === 27) {
      invariant(
        this.textarea instanceof HTMLTextAreaElement,
        "textarea ref not set",
      );
      this.textarea.blur();
    }
  }

  async save(serverID: ?string, newText: string) {
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

    const curSaveAttempt = ++this.saveAttemptIndex;
    if (this.mounted) {
      this.setState({ loadingStatus: "loading" });
    }

    const entryID = serverID ? serverID : "-1";
    const payload: Object = {
      'text': newText,
      'prev_text': this.props.entryInfo.text,
      'session_id': this.props.sessionID,
      'entry_id': entryID,
    };
    if (!serverID) {
      payload['day'] = this.props.entryInfo.day;
      payload['month'] = this.props.entryInfo.month;
      payload['year'] = this.props.entryInfo.year;
      payload['calendar'] = this.props.entryInfo.calendarID;
      payload['timestamp'] = this.props.entryInfo.creationTime;
    } else {
      payload['timestamp'] = Date.now();
    }
    const response = await fetchJSON('save.php', payload);

    if (this.mounted && curSaveAttempt === this.saveAttemptIndex) {
      this.setState({ 
        loadingStatus: response.success ? "inactive" : "error",
      });
    }
    if (response.error === 'concurrent_modification') {
      invariant(serverID, "serverID should be set");
      const onRefresh = () => {
        const newText = response.db;
        this.setState(
          { loadingStatus: "inactive" },
          this.updateHeight.bind(this),
        );
        // We need to update props.entryInfo.text so that prev_text is correct
        this.props.updateStore((prevState: AppState) => {
          const dayString = this.props.entryInfo.day.toString();
          const updateObj = {};
          updateObj[dayString] = {};
          updateObj[dayString][serverID] = { text: { $set: newText } };
          return update(prevState, { entryInfos: updateObj });
        });
        this.props.clearModal();
      };
      this.props.setModal(
        <ConcurrentModificationModal
          onClose={this.props.clearModal}
          onRefresh={onRefresh}
        />
      );
      return;
    }
    if (!serverID && response.entry_id) {
      const newServerID = response.entry_id.toString();
      const needsUpdate = this.needsUpdateAfterCreation;
      if (needsUpdate && !this.mounted) {
        await this.delete(newServerID, false);
        return;
      }
      // This is to update the server ID in the Redux store. It may trigger an
      // update in componentDidUpdate.
      this.props.updateStore((prevState: AppState) => {
        const localID = this.props.entryInfo.localID;
        invariant(localID, "we should have a localID");
        const dayString = this.props.entryInfo.day.toString();
        const dayEntryInfos = prevState.entryInfos[dayString];
        let newDayEntryInfos;
        // If an entry with this serverID already got into the store somehow
        // (likely through an unrelated request), we need to dedup them.
        if (dayEntryInfos[newServerID]) {
          // It's fair to assume the serverID entry is newer than the localID
          // entry, and this probably won't happen often, so for now we can just
          // keep the serverID entry.
          newDayEntryInfos = _.omitBy(dayEntryInfos, (candidate) =>
            candidate.localID === localID
          );
        } else {
          newDayEntryInfos = _.mapKeys(dayEntryInfos, (entryInfo, oldKey) =>
            entryInfo.localID === localID ? newServerID : oldKey
          );
          newDayEntryInfos[newServerID].id = newServerID;
        }
        const updateObj = {};
        updateObj[dayString] = { $set: newDayEntryInfos };
        return update(prevState, { entryInfos: updateObj });
      });
    }
  }

  async onDelete(event: SyntheticEvent) {
    event.preventDefault();
    if (this.props.calendarInfo.editRules >= 1 && !this.props.loggedIn) {
      this.props.setModal(
        <LogInFirstModal
          inOrderTo="edit this calendar"
          onClose={this.props.clearModal}
          setModal={this.props.setModal}
        />
      );
      return;
    }
    await this.delete(this.props.entryInfo.id, true);
  }

  async delete(serverID: ?string, focusOnNextEntry: bool) {
    invariant(
      this.props.calendarInfo.editRules < 1 || this.props.loggedIn,
      "calendar should be editable if delete triggered",
    );
    this.props.updateStore((prevState: AppState) => {
      const dayString = this.props.entryInfo.day.toString();
      const dayEntryInfos = prevState.entryInfos[dayString];
      const newDayEntryInfos = _.omitBy(dayEntryInfos, (candidate) => {
        const ei = this.props.entryInfo;
        return (!!candidate.id && candidate.id === serverID) ||
          (!!candidate.localID && candidate.localID === ei.localID);
      });
      const saveObj = {};
      saveObj[dayString] = { $set: newDayEntryInfos };
      return update(prevState, { entryInfos: saveObj });
    });

    if (focusOnNextEntry) {
      this.props.focusOnFirstEntryNewerThan(this.props.entryInfo.creationTime);
    }
    if (serverID) {
      await fetchJSON('delete_entry.php', {
        'id': serverID,
        'prev_text': this.props.entryInfo.text,
        'session_id': this.props.sessionID,
        'timestamp': Date.now(),
      });
    } else if (this.creating) {
      this.needsUpdateAfterCreation = true;
    }
  }

  onHistory(event: SyntheticEvent) {
    event.preventDefault();
    this.props.setModal(
      <HistoryModal
        mode="entry"
        year={this.props.entryInfo.year}
        month={this.props.entryInfo.month}
        day={this.props.entryInfo.day}
        onClose={this.props.clearModal}
        currentEntryID={this.props.entryInfo.id}
      />
    );
  }

}

Entry.propTypes = {
  entryInfo: entryInfoPropType.isRequired,
  calendarInfo: calendarInfoPropType.isRequired,
  sessionID: React.PropTypes.string.isRequired,
  loggedIn: React.PropTypes.bool.isRequired,
  focusOnFirstEntryNewerThan: React.PropTypes.func.isRequired,
  setModal: React.PropTypes.func.isRequired,
  clearModal: React.PropTypes.func.isRequired,
  tabIndex: React.PropTypes.number.isRequired,
  updateStore: React.PropTypes.func.isRequired,
}

type OwnProps = {
  entryInfo: EntryInfo,
};
export default connect(
  (state: AppState, ownProps: OwnProps) => ({
    calendarInfo: state.calendarInfos[ownProps.entryInfo.calendarID],
    sessionID: state.sessionID,
    loggedIn: !!state.userInfo,
  }),
  mapStateToUpdateStore,
  undefined,
  { 'withRef': true },
)(Entry);
