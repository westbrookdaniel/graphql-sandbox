import { ArchiveBoxIcon } from "@heroicons/react/16/solid";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip } from "./ui/tooltip";
import { useState } from "react";
import { Tab, useStore } from "@/store";

export function ArchiveMenu({
  tab,
  setSelected,
}: {
  tab: Tab;
  setSelected: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Tooltip label={open ? null : "Import/Export Tab"}>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button onClick={() => {}} variant="secondary" size="icon">
            <ArchiveBoxIcon className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={async () => {
              const id = await importTab();
              setSelected(id);
            }}
          >
            Import
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => exportTab(tab)}>
            Export
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </Tooltip>
  );
}

async function importTab() {
  const [fileHandle] = await (window as any).showOpenFilePicker({
    types: [
      {
        description: "Tab JSON",
        accept: {
          "application/JSON": [".json"],
        },
      },
    ],
    excludeAcceptAllOption: true,
    multiple: false,
  });
  const file = await fileHandle.getFile();
  const text = await fileToText(file);
  const tab = JSON.parse(text);
  // TODO validate
  const s = useStore.getState();
  const id = s.createTab();
  s.updateTab({ ...tab, id });
  return id;
}

function fileToText(file: File): Promise<string> {
  return new Promise((res) => {
    const reader = new FileReader();
    reader.addEventListener("loadend", (e: any) => {
      const text = e.srcElement.result;
      res(text);
    });
    reader.readAsText(file);
  });
}

async function exportTab(tab: Tab) {
  var element = document.createElement("a");
  element.setAttribute(
    "href",
    "data:text/plain;charset=utf-8," + encodeURIComponent(JSON.stringify(tab)),
  );
  element.setAttribute("download", tab.name + ".json");

  element.style.display = "none";
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}
