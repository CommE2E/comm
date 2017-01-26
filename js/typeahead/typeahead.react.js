// @flow

import type { CalendarInfo } from '../calendar-info';
import { calendarInfoPropType } from '../calendar-info';
import type { NavID } from './typeahead-action-option.react';
import type { AppState, UpdateStore } from '../redux-reducer';

import React from 'react';
import ReactDOM from 'react-dom';
import classNames from 'classnames';
import invariant from 'invariant';
import update from 'immutability-helper';
import _ from 'lodash';
import { connect } from 'react-redux';

import TypeaheadActionOption from './typeahead-action-option.react';
import TypeaheadCalendarOption from './typeahead-calendar-option.react';
import TypeaheadOptionButtons from './typeahead-option-buttons.react';
import TypeaheadPane from './typeahead-pane.react';
import { SearchIndex, searchIndex } from './search-index';
import { currentNavID, subscriptionExists } from '../nav-utils';
import { typeaheadSortedCalendarInfos } from '../calendar-utils';
import { htmlTargetFromEvent } from '../vector-utils';
import { UpCaret, DownCaret, MagnifyingGlass } from '../vectors.react';

type Props = {
  currentNavID: ?string,
  calendarInfos: {[id: string]: CalendarInfo},
  currentlyHome: bool,
  currentCalendarID: ?string,
  subscriptionExists: bool,
  searchIndex: SearchIndex,
  sortedCalendarInfos: {[id: string]: CalendarInfo[]},
  setModal: (modal: React.Element<any>) => void,
  clearModal: () => void,
  modalExists: bool,
};
type State = {
  typeaheadFocused: bool,
  searchActive: bool,
  frozenNavIDs: {[id: string]: bool},
  typeaheadValue: string,
  searchResults: string[],
  recommendedCalendars: CalendarInfo[],
};
type TypeaheadCalendarOptionConnect = {
  getWrappedInstance: () => TypeaheadCalendarOption,
};

class Typeahead extends React.Component {

  static recommendationSize;
  static homeNullStateRecommendationSize;

  props: Props;
  state: State;

  input: ?HTMLInputElement;
  dropdown: ?HTMLElement;
  current: ?HTMLElement;
  magnifyingGlass: ?HTMLElement;

  constructor(props: Props) {
    super(props);
    this.state = {
      typeaheadFocused: false,
      searchActive: false,
      frozenNavIDs: {},
      typeaheadValue: Typeahead.getCurrentNavName(props),
      searchResults: [],
      recommendedCalendars: Typeahead.sampleRecommendations(props),
    };
  }

  static getCurrentNavName(props: Props) {
    if (props.currentlyHome) {
      return TypeaheadActionOption.homeText;
    } else if (props.currentNavID) {
      return props.calendarInfos[props.currentNavID].name;
    } else {
      return "";
    }
  }

