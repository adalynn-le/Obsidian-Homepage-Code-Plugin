import { Plugin, TFile } from "obsidian";

export default class HomebasePlugin extends Plugin {
  settings: any;

  async onload() {
    this.registerMarkdownCodeBlockProcessor(
      "homebase",
      (source, el) => {

        // ==========================================
        // HOMEBASE HEADER
        // ==========================================

        const header = el.createDiv({
          cls: "homebase-header"
        });

        const date = header.createDiv({
          cls: "homebase-date"
        });

        const clock = header.createDiv({
          cls: "homebase-clock"
        });


        // ==========================================
        // HOMEBASE COMMAND BAR
        // ==========================================

        const searchContainer = header.createDiv({
          cls: "homebase-search"
        });

        const searchInput = searchContainer.createEl("input", {
          type: "text",
          placeholder: "cmd palette + search"
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


        // ==========================================
        // SEARCH RESULT HELPERS
        // ==========================================

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
          });

          suggestions.addClass("is-visible");
        };


        // ==========================================
        // COMMAND MANAGER
        // ==========================================

        const commandManager = (this.app as any).commands;


        // ==========================================
        // SHOW COMMAND SHORTCUTS
        // ==========================================

        const showShortcuts = () => {
          const commands = commandManager.listCommands();

          const shortcuts = commands
            .filter((command: { name: string }) =>
              /daily note|new note|random note|quick switcher/i.test(
                command.name
              )
            )
            .slice(0, 6)
            .map((command: { name: string; id: string }) => ({
              title: command.name,
              description: "Obsidian command",
              icon: ">",
              action: () => {
                commandManager.executeCommandById(command.id);
              }
            }));

          renderResults(shortcuts);
        };


        // ==========================================
        // SEARCH
        // ==========================================

        const search = (value: string) => {
          const query = value.trim().toLowerCase();

          // Empty search
          if (!query) {
            showShortcuts();
            return;
          }


          // ----------------------------------------
          // COMMAND MODE
          // ----------------------------------------

          if (query.startsWith(">")) {
            const term = query.slice(1).trim();

            const results = commandManager
              .listCommands()
              .filter((command: { name: string }) =>
                command.name.toLowerCase().includes(term)
              )
              .slice(0, 10)
              .map((command: { name: string; id: string }) => ({
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


          // ----------------------------------------
          // TAG MODE
          // ----------------------------------------

          if (query.startsWith("#")) {
            const tag = query.slice(1);

            const results: SearchResult[] = [];

            for (const file of this.app.vault.getMarkdownFiles()) {
              const cache =
                this.app.metadataCache.getFileCache(file);

              const frontmatterTags =
                cache?.frontmatter?.tags;

              const tags = [
                ...(cache?.tags?.map(t => t.tag) ?? []),

                ...(Array.isArray(frontmatterTags)
                  ? frontmatterTags
                  : typeof frontmatterTags === "string"
                    ? [frontmatterTags]
                    : [])
              ];

              if (
                tags.some(t =>
                  String(t)
                    .replace(/^#/, "")
                    .toLowerCase()
                    .includes(tag)
                )
              ) {
                results.push({
                  title: file.basename,
                  description: file.path,
                  icon: "#",
                  action: () => {
                    this.app.workspace
                      .getLeaf(false)
                      .openFile(file);
                  }
                });
              }

              if (results.length >= 10) {
                break;
              }
            }

            renderResults(results);

            return;
          }


          // ----------------------------------------
          // FOLDER MODE
          // ----------------------------------------

          if (query.startsWith("@")) {
            const folder = query.slice(1);

            const results = this.app.vault
              .getMarkdownFiles()
              .filter(file =>
                file.parent?.path
                  .toLowerCase()
                  .includes(folder)
              )
              .slice(0, 10)
              .map(file => ({
                title: file.basename,
                description: file.path,
                icon: "@",
                action: () => {
                  this.app.workspace
                    .getLeaf(false)
                    .openFile(file);
                }
              }));

            renderResults(results);

            return;
          }


          // ----------------------------------------
          // NORMAL NOTE SEARCH
          // ----------------------------------------

          const results = this.app.vault
            .getMarkdownFiles()
            .filter(file => {
              const cache =
                this.app.metadataCache.getFileCache(file);

              const tags =
                cache?.tags
                  ?.map(t => t.tag)
                  .join(" ") ?? "";

              const searchable = [
                file.basename,
                file.path,
                tags
              ]
                .join(" ")
                .toLowerCase();

              return searchable.includes(query);
            })
            .slice(0, 10)
            .map(file => ({
              title: file.basename,
              description: file.path,
              icon: "⌕",
              action: () => {
                this.app.workspace
                  .getLeaf(false)
                  .openFile(file);
              }
            }));

          renderResults(results);
        };


        // ==========================================
        // SEARCH INPUT EVENTS
        // ==========================================

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

            selectedIndex = Math.max(
              selectedIndex - 1,
              0
            );
          }


          if (event.key === "Enter") {
            event.preventDefault();

            openResult(selectedIndex);
          }


          if (event.key === "Escape") {
            closeSuggestions();
            searchInput.blur();
          }


          const items =
            suggestions.querySelectorAll(
              ".homebase-suggestion"
            );

          items.forEach((item, index) => {
            item.toggleClass(
              "is-selected",
              index === selectedIndex
            );
          });
        });


        searchInput.addEventListener("blur", () => {
          window.setTimeout(
            closeSuggestions,
            150
          );
        });


        // ==========================================
        // DATE + CLOCK
        // ==========================================

        const updateTime = () => {
          const now = new Date();

          date.setText(
            now.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric"
            }).toUpperCase()
          );

          clock.setText(
            now.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true
            }) + " — TIME TO LOCK IN"
          );
        };


