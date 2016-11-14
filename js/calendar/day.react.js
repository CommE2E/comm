// @flow

import type { EntryInfo } from './entry-info';
import { entryInfoPropType } from './entry-info';
import type { SquadInfo } from '../squad-info';
import { squadInfoPropType } from '../squad-info';
import type { AppState, UpdateStore } from '../redux-reducer';

import React from 'react';
import classNames from 'classnames';
import _ from 'lodash';
import update from 'immutability-helper';
import invariant from 'invariant';
import { connect } from 'react-redux';

import Entry from './entry.react';
import Modernizr from '../modernizr-custom';
import { entryID } from './entry-utils';
import HistoryModal from '../modals/history/history-modal.react';
import { mapStateToUpdateStore } from '../redux-utils';
import { onScreenSquadInfos } from '../squad-utils';

type Props = {
  year: number,
  month: number, // 1-indexed
  day: number, // 1-indexed
  entryInfos: EntryInfo[],
  onScreenSquadInfos: SquadInfo[],
  setModal: (modal: React.Element<any>) => void,
  clearModal: () => void,
  startingTabIndex: number,
  updateStore: UpdateStore,
};
type State = {
  pickerOpen: bool,
  hovered: bool,
};
type EntryConnect = {
  getWrappedInstance: () => Entry,
};

class Day extends React.Component {

  props: Props;
  state: State;
  entryContainer: ?HTMLDivElement;
  entryContainerSpacer: ?HTMLDivElement;
  actionLinks: ?HTMLDivElement;
  squadPicker: ?HTMLDivElement;
  entries: Map<string, EntryConnect>;
  curLocalID: number;

  constructor(props: Props) {
    super(props);
    this.state = {
      pickerOpen: false,
      hovered: false,
    };
    this.curLocalID = 1;
    this.entries = new Map();
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    if (this.props.entryInfos.length > prevProps.entryInfos.length) {
      invariant(this.entryContainer, "entryContainer ref not set");
      this.entryContainer.scrollTop = this.entryContainer.scrollHeight;
    }
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

    const entries = this.props.entryInfos.map((entryInfo, i) => {
      const id = entryID(entryInfo);
      return <Entry
        entryInfo={entryInfo}
        focusOnFirstEntryNewerThan={this.focusOnFirstEntryNewerThan.bind(this)}
        setModal={this.props.setModal}
        clearModal={this.props.clearModal}
        tabIndex={this.props.startingTabIndex + i}
        key={id}
        ref={(entry) => this.entries.set(id, entry)}
      />;
    });

    let squadPicker = null;
    if (this.state.pickerOpen) {
      const options = this.props.onScreenSquadInfos.map((squadInfo) => {
        const style = { backgroundColor: "#" + squadInfo.color };
        return (
          <div
            key={squadInfo.id}
            onClick={() => this.createNewEntry(squadInfo.id)}
          >
            <span className="select-squad">
              <div className="color-preview" style={style} />
              <span className="select-squad-name">{squadInfo.name}</span>
            </span>
          </div>
        );
      });
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
    event.preventDefault();
    if (this.props.onScreenSquadInfos.length === 1) {
      this.createNewEntry(this.props.onScreenSquadInfos[0].id);
    } else if (this.props.onScreenSquadInfos.length > 1) {
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
    this.props.updateStore((prevState: AppState) => {
      const dayString = this.props.day.toString();
      const dayEntryInfos = prevState.entryInfos[dayString];
      const newEntryInfo: EntryInfo = {
        localID: localID,
        squadID: squadID,
        text: "",
        year: this.props.year,
        month: this.props.month,
        day: this.props.day,
        creationTime: Date.now(),
      };
      const saveObj = {};
      saveObj[dayString] = {};
      saveObj[dayString][localID.toString()] = { $set: newEntryInfo };
      return update(prevState, { entryInfos: saveObj });
    });
  }

  onSquadPickerBlur(event: SyntheticEvent) {
    this.setState({ pickerOpen: false });
  }

  onHistory(event: SyntheticEvent) {
    event.preventDefault();
    this.props.setModal(
      <HistoryModal
        mode="day"
        year={this.props.year}
        month={this.props.month}
        day={this.props.day}
        onClose={this.props.clearModal}
      />
    );
  }

  focusOnFirstEntryNewerThan(time: number) {
    const entryInfo = this.props.entryInfos.find(
      (entryInfo) => entryInfo.creationTime > time,
    );
    if (entryInfo) {
      const entry = this.entries.get(entryID(entryInfo));
      invariant(entry, "entry for entryinfo should be defined");
      entry.getWrappedInstance().setFocus();
    }
  }

}

Day.propTypes = {
  year: React.PropTypes.number.isRequired,
  month: React.PropTypes.number.isRequired,
  day: React.PropTypes.number.isRequired,
  entryInfos: React.PropTypes.arrayOf(entryInfoPropType).isRequired,
  onScreenSquadInfos: React.PropTypes.arrayOf(squadInfoPropType).isRequired,
  setModal: React.PropTypes.func.isRequired,
  clearModal: React.PropTypes.func.isRequired,
  startingTabIndex: React.PropTypes.number.isRequired,
  updateStore: React.PropTypes.func.isRequired,
};

export default connect(
  (state: AppState) => ({
    onScreenSquadInfos: onScreenSquadInfos(state),
  }),
  mapStateToUpdateStore,
)(Day);
