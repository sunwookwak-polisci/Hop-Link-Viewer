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
				name: "Display style",
				desc: "How to show suggestions: a unique-note list, or Chain walks that can repeat notes on each path.",
				control: {
					type: "dropdown",
					key: "hierarchyStyle",
					options: {
						list: "List (unique notes)",
						chain: "Chain (all paths)",
					},
				},
			},
			{
				name: "Hop depth",
				desc: "How far to walk from the current note. Hop 1 appears only when that style includes direct links.",
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
				desc: "For List, maximum unique notes. For Chain, maximum first-level items.",
				control: {
					type: "number",
					key: "displayCap",
					placeholder: "15",
					min: 1,
					step: 1,
					validate: (value) =>
						Number.isInteger(value) && value >= 1
							? undefined
							: "Display cap must be a whole number of 1 or more.",
				},
			},
			{
				name: "Nested list cap",
				desc: "For Chain only, maximum items in each nested list (second level and deeper). List is unchanged.",
				control: {
					type: "number",
					key: "nestedDisplayCap",
					placeholder: "5",
					min: 1,
					step: 1,
					validate: (value) =>
						Number.isInteger(value) && value >= 1
							? undefined
							: "Nested list cap must be a whole number of 1 or more.",
				},
			},
			{
				name: "List order",
				desc: "How to sort suggestions before applying the display cap and nested list cap.",
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
				name: "Anchor mode",
				desc: "How the viewer chooses the current note.",
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
				type: "group",
				heading: "Direct links",
				items: [
					{
						name: "List",
						desc: "Also show notes already linked to the anchor. Those rows use a “linked” badge. Off by default.",
						control: {
							type: "toggle",
							key: "includeDirectLinksList",
						},
					},
					{
						name: "Chain",
						desc: "Also show notes already linked to the anchor. Those rows use a “linked” badge. On by default.",
						control: {
							type: "toggle",
							key: "includeDirectLinksChain",
						},
					},
				],
			},
			{
				type: "group",
				heading: "Folders",
				items: [
					{
						name: "Excluded folder paths",
						desc: "One folder prefix per line. Notes under these paths are hidden from suggestions. They can still be the anchor, and the walk can still pass through them.",
						control: {
							type: "textarea",
							key: "excludedPaths",
							placeholder: "Daily Notes/\nTemplates/",
							rows: 4,
						},
					},
				],
			},
			{
				type: "group",
				heading: "Startup",
				items: [
					{
						name: "Auto-open sidebar on startup",
						desc: "Open the viewer in the sidebar when Obsidian starts.",
						control: {
							type: "toggle",
							key: "autoOpenSidebar",
						},
					},
				],
			},
		];
	}

	getControlValue(key: string): unknown {
		switch (key) {
			case "hops":
			case "displayCap":
			case "nestedDisplayCap":
			case "anchorMode":
			case "sortOrder":
			case "hierarchyStyle":
			case "includeDirectLinksList":
			case "includeDirectLinksChain":
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
			case "nestedDisplayCap":
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
			case "hierarchyStyle":
				if (value !== "list" && value !== "chain") {
					return;
				}
				this.plugin.settings.hierarchyStyle = value;
				break;
			case "includeDirectLinksList":
			case "includeDirectLinksChain":
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
