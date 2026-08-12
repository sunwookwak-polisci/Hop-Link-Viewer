import { Plugin, TFile, WorkspaceLeaf } from "obsidian";
import { DEFAULT_SETTINGS, VIEW_TYPE_HOP_LINK_VIEWER, type HopLinkViewerSettings } from "./src/constants";
import { HopLinkViewerView } from "./src/view";
import { HopLinkViewerSettingTab } from "./src/settings-tab";

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function parseSettings(value: unknown): HopLinkViewerSettings {
	const settings: HopLinkViewerSettings = {
		...DEFAULT_SETTINGS,
		excludedPaths: [...DEFAULT_SETTINGS.excludedPaths],
	};

	if (!isRecord(value)) return settings;

	if (typeof value.hops === "number" && Number.isInteger(value.hops) && value.hops >= 1) {
		settings.hops = value.hops;
	}
	if (
		typeof value.displayCap === "number" &&
		Number.isInteger(value.displayCap) &&
		value.displayCap >= 1
	) {
		settings.displayCap = value.displayCap;
	}
	if (Array.isArray(value.excludedPaths)) {
		settings.excludedPaths = value.excludedPaths.filter(
			(path): path is string => typeof path === "string"
		);
	}
	if (
		value.anchorMode === "active-file" ||
		value.anchorMode === "last-edited" ||
		value.anchorMode === "last-viewed"
	) {
		settings.anchorMode = value.anchorMode;
	}
	if (
		value.sortOrder === "walk-order" ||
		value.sortOrder === "mtime-desc" ||
		value.sortOrder === "mtime-asc" ||
		value.sortOrder === "link-count-desc" ||
		value.sortOrder === "alphabetical" ||
		value.sortOrder === "random"
	) {
		settings.sortOrder = value.sortOrder;
	}
	if (typeof value.includeDirectLinks === "boolean") {
		settings.includeDirectLinks = value.includeDirectLinks;
	}
	if (typeof value.autoOpenSidebar === "boolean") {
		settings.autoOpenSidebar = value.autoOpenSidebar;
	}

	return settings;
}

function parseLastEditedPath(value: unknown): string | null {
	if (!isRecord(value) || typeof value.lastEditedPath !== "string") return null;
	return value.lastEditedPath;
}

export default class HopLinkViewerPlugin extends Plugin {
	settings: HopLinkViewerSettings = DEFAULT_SETTINGS;
	lastEditedPath: string | null = null;
	private refreshTimeout: number | null = null;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.registerView(VIEW_TYPE_HOP_LINK_VIEWER, (leaf) => new HopLinkViewerView(leaf, this));

		this.addRibbonIcon("git-branch", "Open Hop-Link Viewer", () => {
			void this.activateView();
		});

		this.addCommand({
			id: "open-view",
			name: "Open viewer",
			callback: () => {
				void this.activateView();
			},
		});

		this.addSettingTab(new HopLinkViewerSettingTab(this.app, this));

		this.registerEvent(
			this.app.workspace.on("active-leaf-change", () => {
				this.scheduleRefresh();
			})
		);

		this.registerEvent(
			this.app.workspace.on("file-open", () => {
				this.scheduleRefresh();
			})
		);

		this.registerEvent(
			this.app.vault.on("modify", (file) => {
				if (file instanceof TFile && file.extension === "md") {
					void this.setLastEditedPath(file.path);
				}
				this.scheduleRefresh();
			})
		);

		this.registerEvent(
			this.app.vault.on("rename", (file, oldPath) => {
				if (oldPath === this.lastEditedPath) {
					void this.setLastEditedPath(
						file instanceof TFile && file.extension === "md" ? file.path : null
					);
				}
			})
		);

		this.registerEvent(
			this.app.vault.on("delete", (file) => {
				if (file.path === this.lastEditedPath) {
					void this.setLastEditedPath(null);
				}
			})
		);

		this.registerEvent(
			this.app.metadataCache.on("resolved", () => {
				this.scheduleRefresh();
			})
		);

		this.registerEvent(
			this.app.metadataCache.on("changed", () => {
				this.scheduleRefresh();
			})
		);

		if (this.settings.autoOpenSidebar) {
			this.app.workspace.onLayoutReady(() => {
				void this.activateView();
			});
		}
	}

	onunload(): void {
		if (this.refreshTimeout !== null) {
			window.clearTimeout(this.refreshTimeout);
			this.refreshTimeout = null;
		}
	}

	async loadSettings(): Promise<void> {
		const savedSettings: unknown = await this.loadData();
		this.settings = parseSettings(savedSettings);
		this.lastEditedPath = parseLastEditedPath(savedSettings);
	}

	async saveSettings(): Promise<void> {
		await this.savePluginData();
	}

	private async setLastEditedPath(path: string | null): Promise<void> {
		if (path === this.lastEditedPath) return;
		this.lastEditedPath = path;
		await this.savePluginData();
	}

	private async savePluginData(): Promise<void> {
		await this.saveData({
			...this.settings,
			lastEditedPath: this.lastEditedPath,
		});
	}

	scheduleRefresh(): void {
		if (this.refreshTimeout !== null) {
			window.clearTimeout(this.refreshTimeout);
		}
		this.refreshTimeout = window.setTimeout(() => {
			this.refreshTimeout = null;
			this.refreshViews();
		}, 200);
	}

	refreshViews(): void {
		this.app.workspace.getLeavesOfType(VIEW_TYPE_HOP_LINK_VIEWER).forEach((leaf) => {
			const view = leaf.view;
			if (view instanceof HopLinkViewerView) {
				view.render();
			}
		});
	}

	async activateView(): Promise<void> {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | undefined = workspace.getLeavesOfType(
			VIEW_TYPE_HOP_LINK_VIEWER
		)[0];

		if (!leaf) {
			const rightLeaf = workspace.getRightLeaf(false);
			if (rightLeaf) {
				await rightLeaf.setViewState({
					type: VIEW_TYPE_HOP_LINK_VIEWER,
					active: true,
				});
				leaf = rightLeaf;
			}
		}

		if (!leaf) return;

		await workspace.revealLeaf(leaf);
	}
}
