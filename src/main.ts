import { Plugin } from "obsidian";

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