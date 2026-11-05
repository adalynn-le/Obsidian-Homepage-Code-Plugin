import { Plugin, TFile } from "obsidian";

export default class HomebasePlugin extends Plugin {
  settings: any;
  async onload() {
    this.registerMarkdownCodeBlockProcessor(
      "homebase",
      (source, el) => {
        const header = el.createDiv({
          cls: "homebase-header"
        });
        const date = header.createDiv({
          cls: "homebase-date"
        });
        const clock = header.createDiv({
          cls: "homebase-clock"
        });

const searchContainer = header.createDiv({
  cls: "homebase-search"
});

const searchInput = searchContainer.createEl("input", {
  type: "text",
  placeholder: "cmd pallete + search"
});

const suggestions = searchContainer.createDiv({
  cls: "homebase-suggestions"
});

let selectedIndex = 0;

type SearchResult = {
  title: string;
  description: string;
  action: () => void;
  icon: string;
};

let currentResults: SearchResult[] = [];

const closeSuggestions = () => {
  suggestions.empty();
  suggestions.removeClass("is-visible");
  currentResults = [];
  selectedIndex = 0;
};

const openResult = (index: number) => {
  const result = currentResults[index];

  if (result) {
    result.action();
    searchInput.value = "";
    closeSuggestions();
  }
};

const renderResults = (results: SearchResult[]) => {
  currentResults = results;
  selectedIndex = 0;
  suggestions.empty();

  if (results.length === 0) {
    const empty = suggestions.createDiv({
      cls: "homebase-empty"
    });
    empty.setText("No matching results");
    suggestions.addClass("is-visible");
    return;
  }

  results.forEach((result, index) => {
    const item = suggestions.createDiv({
      cls: "homebase-suggestion"
    });

    if (index === selectedIndex) {
      item.addClass("is-selected");
    }

    const icon = item.createDiv({
      cls: "homebase-suggestion-icon"
    });
    icon.setText(result.icon);

    const content = item.createDiv({
      cls: "homebase-suggestion-content"
    });

    content.createDiv({
      cls: "homebase-suggestion-title"
    }).setText(result.title);

    content.createDiv({
      cls: "homebase-suggestion-description"
    }).setText(result.description);

    item.addEventListener("mousedown", (event) => {
      event.preventDefault();
      openResult(index);
    });

    suggestions.appendChild(item);
  });

  suggestions.addClass("is-visible");
const calendarContainer = el.createDiv({
  cls: "homebase-calendar"
});

const now = new Date();
const year = now.getFullYear();
const month = now.getMonth();

const monthName = now.toLocaleDateString("en-US", {
  month: "long"
});

const calendarTitle = calendarContainer.createDiv({
  cls: "homebase-calendar-title"
});

calendarTitle.setText(`${monthName.toUpperCase()} ${year}`);

const calendarGrid = calendarContainer.createDiv({
  cls: "homebase-calendar-grid"
});

const weekdays = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

weekdays.forEach(day => {
  const weekday = calendarGrid.createDiv({
    cls: "homebase-calendar-weekday"
  });

  weekday.setText(day);
});

const firstDay = new Date(year, month, 1).getDay();
const daysInMonth = new Date(year, month + 1, 0).getDate();

for (let i = 0; i < firstDay; i++) {
  calendarGrid.createDiv({
    cls: "homebase-calendar-empty"
  });
}

for (let day = 1; day <= daysInMonth; day++) {
  const dayButton = calendarGrid.createDiv({
    cls: "homebase-calendar-day"
  });

  dayButton.setText(String(day));

  if (
    day === now.getDate() &&
    month === now.getMonth() &&
    year === now.getFullYear()
  ) {
    dayButton.addClass("is-today");
  }

  const monthString = String(month + 1).padStart(2, "0");
  const dayString = String(day).padStart(2, "0");

  const notePath =
    `Reflections/Daily Notes ${year}/${year}-${monthString}-${dayString}.md`;

  const noteExists = this.app.vault.getAbstractFileByPath(notePath);

  if (noteExists) {
    dayButton.addClass("has-note");
  }

  dayButton.addEventListener("click", async () => {
    let file = this.app.vault.getAbstractFileByPath(notePath);

    if (!file) {
      file = await this.app.vault.create(
        notePath,
        `# ${year}-${monthString}-${dayString}\n\n`
      );
    }

    if (file instanceof TFile) {
      await this.app.workspace.getLeaf(false).openFile(file);
    }
  });
}
};
const commandManager = (this.app as any).commands;

const showShortcuts = () => {
  const commands = commandManager.listCommands();

  const shortcuts = commands
    .filter((command: { name: string; }) =>
      /daily note|new note|random note|quick switcher/i.test(command.name)
    )
    .slice(0, 6)
    .map((command: { name: any; id: any; }) => ({
      title: command.name,
      description: "Obsidian command",
      icon: ">",
      action: () => {
        commandManager.executeCommandById(command.id);
      }
    }));

  renderResults(shortcuts);
};

const search = (value: string) => {
  const query = value.trim().toLowerCase();

  if (!query) {
    showShortcuts();
    return;
  }

  if (query.startsWith(">")) {
    const term = query.slice(1).trim();

    const results = commandManager.listCommands()
      .filter((command: { name: string; }) =>
        command.name.toLowerCase().includes(term)
      )
      .slice(0, 10)
      .map((command: { name: any; id: any; }) => ({
        title: command.name,
        description: "Obsidian command",
        icon: ">",
        action: () => {
          commandManager.executeCommandById(command.id);
        }
      }));

    renderResults(results);
    return;
  }

  if (query.startsWith("#")) {
    const tag = query.slice(1);

    const results: SearchResult[] = [];

    for (const file of this.app.vault.getMarkdownFiles()) {
      const cache = this.app.metadataCache.getFileCache(file);

      const tags = [
        ...(cache?.tags?.map(t => t.tag) ?? []),
        ...(cache?.frontmatter?.tags ?? [])
      ];

      if (tags.some(t =>
        String(t).replace(/^#/, "").toLowerCase().includes(tag)
      )) {
        results.push({
          title: file.basename,
          description: file.path,
          icon: "#",
          action: () => {
            this.app.workspace.getLeaf(false).openFile(file);
          }
        });
      }

      if (results.length >= 10) break;
    }

    renderResults(results);
    return;
  }

  if (query.startsWith("@")) {
    const folder = query.slice(1);

    const results = this.app.vault.getMarkdownFiles()
      .filter(file =>
        file.parent?.path.toLowerCase().includes(folder)
      )
      .slice(0, 10)
      .map(file => ({
        title: file.basename,
        description: file.path,
        icon: "@",
        action: () => {
          this.app.workspace.getLeaf(false).openFile(file);
        }
      }));

    renderResults(results);
    return;
  }

  const results = this.app.vault.getMarkdownFiles()
    .filter(file => {
      const cache = this.app.metadataCache.getFileCache(file);

      const tags = cache?.tags?.map(t => t.tag).join(" ") ?? "";

      const searchable = [
        file.basename,
        file.path,
        tags
      ].join(" ").toLowerCase();

      return searchable.includes(query);
    })
    .slice(0, 10)
    .map(file => ({
      title: file.basename,
      description: file.path,
      icon: "⌕",
      action: () => {
        this.app.workspace.getLeaf(false).openFile(file);
      }
    }));

  renderResults(results);
};


searchInput.addEventListener("focus", () => {
  search(searchInput.value);
});

searchInput.addEventListener("input", () => {
  search(searchInput.value);
});

searchInput.addEventListener("keydown", event => {
  if (event.key === "ArrowDown") {
    event.preventDefault();
    selectedIndex = Math.min(
      selectedIndex + 1,
      currentResults.length - 1
    );
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    selectedIndex = Math.max(selectedIndex - 1, 0);
  }

  if (event.key === "Enter") {
    event.preventDefault();
    openResult(selectedIndex);
  }

  if (event.key === "Escape") {
    closeSuggestions();
    searchInput.blur();
  }

  const items = suggestions.querySelectorAll(
    ".homebase-suggestion"
  );

  items.forEach((item, index) => {
    item.toggleClass("is-selected", index === selectedIndex);
  });
});

searchInput.addEventListener("blur", () => {
  window.setTimeout(closeSuggestions, 150);
});
const updateTime = () => {
          const now = new Date();
          date.setText(
            now.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric"
            })
          );

          clock.setText(
            now.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true
            }) + " — time to lock in"
          );
        };

        updateTime();

        const interval = window.setInterval(updateTime, 60 * 1000);

        this.register(() => window.clearInterval(interval));
      }
    );
  }
}