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
};
type State = {
  active: bool,
  frozenNavID: ?string,
};

class Typeahead extends React.Component {

  props: Props;
  state: State;
  setActive: (active: bool) => void;
  freeze: (navID: string) => void;
  unfreeze: () => void;
  onClick: (event: SyntheticEvent) => void;
  onKeyUp: (event: SyntheticEvent) => void;
  input: HTMLInputElement;

  constructor(props: Props) {
    super(props);
    this.state = {
      active: false,
      frozenNavID: null,
    };
    this.setActive = this.setActive.bind(this);
    this.freeze = this.freeze.bind(this);
    this.unfreeze = this.unfreeze.bind(this);
    this.onClick = this.onClick.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
  }

  render() {
    let dropdown = null;
    let navSymbols = null;

    if (this.state.active) {
      let options = [];
      if (this.props.currentNavID !== "home") {
        options.push(
          <TypeaheadOption
            navID="home"
            navName="Home"
            monthURL={this.props.monthURL}
            authorizedSquads={this.props.authorizedSquads}
            loggedIn={this.props.loggedIn}
            freezeTypeahead={this.freeze}
            hideTypeahead={() => this.setActive(false)}
            frozen={this.state.frozenNavID === "home"}
            key="home"
          />
        );
      }
      for (let squadID: string in this.props.defaultSquads) {
        if (squadID === this.props.currentNavID) {
          continue;
        }
        let squadName: string = this.props.defaultSquads[squadID];
        options.push(
          <TypeaheadOption
            navID={squadID}
            navName={squadName}
            monthURL={this.props.monthURL}
            authorizedSquads={this.props.authorizedSquads}
            loggedIn={this.props.loggedIn}
            freezeTypeahead={this.freeze}
            hideTypeahead={() => this.setActive(false)}
            frozen={this.state.frozenNavID === squadID}
            key={squadID}
          />
        );
      }
      options.push(
        <TypeaheadOption
          navID="new"
          navName="New squad..."
          monthURL={this.props.monthURL}
          authorizedSquads={this.props.authorizedSquads}
          loggedIn={this.props.loggedIn}
          freezeTypeahead={this.freeze}
          hideTypeahead={() => this.setActive(false)}
          frozen={this.state.frozenNavID === "new"}
          key="new"
        />
      );
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
    }

    return (
      <div id="squad-nav" onMouseDown={this.onClick}>
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
            onKeyUp={this.onKeyUp}
          />
          {navSymbols}
          {dropdown}
        </div>
      </div>
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

  onKeyUp(event: SyntheticEvent) {
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
};

export default Typeahead;
