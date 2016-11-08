// @flow

import type { SquadInfo } from '../squad-info';
import { squadInfoPropType } from '../squad-info';
import type { NavID } from './typeahead-action-option.react';

import React from 'react';
import ReactDOM from 'react-dom';
import classNames from 'classnames';
import invariant from 'invariant';
import update from 'immutability-helper';
import _ from 'lodash';

import TypeaheadActionOption from './typeahead-action-option.react';
import TypeaheadSquadOption from './typeahead-squad-option.react';
import TypeaheadOptionButtons from './typeahead-option-buttons.react';
import SearchIndex from './search-index';

type Props = {
  thisURL: string,
  baseURL: string,
  monthURL: string,
  currentNavID: string,
  currentNavName: string,
  squadInfos: {[id: string]: SquadInfo},
  loggedIn: bool,
  setModal: (modal: React.Element<any>) => void,
  clearModal: () => void,
};
type State = {
  active: bool,
  searchActive: bool,
  frozen: bool,
  frozenNavID: ?string,
  typeaheadValue: string,
  squadInfos: {[id: string]: SquadInfo},
  searchResults: string[],
};

class Typeahead extends React.Component {

  props: Props;
  state: State;

  input: ?HTMLInputElement;
  dropdown: ?HTMLElement;
  current: ?HTMLElement;
  magnifyingGlass: ?HTMLElement;

  searchIndex: SearchIndex;

  constructor(props: Props) {
    super(props);
    this.state = {
      active: false,
      searchActive: false,
      frozen: false,
      frozenNavID: null,
      typeaheadValue: props.currentNavName,
      squadInfos: props.squadInfos,
      searchResults: [],
    };
    this.buildSearchIndex();
  }

  componentDidUpdate() {
    this.buildSearchIndex();
  }

  buildSearchIndex() {
    this.searchIndex = new SearchIndex();
    for (const squadID in this.state.squadInfos) {
      const squad = this.state.squadInfos[squadID];
      this.searchIndex.addEntry(squadID, squad.name + " " + squad.description);
    }
    if (_.some(this.state.squadInfos, (squadInfo) => squadInfo.subscribed)) {
      this.searchIndex.addEntry("home", TypeaheadActionOption.homeText);
    }
    this.searchIndex.addEntry("new", TypeaheadActionOption.newText);
  }

