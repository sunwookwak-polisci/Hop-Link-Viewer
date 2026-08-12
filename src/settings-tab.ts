import { App, normalizePath, PluginSettingTab, Setting } from "obsidian";
import type HopLinkViewerPlugin from "../main";
import type { AnchorMode, SortOrder } from "./constants";

export class HopLinkViewerSettingTab extends PluginSettingTab {
	plugin: HopLinkViewerPlugin;

	constructor(app: App, plugin: HopLinkViewerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Hop depth")
			.setDesc("Maximum hop distance from the anchor. Shows non-direct notes from hop 2 up to this depth (hop 1 only with Include direct links).")
			.addText((text) =>
				text
					.setPlaceholder("3")
					.setValue(String(this.plugin.settings.hops))
					.onChange(async (value) => {
						const parsed = parseInt(value, 10);
						if (!isNaN(parsed) && parsed >= 1) {
							this.plugin.settings.hops = parsed;
							await this.plugin.saveSettings();
							this.plugin.refreshViews();
						}
					})
			);

		new Setting(containerEl)
			.setName("Display cap")
			.setDesc("Maximum number of suggestions to show.")
			.addText((text) =>
				text
					.setPlaceholder("10")
					.setValue(String(this.plugin.settings.displayCap))
					.onChange(async (value) => {
						const parsed = parseInt(value, 10);
						if (!isNaN(parsed) && parsed >= 1) {
							this.plugin.settings.displayCap = parsed;
							await this.plugin.saveSettings();
							this.plugin.refreshViews();
						}
					})
			);

		new Setting(containerEl)
			.setName("Excluded folder paths")
			.setDesc("One folder prefix per line. Notes under these paths are excluded from suggestions (not from anchor selection).")
			.addTextArea((text) => {
				text
					.setPlaceholder("Daily Notes/\nTemplates/")
					.setValue(this.plugin.settings.excludedPaths.join("\n"))
					.onChange(async (value) => {
						this.plugin.settings.excludedPaths = value
							.split("\n")
							.map((line) => line.trim())
							.filter((line) => line.length > 0)
							.map((line) => normalizePath(line));
						await this.plugin.saveSettings();
						this.plugin.refreshViews();
					});
				text.inputEl.rows = 4;
				text.inputEl.cols = 40;
			});

		new Setting(containerEl)
			.setName("Sidebar anchor mode")
			.setDesc("How the sidebar chooses the anchor note for suggestions.")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("active-file", "Active file (focused pane)")
					.addOption("last-edited", "Last edited (most recently modified)")
					.addOption("last-viewed", "Last viewed (active or recently opened)")
					.setValue(this.plugin.settings.anchorMode)
					.onChange(async (value) => {
						this.plugin.settings.anchorMode = value as AnchorMode;
						await this.plugin.saveSettings();
						this.plugin.refreshViews();
					})
			);

		new Setting(containerEl)
			.setName("List order")
			.setDesc("How to sort suggestions before applying the display cap.")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("walk-order", "Graph walk order (default)")
					.addOption("mtime-desc", "Recently modified (newest first)")
					.addOption("mtime-asc", "Recently modified (oldest first)")
					.addOption("link-count-desc", "Most linked notes first")
					.addOption("alphabetical", "Alphabetical (A–Z)")
					.addOption("random", "Random")
					.setValue(this.plugin.settings.sortOrder)
					.onChange(async (value) => {
						this.plugin.settings.sortOrder = value as SortOrder;
						await this.plugin.saveSettings();
						this.plugin.refreshViews();
					})
			);

		new Setting(containerEl)
			.setName("Include direct links")
			.setDesc("Also show notes already linked to the anchor. Direct links are marked with a “linked” badge.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.includeDirectLinks)
					.onChange(async (value) => {
						this.plugin.settings.includeDirectLinks = value;
						await this.plugin.saveSettings();
						this.plugin.refreshViews();
					})
			);

		new Setting(containerEl)
			.setName("Auto-open sidebar on startup")
			.setDesc("Open the Hop-Link Viewer sidebar when Obsidian starts.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.autoOpenSidebar)
					.onChange(async (value) => {
						this.plugin.settings.autoOpenSidebar = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