  componentWillReceiveProps(nextProps: Props) {
    const updateObj = {};

    const newName = Typeahead.getCurrentNavName(nextProps);
    const oldName = Typeahead.getCurrentNavName(this.props);
    if (newName !== oldName) {
      updateObj.typeaheadValue = newName;
      updateObj.searchActive = false;
    }

    // If props change caused Typeahead.isActive to become false, then update
    // state (state change handled in componentDidUpdate)
    const newActive = Typeahead.isActive(nextProps, this.state);
    const oldActive = Typeahead.isActive(this.props, this.state);
    if (!newActive && oldActive) {
      updateObj.typeaheadValue = newName;
      updateObj.searchActive = false;
      updateObj.recommendedCalendars =
        Typeahead.sampleRecommendations(nextProps);
    }

    if (
      nextProps.sortedCalendarInfos.recommended !==
        this.props.sortedCalendarInfos.recommended ||
      Typeahead.getRecommendationSize(nextProps) >
        Typeahead.getRecommendationSize(this.props)
    ) {
      const stillValidRecommendations = _.filter(
        this.state.recommendedCalendars,
        (calendarInfo: CalendarInfo) => _.some(
          nextProps.sortedCalendarInfos.recommended,
          { id: calendarInfo.id },
        ),
      );
      const recommendationSize = Typeahead.getRecommendationSize(nextProps);
      const newRecommendationsNeeded = recommendationSize
        - stillValidRecommendations.length;
      if (newRecommendationsNeeded > 0) {
        const randomCalendarInfos =
          _.chain(nextProps.sortedCalendarInfos.recommended)
            .filter((calendarInfo: CalendarInfo) => !_.some(
              stillValidRecommendations,
              { id: calendarInfo.id },
            )).sampleSize(newRecommendationsNeeded)
            .value();
        updateObj.recommendedCalendars = update(
          stillValidRecommendations,
          { $push: randomCalendarInfos },
        );
      } else if (newRecommendationsNeeded < 0) {
        updateObj.recommendedCalendars =
          stillValidRecommendations.slice(0, recommendationSize);
      } else if (
        stillValidRecommendations.length <
          this.state.recommendedCalendars.length
      ) {
        updateObj.recommendedCalendars = stillValidRecommendations;
      }
    }

    if (updateObj) {
      this.setState(updateObj);
    }
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    const newName = Typeahead.getCurrentNavName(this.props);
    const oldName = Typeahead.getCurrentNavName(prevProps);
    // Mirroring functionality in TypeaheadCalendarOption.componentDidUpdate
    const passwordEntryWillBeFocused =
      !this.props.currentNavID && this.props.currentCalendarID &&
      (prevProps.currentNavID || !prevProps.currentCalendarID);
    if (
      newName !== oldName &&
      Typeahead.isActive(this.props, this.state) &&
      !passwordEntryWillBeFocused
    ) {
      const input = this.input;
      invariant(input, "ref should be set");
      input.focus();
      input.select();
    }

    // If state change caused Typeahead.isActive to become false, then update
    // state (props change handled in componentWillReceiveProps)
    const newActive = Typeahead.isActive(this.props, this.state);
    const oldStateActive = Typeahead.isActive(this.props, prevState);
    if (!newActive && oldStateActive) {
      this.setState({
        typeaheadValue: newName,
        searchActive: false,
        recommendedCalendars: Typeahead.sampleRecommendations(this.props),
      });
    }

    const input = this.input;
    invariant(input, "ref should be set");
    const oldActive = Typeahead.isActive(prevProps, prevState);
    if (newActive && !oldActive && !passwordEntryWillBeFocused) {
      input.focus();
      input.select();
    } else if (!newActive && oldActive) {
      input.blur();
    }
  }

