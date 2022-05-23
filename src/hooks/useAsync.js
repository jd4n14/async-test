import axios from "axios";
import { useCallback, useEffect, useRef, useState } from "react";

const InitialAsyncState = {
  status: "not-requested",
  loading: false,
  result: undefined,
  error: undefined,
};
const InitialAsyncLoadingState = {
  status: "loading",
  loading: true,
  result: undefined,
  error: undefined,
};

const api = axios.create({
  baseURL: "https://swapi.dev/api/people/",
});

const defaultAsyncFunc = (url) => api.get(url);

const setLoadingFn = () => InitialAsyncLoadingState;
const setResultFn = (result) => ({
  status: "success",
  loading: false,
  result: result,
  error: undefined,
});

const setErrorFn = (error) => ({
  status: "error",
  loading: false,
  result: undefined,
  error: error,
});

const DefaultOptions = {
  initialState: (options) =>
    options && options.executeOnMount
      ? InitialAsyncLoadingState
      : InitialAsyncState,
  executeOnMount: true,
  executeOnUpdate: true,
  setLoading: setLoadingFn,
  setResult: setResultFn,
  setError: setErrorFn,
  onSuccess: () => {
    /*  */
  },
  onError: () => {
    /*  */
  },
};

const normalizeOptions = (options) => ({
  ...DefaultOptions,
  ...options,
});

const useAsyncState = (options) => {
  const [value, setValue] = useState(() => options.initialState(options));

  const reset = useCallback(
    () => setValue(options.initialState(options)),
    [setValue, options]
  );

  const setLoading = useCallback(
    () => setValue(options.setLoading(value)),
    [value, setValue]
  );

  const setResult = useCallback(
    (result) => setValue(options.setResult(result, value)),
    [value, setValue]
  );

  const setError = useCallback(
    (error) => setValue(options.setError(error, value)),
    [value, setValue]
  );

  const merge = useCallback(
    (state) => setValue({ ...value, ...state }),
    [value, setValue]
  );

  return {
    value,
    set: setValue,
    merge,
    reset,
    setLoading,
    setResult,
    setError,
  };
};

export const useIsMounted = () => {
  const ref = useRef(false);
  useEffect(() => {
    ref.current = true;
    return () => {
      ref.current = false;
    };
  }, []);
  return () => ref.current;
};

const useGetter = (value) => {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  });

  return useCallback(() => ref.current, [ref]);
};

const useCurrentPromise = () => {
  const ref = useRef(null);

  return {
    set: (promise) => (ref.current = promise),
    get: () => ref.current,
    is: (promise) => ref.current === promise,
  };
};

export const useAsync = (asyncFunction, params = [], options = {}) => {
  
  const asyncFunctionParsable =
    typeof asyncFunction === "string"
      ? () => defaultAsyncFunc(asyncFunction)
      : asyncFunction;

  const normalizedOptions = normalizeOptions(options);

  const [currentParams, setCurrentParams] = useState(null);
  const asyncState = useAsyncState(normalizedOptions);

  const isMounted = useIsMounted();

  const currentPromise = useCurrentPromise();

  const shouldHandlePromise = (p) => isMounted() && currentPromise.is(p);

  const executeAsyncOperation = (...args) => {
    const promise = (async () => asyncFunctionParsable(...args))();
    setCurrentParams(args);
    currentPromise.set(promise);
    asyncState.setLoading();
    promise.then(
      (result) => {
        if (shouldHandlePromise(promise)) {
          asyncState.setResult(result);
        }
        normalizedOptions.onSuccess(result, {
          isCurrent: () => currentPromise.is(promise),
        });
      },
      (error) => {
        if (shouldHandlePromise(promise)) {
          asyncState.setError(error);
        }
        normalizedOptions.onError(error, {
          isCurrent: () => currentPromise.is(promise),
        });
      }
    );
    return promise;
  };

  const getLatestExecuteAsyncOperation = useGetter(executeAsyncOperation);

  const executeAsyncOperationMemo = useCallback(
    (...args) => getLatestExecuteAsyncOperation()(...args),
    [getLatestExecuteAsyncOperation]
  );
  const isMounting = !isMounted();

  useEffect(() => {
    const execute = () => getLatestExecuteAsyncOperation()(...params);
    isMounting && normalizedOptions.executeOnMount && execute();
    !isMounting && normalizedOptions.executeOnUpdate && execute();
  }, params);

  return {
    ...asyncState.value,
    set: asyncState.set,
    merge: asyncState.merge,
    reset: asyncState.reset,
    execute: executeAsyncOperationMemo,
    currentPromise: currentPromise.get(),
    currentParams,
  };
};

export const useAsyncCallback = (asyncFunction, options) => {
  return useAsync(asyncFunction, [], {
    ...options,
    executeOnMount: false,
    executeOnUpdate: false,
  });
};
