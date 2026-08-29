import {
	MarkdownView,
	Platform,
	Plugin,
	TFile,
	WorkspaceLeaf,
	WorkspaceTabs,
	type WorkspaceContainer,
} from "obsidian";
import {
	DEFAULT_SETTINGS,
	VIEW_TYPE_HOP_LINK_VIEWER,
	type HopLinkViewerSettings,
	type ViewerLocation,
} from "./src/constants";
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
	} else if (typeof value.autoOpenViewer === "boolean") {
		settings.autoOpenSidebar = value.autoOpenViewer;
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
			void this.activateView("sidebar");
		});

		this.addCommand({
			id: "open-view",
			name: "Open viewer in sidebar",
			callback: () => {
				void this.activateView("sidebar");
			},
		});

		this.addCommand({
			id: "open-view-below",
			name: "Open viewer below active note",
			callback: () => {
				void this.activateView("below");
			},
		});

		this.addCommand({
			id: "open-view-right",
			name: "Open viewer to right of active note",
			callback: () => {
				void this.activateView("right");
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
				void this.activateView("sidebar");
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

	async activateView(location: ViewerLocation = "sidebar"): Promise<void> {
		const { workspace } = this.app;
		const container = this.getActiveContainer();
		let leaf: WorkspaceLeaf | null | undefined;

		if (location === "sidebar") {
			leaf = await this.ensureSidebarView(container);
		} else {
			const paneLeaves = this.getViewerLeavesInContainer(container).filter((existingLeaf) =>
				this.isRootLeaf(existingLeaf)
			);
			const referenceLeaf = this.getSplitReferenceLeaf(container, new Set(paneLeaves));

			await this.ensureSidebarView(container);
			paneLeaves.forEach((paneLeaf) => {
				paneLeaf.detach();
			});

			leaf = this.createViewerLeaf(location, container, referenceLeaf);
			await leaf?.setViewState({
				type: VIEW_TYPE_HOP_LINK_VIEWER,
				active: true,
			});
		}

		if (!leaf) return;

		await workspace.revealLeaf(leaf);
	}

	private async ensureSidebarView(
		container: WorkspaceContainer = this.getActiveContainer()
	): Promise<WorkspaceLeaf | null> {
		const windowLeaves = this.getViewerLeavesInContainer(container);
		let leaf = windowLeaves.find((existingLeaf) => !this.isRootLeaf(existingLeaf));

		if (!leaf && this.windowHasNoSidebar(container)) {
			leaf = windowLeaves[0];
		}

		if (!leaf) {
			leaf = this.createViewerLeaf("sidebar", container, null) ?? undefined;
			await leaf?.setViewState({
				type: VIEW_TYPE_HOP_LINK_VIEWER,
				active: false,
			});
		}

		return leaf ?? null;
	}

	private createViewerLeaf(
		location: ViewerLocation,
		container: WorkspaceContainer,
		referenceLeaf: WorkspaceLeaf | null
	): WorkspaceLeaf | null {
		const { workspace } = this.app;

		switch (location) {
			case "below":
			case "right": {
				if (Platform.isMobile) {
					return workspace.getLeaf("tab");
				}

				const direction = location === "below" ? "horizontal" : "vertical";
				return referenceLeaf
					? workspace.createLeafBySplit(referenceLeaf, direction)
					: workspace.getLeaf("split", direction);
			}
			case "sidebar":
			default:
				return this.createSidebarLeaf(container);
		}
	}

	private createSidebarLeaf(container: WorkspaceContainer): WorkspaceLeaf | null {
		const { workspace } = this.app;

		if (this.isMainWindowContainer(container) || Platform.isMobile) {
			return workspace.getRightLeaf(false);
		}

		const sidebarLeaves: WorkspaceLeaf[] = [];
		workspace.iterateAllLeaves((leaf) => {
			if (this.isLeafInContainer(leaf, container) && !this.isRootLeaf(leaf)) {
				sidebarLeaves.push(leaf);
			}
		});

		const sidebarHost = sidebarLeaves[0]?.parent;
		if (sidebarHost instanceof WorkspaceTabs) {
			return workspace.createLeafInParent(sidebarHost.parent, 0);
		}

		return workspace.getLeaf("tab");
	}

	private getActiveContainer(): WorkspaceContainer {
		const focusedWin = window.activeWindow;
		const recent = this.app.workspace.getMostRecentLeaf();
		if (recent && recent.getContainer().win === focusedWin) {
			return recent.getContainer();
		}

		const focusedLeaves: WorkspaceContainer[] = [];
		this.app.workspace.iterateAllLeaves((leaf) => {
			if (focusedLeaves.length > 0) return;
			const container = leaf.getContainer();
			if (container.win === focusedWin) {
				focusedLeaves.push(container);
			}
		});
		return focusedLeaves[0] ?? this.app.workspace.rootSplit;
	}

	private isMainWindowContainer(container: WorkspaceContainer): boolean {
		return container.win === window;
	}

	private isLeafInContainer(leaf: WorkspaceLeaf, container: WorkspaceContainer): boolean {
		return leaf.getContainer().win === container.win;
	}

	private getViewerLeavesInContainer(container: WorkspaceContainer): WorkspaceLeaf[] {
		return this.app.workspace
			.getLeavesOfType(VIEW_TYPE_HOP_LINK_VIEWER)
			.filter((leaf) => this.isLeafInContainer(leaf, container));
	}

	private windowHasNoSidebar(container: WorkspaceContainer): boolean {
		if (this.isMainWindowContainer(container) || Platform.isMobile) {
			return false;
		}

		const sidebarLeaves: WorkspaceLeaf[] = [];
		this.app.workspace.iterateAllLeaves((leaf) => {
			if (this.isLeafInContainer(leaf, container) && !this.isRootLeaf(leaf)) {
				sidebarLeaves.push(leaf);
			}
		});
		return sidebarLeaves.length === 0;
	}

	private isRootLeaf(targetLeaf: WorkspaceLeaf): boolean {
		let isRootLeaf = false;
		this.app.workspace.iterateRootLeaves((leaf) => {
			if (leaf === targetLeaf) {
				isRootLeaf = true;
			}
		});
		return isRootLeaf;
	}

	private getSplitReferenceLeaf(
		container: WorkspaceContainer,
		excludedLeaves = new Set<WorkspaceLeaf>()
	): WorkspaceLeaf | null {
		const { workspace } = this.app;
		const activeMarkdownLeaf = workspace.getActiveViewOfType(MarkdownView)?.leaf;
		if (
			activeMarkdownLeaf &&
			!excludedLeaves.has(activeMarkdownLeaf) &&
			this.isLeafInContainer(activeMarkdownLeaf, container)
		) {
			return activeMarkdownLeaf;
		}

		const recentLeaf = workspace.getMostRecentLeaf(container);
		if (recentLeaf && !excludedLeaves.has(recentLeaf)) {
			return recentLeaf;
		}

		let fallbackLeaf: WorkspaceLeaf | null = null;
		workspace.iterateRootLeaves((leaf) => {
			if (!fallbackLeaf && !excludedLeaves.has(leaf) && this.isLeafInContainer(leaf, container)) {
				fallbackLeaf = leaf;
			}
		});
		return fallbackLeaf;
	}
}