  render() {
    const active = Typeahead.isActive(this.props, this.state);
    let dropdown = null;
    if (this.state.searchActive) {
      let resultsPane;
      if (this.state.searchResults.length !== 0) {
        resultsPane = (
          <TypeaheadPane
            paneTitle="Results"
            pageSize={10}
            totalResults={this.state.searchResults.length}
            resultsBetween={this.searchResultOptionsForPage.bind(this)}
            key="results"
          />
        );
      } else {
        const noResults = (
          <div className="calendar-nav-no-results" key="none">
            No results
          </div>
        );
        resultsPane = (
          <TypeaheadPane
            paneTitle="Results"
            pageSize={1}
            totalResults={1}
            resultsBetween={() => [ noResults ]}
            key="results"
          />
        );
      }
      dropdown = (
        <div
          className="calendar-nav-dropdown"
          ref={(dropdown) => this.dropdown = dropdown}
        >{resultsPane}</div>
      );
    } else if (active) {
      const panes = [];
      let currentOptions = [];
      if (this.props.sortedCalendarInfos.current.length > 0) {
        currentOptions = this.props.sortedCalendarInfos.current.map(
          (calendarInfo) => this.buildCalendarOption(calendarInfo),
        );
      } else if (
        this.props.currentCalendarID &&
        !this.props.calendarInfos[this.props.currentCalendarID]
      ) {
        currentOptions = [
          this.buildSecretOption(this.props.currentCalendarID)
        ];
      }
      panes.push(
        <TypeaheadPane
          paneTitle="Current"
          pageSize={1}
          totalResults={currentOptions.length}
          resultsBetween={() => currentOptions}
          key="current"
        />
      );
      if (!this.props.currentlyHome) {
        const homeOption =
          this.buildActionOption("home", TypeaheadActionOption.homeText);
        panes.push(
          <TypeaheadPane
            paneTitle="Home"
            pageSize={1}
            totalResults={1}
            resultsBetween={() => [ homeOption ]}
            key="home"
          />
        );
      }
      panes.push(
        <TypeaheadPane
          paneTitle="Subscribed"
          pageSize={5}
          totalResults={this.props.sortedCalendarInfos.subscribed.length}
          resultsBetween={this.subscribedCalendarOptionsForPage.bind(this)}
          key="subscribed"
        />
      );
      const recommendedOptions = this.state.recommendedCalendars
        .map((calendarInfo) => this.buildCalendarOption(calendarInfo));
      panes.push(
        <TypeaheadPane
          paneTitle="Recommended"
          pageSize={recommendedOptions.length}
          totalResults={recommendedOptions.length}
          resultsBetween={() => recommendedOptions}
          key="recommended"
        />
      );
      const newOption =
        this.buildActionOption("new", TypeaheadActionOption.newText);
      panes.push(
        <TypeaheadPane
          paneTitle="Actions"
          pageSize={1}
          totalResults={1}
          resultsBetween={() => [ newOption ]}
          key="actions"
        />
      );
      dropdown = (
        <div
          className="calendar-nav-dropdown"
          ref={(dropdown) => this.dropdown = dropdown}
        >
          {panes}
        </div>
      );
    }

    let rightAligned = null;
    if (active) {
      const currentCalendarInfo = this.props.currentNavID &&
        this.props.calendarInfos[this.props.currentNavID];
      if (currentCalendarInfo) {
        rightAligned = (
          <TypeaheadOptionButtons
            calendarInfo={currentCalendarInfo}
            setModal={this.props.setModal}
            clearModal={this.props.clearModal}
            freezeTypeahead={this.freeze.bind(this)}
            unfreezeTypeahead={this.unfreeze.bind(this)}
            focusTypeahead={this.focusIfNotFocused.bind(this)}
          />
        );
      }
    } else {
      rightAligned = (  
        <span className="calendar-nav-symbols">
          <UpCaret className="calendar-nav-first-symbol" />
          <DownCaret className="calendar-nav-second-symbol" />
        </span>
      );
    }

    return (
      <div
        onMouseDown={this.onMouseDown.bind(this)}
        className={classNames({
          'calendar-nav': true,
          'calendar-nav-active': active,
          'calendar-nav-null-state': !this.props.currentNavID &&
            !this.props.modalExists,
        })}
      >
        <div
          className="calendar-nav-current"
          ref={(current) => this.current = current}
        >
          <span
            ref={(magnifyingGlass) => this.magnifyingGlass = magnifyingGlass}
          >
            <MagnifyingGlass className="search-vector" />
          </span>
          {rightAligned}
          <div className="typeahead-container">
            <input
              type="text"
              className="typeahead"
              ref={(input) => this.input = input}
              onFocus={this.onFocus.bind(this)}
              onBlur={this.onBlur.bind(this)}
              onKeyDown={this.onKeyDown.bind(this)}
              value={this.state.typeaheadValue}
              onChange={this.onChange.bind(this)}
            />
          </div>
        </div>
        {dropdown}
      </div>
    );
  }

