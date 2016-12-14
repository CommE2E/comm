// @flow

import React from 'react';
import { ChromePicker } from 'react-color';

type Props = {
  id: string,
  value: string,
  disabled: bool,
  onChange: (hex: string) => void,
};
type State = {
  pickerOpen: bool,
}
type Color = {
  hex: string,
}

class ColorPicker extends React.Component {

  props: Props;
  state: State;

  constructor(props: Props) {
    super(props);
    this.state = {
      pickerOpen: false,
    }
  }

  render() {
    let picker = null;
    if (this.state.pickerOpen) {
      picker = (
        <div className="color-picker-selector">
          <ChromePicker
            color={this.props.value}
            onChangeComplete={this.onChangeColor.bind(this)}
            disableAlpha={true}
          />
        </div>
      );
    }
    const style = { backgroundColor: `#${this.props.value}` };
    return (
      <div
        className="color-picker-container"
        tabIndex="0"
        onClick={() => this.setState({ pickerOpen: true })}
        onBlur={() => this.setState({ pickerOpen: false })}
        onKeyDown={this.onPickerKeyDown.bind(this)}
      >
        <div className="color-picker-button">
          <div className="color-picker-preview" style={style} />
          <div className="color-picker-down-symbol">▼</div>
        </div>
        {picker}
      </div>
    );
  }

  // Throw away typechecking here because SyntheticEvent isn't typed
  onPickerKeyDown(event: any) {
    if (event.keyCode === 27) { // Esc
      this.setState({ pickerOpen: false });
    }
  }

  onChangeColor(color: Color) {
    this.props.onChange(color.hex.substring(1, 7));
  }

}

ColorPicker.propTypes = {
  id: React.PropTypes.string.isRequired,
  value: React.PropTypes.string.isRequired,
  disabled: React.PropTypes.bool.isRequired,
  onChange: React.PropTypes.func.isRequired,
}

export default ColorPicker;
