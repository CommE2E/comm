// @flow

import type { EntryInfo } from './entry-info';
import { entryInfoPropType } from './entry-info';
import type { SquadInfo } from '../squad-info';
import { squadInfoPropType } from '../squad-info';

import React from 'react';
import classNames from 'classnames';
import _ from 'lodash';
import update from 'immutability-helper';
import invariant from 'invariant';

import Entry from './entry.react';
import Modernizr from '../modernizr-custom';
import { entryID } from './entry-utils';
import HistoryModal from '../modals/history/history-modal.react';

type Props = {
  thisURL: string,
  baseURL: string,
  navID: string,
  sessionID: string,
  year: number,
  month: number, // 1-indexed
  day: number, // 1-indexed
  entryInfos: EntryInfo[],
  squadInfos: {[id: string]: SquadInfo},
  setModal: (modal: React.Element<any>) => void,
  clearModal: () => void,
  recomputeTabIndices: () => void,
};
type State = {
  entryInfos: EntryInfo[],
  pickerOpen: bool,
  hovered: bool,
};

class Day extends React.Component {

  props: Props;
  state: State;
  entryContainer: ?HTMLDivElement;
  entryContainerSpacer: ?HTMLDivElement;
  actionLinks: ?HTMLDivElement;
  squadPicker: ?HTMLDivElement;
  entries: Map<string, Entry>;
  curLocalID: number;

  constructor(props: Props) {
    super(props);
    this.state = {
      entryInfos: props.entryInfos,
      pickerOpen: false,
      hovered: false,
    };
    this.curLocalID = 1;
    this.entries = new Map();
  }

  render() {
    const today = new Date();
    const isToday = today.getDate() === this.props.day &&
      today.getMonth() === this.props.month - 1 &&
      today.getFullYear() === this.props.year;
    const tdClasses = classNames("day", { "current-day": isToday });

    let actionLinks = null;
    if (this.state.hovered || Modernizr.touchevents) {
      actionLinks = (
        <div
          className="action-links day-action-links"
          ref={(elem) => this.actionLinks = elem}
        >
          <a
            href="#"
            className="add-entry-button"
            onClick={this.onAddEntry.bind(this)}
          >
            <span className="add">+</span>
            <span className="action-links-text">Add</span>
          </a>
          <a
            href="#"
            className="day-history-button"
            onClick={this.onHistory.bind(this)}
          >
            <span className="history">≡</span>
            <span className="action-links-text">History</span>
          </a>
        </div>
      );
    }

    const entries = this.state.entryInfos.map((entryInfo) => {
      const id = entryID(entryInfo);
      return <Entry
        entryInfo={entryInfo}
        squadInfo={this.props.squadInfos[entryInfo.squadID]}
        thisURL={this.props.thisURL}
        baseURL={this.props.baseURL}
        sessionID={this.props.sessionID}
        removeEntriesWhere={this.removeEntriesWhere.bind(this)}
        focusOnFirstEntryNewerThan={this.focusOnFirstEntryNewerThan.bind(this)}
        setServerID={this.setServerID.bind(this)}
        restoreEntryInfo={this.restoreEntryInfo.bind(this)}
        setModal={this.props.setModal}
        clearModal={this.props.clearModal}
        key={id}
        ref={(entry) => this.entries.set(id, entry)}
      />;
    });

    let squadPicker = null;
    if (this.state.pickerOpen) {
      const options = _.chain(this.props.squadInfos).filter(
        squadInfo => squadInfo.onscreen
      ).map((squadInfo) => {
        const style = { backgroundColor: "#" + squadInfo.color };
        return (
          <div
            key={squadInfo.id}
            onClick={() => this.createNewEntry(squadInfo.id)}
          >
            <span
              href="#"
              className="select-squad"
              id={"select_" + squadInfo.id}
            >
              <div className="color-preview" style={style} />
              <span className="select-squad-name">{squadInfo.name}</span>
            </span>
          </div>
        );
      }).value();
      squadPicker =
        <div
          className="pick-squad"
          tabIndex="0"
          onBlur={this.onSquadPickerBlur.bind(this)}
          ref={(elem) => this.squadPicker = elem}
        >{options}</div>;
    }

    const entryContainerClasses = classNames(
      "entry-container",
      { "focused-entry-container": this.state.hovered },
    );
    return (
      <td
        className={tdClasses}
        id={this.props.day}
        onClick={this.onClick.bind(this)}
        onMouseEnter={() => this.setState({ hovered: true })}
        onMouseLeave={() => this.setState({ hovered: false })}
      >
        <h2>{this.props.day}</h2>
        <div
          className={entryContainerClasses}
          ref={(elem) => this.entryContainer = elem}
        >
          {entries}
          <div
            className="entry-container-spacer"
            ref={(elem) => this.entryContainerSpacer = elem}
          />
        </div>
        {actionLinks}
        {squadPicker}
      </td>
    );
  }

