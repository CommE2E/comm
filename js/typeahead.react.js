// @flow

import React from 'react';
import TypeaheadOption from './typeaheadoption.react';

type Props = {
  baseURL: string,
  monthURL: string,
  currentNavID: string,
  currentNavName: string,
  defaultSquads: {[id: string]: string},
  authorizedSquads: {[id: string]: bool},
  loggedIn: bool,
  subscriptionExists: bool,
};
type State = {
  active: bool,
  frozenNavID: ?string,
};

class Typeahead extends React.Component {

  props: Props;
  state: State;
  input: HTMLInputElement;

  constructor(props: Props) {
    super(props);
    this.state = {
      active: false,
      frozenNavID: null,
    };
  }

  render() {
    let dropdown = null;
    let navSymbols = null;
    let typeaheadValue = null;

    if (this.state.active) {
      let options = [];
      if (this.props.currentNavID !== "home" && this.props.subscriptionExists) {
        options.push(this.buildOption("home", "Home"));
      }
      for (let squadID: string in this.props.defaultSquads) {
        if (squadID === this.props.currentNavID) {
          continue;
        }
        options.push(this.buildOption(
          squadID,
          this.props.defaultSquads[squadID]
        ));
      }
      options.push(this.buildOption("new", "New squad..."));
      dropdown = (
        <div className="squad-nav-dropdown">
          {options}
        </div>
      );
    } else {
      navSymbols = (  
        <span>
          <span className="squad-nav-first-symbol">&#x25B2;</span>
          <span className="squad-nav-second-symbol">&#x25BC;</span>
        </span>
      );
      typeaheadValue = this.props.currentNavName;
    }

    return (
      <div id="squad-nav" onMouseDown={this.onClick.bind(this)}>
        <div className="squad-nav-current">
          <img
            id="search"
            src={this.props.baseURL + "images/search.svg"}
            alt="search"
          />
          <input
            type="text"
            id="typeahead"
            ref={(input) => this.input = input}
            defaultValue={this.props.currentNavName}
            onBlur={() => this.setActive(false)}
            onKeyDown={this.onKeyDown.bind(this)}
            value={typeaheadValue}
          />
          {navSymbols}
          {dropdown}
        </div>
      </div>
    );
  }

  buildOption(navID: string, navName: string) {
    return (
      <TypeaheadOption
        navID={navID}
        navName={navName}
        monthURL={this.props.monthURL}
        authorizedSquads={this.props.authorizedSquads}
        loggedIn={this.props.loggedIn}
        freezeTypeahead={this.freeze.bind(this)}
        hideTypeahead={() => this.setActive(false)}
        frozen={this.state.frozenNavID === navID}
        key={navID}
      />
    );
  }

  setActive(active: bool) {
    this.setState(
      (prevState, props) => {
        if (prevState.frozenNavID !== null || active === prevState.active) {
          return {};
        }
        if (active) {
          this.input.select();
          this.input.focus();
        }
        return { active: active };
      },
    );
  }

  onClick(event: SyntheticEvent) {
    if (!this.state.active) {
      this.setActive(true);
      event.preventDefault(); 
    } else if (
      this.state.active &&
      (!(event.target instanceof HTMLInputElement) || 
        event.target.id !== "typeahead")
    ) {
      this.setActive(false);
    }
  }

  freeze(navID: string) {
    this.setState({ frozenNavID: navID });
  }

  unfreeze() {
    this.setState({ frozenNavID: null, active: false });
  }

  isActive() {
    return this.state.active;
  }

  onKeyDown(event: SyntheticEvent) {
    if (event.keyCode == 27) { // esc key
      this.setActive(false);
    }
  }

}

Typeahead.propTypes = {
  baseURL: React.PropTypes.string.isRequired,
  monthURL: React.PropTypes.string.isRequired,
  currentNavID: React.PropTypes.string.isRequired,
  currentNavName: React.PropTypes.string.isRequired,
  defaultSquads: React.PropTypes.objectOf(React.PropTypes.string).isRequired,
  authorizedSquads: React.PropTypes.objectOf(React.PropTypes.bool).isRequired,
  loggedIn: React.PropTypes.bool.isRequired,
  subscriptionExists: React.PropTypes.bool.isRequired,
};

export default Typeahead;
