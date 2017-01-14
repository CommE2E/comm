// @flow

import React from 'react';

import { LeftPager, RightPager, DownArrow } from '../vectors.react';
import LogInModal from './account/log-in-modal.react';
import RegisterModal from './account/register-modal.react';

type Props = {
  setModal: (modal: React.Element<any>) => void,
  clearModal: () => void,
};
type State = {
  screenWidth: number,
  screenHeight: number,
  showFirstGuide: bool,
  showSecondGuide: bool,
  showThirdGuide: bool,
};

class IntroModal extends React.Component {

  static maxDistanceFromTypeahead;
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
      showFirstGuide: false,
      showSecondGuide: false,
      showThirdGuide: false,
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
    const maxWidth = (350 + 432 + 60 + IntroModal.maxDistanceFromTypeahead);
    if (this.state.screenWidth < maxWidth || this.state.screenHeight < 310) {
      return <div className="modal-overlay" />;
    }
    let modalLeft = (this.state.screenWidth - 350) / 2;
    const rightEdge = modalLeft + 350;
    const typeaheadLeftEdge = this.state.screenWidth - 432;
    if (rightEdge > (typeaheadLeftEdge - IntroModal.maxDistanceFromTypeahead)) {
      modalLeft = typeaheadLeftEdge - IntroModal.maxDistanceFromTypeahead - 350;
    }
    if (modalLeft < 0) {
      modalLeft = 0;
    }

    const firstOutlineWidth = modalLeft - 10;
    const secondOutlineLeft = modalLeft + 360;
    const secondOutlineWidth = typeaheadLeftEdge - secondOutlineLeft - 10;

    const thirdOutlineWidth = modalLeft + 175;

    let firstGuide = null;
    if (this.state.showFirstGuide) {
      firstGuide = (
        <div
          className="intro-first-outline-container"
          style={{ width: firstOutlineWidth }}
        >
          <div className="intro-first-outline" />
          <DownArrow className="intro-first-outline-arrow" />
        </div>
      );
    }
    let secondGuide = null;
    if (this.state.showSecondGuide) {
      secondGuide = (
        <div
          className="intro-second-outline-container"
          style={{ left: secondOutlineLeft, width: secondOutlineWidth }}
        >
          <div className="intro-second-outline" />
          <RightPager className="intro-second-outline-arrow" />
        </div>
      );
    }
    let thirdGuide = null;
    if (this.state.showThirdGuide) {
      thirdGuide = (
        <div
          className="intro-third-outline-container"
          style={{ width: thirdOutlineWidth }}
        >
          <div className="intro-third-outline" />
          <LeftPager className="intro-third-outline-arrow" />
        </div>
      );
    }

    return (
      <div className="modal-overlay">
        <div className="intro-modal" style={{ left: modalLeft }}>
          <h3 className="intro-modal-welcome">Welcome!</h3>
          <ol>
            <li>
              {"If you already have an account, "}
              <a
                onClick={this.onLogIn.bind(this)}
                onMouseOver={() => this.setState({ showFirstGuide: true })}
                onMouseOut={() => this.setState({ showFirstGuide: false })}
                className="intro-link"
              >log in</a>.
            </li>
            <li>
              If you're just browsing, have a look at some calendars and
              {" maybe "}
              <span
                onMouseOver={() => this.setState({ showSecondGuide: true })}
                onMouseOut={() => this.setState({ showSecondGuide: false })}
                className="intro-guide"
              >subscribe</span>.
            </li>
            <li>
              If you want to save your subscriptions or create a new
              {"calendar, "}
              <a
                onClick={this.onRegister.bind(this)}
                onMouseOver={() => this.setState({ showThirdGuide: true })}
                onMouseOut={() => this.setState({ showThirdGuide: false })}
                className="intro-link"
              >register</a> an account.
            </li>
          </ol>
        </div>
        {firstGuide}
        {secondGuide}
        {thirdGuide}
      </div>
    );
  }

  onLogIn(event: SyntheticEvent) {
    event.preventDefault();
    this.props.setModal(
      <LogInModal
        onClose={this.props.clearModal}
        setModal={this.props.setModal}
      />
    );
  }

  onRegister(event: SyntheticEvent) {
    event.preventDefault();
    this.props.setModal(
      <RegisterModal
        onClose={this.props.clearModal}
        setModal={this.props.setModal}
      />
    );
  }

}

IntroModal.maxDistanceFromTypeahead = 50;

IntroModal.propTypes = {
  setModal: React.PropTypes.func.isRequired,
  clearModal: React.PropTypes.func.isRequired,
};

export default IntroModal;
