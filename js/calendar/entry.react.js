// @flow

import type { EntryInfo } from './entry-info';
import { entryInfoPropType } from './entry-info';
import type { SquadInfo } from '../squad-info';
import { squadInfoPropType } from '../squad-info';
import type { LoadingStatus } from '../loading-indicator.react';
import type { AppState, UpdateStore } from '../redux-reducer';

import React from 'react';
import classNames from 'classnames';
import invariant from 'invariant';
import update from 'immutability-helper';
import { connect } from 'react-redux';
import _ from 'lodash';

import LoadingIndicator from '../loading-indicator.react';
import { colorIsDark } from '../squad-utils';
import fetchJSON from '../fetch-json';
import Modernizr from '../modernizr-custom';
import ConcurrentModificationModal from
  '../modals/concurrent-modification-modal.react';
import HistoryModal from '../modals/history/history-modal.react';
import { mapStateToUpdateStore } from '../redux-utils';

type Props = {
  entryInfo: EntryInfo,
  squadInfo: SquadInfo,
  sessionID: string,
  focusOnFirstEntryNewerThan: (time: number) => void,
  setModal: (modal: React.Element<any>) => void,
  clearModal: () => void,
  tabIndex: number,
  updateStore: UpdateStore,
};
type State = {
  focused: bool,
  hovered: bool,
  showSquadSelector: bool,
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
      hovered: false,
      showSquadSelector: false,
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
    if (this.state.text !== nextProps.entryInfo.text) {
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

  setFocus() {
    this.setState(
      { hovered: true },
      this.focus.bind(this),
    );
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
    if (this.state.focused || this.state.hovered || Modernizr.touchevents) {
      let historyButton = null;
      if (this.props.entryInfo.id) {
        historyButton = (
          <a
            href="#"
            className="entry-history-button"
            onClick={this.onHistory.bind(this)}
          >
            <span className="history">≡</span>
            <span className="action-links-text">History</span>
          </a>
        );
      }
      actionLinks = (
        <div className="action-links">
          <a
            href="#"
            className="delete-entry-button"
            onClick={this.onDelete.bind(this)}
          >
            <span className="delete">✖</span>
            <span className="action-links-text">Delete</span>
          </a>
          {historyButton}
          <span className="right-action-links action-links-text">
            {this.props.squadInfo.name}
          </span>
          <div className="clear"></div>
        </div>
      );
    }

    const entryClasses = classNames({
      "entry": true,
      "dark-entry": colorIsDark(this.props.squadInfo.color),
      "focused-entry": this.state.focused || this.state.hovered,
    });
    const style = { backgroundColor: "#" + this.props.squadInfo.color };
    return (
      <div
        className={entryClasses}
        style={style}
        onMouseEnter={() => this.setState({ hovered: true })}
        onMouseLeave={() => this.setState({ hovered: false })}
      >
        <textarea
          rows="1"
          className="entry-text"
          onChange={this.onChange.bind(this)}
          value={this.state.text}
          onFocus={() => this.setState({ focused: true })}
          onBlur={this.onBlur.bind(this)}
          tabIndex={this.props.tabIndex}
          ref={(textarea) => this.textarea = textarea}
        />
        <LoadingIndicator
          status={this.state.loadingStatus}
          className="entry-loading"
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
    const target = event.target;
    invariant(target instanceof HTMLTextAreaElement, "target not textarea");
    this.setState(
      { "text": target.value },
      this.updateHeight.bind(this),
    );
    await this.save(this.props.entryInfo.id, target.value);
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
      payload['squad'] = this.props.entryInfo.squadID;
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
      this.creating = false;
      this.needsUpdateAfterCreation = false;
      if (needsUpdate && this.mounted) {
        invariant(
          this.textarea instanceof HTMLTextAreaElement,
          "textarea ref not set",
        );
        await this.save(newServerID, this.textarea.value);
      }
      // This is to update the server ID in the Redux store
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
    await this.delete(this.props.entryInfo.id, true);
  }

  async delete(serverID: ?string, focusOnNextEntry: bool) {
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
  squadInfo: squadInfoPropType.isRequired,
  sessionID: React.PropTypes.string.isRequired,
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
    squadInfo: state.squadInfos[ownProps.entryInfo.squadID],
    sessionID: state.sessionID,
  }),
  mapStateToUpdateStore,
  undefined,
  { 'withRef': true },
)(Entry);
