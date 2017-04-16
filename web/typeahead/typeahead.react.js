// @flow

import type { CalendarInfo } from 'lib/types/calendar-types';
import { calendarInfoPropType } from 'lib/types/calendar-types';
import type { NavID } from './typeahead-action-option.react';
import type { AppState } from '../redux-setup';

import PropTypes from 'prop-types';

import React from 'react';
import classNames from 'classnames';
import invariant from 'invariant';
import _flow from 'lodash/fp/flow';
import _filter from 'lodash/fp/filter';
import _some from 'lodash/fp/some';
import _isEmpty from 'lodash/fp/isEmpty';
import _omit from 'lodash/fp/omit';
import _sampleSize from 'lodash/fp/sampleSize';
import { connect } from 'react-redux';

import { SearchIndex, searchIndex } from 'lib/selectors/search-index';
import { currentNavID, subscriptionExists } from 'lib/selectors/nav-selectors';
import { typeaheadSortedCalendarInfos } from 'lib/selectors/calendar-selectors';
import * as TypeaheadText from 'lib/shared/typeahead-text';

import css from '../style.css';
import TypeaheadActionOption from './typeahead-action-option.react';
import TypeaheadCalendarOption from './typeahead-calendar-option.react';
import TypeaheadOptionButtons from './typeahead-option-buttons.react';
import TypeaheadPane from './typeahead-pane.react';
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

const emptyArray = [];
const noResults = [(
  <div className={css['calendar-nav-no-results']} key="none">
    No results
  </div>
)];
const noResultsFunc = () => noResults;

class Typeahead extends React.PureComponent {

