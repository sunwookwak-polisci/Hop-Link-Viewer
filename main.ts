import { Plugin, WorkspaceLeaf } from "obsidian";
import { DEFAULT_SETTINGS, VIEW_TYPE_HOP_LINK_VIEWER, type HopLinkViewerSettings } from "./src/constants";
import { HopLinkViewerView } from "./src/view";
import { HopLinkViewerSettingTab } from "./src/settings-tab";

export default class HopLinkViewerPlugin extends Plugin {
	settings: HopLinkViewerSettings = DEFAULT_SETTINGS;
	private refreshTimeout: number | null = null;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.registerView(VIEW_TYPE_HOP_LINK_VIEWER, (leaf) => new HopLinkViewerView(leaf, this));

		this.addRibbonIcon("git-branch", "Open Hop-Link Viewer", () => {
			this.activateView();
		});

		this.addCommand({
			id: "open-hop-link-viewer",
			name: "Open Hop-Link Viewer",
			callback: () => {
				this.activateView();
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
			this.app.vault.on("modify", () => {
				this.scheduleRefresh();
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
				this.activateView();
			});
		}
	}

	onunload(): void {
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_HOP_LINK_VIEWER);
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
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

		let leaf: WorkspaceLeaf | null = workspace.getLeavesOfType(VIEW_TYPE_HOP_LINK_VIEWER)[0] ?? null;

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

		if (leaf) {
			workspace.revealLeaf(leaf);
		}
	}
}
