#!/usr/bin/python3
"""Renders every themed GTK2 widget in one window, for visual review.

Must run under /usr/bin/python3 — the Homebrew python3 on PATH has no gi.

Separate from gallery.py and gallery4.py for the same reason those are
separate from each other: gi.require_version pins one GTK major version per
interpreter, so a shared script is impossible even in principle.

This exists because `pinentry-gtk-2` — the only GTK2 application on a normal
modern machine — renders a dialog, a label, an entry and two buttons, and
nothing else. Everything else the GTK2 theme styles (menus, notebooks,
tree/column headers, toolbars, combo boxes, frames, scrolled windows) was
otherwise verified only by the gtkrc parser accepting it, which says nothing
about whether a rule reaches a widget. The GTK4 pass proved that gap is not
theoretical: two widgets there rendered nothing at all while parsing cleanly
and passing every test.

The sections mirror gallery.py's and gallery4.py's so the contact sheets can
be read side by side, minus widgets GTK2 does not have.
"""

import argparse
import sys

try:
    import gi

    gi.require_version("Gtk", "2.0")
    from gi.repository import Gtk, GLib, GObject
except (ImportError, ValueError):
    sys.exit(
        "gallery2.py needs PyGObject with GTK 2 bindings.\n"
        "Install them with: sudo apt install gir1.2-gtk-2.0\n"
        "Run it with /usr/bin/python3, not the python3 on PATH."
    )


def section(title):
    """A titled frame; every widget group in the gallery sits in one."""
    frame = Gtk.Frame(label=title)
    box = Gtk.VBox(spacing=6)
    box.set_border_width(8)
    frame.add(box)
    return frame, box


def row(*widgets, **kwargs):
    box = Gtk.HBox(spacing=kwargs.get("spacing", 8))
    for widget in widgets:
        box.pack_start(widget, False, False, 0)
    return box


def label(text):
    widget = Gtk.Label(label=text)
    widget.set_alignment(0.0, 0.5)
    return widget


def surfaces_section():
    frame, box = section("Surfaces")
    box.pack_start(label("window background"), False, False, 0)

    # A GtkTextView is the closest GTK2 analogue of the .view surface the
    # GTK3/GTK4 galleries show: it is the widget whose base colour the
    # theme's view style sets, as distinct from the window's bg.
    view = Gtk.TextView()
    view.get_buffer().set_text("text view — the view surface")
    view.set_size_request(-1, 40)
    scrolled = Gtk.ScrolledWindow()
    scrolled.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC)
    scrolled.set_shadow_type(Gtk.ShadowType.IN)
    scrolled.add(view)
    box.pack_start(scrolled, False, False, 0)

    box.pack_start(Gtk.HSeparator(), False, False, 0)
    box.pack_start(label("a separator sits above this line"), False, False, 0)
    return frame


def menus_section():
    """Unreachable via pinentry — the largest single gap this gallery closes."""
    frame, box = section("Menus")
    menubar = Gtk.MenuBar()
    for name in ("File", "Edit", "View"):
        item = Gtk.MenuItem(label=name)
        submenu = Gtk.Menu()
        for entry in ("Open", "Save"):
            submenu.append(Gtk.MenuItem(label=entry))
        submenu.append(Gtk.SeparatorMenuItem())
        submenu.append(Gtk.MenuItem(label="Quit"))
        item.set_submenu(submenu)
        menubar.append(item)
    box.pack_start(menubar, False, False, 0)

    toolbar = Gtk.Toolbar()
    toolbar.set_style(Gtk.ToolbarStyle.TEXT)
    for name in ("Open", "Save", "Undo"):
        toolbar.insert(Gtk.ToolButton(label=name), -1)
    box.pack_start(toolbar, False, False, 0)
    return frame


def inputs_section():
    frame, box = section("Inputs")
    entry = Gtk.Entry()
    entry.set_text("Editable text")
    box.pack_start(entry, False, False, 0)

    combo = Gtk.ComboBoxText()
    for name in ("Midnight", "Twilight", "Dawn", "Noon"):
        combo.append_text(name)
    combo.set_active(0)
    box.pack_start(row(label("Dropdown:"), combo), False, False, 0)

    # new_with_label, not the `label=` property: under GTK2's bindings the
    # property form constructs the button but renders no text, which makes a
    # capture look like the theme lost the label.
    check = Gtk.CheckButton.new_with_label("Checked")
    check.set_active(True)
    unchecked = Gtk.CheckButton.new_with_label("Unchecked")
    box.pack_start(row(check, unchecked), False, False, 0)

    # A lone radio cannot show the unselected state — GTK keeps a single
    # radio active — so the pair is what makes the indicator legible.
    # ..._from_widget, not new_with_label(None, …): the group argument of the
    # latter is a GSList that PyGObject will not accept as None, and the
    # failure is a hard TypeError at construction, not a missing label.
    selected = Gtk.RadioButton.new_with_label_from_widget(None, "Selected")
    unselected = Gtk.RadioButton.new_with_label_from_widget(selected, "Unselected")
    selected.set_active(True)
    box.pack_start(row(selected, unselected), False, False, 0)

    scale = Gtk.HScale.new_with_range(0, 100, 1)
    scale.set_value(60)
    scale.set_size_request(180, -1)
    box.pack_start(row(label("Scale:"), scale), False, False, 0)

    spin = Gtk.SpinButton.new_with_range(0, 100, 1)
    spin.set_value(42)
    box.pack_start(row(label("Spin:"), spin), False, False, 0)
    return frame


