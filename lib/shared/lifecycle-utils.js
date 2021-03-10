import { useSelector } from 'react-redux';

function useIsAppForegrounded() {
  return useSelector((state) => state.lifecycleState !== 'background');
}

export { useIsAppForegrounded };
