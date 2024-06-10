import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useResizeDetector } from "react-resize-detector";
import * as prettier from "prettier";
import * as babel from "prettier/parser-babel";
import * as prettierPluginEstree from "prettier/plugins/estree";
import CodeMirror, { EditorView } from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { graphql, updateSchema } from "cm6-graphql";
import * as Comlink from "comlink";
import { IntrospectionQuery } from "./intro";
// eslint-disable-next-line no-redeclare
import { buildClientSchema, parse, print } from "graphql";
import { tokyoNightInit } from "@uiw/codemirror-theme-tokyo-night";
import { tokyoNightDayInit } from "@uiw/codemirror-theme-tokyo-night-day";
import { Button } from "./components/ui/button";
import {
  Tabs,
  TabsFakeTrigger,
  TabsList,
  TabsTrigger,
} from "./components/ui/tabs";
import { PaintBrushIcon, PlayIcon, XMarkIcon } from "@heroicons/react/16/solid";
import { useStore } from "./store";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Badge } from "./components/ui/badge";
import { ModeToggle } from "./components/mode-toggle";
import { useCalculatedTheme } from "./components/theme-provider";
import { Tooltip } from "./components/ui/tooltip";
import { ArchiveMenu } from "./components/archive-menu";
import { Alert, AlertDescription, AlertTitle } from "./components/ui/alert";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { setDefaultResultOrder } from "dns";

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
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    setError(null);
  }, [selected]);

  const t = useCalculatedTheme();

  const theme = useMemo(() => {
    return t === "light"
      ? tokyoNightDayInit({
          settings: {
            background: "hsl(0 0% 100%)",
            gutterBackground: "hsl(0 0% 100%)",
          },
        })
      : tokyoNightInit({
          settings: {
            background: "hsl(0 0% 3.9%)",
            gutterBackground: "hsl(0 0% 3.9%)",
          },
        });
  }, [t]);

  const tab = tabs.find((t) => t.id === selected);
  if (!tab) throw new Error("Selected tab not found");

  const handleRun = useCallback(async () => {
    setRunning(true);
    setError(null);
    try {
      if (!tab) throw new Error("Selected tab not found");

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
    } catch (e) {
      setError(e);
      updateTab({ id: tab.id, output: undefined });
    } finally {
      setRunning(false);
    }
  }, [tab, updateTab]);

  const prettify = useCallback(async () => {
    if (!tab) throw new Error("Selected tab not found");

    let prettyQuery;
    try {
      prettyQuery = print(parse(tab.query));
    } catch (e) {
      console.error(e);
      prettyQuery = tab.query;
    }

    let prettyScript;
    try {
      prettyScript = await prettier.format(tab.script, {
        trailingComma: "es5",
        tabWidth: 2,
        semi: true,
        singleQuote: true,
        parser: "babel",
        plugins: [babel, prettierPluginEstree],
      });
    } catch (e) {
      console.error(e);
      prettyScript = tab.script;
    }

    updateTab({
      id: tab.id,
      query: prettyQuery,
      script: prettyScript,
    });
  }, [tab, updateTab]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleRun();
      }
      if (e.key === "p" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        prettify();
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [handleRun, prettify]);

  const querySize = useResizeDetector({ handleWidth: false });
  const scriptSize = useResizeDetector({ handleWidth: false });
  const resultSize = useResizeDetector({ handleWidth: false });

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
              <TabsTrigger value={t.id} key={t.id}>
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
                      <XMarkIcon className="size-4" />
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

          <div className="flex gap-2 items-center">
            <ArchiveMenu tab={tab} setSelected={setSelected} />
            <ModeToggle />
          </div>
        </div>

        <ResizablePanelGroup
          direction="horizontal"
          className="max-w-full rounded-lg border flex-1"
          key={tab.id}
        >
          <ResizablePanel defaultSize={50}>
            <ResizablePanelGroup direction="vertical">
              <ResizablePanel
                defaultSize={50}
                className="flex flex-col relative"
              >
                <div
                  ref={querySize.ref}
                  className="h-full w-full flex-1 flex flex-col"
                >
                  <div className="flex flex-col gap-2 items-center absolute top-8 right-2 z-20">
                    <Tooltip label="Execute Query (Ctr-Enter)">
                      <Button
                        onClick={handleRun}
                        disabled={running}
                        size="icon"
                        className="h-10 w-10 rounded-full"
                      >
                        <PlayIcon className="size-4" />
                      </Button>
                    </Tooltip>
                    <Tooltip label="Prettify Query (Ctr-P)">
                      <Button
                        onClick={prettify}
                        variant="secondary"
                        size="icon"
                        className="h-10 w-10 rounded-full"
                      >
                        <PaintBrushIcon className="size-4" />
                      </Button>
                    </Tooltip>
                  </div>

                  <SectionLabel>Query</SectionLabel>
                  <CodeMirror
                    className="flex-1 overflow-auto text-[16px]"
                    height={`${querySize.height}px`}
                    value={tab.query}
                    theme={theme}
                    extensions={[graphql()]}
                    onChange={(v) => updateTab({ id: tab.id, query: v })}
                    onCreateEditor={(v) => (view.current = v)}
                  />
                </div>
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel
                defaultSize={75}
                className="flex flex-col relative"
              >
                <div
                  ref={scriptSize.ref}
                  className="h-full w-full flex-1 flex flex-col"
                >
                  <SectionLabel>Script</SectionLabel>
                  <CodeMirror
                    className="flex-1 overflow-auto text-[16px]"
                    height={`${scriptSize.height}px`}
                    value={tab.script}
                    theme={theme}
                    extensions={[javascript()]}
                    onChange={(v) => updateTab({ id: tab.id, script: v })}
                  />
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={50} className="flex flex-col relative">
            <div
              ref={resultSize.ref}
              className="h-full w-full flex-1 flex flex-col"
            >
              <SectionLabel>Result</SectionLabel>
              <CodeMirror
                className="flex-1 overflow-auto text-[16px]"
                height={`${resultSize.height}px`}
                value={JSON.stringify(tab.output, undefined, 2)}
                theme={theme}
                editable={false}
                extensions={[json()]}
              />

              {error ? (
                <div className="absolute bottom-6 px-6 w-full">
                  <Alert variant="error">
                    <ExclamationTriangleIcon className="h-5 w-5" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{getMessage(error)}</AlertDescription>
                  </Alert>
                </div>
              ) : null}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </Tabs>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Badge
      className="absolute text-muted-foreground border-t-0 border-r-0 top-0 right-0 z-10 rounded-r-none rounded-t-none bg-background"
      variant="outline"
    >
      {children}
    </Badge>
  );
}

function getMessage(error: any) {
  const m = error?.message;
  if (!m) return "Something went wrong sending the request";
  if (m === "Failed to fetch") return "Failed to reach server endpoint";
  return m;
}

export default App;
