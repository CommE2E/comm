// @flow

import React from 'react';

type Props = {
};
type State = {
  screenWidth: number,
  screenHeight: number,
};

class IntroModal extends React.Component {

  static maxDistanceFromTypeahead;
  props: Props;
  state: State;

  constructor(props: Props) {
    super(props);
    this.state = {
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
    };
  }

  componentDidMount() {
    window.addEventListener("resize", this.onResize.bind(this));
  }

  onResize() {
    this.setState({
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
    });
  }

  render() {
    if (this.state.screenWidth < (350 + 432)) {
      return <div className="modal-overlay" />;
    }
    let left = (this.state.screenWidth - 350) / 2;
    const rightEdge = left + 350;
    const typeaheadLeftEdge = this.state.screenWidth - 432;
    if (rightEdge > (typeaheadLeftEdge - IntroModal.maxDistanceFromTypeahead)) {
      left = typeaheadLeftEdge - IntroModal.maxDistanceFromTypeahead - 350;
    }
    if (left < 0) {
      left = 0;
    }
    return (
      <div className="modal-overlay">
        <div className="intro-modal" style={{ left }}>
          <h3 className="intro-modal-welcome">Welcome!</h3>
          <ol>
            <li>
              {"If you already have an account, "}
              <span className="bold">log in</span>.
            </li>
            <li>
              If you're just browsing, have a look at some calendars and
              maybe <span className="bold">subscribe</span>.
            </li>
            <li>
              If you want to save your subscriptions or create a new
              calendar, <span className="bold">register</span> an account.
            </li>
          </ol>
        </div>
      </div>
    );
  }

}

IntroModal.maxDistanceFromTypeahead = 30;

IntroModal.propTypes = {
};

export default IntroModal;
