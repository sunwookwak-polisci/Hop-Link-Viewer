# Hop-Link Viewer — Obsidian Plugin

Suggest notes **up to N hops** from an anchor note, skipping notes already linked to it by default. Built for serendipitous discovery of missing links in your vault.

## What it does

Hop-Link Viewer walks your vault’s link graph outward from an **anchor** and lists nearby notes that are **not yet connected** to it. It opens in the right sidebar by default, with commands for opening it below or beside the active note.

A link counts in either direction: notes the anchor points to, and notes that point back. By default the sidebar skips those already-connected notes, so you see **missing** links instead of the same neighbors Obsidian already shows.

### Example

Anchor: **Project Alpha**, which links to **Jane Smith** and **Budget 2024**.

| Distance | Meaning | Shown by default? |
|----------|---------|-------------------|
| **1-hop** | Direct neighbors — Jane, Budget (either direction) | No |
| **2-hop** | Linked from Jane or Budget, but not from Project Alpha — e.g. **Conference talk**, **Prior grant** | Yes |
| **3-hop** | One step further — e.g. a paper cited on Conference talk | Yes, up to your hop depth |

Each suggestion is a clickable link with a hop number (2, 3, …). Turn on **Include direct links** to also list 1-hop neighbors; those show a **linked** badge instead of a hop number.

### Viewer

Open it in the sidebar from the ribbon (**Open Hop-Link Viewer**) or the command palette (**Hop-Link Viewer: Open viewer in sidebar**).

Use **Open viewer below active note** or **Open viewer to right of active note** to open the plugin in a workspace pane. When that pane is linked to a Markdown tab with Obsidian’s **Link with tab**, its active-file anchor follows the linked tab. The sidebar and any unlinked workspace viewer continue to follow the globally active note.

The viewer shows a hop-depth stepper (synced with Settings), the current anchor and its last-modified time, and up to your display cap of suggestions (default 10).

Click or tap a suggestion to open it. On desktop, Ctrl/Cmd-click or middle-click opens a new tab. The list refreshes when you switch notes, open files, edit, or when link metadata updates. No query language or templates.

Typical uses: spotting related notes while writing, finding “obvious in hindsight” links between clusters, or raising hop depth / shuffling sort order to wander nearby ideas.

## Install

Requires Obsidian 1.13.0 or newer.

1. Open **Settings → Community plugins**.
2. Turn off **Restricted mode** if it is on.
3. Click **Browse**, search for **Hop-Link Viewer**, then install and enable it.


## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| **Hop depth** | `3` | How far to walk from the anchor. Hop 1 appears only with **Include direct links**. |
| **Display cap** | `10` | Maximum suggestions after sorting |
| **Excluded folder paths** | _(empty)_ | One prefix per line. Hidden from the list only; those notes can still be the anchor, and the walk can still pass through them. |
| **Anchor mode** | `active-file` | Which note is “you are here” |
| **List order** | `walk-order` | Sort before applying the display cap |
| **Include direct links** | off | Show 1-hop neighbors with a `linked` badge |
| **Auto-open sidebar on startup** | off | Open the viewer in the sidebar when Obsidian starts |

### Anchor mode

The **anchor** must be a markdown note. If none can be resolved, the viewer shows “No anchor note found.” (Updates to support other file types are planned.)

| Mode | Behavior |
|------|----------|
| `active-file` | Linked Markdown tab for a linked workspace viewer; otherwise, the Markdown note in the focused pane |
| `last-edited` | Most recently modified markdown file tracked while the plugin was enabled; before the first tracked edit, same fallback as `last-viewed` |
| `last-viewed` | Active markdown file if there is one; otherwise the first markdown file in recently opened files |

### List order

| Option | Behavior |
|--------|----------|
| `walk-order` | Breadth-first discovery order (default) |
| `mtime-desc` | Most recently modified first |
| `mtime-asc` | Oldest modified first |
| `link-count-desc` | Most vault links first |
| `alphabetical` | Title A–Z |
| `random` | Shuffled on each refresh |

## How it works

1. Resolve the anchor from the selected mode.
2. Walk an undirected graph of **resolved** inlinks and outlinks (broken or unresolved links are ignored), up to N hops.
3. Keep markdown notes and PDFs as suggestions. Images, canvases, and other attachments are skipped even if they are linked.
4. Sort the full candidate set, then apply the display cap. There is no other ranking.

## License

MIT — see [LICENSE](LICENSE).

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and pull requests.