  onClick(event: SyntheticEvent) {
    invariant(event.target instanceof HTMLElement, "target isn't element");
    invariant(
      this.entryContainer instanceof HTMLDivElement,
      "entryContainer isn't div",
    );
    invariant(
      this.entryContainerSpacer instanceof HTMLDivElement,
      "entryContainerSpacer isn't div",
    );
    if (
      event.target === this.entryContainer ||
      event.target === this.entryContainerSpacer ||
      (this.actionLinks && event.target === this.actionLinks)
    ) {
      this.onAddEntry(event);
    }
  }

  onAddEntry(event: SyntheticEvent) {
    const onscreen = _.filter(
      this.props.squadInfos, 
      (squadInfo) => squadInfo.onscreen,
    );
    if (onscreen.length === 1) {
      this.createNewEntry(onscreen[0].id);
    } else if (onscreen.length > 1) {
      this.setState(
        { pickerOpen: true },
        () => {
          invariant(
            this.squadPicker instanceof HTMLDivElement,
            "squad picker isn't div",
          );
          this.squadPicker.focus();
        },
      );
    }
    // TODO: handle case where no onscreen squads
  }

  createNewEntry(squadID: string) {
    const localID = this.curLocalID++;
    this.setState(
      (prevState, props) => {
        const newEntryInfo: EntryInfo = {
          localID: localID,
          squadID: squadID,
          text: "",
          year: props.year,
          month: props.month,
          day: props.day,
          creationTime: Date.now(),
        };
        return update(prevState, {
          entryInfos: { $push: [ newEntryInfo ] },
        });
      },
      () => {
        invariant(
          this.entryContainer instanceof HTMLDivElement,
          "entry container isn't div",
        );
        this.entryContainer.scrollTop = this.entryContainer.scrollHeight;
        this.props.recomputeTabIndices();
      },
    );
  }

  onSquadPickerBlur(event: SyntheticEvent) {
    this.setState({ pickerOpen: false });
  }

  onHistory(event: SyntheticEvent) {
    this.props.setModal(
      <HistoryModal
        mode="day"
        baseURL={this.props.baseURL}
        year={this.props.year}
        month={this.props.month}
        sessionID={this.props.sessionID}
        day={this.props.day}
        navID={this.props.navID}
        squadInfos={this.props.squadInfos}
        onClose={this.props.clearModal}
        restoreEntryInfo={this.restoreEntryInfo.bind(this)}
      />
    );
  }

  async restoreEntryInfo(entryInfo: EntryInfo) {
    this.setState(
      (prevState, props) => {
        const spliceIndex = _.sortedIndexBy(
          prevState.entryInfos,
          entryInfo,
          'creationTime',
        );
        return update(prevState, {
          entryInfos: { $splice: [[ spliceIndex, 0, entryInfo ]] },
        });
      },
      this.props.recomputeTabIndices,
    );
  }

  removeEntriesWhere(filterFunc: (entryInfo: EntryInfo) => bool) {
    this.setState(
      (prevState, props) => {
        const newEntryInfos = prevState.entryInfos.filter(
          (entryInfo) => !filterFunc(entryInfo),
        );
        return update(prevState, {
          entryInfos: { $set: newEntryInfos },
        });
      },
      this.props.recomputeTabIndices,
    );
  }

  focusOnFirstEntryNewerThan(time: number) {
    const entryInfo = this.state.entryInfos.find(
      (entryInfo) => entryInfo.creationTime > time,
    );
    if (entryInfo) {
      const entry = this.entries.get(entryID(entryInfo));
      invariant(entry, "entry for entryinfo should be defined");
      entry.setFocus();
    }
  }

  setServerID(localID: number, serverID: string, currentText: string) {
    this.setState(
      (prevState, props) => {
        const index = prevState.entryInfos.findIndex(
          (entryInfo) => entryInfo.localID === localID,
        );
        const saveObj = {};
        saveObj[index] = {
          id: { $set: serverID },
          text: { $set: currentText },
        };
        return update(prevState, { entryInfos: saveObj });
      },
      () => {
        const entry = this.entries.get(serverID);
        invariant(entry, "entry for entryinfo should be defined");
        entry.setFocus();
        this.props.recomputeTabIndices();
      },
    );
  }

}

Day.propTypes = {
  thisURL: React.PropTypes.string.isRequired,
  baseURL: React.PropTypes.string.isRequired,
  navID: React.PropTypes.string.isRequired,
  sessionID: React.PropTypes.string.isRequired,
  year: React.PropTypes.number.isRequired,
  month: React.PropTypes.number.isRequired,
  day: React.PropTypes.number.isRequired,
  entryInfos: React.PropTypes.arrayOf(entryInfoPropType).isRequired,
  squadInfos: React.PropTypes.objectOf(squadInfoPropType).isRequired,
  setModal: React.PropTypes.func.isRequired,
  clearModal: React.PropTypes.func.isRequired,
  recomputeTabIndices: React.PropTypes.func.isRequired,
};

export default Day;
