import {
	normalizePath,
	PluginSettingTab,
	type App,
	type SettingDefinitionItem,
} from "obsidian";
import type HopLinkViewerPlugin from "../main";
import type { HopLinkViewerSettings } from "./constants";

type SettingKey = keyof HopLinkViewerSettings;

export class HopLinkViewerSettingTab extends PluginSettingTab {
	plugin: HopLinkViewerPlugin;

	constructor(app: App, plugin: HopLinkViewerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	getSettingDefinitions(): SettingDefinitionItem<SettingKey>[] {
		return [
			{
				name: "Hop depth",
				desc: "Maximum hop distance from the anchor. Shows non-direct notes from hop 2 up to this depth; hop 1 appears only when direct links are included.",
				control: {
					type: "number",
					key: "hops",
					placeholder: "3",
					min: 1,
					step: 1,
					validate: (value) =>
						Number.isInteger(value) && value >= 1
							? undefined
							: "Hop depth must be a whole number of 1 or more.",
				},
			},
			{
				name: "Display cap",
				desc: "Maximum number of suggestions to show.",
				control: {
					type: "number",
					key: "displayCap",
					placeholder: "10",
					min: 1,
					step: 1,
					validate: (value) =>
						Number.isInteger(value) && value >= 1
							? undefined
							: "Display cap must be a whole number of 1 or more.",
				},
			},
			{
				name: "Excluded folder paths",
				desc: "One folder prefix per line. Notes under these paths are excluded from suggestions (not from anchor selection).",
				control: {
					type: "textarea",
					key: "excludedPaths",
					placeholder: "Daily Notes/\nTemplates/",
					rows: 4,
				},
			},
			{
				name: "Anchor mode",
				desc: "How the viewer chooses the anchor note for suggestions.",
				control: {
					type: "dropdown",
					key: "anchorMode",
					options: {
						"active-file": "Active file (focused pane)",
						"last-edited": "Last edited (tracked by this plugin)",
						"last-viewed": "Last viewed (active or recently opened)",
					},
				},
			},
			{
				name: "List order",
				desc: "How to sort suggestions before applying the display cap.",
				control: {
					type: "dropdown",
					key: "sortOrder",
					options: {
						"walk-order": "Graph walk order (default)",
						"mtime-desc": "Recently modified (newest first)",
						"mtime-asc": "Recently modified (oldest first)",
						"link-count-desc": "Most linked notes first",
						alphabetical: "Alphabetical (A–Z)",
						random: "Random",
					},
				},
			},
			{
				name: "Include direct links",
				desc: "Also show notes already linked to the anchor. Direct links are marked with a “linked” badge.",
				control: {
					type: "toggle",
					key: "includeDirectLinks",
				},
			},
			{
				name: "Auto-open sidebar on startup",
				desc: "Open the viewer in the sidebar when Obsidian starts.",
				control: {
					type: "toggle",
					key: "autoOpenSidebar",
				},
			},
		];
	}

	getControlValue(key: string): unknown {
		switch (key) {
			case "hops":
			case "displayCap":
			case "anchorMode":
			case "sortOrder":
			case "includeDirectLinks":
			case "autoOpenSidebar":
				return this.plugin.settings[key];
			case "excludedPaths":
				return this.plugin.settings.excludedPaths.join("\n");
			default:
				return undefined;
		}
	}

	async setControlValue(key: string, value: unknown): Promise<void> {
		switch (key) {
			case "hops":
			case "displayCap":
				if (typeof value !== "number" || !Number.isInteger(value) || value < 1) return;
				this.plugin.settings[key] = value;
				break;
			case "excludedPaths":
				if (typeof value !== "string") return;
				this.plugin.settings.excludedPaths = value
					.split("\n")
					.map((line) => line.trim())
					.filter((line) => line.length > 0)
					.map((line) => normalizePath(line));
				break;
			case "anchorMode":
				if (
					value !== "active-file" &&
					value !== "last-edited" &&
					value !== "last-viewed"
				) {
					return;
				}
				this.plugin.settings.anchorMode = value;
				break;
			case "sortOrder":
				if (
					value !== "walk-order" &&
					value !== "mtime-desc" &&
					value !== "mtime-asc" &&
					value !== "link-count-desc" &&
					value !== "alphabetical" &&
					value !== "random"
				) {
					return;
				}
				this.plugin.settings.sortOrder = value;
				break;
			case "includeDirectLinks":
			case "autoOpenSidebar":
				if (typeof value !== "boolean") return;
				this.plugin.settings[key] = value;
				break;
			default:
				return;
		}

		await this.plugin.saveSettings();
		this.plugin.refreshViews();
	}
}