  // This gets triggered when the typeahead input field loses focus. It's
  // worth noting that onMouseDown() uses event.preventDefault() to keep the
  // focus on the typeahead input field when you click in some neutral spaces.
  onBlur() {
    // There are nav options that have their own input fields. If those are
    // clicked, the nav ID will be frozen, and focus will be lost by the
    // typeahead input field, but the typeahead will not close, and we want to
    // avoid resetting search results.
    if (_.isEmpty(this.state.frozenNavIDs)) {
      this.setState({
        typeaheadFocused: false,
        searchActive: false,
        typeaheadValue: Typeahead.getCurrentNavName(this.props),
      });
    } else {
      this.setState({ typeaheadFocused: false });
    }
  }

  onFocus() {
    this.setState({ typeaheadFocused: true });
  }

  buildOption(navID: string) {
    const calendarInfo = this.props.calendarInfos[navID];
    if (calendarInfo !== undefined) {
      return this.buildCalendarOption(calendarInfo);
    } else if (navID === "home") {
      return this.buildActionOption("home", TypeaheadActionOption.homeText);
    } else if (navID === "new") {
      return this.buildActionOption("new", TypeaheadActionOption.newText);
    } else if (navID === this.props.currentCalendarID) {
      return this.buildSecretOption(navID);
    } else {
      invariant(false, "invalid navID passed to buildOption");
    }
  }

  buildActionOption(navID: NavID, name: string) {
    const onTransition = () => {
      invariant(this.input, "ref should be set");
      this.input.blur();
    }
    return (
      <TypeaheadActionOption
        navID={navID}
        name={name}
        freezeTypeahead={this.freeze.bind(this)}
        unfreezeTypeahead={this.unfreeze.bind(this)}
        onTransition={onTransition}
        setModal={this.props.setModal}
        clearModal={this.props.clearModal}
        frozen={!!this.state.frozenNavIDs[navID]}
        key={navID}
      />
    );
  }

  buildCalendarOption(calendarInfo: CalendarInfo) {
    const onTransition = () => {
      invariant(this.input, "ref should be set");
      this.input.blur();
    }
    return (
      <TypeaheadCalendarOption
        calendarInfo={calendarInfo}
        freezeTypeahead={this.freeze.bind(this)}
        unfreezeTypeahead={this.unfreeze.bind(this)}
        focusTypeahead={this.focusIfNotFocused.bind(this)}
        onTransition={onTransition}
        frozen={!!this.state.frozenNavIDs[calendarInfo.id]}
        setModal={this.props.setModal}
        clearModal={this.props.clearModal}
        typeaheadFocused={this.state.typeaheadFocused}
        key={calendarInfo.id}
      />
    );
  }

  buildSecretOption(secretCalendarID: string) {
    const onTransition = () => {
      invariant(this.input, "ref should be set");
      this.input.blur();
    }
    return (
      <TypeaheadCalendarOption
        secretCalendarID={secretCalendarID}
        freezeTypeahead={this.freeze.bind(this)}
        unfreezeTypeahead={this.unfreeze.bind(this)}
        onTransition={onTransition}
        frozen={!!this.state.frozenNavIDs[secretCalendarID]}
        setModal={this.props.setModal}
        clearModal={this.props.clearModal}
        key={secretCalendarID}
      />
    );
  }

  static isActive(props: Props, state: State) {
    return state.typeaheadFocused ||
      !props.currentNavID ||
      !_.isEmpty(state.frozenNavIDs);
  }

  // This method makes sure that this.state.typeaheadFocused iff typeahead input
  // field is focused
  onMouseDown(event: SyntheticEvent) {
    if (!Typeahead.isActive(this.props, this.state)) {
      this.setState({ typeaheadFocused: true });
      // This prevents a possible focus event on input.typeahead from overriding
      // the select() that gets called in componentDidUpdate
      event.preventDefault();
      return;
    }
    const target = htmlTargetFromEvent(event);
    const dropdown = this.dropdown;
    const current = this.current;
    const magnifyingGlass = this.magnifyingGlass;
    invariant(dropdown, "ref should be set");
    invariant(current, "ref should be set");
    invariant(magnifyingGlass, "ref should be set");
    if (target === this.input) {
      // In some browsers, HTML elements keep state about what was selected when
      // they lost focus. If previously something was selected and we focus on
      // it, that is selected again (until an onMouseUp event clears it). This
      // is a bit confusing in my opinion, so we clear any selection here so
      // that the focus behaves consistently.
      invariant(this.input, "ref should be set");
      this.input.selectionStart = this.input.selectionEnd;
      return;
    }
    if (
      dropdown.contains(target) ||
      (current.contains(target) && !magnifyingGlass.contains(target)) &&
      this.state.typeaheadFocused
    ) {
      // This prevents onBlur from firing on input#typeahead
      event.preventDefault(); 
    }
  }

