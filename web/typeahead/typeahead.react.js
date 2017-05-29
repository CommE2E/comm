// @flow

import type { ThreadInfo } from 'lib/types/thread-types';
import { threadInfoPropType } from 'lib/types/thread-types';
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
import { typeaheadSortedThreadInfos } from 'lib/selectors/thread-selectors';
import * as TypeaheadText from 'lib/shared/typeahead-text';

import css from '../style.css';
import TypeaheadActionOption from './typeahead-action-option.react';
import TypeaheadThreadOption from './typeahead-thread-option.react';
import TypeaheadOptionButtons from './typeahead-option-buttons.react';
import TypeaheadPane from './typeahead-pane.react';
import { htmlTargetFromEvent } from '../vector-utils';
import { UpCaret, DownCaret, MagnifyingGlass } from '../vectors.react';

type Props = {
  currentNavID: ?string,
  threadInfos: {[id: string]: ThreadInfo},
  currentlyHome: bool,
  currentThreadID: ?string,
  subscriptionExists: bool,
  searchIndex: SearchIndex,
  sortedThreadInfos: {[id: string]: ThreadInfo[]},
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
  recommendedThreads: ThreadInfo[],
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
      recommendedThreads: Typeahead.sampleRecommendations(props),
    };
  }

  static getCurrentNavName(props: Props) {
    if (props.currentlyHome) {
      return TypeaheadText.homeText;
    } else if (props.currentNavID) {
      return props.threadInfos[props.currentNavID].name;
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
      updateObj.recommendedThreads =
        Typeahead.sampleRecommendations(nextProps);
    }

    if (
      nextProps.sortedThreadInfos.recommended !==
        this.props.sortedThreadInfos.recommended ||
      Typeahead.getRecommendationSize(nextProps) >
        Typeahead.getRecommendationSize(this.props)
    ) {
      const stillValidRecommendations = _filter(
        (threadInfo: ThreadInfo) => _some({ id: threadInfo.id })
          (nextProps.sortedThreadInfos.recommended),
      )(this.state.recommendedThreads);
      const recommendationSize = Typeahead.getRecommendationSize(nextProps);
      const newRecommendationsNeeded = recommendationSize
        - stillValidRecommendations.length;
      if (newRecommendationsNeeded > 0) {
        const randomThreadInfos = _flow(
          _filter((threadInfo: ThreadInfo) =>
            !_some({ id: threadInfo.id })(stillValidRecommendations),
          ),
          _sampleSize(newRecommendationsNeeded),
        )(nextProps.sortedThreadInfos.recommended);
        updateObj.recommendedThreads = [
          ...stillValidRecommendations,
          ...randomThreadInfos,
        ];
      } else if (newRecommendationsNeeded < 0) {
        updateObj.recommendedThreads =
          stillValidRecommendations.slice(0, recommendationSize);
      } else if (
        stillValidRecommendations.length <
          this.state.recommendedThreads.length
      ) {
        updateObj.recommendedThreads = stillValidRecommendations;
      }
    }

    if (updateObj) {
      this.setState(updateObj);
    }
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    const newName = Typeahead.getCurrentNavName(this.props);
    const oldName = Typeahead.getCurrentNavName(prevProps);
    // Mirroring functionality in TypeaheadThreadOption.componentDidUpdate
    const passwordEntryWillBeFocused =
      !this.props.currentNavID && this.props.currentThreadID &&
      (prevProps.currentNavID || !prevProps.currentThreadID);
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
        recommendedThreads: Typeahead.sampleRecommendations(this.props),
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
        this.props.sortedThreadInfos.current.length > 0 ||
        (this.props.currentThreadID &&
          !this.props.threadInfos[this.props.currentThreadID]);
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
          totalResults={this.props.sortedThreadInfos.subscribed.length}
          resultsBetween={this.resultsBetweenForSubscribedPane}
          key="subscribed"
        />
      );
      panes.push(
        <TypeaheadPane
          paneTitle="Recommended"
          pageSize={this.state.recommendedThreads.length}
          totalResults={this.state.recommendedThreads.length}
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
      const currentThreadInfo = this.props.currentNavID &&
        this.props.threadInfos[this.props.currentNavID];
      if (currentThreadInfo) {
        rightAligned = (
          <TypeaheadOptionButtons
            threadInfo={currentThreadInfo}
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
    const threadInfo = this.props.threadInfos[navID];
    if (threadInfo !== undefined) {
      return this.buildCalendarOption(threadInfo);
    } else if (navID === "home") {
      return this.buildActionOption("home", TypeaheadText.homeText);
    } else if (navID === "new") {
      return this.buildActionOption("new", TypeaheadText.newText);
    } else if (navID === this.props.currentThreadID) {
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

  buildCalendarOption(threadInfo: ThreadInfo) {
    const onTransition = () => {
      invariant(this.input, "ref should be set");
      this.input.blur();
    }
    return (
      <TypeaheadThreadOption
        threadInfo={threadInfo}
        freezeTypeahead={this.freeze}
        unfreezeTypeahead={this.unfreeze}
        focusTypeahead={this.focusIfNotFocused}
        onTransition={onTransition}
        frozen={!!this.state.frozenNavIDs[threadInfo.id]}
        setModal={this.props.setModal}
        clearModal={this.props.clearModal}
        typeaheadFocused={this.state.typeaheadFocused}
        key={threadInfo.id}
      />
    );
  }

  buildSecretOption(secretThreadID: string) {
    const onTransition = () => {
      invariant(this.input, "ref should be set");
      this.input.blur();
    }
    return (
      <TypeaheadThreadOption
        secretThreadID={secretThreadID}
        freezeTypeahead={this.freeze}
        unfreezeTypeahead={this.unfreeze}
        focusTypeahead={this.focusIfNotFocused}
        onTransition={onTransition}
        frozen={!!this.state.frozenNavIDs[secretThreadID]}
        setModal={this.props.setModal}
        clearModal={this.props.clearModal}
        typeaheadFocused={this.state.typeaheadFocused}
        key={secretThreadID}
      />
    );
  }

  static isActive(props: Props, state: State) {
    return state.typeaheadFocused ||
      !props.currentNavID ||
      !_isEmpty(state.frozenNavIDs);
  }

  resultsBetweenForCurrentPane = () => {
    if (this.props.sortedThreadInfos.current.length > 0) {
      return this.props.sortedThreadInfos.current.map(
        (threadInfo) => this.buildCalendarOption(threadInfo),
      );
    } else if (
      this.props.currentThreadID &&
      !this.props.threadInfos[this.props.currentThreadID]
    ) {
      return [
        this.buildSecretOption(this.props.currentThreadID)
      ];
    }
    return emptyArray;
  }

  resultsBetweenForHomePane = () => {
    return [ this.buildActionOption("home", TypeaheadText.homeText) ];
  }

  resultsBetweenForRecommendedPane = () => {
    return this.state.recommendedThreads
      .map((threadInfo) => this.buildCalendarOption(threadInfo));
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
    return this.props.sortedThreadInfos.subscribed.slice(start, end)
      .map((threadInfo) => this.buildCalendarOption(threadInfo));
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
      (props.sortedThreadInfos.recommended);
  }

}

Typeahead.propTypes = {
  currentNavID: PropTypes.string,
  threadInfos: PropTypes.objectOf(threadInfoPropType).isRequired,
  currentlyHome: PropTypes.bool.isRequired,
  currentThreadID: PropTypes.string,
  subscriptionExists: PropTypes.bool.isRequired,
  searchIndex: PropTypes.instanceOf(SearchIndex),
  sortedThreadInfos: PropTypes.objectOf(
    PropTypes.arrayOf(threadInfoPropType),
  ).isRequired,
  setModal: PropTypes.func.isRequired,
  clearModal: PropTypes.func.isRequired,
  modalExists: PropTypes.bool.isRequired,
};

export default connect((state: AppState) => ({
  currentNavID: currentNavID(state),
  threadInfos: state.threadInfos,
  currentlyHome: state.navInfo.home,
  currentThreadID: state.navInfo.threadID,
  subscriptionExists: subscriptionExists(state),
  searchIndex: searchIndex(state),
  sortedThreadInfos: typeaheadSortedThreadInfos(state),
}))(Typeahead);
