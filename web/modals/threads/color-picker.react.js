// @flow

import * as React from 'react';
import { ChromePicker } from 'react-color';
import PropTypes from 'prop-types';

import css from '../../style.css';

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

class ColorPicker extends React.PureComponent<Props, State> {

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
        <div className={css['color-picker-selector']}>
          <ChromePicker
            color={this.props.value}
            onChangeComplete={this.onChangeColor}
            disableAlpha={true}
          />
        </div>
      );
    }
    const style = { backgroundColor: `#${this.props.value}` };
    return (
      <div
        className={css['color-picker-container']}
        tabIndex="0"
        onClick={this.onClick}
        onBlur={this.onBlur}
        onKeyDown={this.onPickerKeyDown}
      >
        <div className={css['color-picker-button']}>
          <div className={css['color-picker-preview']} style={style} />
          <div className={css['color-picker-down-symbol']}>▼</div>
        </div>
        {picker}
      </div>
    );
  }

  onPickerKeyDown = (event: SyntheticKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.keyCode === 27) { // Esc
      this.setState({ pickerOpen: false });
    }
  }

  onChangeColor = (color: Color) => {
    this.props.onChange(color.hex.substring(1, 7));
  }

  onClick = () => {
    this.setState({ pickerOpen: true });
  }

  onBlur = () => {
    this.setState({ pickerOpen: false });
  }

}

ColorPicker.propTypes = {
  id: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  disabled: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
}

export default ColorPicker;
