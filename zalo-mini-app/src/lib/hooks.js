import { useCallback, useEffect, useState } from "react";
import { datTieuDe } from "./zalo";

export function useTieuDe(title) {
  useEffect(() => {
    datTieuDe(title);
  }, [title]);
}

/** Gọi API khi vào trang; trả về { data, loading, error, reload } */
export function useTaiDuLieu(hamTai, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });

  const reload = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    return hamTai()
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((error) => setState({ data: null, loading: false, error }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    reload();
  }, [reload]);

  return { ...state, reload };
}