  static recommendationSize = 3;
  static homeNullStateRecommendationSize = 6;

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
      return TypeaheadText.homeText;
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
      const stillValidRecommendations = _filter(
        (calendarInfo: CalendarInfo) => _some({ id: calendarInfo.id })
          (nextProps.sortedCalendarInfos.recommended),
      )(this.state.recommendedCalendars);
      const recommendationSize = Typeahead.getRecommendationSize(nextProps);
      const newRecommendationsNeeded = recommendationSize
        - stillValidRecommendations.length;
      if (newRecommendationsNeeded > 0) {
        const randomCalendarInfos = _flow(
          _filter((calendarInfo: CalendarInfo) =>
            !_some({ id: calendarInfo.id })(stillValidRecommendations),
          ),
          _sampleSize(newRecommendationsNeeded),
        )(nextProps.sortedCalendarInfos.recommended);
        updateObj.recommendedCalendars = [
          ...stillValidRecommendations,
          ...randomCalendarInfos,
        ];
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
            resultsBetween={this.searchResultOptionsForPage}
            key="results"
          />
        );
      } else {
        resultsPane = (
          <TypeaheadPane
            paneTitle="Results"
            pageSize={1}
            totalResults={1}
            resultsBetween={noResultsFunc}
            key="results"
          />
        );
      }
      dropdown = (
        <div className={css['calendar-nav-dropdown']} ref={this.dropdownRef}>
          {resultsPane}
        </div>
      );
    } else if (active) {
      const panes = [];
      const haveCurrentPane =
        this.props.sortedCalendarInfos.current.length > 0 ||
        (this.props.currentCalendarID &&
          !this.props.calendarInfos[this.props.currentCalendarID]);
      panes.push(
        <TypeaheadPane
          paneTitle="Current"
          pageSize={1}
          totalResults={haveCurrentPane ? 1 : 0}
          resultsBetween={this.resultsBetweenForCurrentPane}
          key="current"
        />
      );
      if (!this.props.currentlyHome) {
        panes.push(
          <TypeaheadPane
            paneTitle="Home"
            pageSize={1}
            totalResults={1}
            resultsBetween={this.resultsBetweenForHomePane}
            key="home"
          />
        );
      }
      panes.push(
        <TypeaheadPane
          paneTitle="Subscribed"
          pageSize={5}
          totalResults={this.props.sortedCalendarInfos.subscribed.length}
          resultsBetween={this.resultsBetweenForSubscribedPane}
          key="subscribed"
        />
      );
      panes.push(
        <TypeaheadPane
          paneTitle="Recommended"
          pageSize={this.state.recommendedCalendars.length}
          totalResults={this.state.recommendedCalendars.length}
          resultsBetween={this.resultsBetweenForRecommendedPane}
          key="recommended"
        />
      );
      panes.push(
        <TypeaheadPane
          paneTitle="Actions"
          pageSize={1}
          totalResults={1}
          resultsBetween={this.resultsBetweenForActionsPane}
          key="actions"
        />
      );
      dropdown = (
        <div className={css['calendar-nav-dropdown']} ref={this.dropdownRef}>
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
            freezeTypeahead={this.freeze}
            unfreezeTypeahead={this.unfreeze}
            focusTypeahead={this.focusIfNotFocused}
          />
        );
      }
    } else {
      rightAligned = (  
        <span className={css['calendar-nav-symbols']}>
          <UpCaret className={css['calendar-nav-first-symbol']} />
          <DownCaret className={css['calendar-nav-second-symbol']} />
        </span>
      );
    }

    return (
      <div
        onMouseDown={this.onMouseDown}
        className={classNames({
          [css['calendar-nav']]: true,
          [css['calendar-nav-active']]: active,
          [css['calendar-nav-null-state']]: !this.props.currentNavID &&
            !this.props.modalExists,
        })}
      >
        <div className={css['calendar-nav-current']} ref={this.currentRef}>
          <span ref={this.magnifyingGlassRef}>
            <MagnifyingGlass className={css['search-vector']} />
          </span>
          {rightAligned}
          <div className={css['typeahead-container']}>
            <input
              type="text"
              className={css['typeahead']}
              ref={this.inputRef}
              onFocus={this.onFocus}
              onBlur={this.onBlur}
              onKeyDown={this.onKeyDown}
              value={this.state.typeaheadValue}
              onChange={this.onChange}
            />
          </div>
        </div>
        {dropdown}
      </div>
    );
  }

  inputRef = (input: ?HTMLInputElement) => {
    this.input = input;
  }

  dropdownRef = (dropdown: ?HTMLElement) => {
    this.dropdown = dropdown;
  }

  currentRef = (current: ?HTMLElement) => {
    this.current = current;
  }

  magnifyingGlassRef = (magnifyingGlass: ?HTMLElement) => {
    this.magnifyingGlass = magnifyingGlass;
  }

  // This gets triggered when the typeahead input field loses focus. It's
  // worth noting that onMouseDown() uses event.preventDefault() to keep the
  // focus on the typeahead input field when you click in some neutral spaces.
  onBlur = () => {
    // There are nav options that have their own input fields. If those are
    // clicked, the nav ID will be frozen, and focus will be lost by the
    // typeahead input field, but the typeahead will not close, and we want to
    // avoid resetting search results.
    if (_isEmpty(this.state.frozenNavIDs)) {
      this.setState({
        typeaheadFocused: false,
        searchActive: false,
        typeaheadValue: Typeahead.getCurrentNavName(this.props),
      });
    } else {
      this.setState({ typeaheadFocused: false });
    }
  }

  onFocus = () => {
    this.setState({ typeaheadFocused: true });
  }

  buildOption(navID: string) {
    const calendarInfo = this.props.calendarInfos[navID];
    if (calendarInfo !== undefined) {
      return this.buildCalendarOption(calendarInfo);
    } else if (navID === "home") {
      return this.buildActionOption("home", TypeaheadText.homeText);
    } else if (navID === "new") {
      return this.buildActionOption("new", TypeaheadText.newText);
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
        freezeTypeahead={this.freeze}
        unfreezeTypeahead={this.unfreeze}
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
        freezeTypeahead={this.freeze}
        unfreezeTypeahead={this.unfreeze}
        focusTypeahead={this.focusIfNotFocused}
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
        freezeTypeahead={this.freeze}
        unfreezeTypeahead={this.unfreeze}
        focusTypeahead={this.focusIfNotFocused}
        onTransition={onTransition}
        frozen={!!this.state.frozenNavIDs[secretCalendarID]}
        setModal={this.props.setModal}
        clearModal={this.props.clearModal}
        typeaheadFocused={this.state.typeaheadFocused}
        key={secretCalendarID}
      />
    );
  }

  static isActive(props: Props, state: State) {
    return state.typeaheadFocused ||
      !props.currentNavID ||
      !_isEmpty(state.frozenNavIDs);
  }

  resultsBetweenForCurrentPane = () => {
    if (this.props.sortedCalendarInfos.current.length > 0) {
      return this.props.sortedCalendarInfos.current.map(
        (calendarInfo) => this.buildCalendarOption(calendarInfo),
      );
    } else if (
      this.props.currentCalendarID &&
      !this.props.calendarInfos[this.props.currentCalendarID]
    ) {
      return [
        this.buildSecretOption(this.props.currentCalendarID)
      ];
    }
    return emptyArray;
  }

  resultsBetweenForHomePane = () => {
    return [ this.buildActionOption("home", TypeaheadText.homeText) ];
  }

  resultsBetweenForRecommendedPane = () => {
    return this.state.recommendedCalendars
      .map((calendarInfo) => this.buildCalendarOption(calendarInfo));
  }

  resultsBetweenForActionsPane = () => {
    return [ this.buildActionOption("new", TypeaheadText.newText) ];
  }

  // This method makes sure that this.state.typeaheadFocused iff typeahead input
  // field is focused
  onMouseDown = (event: SyntheticEvent) => {
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

  freeze = (navID: string) => {
    this.setState((prevState, props) => ({
      ...prevState,
      frozenNavIDs: {
        ...prevState.frozenNavIDs,
        [navID]: true,
      },
    }));
  }

  unfreeze = (navID: string) => {
    this.setState(
      (prevState, props) => {
        const newFrozenNavIDs = _omit([ navID ])(prevState.frozenNavIDs);
        return { ...prevState, frozenNavIDs: newFrozenNavIDs };
      },
    );
  }

  onKeyDown = (event: SyntheticEvent) => {
    if (event.keyCode == 27 /* esc key */ && this.state.typeaheadFocused) {
      invariant(this.input, "ref should be set");
      this.input.blur();
    }
  }

  onChange = (event: SyntheticEvent) => {
    const target = event.target;
    invariant(target instanceof HTMLInputElement, "target not input");
    this.setState({
      typeaheadValue: target.value,
      searchResults: this.props.searchIndex.getSearchResults(target.value),
      searchActive: target.value.trim() !== "",
    });
  }

  focusIfNotFocused = () => {
    if (this.state.typeaheadFocused) {
      return;
    }
    const input = this.input;
    invariant(input, "ref should be set");
    input.focus();
    input.select();
  }

  searchResultOptionsForPage = (start: number, end: number) => {
    return this.state.searchResults.slice(start, end)
      .map((navID) => this.buildOption(navID));
  }

  resultsBetweenForSubscribedPane = (start: number, end: number) => {
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
    return _sampleSize(Typeahead.getRecommendationSize(props))
      (props.sortedCalendarInfos.recommended);
  }

}

Typeahead.propTypes = {
  currentNavID: PropTypes.string,
  calendarInfos: PropTypes.objectOf(calendarInfoPropType).isRequired,
  currentlyHome: PropTypes.bool.isRequired,
  currentCalendarID: PropTypes.string,
  subscriptionExists: PropTypes.bool.isRequired,
  searchIndex: PropTypes.instanceOf(SearchIndex),
  sortedCalendarInfos: PropTypes.objectOf(
    PropTypes.arrayOf(calendarInfoPropType),
  ).isRequired,
  setModal: PropTypes.func.isRequired,
  clearModal: PropTypes.func.isRequired,
  modalExists: PropTypes.bool.isRequired,
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
