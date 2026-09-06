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

Each suggestion is a clickable link with a hop number (2, 3, …) to the right. Turn on **Include direct links** to also list 1-hop neighbors; those show a **linked** badge to the right of the name instead of a hop number.

### Viewer

Open it in the sidebar from the ribbon (**Open Hop-Link Viewer**) or the command palette (**Hop-Link Viewer: Open viewer in sidebar**). Each Obsidian window can have its own sidebar viewer and workspace pane viewer.

Use **Open viewer below active note** or **Open viewer to right of active note** to open the plugin in a workspace pane in the current window. When that pane is linked to a markdown or PDF tab with Obsidian’s **Link with tab**, its active-file anchor follows the linked tab. Unlinked viewers follow the active markdown or PDF file in the same window.

The viewer shows a hop-depth stepper (synced with Settings), a **Display** style control, the current anchor and its last-modified time, and suggestions up to your display cap. **List** keeps that many unique notes. **Chain** and **Single** keep that many first-level items and nest the rest without a further cap. Use **Hop-Link Viewer: Cycle display style** or the in-viewer control to switch between the unique-note **List**, **Chain** walks that can repeat notes along each path, and **Single**, which shows each note once with extra parent links nested below.

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
| **Display cap** | `15` | **List:** unique notes after sorting. **Chain / Single:** first-level items only; nested descendants are not capped. |
| **Excluded folder paths** | _(empty)_ | One prefix per line. Hidden from the list only; those notes can still be the anchor, and the walk can still pass through them. |
| **Anchor mode** | `active-file` | Which file is “you are here” |
| **List order** | `walk-order` | Sort before applying the display cap |
| **Display style** | `list` | Unique-note list, Chain, or Single |
| **Include direct links** | off | Show 1-hop neighbors with a `linked` badge |
| **Auto-open sidebar on startup** | off | Open the viewer in the sidebar when Obsidian starts |

### Anchor mode

The **anchor** can be a markdown note or a PDF. If none can be resolved, the viewer shows “No anchor found.” Images, canvases, and other file types are not anchors yet. A PDF used only as an embed inside a note is not an anchor until it is opened as its own tab.

| Mode | Behavior |
|------|----------|
| `active-file` | Linked markdown or PDF tab for a linked workspace viewer; otherwise, the active markdown or PDF file in the same window |
| `last-edited` | Most recently modified markdown or PDF file tracked while the plugin was enabled; before the first tracked edit, same fallback as `last-viewed` |
| `last-viewed` | Active markdown or PDF file if there is one; otherwise the first markdown or PDF file in recently opened files |

### List order

| Option | Behavior |
|--------|----------|
| `walk-order` | Breadth-first discovery order (default) |
| `mtime-desc` | Most recently modified first |
| `mtime-asc` | Oldest modified first |
| `link-count-desc` | Most vault links first |
| `alphabetical` | Title A–Z |
| `random` | Shuffled on each refresh |

### Display style

The **display cap** applies to unique notes in **List**, and to first-level items only in **Chain** and **Single**. Nested descendants are not capped (they are still limited by hop depth and filters). Children of first-level items omitted by the cap are not promoted into the first level. Chain can show more rows than the cap because the same note may appear on more than one path.

| Style | Behavior |
|-------|----------|
| `list` | Flat unique-note list (default). Unchanged from earlier versions, capped to unique notes. |
| `chain` | Nested walks from shown nodes that have no parent also in the suggestion set. Notes can repeat on different branches (`A → C → D` and `B → C → D` when direct links are included). When **Include direct links** is off, 1-hop neighbors are hidden and the next shown hop becomes the root (`C → D`). |
| `single` | Each note appears once, nested under its first previous-hop parent that is also shown. Extra parent notes are listed under the note without a “parents” label, and are not a second subtree. If that primary parent is not shown, the note is promoted to the top level. |

**Hop-Link Viewer: Cycle display style** walks List → Chain → Single → List and saves the same setting.

## How it works

1. Resolve the anchor from the selected mode (markdown or PDF).
2. Walk an undirected graph of **resolved** inlinks and outlinks (broken or unresolved links are ignored), up to N hops.
3. Keep markdown notes and PDFs as suggestions. Images, canvases, and other attachments are skipped even if they are linked.
4. Sort the full candidate set. **List** then keeps the display-cap unique notes. **Chain** and **Single** nest the full sorted set, then keep only display-cap first-level items; nested descendants are not capped. There is no other ranking.

## License

MIT — see [LICENSE](LICENSE).

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and pull requests.