  freeze(navID: string) {
    this.setState((prevState, props) => {
      const updateObj = {};
      updateObj[navID] = { $set: true };
      return update(prevState, { frozenNavIDs: updateObj });
    });
  }

  unfreeze(navID: string) {
    this.setState(
      (prevState, props) => {
        const newFrozenNavIDs = _.omit(prevState.frozenNavIDs, [ navID ]);
        return update(prevState, { frozenNavIDs: { $set: newFrozenNavIDs } });
      },
    );
  }

  onKeyDown(event: SyntheticEvent) {
    if (event.keyCode == 27 /* esc key */ && this.state.typeaheadFocused) {
      invariant(this.input, "ref should be set");
      this.input.blur();
    }
  }

  onChange(event: SyntheticEvent) {
    const target = event.target;
    invariant(target instanceof HTMLInputElement, "target not input");
    this.setState({
      typeaheadValue: target.value,
      searchResults: this.props.searchIndex.getSearchResults(target.value),
      searchActive: target.value.trim() !== "",
    });
  }

  focusIfNotFocused() {
    if (this.state.typeaheadFocused) {
      return;
    }
    const input = this.input;
    invariant(input, "ref should be set");
    input.focus();
    input.select();
  }

  searchResultOptionsForPage(start: number, end: number) {
    return this.state.searchResults.slice(start, end)
      .map((navID) => this.buildOption(navID));
  }

  subscribedCalendarOptionsForPage(start: number, end: number) {
    return this.props.sortedCalendarInfos.subscribed.slice(start, end)
      .map((calendarInfo) => this.buildCalendarOption(calendarInfo));
  }

  static getRecommendationSize(props: Props) {
    if (props.currentlyHome && props.currentNavID === null) {
      return Typeahead.homeNullStateRecommendationSize;
    } else {
      return Typeahead.recommendationSize;
    }
  }

  static sampleRecommendations(props: Props) {
    return _.sampleSize(
      props.sortedCalendarInfos.recommended,
      Typeahead.getRecommendationSize(props),
    );
  }

}

Typeahead.recommendationSize = 3;
Typeahead.homeNullStateRecommendationSize = 6;

Typeahead.propTypes = {
  currentNavID: React.PropTypes.string,
  calendarInfos: React.PropTypes.objectOf(calendarInfoPropType).isRequired,
  currentlyHome: React.PropTypes.bool.isRequired,
  currentCalendarID: React.PropTypes.string,
  subscriptionExists: React.PropTypes.bool.isRequired,
  searchIndex: React.PropTypes.instanceOf(SearchIndex),
  sortedCalendarInfos: React.PropTypes.objectOf(
    React.PropTypes.arrayOf(calendarInfoPropType),
  ).isRequired,
  setModal: React.PropTypes.func.isRequired,
  clearModal: React.PropTypes.func.isRequired,
  modalExists: React.PropTypes.bool.isRequired,
};

export default connect((state: AppState) => ({
  currentNavID: currentNavID(state),
  calendarInfos: state.calendarInfos,
  currentlyHome: state.navInfo.home,
  currentCalendarID: state.navInfo.calendarID,
  subscriptionExists: subscriptionExists(state),
  searchIndex: searchIndex(state),
  sortedCalendarInfos: typeaheadSortedCalendarInfos(state),
}))(Typeahead);
