import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { gql } from "graphql-tag";
import { Kind, OperationDefinitionNode } from "graphql";

const scriptFile = `const ENDPOINT = "https://example.com/graphql"

async function headers() {
  return {
    Authorization: ""
  }
}

async function variables() {
  return {}
}`;

const queryFile = `{}`;

interface Tab {
  id: string;
  name: string;
  script: string;
  query: string;
  output: any;
}

interface BearState {
  tabs: Tab[];
  createTab: () => string;
  deleteTab: (id: string) => void;
  updateTab: (tab: Partial<Omit<Tab, "id">> & { id: string }) => void;
}

export const useStore = create<BearState>()(
  devtools(
    persist(
      (set) => ({
        tabs: [
          {
            id: crypto.randomUUID(),
            name: "Query",
            script: scriptFile,
            query: queryFile,
            output: null,
          },
        ],
        updateTab: (tab) => {
          set((t) => {
            const newTabs = [...t.tabs];
            const found = newTabs.find((t) => t.id === tab.id);
            if (!found) throw new Error("Tab not found");

            if (!tab.name && tab.query) {
              // tab.name = gql(tab.query)
              try {
                const doc = gql(tab.query);
                const op: OperationDefinitionNode = doc.definitions.find(
                  (d) => d.kind === Kind.OPERATION_DEFINITION,
                ) as any;
                tab.name = op?.name?.value ?? cap(op.operation);
              } catch {}
            }

            Object.assign(found, tab);
            return { tabs: newTabs };
          });
        },
        deleteTab: (id) => {
          set((t) => {
            const newTabs = [...t.tabs];
            return { tabs: newTabs.filter((t) => t.id !== id) };
          });
        },
        createTab: () => {
          const id = crypto.randomUUID();
          set((t) => {
            return {
              tabs: [
                ...t.tabs,
                {
                  id,
                  name: "Query",
                  script: scriptFile,
                  query: queryFile,
                  output: null,
                },
              ],
            };
          });
          return id;
        },
      }),
      {
        name: "graphql-test-store",
      },
    ),
  ),
);

function cap(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
