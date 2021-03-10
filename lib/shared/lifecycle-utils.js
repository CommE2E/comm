import { useSelector } from 'react-redux';

function useIsAppForegrounded() {
  return useSelector((state) => state.foreground);
}

export { useIsAppForegrounded };
