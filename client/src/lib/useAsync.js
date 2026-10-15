import { useCallback, useEffect, useRef, useState } from 'react';
import { parseError } from '../services/api';

/** Runs an async fn on mount/deps change. Returns {data, loading, error, reload}. */
export default function useAsync(fn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: '' });
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const seq = useRef(0);

  const run = useCallback(async () => {
    const id = ++seq.current;
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const data = await fnRef.current();
      if (id === seq.current) setState({ data, loading: false, error: '' });
    } catch (err) {
      if (id === seq.current) setState({ data: null, loading: false, error: parseError(err).message });
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { run(); }, deps);
  return { ...state, reload: run };
}
