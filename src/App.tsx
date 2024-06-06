import { useRef, useState } from "react";
import CodeMirror, { EditorView } from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { graphql, updateSchema } from "cm6-graphql";
import * as Comlink from "comlink";
import { IntrospectionQuery } from "./intro";
import { buildClientSchema } from "graphql";
import { tokyoNight } from "@uiw/codemirror-theme-tokyo-night";

const theme = tokyoNight;

const file = `
const ENDPOINT = "https://one.test.glx.global/graphql"

async function headers() {
  return {
    Authorization: "Api-Key ZjFjYjc2Y2MtZDcwNy00MWJhLTgzZGItMjg3NmVkNjIxMjBm"
  }
}

async function variables() {
  return { 
    query: { id: 12 }
  }
}`;

const queryFile = `query($query: JSON!) {
  task(query: $query) { 
    id
    task
  }
}
`;

async function run(input: string) {
  const pre = `importScripts("https://unpkg.com/comlink/dist/umd/comlink.js");`;
  const suf = `Comlink.expose({ ENDPOINT, headers, variables })`;

  const file = pre + "\n" + input + "\n" + suf;

  const blob = new Blob([file], { type: "text/javascript" });
  const url = URL.createObjectURL(blob);
  const worker = new Worker(url);
  const obj: any = Comlink.wrap(worker);

  const endpoint = await obj.ENDPOINT;
  const headers = await obj.headers();
  const variables = await obj.variables();

  return { headers, endpoint, variables };
}

async function gql(query: string, url: string, variables: any, headers: any) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify({
      operationName: null,
      query,
      variables,
    }),
  });

  const data = await res.json();

  return data;
}

function App() {
  const view = useRef<EditorView>();
  const [value, setValue] = useState(file);
  const [query, setQuery] = useState(queryFile);
  const [output, setOutput] = useState("");

  return (
    <>
      <CodeMirror
        value={value}
        theme={theme}
        extensions={[javascript()]}
        onChange={(v) => setValue(v)}
      />
      <CodeMirror
        value={query}
        theme={theme}
        extensions={[graphql()]}
        onChange={(v) => setQuery(v)}
        onCreateEditor={(v) => (view.current = v)}
      />
      <button
        onClick={async () => {
          setOutput("");
          const { headers, endpoint, variables } = await run(value);
          console.log("Constructed:", { headers, endpoint, variables });

          if (view.current) {
            const schemaJson = await gql(
              IntrospectionQuery,
              endpoint,
              variables,
              headers,
            );
            if (!schemaJson || schemaJson?.error) {
              console.error(schemaJson.error ?? "Failed to get schema");
            } else {
              updateSchema(view.current, buildClientSchema(schemaJson.data));
            }
          }

          const json = await gql(query, endpoint, variables, headers);
          setOutput(JSON.stringify(json, undefined, 2));
        }}
      >
        Run
      </button>
      <pre>
        <code>{output}</code>
      </pre>
    </>
  );
}

export default App;