def buttons_section():
    frame, box = section("Buttons")
    normal = Gtk.Button(label="Normal")
    disabled = Gtk.Button(label="Disabled")
    disabled.set_sensitive(False)
    toggle = Gtk.ToggleButton(label="Toggled")
    toggle.set_active(True)
    box.pack_start(row(normal, disabled, toggle), False, False, 0)

    progress = Gtk.ProgressBar()
    progress.set_fraction(0.62)
    progress.set_text("62%")
    box.pack_start(progress, False, False, 0)
    return frame


def lists_section():
    """Column headers are GtkButtons, so they need their own binding."""
    frame, box = section("Lists")
    store = Gtk.ListStore(GObject.TYPE_STRING, GObject.TYPE_STRING)
    store.append(["First row", "alpha"])
    store.append(["Second row", "beta"])
    store.append(["Third row", "gamma"])

    tree = Gtk.TreeView(model=store)
    for index, title in enumerate(("Name", "Value")):
        column = Gtk.TreeViewColumn(title, Gtk.CellRendererText(), text=index)
        column.set_resizable(True)
        tree.append_column(column)
    tree.get_selection().select_path(1)
    tree.set_size_request(-1, 80)

    scrolled = Gtk.ScrolledWindow()
    scrolled.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC)
    scrolled.set_shadow_type(Gtk.ShadowType.IN)
    scrolled.add(tree)
    box.pack_start(scrolled, False, False, 0)
    return frame


def notebook_section():
    frame, box = section("Chrome")
    notebook = Gtk.Notebook()

    # A toggled button and a checked box ON a page, not just beside the
    # notebook. gtkrc bindings are path-based, so "inside a notebook" is a
    # genuinely different context: a rule written for tab labels can reach
    # page content and mute it. That shipped once — the page-button label
    # rendered at 1.03:1 on Dawn Red — and every contact sheet missed it,
    # because this section held only plain labels. The control for these two
    # is the identical pair in buttons_section() and inputs_section(), which
    # sit outside any notebook; the two must match.
    first = Gtk.VBox(spacing=6)
    first.set_border_width(8)
    toggled = Gtk.ToggleButton.new_with_label("Toggled on a page")
    toggled.set_active(True)
    first.pack_start(toggled, False, False, 0)
    checked = Gtk.CheckButton.new_with_label("Checked on a page")
    checked.set_active(True)
    first.pack_start(checked, False, False, 0)
    notebook.append_page(first, Gtk.Label(label="First"))

    # A composite tab label — an hbox, not a bare label — sits one level
    # deeper in the path than a plain tab. A binding narrow enough to spare
    # page content can be too narrow to reach this, so both tab shapes have
    # to be on the sheet for the pair of rules to be checkable at all.
    composite = Gtk.HBox(spacing=4)
    composite.pack_start(Gtk.Label(label="Composite"), False, False, 0)
    composite.show_all()
    notebook.append_page(label("  composite-tab page  "), composite)

    notebook.append_page(label("  Third page  "), Gtk.Label(label="Third"))
    box.pack_start(notebook, False, False, 0)
    return frame


def build_window():
    window = Gtk.Window(type=Gtk.WindowType.TOPLEVEL)
    window.set_default_size(720, 900)
    outer = Gtk.VBox(spacing=8)
    outer.set_border_width(10)
    for build in (
        surfaces_section,
        menus_section,
        buttons_section,
        inputs_section,
        lists_section,
        notebook_section,
    ):
        outer.pack_start(build(), False, False, 0)
    window.add(outer)
    return window


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--theme", help="theme name, for the window title only")
    parser.add_argument(
        "--screenshot",
        help="hold the window open for an external capture, then quit",
    )
    args = parser.parse_args()

    window = build_window()
    window.set_title(f"Vivid Life — GTK2 — {args.theme or 'default'}")
    window.connect("destroy", Gtk.main_quit)
    window.show_all()

    if args.screenshot:
        # Same split as gallery4.py: the capture is import(1)'s job in
        # shots2.sh, and this only holds the window open long enough for it.
        GLib.timeout_add_seconds(6, lambda: Gtk.main_quit() or False)

    Gtk.main()


if __name__ == "__main__":
    main()
