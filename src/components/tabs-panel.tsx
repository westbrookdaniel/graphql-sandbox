import { Button } from "./ui/button";
import { TabsFakeTrigger, TabsList, TabsTrigger } from "./ui/tabs";
import { XMarkIcon } from "@heroicons/react/16/solid";
import { useStore } from "../store";

export function TabsPanel() {
  const { tabs, createTab, deleteTab, getSelected, setSelected } = useStore();

  const tab = getSelected();

  return (
    <TabsList>
      {tabs.map((t) => (
        <TabsTrigger value={t.id} key={t.id}>
          <div className="flex w-full justify-between">
            <p>{t.name}</p>
            {tabs.length === 1 || tab.id !== t.id ? null : (
              <Button
                variant="ghost"
                size="xs"
                onClick={() => {
                  setSelected(tabs.indexOf(t) === 0 ? tabs[1].id : tabs[0].id);
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
  );
}
