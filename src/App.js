import axios from "axios";
import React, { useState } from "react";
import { useAsyncCallback, useAsync } from "./hooks/useAsync";

const doSomething = (params) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(params)
    }, 2000);
  });
};

export function App() {
  const [inputValue, setInputValue] = useState(0);
  const operation = useAsync('https://swapi.dev/api/people/${id}/', [], {
    onError: console.error,
    onSuccess: console.log
  });

  return (
    <div>
      <button
      >
        {operation.status}: 
      </button>
      <input value={inputValue} onChange={(event) => setInputValue(event.target.value)}></input>
    </div>
  );
}
