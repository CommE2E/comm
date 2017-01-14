// @flow

import React from 'react';

import LogInModal from './account/log-in-modal.react';
import RegisterModal from './account/register-modal.react';

type Props = {
  setModal: (modal: React.Element<any>) => void,
  clearModal: () => void,
};
type State = {
  screenWidth: number,
  screenHeight: number,
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
    if (this.state.screenWidth < 782 || this.state.screenHeight < 310) {
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

    return (
      <div className="modal-overlay">
        <div className="intro-modal" style={{ left: modalLeft }}>
          <h3 className="intro-modal-welcome">Welcome!</h3>
          <ol>
            <li>
              {"If you already have an account, "}
              <a
                onClick={this.onLogIn.bind(this)}
                className="intro-link"
              >log in</a>.
            </li>
            <li>
              If you're just browsing, have a look at some calendars and
              {" maybe "}
              <span className="intro-guide">subscribe</span>.
            </li>
            <li>
              If you want to save your subscriptions or create a new
              {" calendar, "}
              <a
                onClick={this.onRegister.bind(this)}
                className="intro-link"
              >register</a> an account.
            </li>
          </ol>
        </div>
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

IntroModal.maxDistanceFromTypeahead = 30;

IntroModal.propTypes = {
  setModal: React.PropTypes.func.isRequired,
  clearModal: React.PropTypes.func.isRequired,
};

export default IntroModal;