        updateTime();


        const interval = window.setInterval(
          updateTime,
          60 * 1000
        );

        this.register(() => {
          window.clearInterval(interval);
        });

        const calendarArea = el.createDiv({
          cls: "homebase-calendar-area"
        });
        const calendarContainer =
          calendarArea.createDiv({
            cls: "homebase-calendar"
          });


        const now = new Date();

        const year = now.getFullYear();
        const month = now.getMonth();


        const monthName =
          now.toLocaleDateString("en-US", {
            month: "long"
          });


        const calendarTitle =
          calendarContainer.createDiv({
            cls: "homebase-calendar-title"
          });


        calendarTitle.setText(
          `${monthName.toUpperCase()} ${year}`
        );


        const calendarGrid =
          calendarContainer.createDiv({
            cls: "homebase-calendar-grid"
          });



        const weekdays = [
          "sun",
          "mon",
          "tue",
          "wed",
          "thu",
          "fri",
          "sat"
        ];


        weekdays.forEach(day => {
          const weekday =
            calendarGrid.createDiv({
              cls: "homebase-calendar-weekday"
            });

          weekday.setText(day);
        });


        const firstDay =
          new Date(year, month, 1).getDay();


        const daysInMonth =
          new Date(
            year,
            month + 1,
            0
          ).getDate();



        for (let i = 0; i < firstDay; i++) {
          calendarGrid.createDiv({
            cls: "homebase-calendar-empty"
          });
        }



        for (
          let day = 1;
          day <= daysInMonth;
          day++
        ) {

          const dayButton =
            calendarGrid.createDiv({
              cls: "homebase-calendar-day"
            });


          dayButton.setText(
            String(day)
          );



          if (
            day === now.getDate() &&
            month === now.getMonth() &&
            year === now.getFullYear()
          ) {
            dayButton.addClass("is-today");
          }



          const monthString =
            String(month + 1)
              .padStart(2, "0");

          const dayString =
            String(day)
              .padStart(2, "0");


          const notePath =
            `Reflections/Daily Notes ${year}/${year}-${monthString}-${dayString}.md`;



          const noteExists =
            this.app.vault
              .getAbstractFileByPath(notePath);


          if (noteExists) {
            dayButton.addClass("has-note");
          }


          dayButton.addEventListener(
            "click",
            async () => {

              let file =
                this.app.vault
                  .getAbstractFileByPath(
                    notePath
                  );


              if (!file) {

                file =
                  await this.app.vault.create(
                    notePath,
                    `# ${year}-${monthString}-${dayString}\n\n`
                  );
              }


              if (file instanceof TFile) {

                await this.app.workspace
                  .getLeaf(false)
                  .openFile(file);

              }
            }
          );
        }
        const lifeCalendar =
          calendarArea.createDiv({
            cls: "homebase-life-calendar"
          });


        const lifeCalendarHeader =
          lifeCalendar.createDiv({
            cls: "homebase-life-calendar-header"
          });


        const targetDate =
          new Date(2027, 7, 15);

        targetDate.setHours(
          0,
          0,
          0,
          0
        );


        const startDate =
          new Date(2026, 7, 15);

        startDate.setHours(
          0,
          0,
          0,
          0
        );

        const today =
          new Date();

        today.setHours(
          0,
          0,
          0,
          0
        );
        const millisecondsPerDay =
          1000 * 60 * 60 * 24;

        const elapsedDays =
          Math.max(
            0,
            Math.floor(
              (
                today.getTime() -
                startDate.getTime()
              ) /
              millisecondsPerDay
            )
          );
        const daysRemaining =
          Math.max(
            0,
            Math.ceil(
              (
                targetDate.getTime() -
                today.getTime()
              ) /
              millisecondsPerDay
            )
          );

        const countdown =
          lifeCalendarHeader.createDiv({
            cls: "homebase-life-calendar-countdown"
          });


        countdown.setText(
          `${daysRemaining} days left`
        );
        const dotGrid =
          lifeCalendar.createDiv({
            cls: "homebase-life-calendar-grid"
          });

        for (let i = 0; i < 365; i++) {

          const dot =
            dotGrid.createDiv({
              cls: "homebase-life-calendar-dot"
            });
          if (i < elapsedDays) {
            dot.addClass("is-filled");
          }
          if (i === elapsedDays) {
            dot.addClass("is-today");
          }
        }

      }
    );
  }
}