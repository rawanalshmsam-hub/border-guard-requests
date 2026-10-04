import { useEffect, useState } from 'react';
import api, { getErrorMessage } from '../api/client';

/**
 * GET an API and track {data, loading, error}.
 * - Each page section uses its own call, so one failing section never breaks the whole page.
 * - `loading` is true whenever the URL/params changed and the new answer hasn't arrived yet;
 *   the previous `data` stays available meanwhile (no flicker).
 */
export default function useApi(url, params) {
  const [reloadKey, setReloadKey] = useState(0);
  const paramsKey = JSON.stringify(params || {});
  const requestKey = `${url}?${paramsKey}#${reloadKey}`;
  const [state, setState] = useState({ key: null, data: null, error: '' });

  useEffect(() => {
    let active = true;
    api.get(url, { params: JSON.parse(paramsKey) })
      .then((res) => { if (active) setState({ key: requestKey, data: res.data, error: '' }); })
      .catch((err) => { if (active) setState({ key: requestKey, data: null, error: getErrorMessage(err) }); });
    return () => { active = false; };   // ignore answers that arrive after the params changed
  }, [url, paramsKey, requestKey]);

  const loading = state.key !== requestKey;
  return {
    data: state.data,
    error: loading ? '' : state.error,
    loading,
    reload: () => setReloadKey((k) => k + 1),
  };
}