  render() {
    let dropdown = null;
    if (this.state.searchActive) {
      let results;
      if (this.state.searchResults.length !== 0) {
        results = this.state.searchResults.map(
          (navID) => this.buildOption(navID)
        );
      } else {
        results = (
          <div className="squad-nav-no-results">
            No results
          </div>
        );
      }
      dropdown = (
        <div
          className="squad-nav-dropdown"
          ref={(dropdown) => this.dropdown = dropdown}
        >
          <div className="squad-nav-option-pane" key="results">
            <div className="squad-nav-option-pane-header">
              Results
            </div>
            {results}
          </div>
        </div>
      );
    } else if (this.state.active) {
      let subscriptionExists = false;
      const subscribedInfos = [];
      const recommendedInfos = [];
      for (const squadID: string in this.state.squadInfos) {
        const squadInfo = this.state.squadInfos[squadID];
        if (squadInfo.subscribed) {
          subscriptionExists = true;
        }
        if (squadID === this.props.currentNavID) {
          continue;
        }
        if (squadInfo.subscribed) {
          subscribedInfos.push(squadInfo);
        } else {
          recommendedInfos.push(squadInfo);
        }
      }

      const panes = [];
      if (this.props.currentNavID !== "home" && subscriptionExists) {
        panes.push(
          <div className="squad-nav-option-pane" key="home">
            <div className="squad-nav-option-pane-header">
              Home
            </div>
            {this.buildActionOption("home", TypeaheadActionOption.homeText)}
          </div>
        );
      }
      const subscribedOptions = [];
      for (const squadInfo of subscribedInfos) {
        subscribedOptions.push(this.buildSquadOption(squadInfo));
      }
      if (subscribedOptions.length > 0) {
        panes.push(
          <div className="squad-nav-option-pane" key="subscribed">
            <div className="squad-nav-option-pane-header">
              Subscribed
            </div>
            {subscribedOptions}
          </div>
        );
      }
      const recommendedOptions = [];
      for (const squadInfo of recommendedInfos) {
        recommendedOptions.push(this.buildSquadOption(squadInfo));
      }
      if (recommendedOptions.length > 0) {
        panes.push(
          <div className="squad-nav-option-pane" key="recommended">
            <div className="squad-nav-option-pane-header">
              Recommended
            </div>
            {recommendedOptions}
          </div>
        );
      }
      panes.push(
        <div className="squad-nav-option-pane" key="actions">
          <div className="squad-nav-option-pane-header">
            Actions
          </div>
          {this.buildActionOption("new", TypeaheadActionOption.newText)}
        </div>
      );
      dropdown = (
        <div
          className="squad-nav-dropdown"
          ref={(dropdown) => this.dropdown = dropdown}
        >
          {panes}
        </div>
      );
    }

    let rightAligned = null;
    if (this.state.active) {
      const currentSquadInfo = this.state.squadInfos[this.props.currentNavID];
      if (currentSquadInfo !== undefined) {
        rightAligned = (
          <TypeaheadOptionButtons
            squadInfo={currentSquadInfo}
            thisURL={this.props.thisURL}
            baseURL={this.props.baseURL}
            monthURL={this.props.monthURL}
            updateSubscription={this.updateSubscription.bind(this)}
            setModal={this.props.setModal}
            clearModal={this.props.clearModal}
            freezeTypeahead={this.freeze.bind(this)}
            unfreezeTypeahead={this.unfreeze.bind(this)}
          />
        );
      }
    } else {
      rightAligned = (  
        <span className="squad-nav-symbols">
          <span className="squad-nav-first-symbol">&#x25B2;</span>
          <span className="squad-nav-second-symbol">&#x25BC;</span>
        </span>
      );
    }

    return (
      <div
        id="squad-nav"
        onMouseDown={this.onMouseDown.bind(this)}
        className={classNames({'squad-nav-active': this.state.active })}
      >
        <div
          className="squad-nav-current"
          ref={(current) => this.current = current}
        >
          <img
            id="search"
            src={this.props.baseURL + "images/search.svg"}
            alt="search"
            ref={(magnifyingGlass) => this.magnifyingGlass = magnifyingGlass}
          />
          {rightAligned}
          <div className="typeahead-container">
            <input
              type="text"
              id="typeahead"
              ref={(input) => this.input = input}
              onBlur={() => this.setActive(false)}
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

  buildOption(navID: string) {
    const squadInfo = this.state.squadInfos[navID];
    if (squadInfo !== undefined) {
      return this.buildSquadOption(squadInfo);
    } else if (navID === "home") {
      return this.buildActionOption("home", TypeaheadActionOption.homeText);
    } else if (navID === "new") {
      return this.buildActionOption("new", TypeaheadActionOption.newText);
    }
    return null;
  }

  buildActionOption(navID: NavID, name: string) {
    return (
      <TypeaheadActionOption
        navID={navID}
        name={name}
        monthURL={this.props.monthURL}
        loggedIn={this.props.loggedIn}
        freezeTypeahead={this.freeze.bind(this)}
        unfreezeTypeahead={this.unfreeze.bind(this)}
        setModal={this.props.setModal}
        clearModal={this.props.clearModal}
        hideTypeahead={() => this.setActive(false)}
        frozen={this.state.frozenNavID === navID}
        key={navID}
      />
    );
  }

  buildSquadOption(squadInfo: SquadInfo) {
    return (
      <TypeaheadSquadOption
        squadInfo={squadInfo}
        thisURL={this.props.thisURL}
        monthURL={this.props.monthURL}
        baseURL={this.props.baseURL}
        loggedIn={this.props.loggedIn}
        freezeTypeahead={this.freeze.bind(this)}
        unfreezeTypeahead={this.unfreeze.bind(this)}
        frozen={this.state.frozenNavID === squadInfo.id}
        updateSubscription={this.updateSubscription.bind(this)}
        setModal={this.props.setModal}
        clearModal={this.props.clearModal}
        key={squadInfo.id}
      />
    );
  }

  setActive(active: bool) {
    this.setState(
      (prevState, props) => {
        if (prevState.frozen || active === prevState.active) {
          return {};
        }
        let typeaheadValue = prevState.typeaheadValue;
        if (active) {
          invariant(this.input, "ref should be set");
          this.input.select();
          invariant(this.input, "ref should be set");
          this.input.focus();
        } else {
          typeaheadValue = this.props.currentNavName;
        }
        return {
          active: active,
          searchActive: prevState.searchActive && active,
          typeaheadValue: typeaheadValue,
        };
      },
    );
  }

  onMouseDown(event: SyntheticEvent) {
    if (!this.state.active) {
      this.setActive(true);
      // This prevents a possible focus event on input#typeahead from overriding
      // the select() that gets called in setActive
      event.preventDefault();
      return;
    }
    const target = event.target;
    const dropdown = this.dropdown;
    const current = this.current;
    const magnifyingGlass = this.magnifyingGlass;
    invariant(target instanceof HTMLElement, "target isn't element");
    invariant(dropdown, "ref should be set");
    invariant(current, "ref should be set");
    invariant(magnifyingGlass, "ref should be set");
    if (target.id === "typeahead") {
      return;
    }
    if (
      dropdown.contains(target) ||
      (current.contains(target) && !magnifyingGlass.contains(target))
    ) {
      // This prevents onBlur from firing on input#typeahead
      event.preventDefault(); 
    } else if (this.state.active) {
      this.setActive(false);
    }
  }

  freeze(navID: ?string) {
    this.setState({ frozen: true, frozenNavID: navID });
  }

  unfreeze() {
    this.setState({ frozen: false, frozenNavID: null, active: false });
  }

  isActive() {
    return this.state.active;
  }

  onKeyDown(event: SyntheticEvent) {
    if (event.keyCode == 27) { // esc key
      this.setActive(false);
      invariant(this.input, "ref should be set");
      this.input.blur();
    }
  }

  onChange(event: SyntheticEvent) {
    const target = event.target;
    invariant(target instanceof HTMLInputElement, "target not input");
    this.setState({
      typeaheadValue: target.value,
      searchResults: this.searchIndex.getSearchResults(target.value),
      searchActive: target.value.trim() !== "",
    });
  }

  updateSubscription(squadID: string, newSubscribed: bool) {
    this.setState(
      (prevState, props) => {
        const updateParam = { squadInfos: {} };
        updateParam.squadInfos[squadID] = {
          subscribed: { $set: newSubscribed },
        };
        return update(prevState, updateParam);
      },
    );
  }

}

Typeahead.propTypes = {
  thisURL: React.PropTypes.string.isRequired,
  baseURL: React.PropTypes.string.isRequired,
  monthURL: React.PropTypes.string.isRequired,
  currentNavID: React.PropTypes.string.isRequired,
  currentNavName: React.PropTypes.string.isRequired,
  squadInfos: React.PropTypes.objectOf(squadInfoPropType).isRequired,
  loggedIn: React.PropTypes.bool.isRequired,
  setModal: React.PropTypes.func.isRequired,
  clearModal: React.PropTypes.func.isRequired,
};

export default Typeahead;
