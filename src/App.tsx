import { useRef, useState } from "react";
import CodeMirror, { EditorView } from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { graphql, updateSchema } from "cm6-graphql";
import * as Comlink from "comlink";
import { IntrospectionQuery } from "./intro";
import { buildClientSchema } from "graphql";
import { tokyoNightInit } from "@uiw/codemirror-theme-tokyo-night";
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
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

const theme = tokyoNightInit({
  settings: { background: "hsl(0 0% 3.9%)", gutterBackground: "hsl(0 0% 3.9%)" },
});

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
    <div className="min-h-screen flex flex-col">
      <Tabs
        value={selected}
        onValueChange={setSelected}
        className="p-4 flex-1 flex flex-col gap-3"
      >
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

        <ResizablePanelGroup
          direction="horizontal"
          className="max-w-full rounded-lg border flex-1"
        >
          <ResizablePanel defaultSize={50}>
            <ResizablePanelGroup direction="vertical">
              <ResizablePanel defaultSize={50} className="flex flex-col">
                <CodeMirror
                  className="flex-1 overflow-auto"
                  height="100%"
                  value={tab.query}
                  theme={theme}
                  extensions={[graphql()]}
                  onChange={(v) => updateTab({ id: tab.id, query: v })}
                  onCreateEditor={(v) => (view.current = v)}
                />
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={75} className="flex flex-col">
                <CodeMirror
                  className="flex-1 overflow-auto"
                  height="100%"
                  value={tab.script}
                  theme={theme}
                  extensions={[javascript()]}
                  onChange={(v) => updateTab({ id: tab.id, script: v })}
                />
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={50} className="flex flex-col">
            <CodeMirror
              className="flex-1 overflow-auto"
              height="100%"
              value={JSON.stringify(tab.output, undefined, 2)}
              theme={theme}
              extensions={[json()]}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </Tabs>
    </div>
  );
}

export default App;
