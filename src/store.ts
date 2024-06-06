import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

const scriptFile = `const ENDPOINT = "https://one.test.glx.global/graphql"

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
