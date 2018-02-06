// @flow

import * as React from 'react';

import css from '../style.css';

type Props = {
};
type State = {
  screenWidth: number,
  screenHeight: number,
};

class IntroModal extends React.PureComponent<Props, State> {

  static maxDistanceFromTypeahead = 30;

  constructor(props: Props) {
    super(props);
    this.state = {
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
    };
  }

  componentDidMount() {
    window.addEventListener("resize", this.onResize);
  }

  componentWillUnmount() {
    window.removeEventListener("resize", this.onResize);
  }

  onResize = () => {
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
            You're home, but you haven't joined any threads yet, so there's
            nothing to show. You can browse and join some threads using the
            dialog at right.
          </p>
        </div>
      </div>
    );
  }

}

IntroModal.propTypes = {
};

export default IntroModal;
