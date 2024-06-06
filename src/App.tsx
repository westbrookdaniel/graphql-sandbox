import { useRef, useState } from "react";
import CodeMirror, { EditorView } from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { graphql, updateSchema } from "cm6-graphql";
import * as Comlink from "comlink";
import { IntrospectionQuery } from "./intro";
import { buildClientSchema } from "graphql";
import { tokyoNight } from "@uiw/codemirror-theme-tokyo-night";
import { Button } from "./components/ui/button";
import {
  Tabs,
  TabsFakeTrigger,
  TabsList,
  TabsTrigger,
} from "./components/ui/tabs";
import { XMarkIcon } from "@heroicons/react/16/solid";
import { ModeToggle } from "./components/mode-toggle";
import { useStore } from "./store";

const theme = tokyoNight;

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

  const { tabs, updateTab, createTab, deleteTab } = useStore();
  const [selected, setSelected] = useState(tabs[0].id);

  const tab = tabs.find((t) => t.id === selected);
  if (!tab) throw new Error("Selected tab not found");

  async function handleRun() {
    if (!tab) throw new Error("Selected tab not found");
    updateTab({ id: tab.id, output: null });

    const { headers, endpoint, variables } = await run(tab.script);
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

    const json = await gql(tab.query, endpoint, variables, headers);

    updateTab({ id: tab.id, output: json });
  }

  return (
    <Tabs value={selected} onValueChange={setSelected} className="p-4">
      <div className="flex w-full justify-between">
        <TabsList>
          {tabs.map((t) => (
            <TabsTrigger value={t.id}>
              <div className="flex w-full justify-between">
                <p>{t.name}</p>
                {tabs.length === 1 || selected !== t.id ? null : (
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => {
                      setSelected(
                        tabs.indexOf(t) === 0 ? tabs[1].id : tabs[0].id,
                      );
                      deleteTab(t.id);
                    }}
                  >
                    <XMarkIcon className="size-4 text-primary" />
                  </Button>
                )}
              </div>
            </TabsTrigger>
          ))}
          <TabsFakeTrigger
            value="add"
            onClick={() => {
              const id = createTab();
              setSelected(id);
            }}
          >
            Add +
          </TabsFakeTrigger>
        </TabsList>

        <div className="flex gap-2">
          <Button onClick={handleRun}>Run</Button>
          <ModeToggle />
        </div>
      </div>
      <div className="flex flex-col gap-2 mt-3">
        <CodeMirror
          className="flex-1 rounded-lg overflow-auto"
          value={tab.script}
          theme={theme}
          extensions={[javascript()]}
          onChange={(v) => updateTab({ id: tab.id, script: v })}
        />
        <CodeMirror
          className="flex-1 rounded-lg overflow-auto"
          value={tab.query}
          theme={theme}
          extensions={[graphql()]}
          onChange={(v) => updateTab({ id: tab.id, query: v })}
          onCreateEditor={(v) => (view.current = v)}
        />

        <CodeMirror
          className="flex-1 rounded-lg overflow-auto"
          value={JSON.stringify(tab.output, undefined, 2)}
          theme={theme}
          extensions={[json()]}
        />
      </div>
    </Tabs>
  );
}

export default App;
