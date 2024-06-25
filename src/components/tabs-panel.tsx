import { Button } from "./ui/button";
import { TabsTriggerButton, TabsList, TabsTrigger } from "./ui/tabs";
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
            <Button
              className="ml-2 disabled:opacity-0"
              variant="ghost"
              size="xs"
              disabled={tabs.length === 1 || tab.id !== t.id}
              onClick={() => {
                setSelected(tabs.indexOf(t) === 0 ? tabs[1].id : tabs[0].id);
                deleteTab(t.id);
              }}
            >
              <XMarkIcon className="size-4" />
            </Button>
          </div>
        </TabsTrigger>
      ))}
      <TabsTriggerButton
        value="add"
        onClick={() => {
          const id = createTab();
          setSelected(id);
        }}
      >
        Add +
      </TabsTriggerButton>
    </TabsList>
  );
}
