// @flow

import React from 'react';

import css from '../style.css';

type Props = {
};
type State = {
  screenWidth: number,
  screenHeight: number,
};

class IntroModal extends React.Component {

  static maxDistanceFromTypeahead = 30;
  // This needs to be bound, but we need to pass the same reference to
  // window.removeEventListener that we pass to window.addEventListener
  onResizeCallback: () => void;
  props: Props;
  state: State;

  constructor(props: Props) {
    super(props);
    this.state = {
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
    };
    this.onResizeCallback = this.onResize.bind(this);
  }

  componentDidMount() {
    window.addEventListener("resize", this.onResizeCallback);
  }

  componentWillUnmount() {
    window.removeEventListener("resize", this.onResizeCallback);
  }

  onResize() {
    this.setState({
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
    });
  }

  render() {
    if (this.state.screenWidth < 786 || this.state.screenHeight < 310) {
      return <div className={css['modal-overlay']} />;
    }
    let modalLeft = (this.state.screenWidth - 350) / 2;
    const rightEdge = modalLeft + 354;
    const typeaheadLeftEdge = this.state.screenWidth - 432;
    if (rightEdge > (typeaheadLeftEdge - IntroModal.maxDistanceFromTypeahead)) {
      modalLeft = typeaheadLeftEdge - IntroModal.maxDistanceFromTypeahead - 354;
    }
    if (modalLeft < 0) {
      modalLeft = 0;
    }

    return (
      <div className={css['modal-overlay']}>
        <div className={css['intro-modal']} style={{ left: modalLeft }}>
          <p>
            You're home, but you're not subscribed to any calendars, so there's
            nothing to show. You can browse and subscribe to some calendars
            using the dialog at right.
          </p>
        </div>
      </div>
    );
  }

}

IntroModal.propTypes = {
};

export default IntroModal;
