#!/usr/bin/python3
"""Renders every themed GTK3 widget in one window, for visual review.

Must run under /usr/bin/python3 — the Homebrew python3 on PATH has no gi.

A coverage gap in the stylesheet is visible here as an unstyled widget,
instead of surfacing later as a bug report from a real application.
"""

import argparse
import sys

try:
    import gi

    gi.require_version("Gtk", "3.0")
    gi.require_version("Gdk", "3.0")
    from gi.repository import Gtk, Gdk, GLib
except (ImportError, ValueError):
    sys.exit(
        "gallery.py needs PyGObject with GTK 3 bindings.\n"
        "Run it with /usr/bin/python3, not the python3 on PATH."
    )


def section(title):
    """A titled frame; every widget group in the gallery sits in one."""
    frame = Gtk.Frame(label=title)
    frame.set_label_align(0.02, 0.5)
    box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=6)
    box.set_border_width(10)
    frame.add(box)
    return frame, box


def row(*widgets, spacing=8):
    box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=spacing)
    for widget in widgets:
        box.pack_start(widget, False, False, 0)
    return box


def label(text, *style_classes):
    widget = Gtk.Label(label=text, xalign=0)
    for name in style_classes:
        widget.get_style_context().add_class(name)
    return widget


def surfaces_section():
    frame, box = section("Surfaces")
    # Each surface is a plain box carrying the class the stylesheet paints,
    # so a flat set of panes here means the surface ramp collapsed.
    for name in ("background", "view", "frame"):
        pane = Gtk.Box()
        pane.set_size_request(-1, 34)
        pane.get_style_context().add_class(name)
        pane.pack_start(label(f"  .{name}"), False, False, 0)
        box.pack_start(pane, False, False, 0)
    box.pack_start(Gtk.Separator(), False, False, 6)
    box.pack_start(label("A horizontal separator sits above this line"), False, False, 0)
    return frame


def text_section():
    frame, box = section("Text layers")
    box.pack_start(label("Primary body text — the default foreground"), False, False, 0)
    box.pack_start(label("Dimmed secondary text", "dim-label"), False, False, 0)
    box.pack_start(label("Warning text", "warning"), False, False, 0)
    box.pack_start(label("Error text", "error"), False, False, 0)
    box.pack_start(label("Success text", "success"), False, False, 0)
    linked = Gtk.LinkButton(uri="https://example.invalid", label="A link button")
    linked.set_halign(Gtk.Align.START)
    box.pack_start(linked, False, False, 0)
    return frame


def buttons_section():
    frame, box = section("Buttons")

    normal = Gtk.Button(label="Normal")
    hover = Gtk.Button(label="Hover")
    hover.set_state_flags(Gtk.StateFlags.PRELIGHT, False)
    active = Gtk.Button(label="Active")
    active.set_state_flags(Gtk.StateFlags.ACTIVE, False)
    disabled = Gtk.Button(label="Disabled")
    disabled.set_sensitive(False)
    box.pack_start(row(normal, hover, active, disabled), False, False, 0)

    suggested = Gtk.Button(label="Suggested")
    suggested.get_style_context().add_class("suggested-action")
    destructive = Gtk.Button(label="Destructive")
    destructive.get_style_context().add_class("destructive-action")
    toggle = Gtk.ToggleButton(label="Toggled")
    toggle.set_active(True)
    box.pack_start(row(suggested, destructive, toggle), False, False, 0)

    # The Fensterverwaltung-style row from the Settings dialogs: adjacent
    # buttons with no spacing, where an invisible border reads as one mass.
    linked_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL)
    linked_box.get_style_context().add_class("linked")
    for text in ("Left", "Middle", "Right"):
        linked_box.pack_start(Gtk.Button(label=text), False, False, 0)
    linked_box.set_halign(Gtk.Align.START)
    box.pack_start(linked_box, False, False, 0)

    toolbar = Gtk.Toolbar()
    for icon in ("go-previous", "go-next", "view-refresh", "document-open"):
        toolbar.insert(Gtk.ToolButton(icon_name=icon), -1)
    box.pack_start(toolbar, False, False, 0)
    return frame


def inputs_section():
    frame, box = section("Inputs")

    entry = Gtk.Entry()
    entry.set_text("Entry text")
    focused = Gtk.Entry()
    focused.set_text("Focused entry")
    focused.set_state_flags(Gtk.StateFlags.FOCUSED, False)
    box.pack_start(row(entry, focused), False, False, 0)

    spin = Gtk.SpinButton.new_with_range(0, 100, 1)
    spin.set_value(42)
    combo = Gtk.ComboBoxText()
    for text in ("First choice", "Second choice"):
        combo.append_text(text)
    combo.set_active(0)
    box.pack_start(row(spin, combo), False, False, 0)

    switch_off = Gtk.Switch()
    switch_on = Gtk.Switch()
    switch_on.set_active(True)
    switch_disabled = Gtk.Switch()
    switch_disabled.set_active(True)
    switch_disabled.set_sensitive(False)
    box.pack_start(
        row(
            label("Switch:"),
            switch_off,
            switch_on,
            switch_disabled,
        ),
        False,
        False,
        0,
    )

    check = Gtk.CheckButton(label="Unchecked")
    check_on = Gtk.CheckButton(label="Checked")
    check_on.set_active(True)
    radio = Gtk.RadioButton(label="Radio one")
    radio_two = Gtk.RadioButton.new_with_label_from_widget(radio, "Radio two")
    radio_two.set_active(True)
    box.pack_start(row(check, check_on, radio, radio_two), False, False, 0)

    scale = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 0, 100, 1)
    scale.set_value(60)
    scale.set_size_request(220, -1)
    box.pack_start(row(label("Scale:"), scale), False, False, 0)
    return frame


def tabs_section():
    frame, box = section("Tabs")
    notebook = Gtk.Notebook()
    for index, name in enumerate(("Active tab", "Second", "Third")):
        page = Gtk.Box(orientation=Gtk.Orientation.VERTICAL)
        page.set_border_width(10)
        page.pack_start(label(f"Contents of {name.lower()}"), False, False, 0)
        notebook.append_page(page, Gtk.Label(label=name))
        if index == 0:
            page.pack_start(Gtk.Separator(), False, False, 6)
    box.pack_start(notebook, False, False, 0)
    return frame


def lists_section():
    frame, box = section("Lists")

    store = Gtk.ListStore(str, str)
    for name, targets in (
        ("Vivid Life Midnight Blue", "Gtk3, Gtk2, Xfwm4"),
        ("Vivid Life Noon Red", "Gtk3, Gtk2, Xfwm4"),
        ("Adwaita", "Gtk3"),
    ):
        store.append([name, targets])
    tree = Gtk.TreeView(model=store)
    for index, title in enumerate(("Theme", "Targets")):
        tree.append_column(
            Gtk.TreeViewColumn(title, Gtk.CellRendererText(), text=index)
        )
    tree.get_selection().select_path(1)
    scroller = Gtk.ScrolledWindow()
    scroller.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.ALWAYS)
    scroller.set_size_request(-1, 110)
    scroller.add(tree)
    box.pack_start(scroller, False, False, 0)

    listbox = Gtk.ListBox()
    for index, (title, subtitle) in enumerate(
        (("Selected row", "Gtk3, Gtk2, Xfwm4"), ("Plain row", "Secondary line"))
    ):
        line = Gtk.Box(orientation=Gtk.Orientation.VERTICAL)
        line.set_border_width(6)
        line.pack_start(label(title), False, False, 0)
        line.pack_start(label(subtitle, "dim-label"), False, False, 0)
        listbox.insert(line, -1)
        if index == 0:
            listbox.select_row(listbox.get_row_at_index(0))
    box.pack_start(listbox, False, False, 0)
    return frame


def menus_section():
    frame, box = section("Menus")

    menubar = Gtk.MenuBar()
    for title in ("File", "Edit", "View"):
        item = Gtk.MenuItem(label=title)
        submenu = Gtk.Menu()
        for entry in ("Open", "Save", "Close"):
            submenu.append(Gtk.MenuItem(label=entry))
        submenu.append(Gtk.SeparatorMenuItem())
        submenu.append(Gtk.MenuItem(label="Quit"))
        item.set_submenu(submenu)
        menubar.append(item)
    box.pack_start(menubar, False, False, 0)

    # A dropdown rendered inline: a real popup would not be captured by a
    # window grab, and the menu/menuitem rules are what need reviewing.
    inline = Gtk.Box(orientation=Gtk.Orientation.VERTICAL)
    inline.get_style_context().add_class("menu")
    inline.set_border_width(4)
    for index, text in enumerate(("Open…", "Save as…", "Preferences", "Quit")):
        item = Gtk.Label(label=text, xalign=0)
        item.get_style_context().add_class("menuitem")
        if index == 2:
            item.set_state_flags(Gtk.StateFlags.PRELIGHT, False)
        inline.pack_start(item, False, False, 0)
    inline.set_halign(Gtk.Align.START)
    box.pack_start(inline, False, False, 0)
    return frame


def feedback_section():
    frame, box = section("Feedback")

    progress = Gtk.ProgressBar()
    progress.set_fraction(0.62)
    progress.set_show_text(True)
    progress.set_text("62%")
    box.pack_start(progress, False, False, 0)

    level = Gtk.LevelBar.new_for_interval(0, 100)
    level.set_value(72)
    box.pack_start(level, False, False, 0)

    for message_type, text in (
        (Gtk.MessageType.INFO, "Informational message"),
        (Gtk.MessageType.WARNING, "Warning message"),
        (Gtk.MessageType.ERROR, "Error message"),
    ):
        bar = Gtk.InfoBar()
        bar.set_message_type(message_type)
        bar.get_content_area().pack_start(label(text), False, False, 0)
        box.pack_start(bar, False, False, 0)

    # Tooltips only appear on hover, so the styled node is reproduced inline.
    tip = Gtk.Box()
    tip.get_style_context().add_class("tooltip")
    tip.set_border_width(6)
    tip.pack_start(label("Tooltip text"), False, False, 0)
    tip.set_halign(Gtk.Align.START)
    box.pack_start(tip, False, False, 0)

    spinner = Gtk.Spinner()
    spinner.start()
    box.pack_start(row(label("Spinner:"), spinner), False, False, 0)
    return frame


def xfce_section():
    """The Whisker Menu layout — a two-pane popup, categories beside apps.

    This is where the two-tone bug was reported: one pane painting
    bg_overlay and the other not.
    """
    frame, box = section("Xfce — Whisker Menu layout")

    popup = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=6)
    popup.get_style_context().add_class("menu")
    popup.set_border_width(6)

    search = Gtk.Entry()
    search.set_placeholder_text("Search…")
    popup.pack_start(search, False, False, 0)

    panes = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=6)

    categories = Gtk.ListBox()
    categories.set_size_request(140, -1)
    for index, name in enumerate(("Favorites", "Settings", "System", "Development")):
        entry = label(f"  {name}")
        categories.insert(entry, -1)
        if index == 1:
            categories.select_row(categories.get_row_at_index(1))
    panes.pack_start(categories, False, False, 0)

    apps = Gtk.ListBox()
    apps.set_size_request(220, -1)
    for name in ("Appearance", "Window Manager", "Panel", "Display"):
        apps.insert(label(f"  {name}"), -1)
    panes.pack_start(apps, True, True, 0)

    popup.pack_start(panes, False, False, 0)
    popup.set_halign(Gtk.Align.START)
    box.pack_start(popup, False, False, 0)
    return frame


SECTIONS = (
    surfaces_section,
    text_section,
    buttons_section,
    inputs_section,
    tabs_section,
    lists_section,
    menus_section,
    feedback_section,
    xfce_section,
)


def build_window(theme):
    window = Gtk.Window(title=f"Vivid Life widget gallery — {theme or 'default'}")
    # Natural height: a fixed one leaves dead space at the bottom of every
    # capture, which is wasted area in the contact sheets.
    window.set_default_size(1000, -1)
    window.connect("destroy", Gtk.main_quit)

    columns = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=12)
    columns.set_border_width(12)
    left = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=12)
    right = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=12)
    columns.pack_start(left, True, True, 0)
    columns.pack_start(right, True, True, 0)

    half = (len(SECTIONS) + 1) // 2
    for index, build in enumerate(SECTIONS):
        (left if index < half else right).pack_start(build(), False, False, 0)

    window.add(columns)
    return window


def capture(window, path):
    """Write the window to a PNG, then quit.

    Captured from the first `draw` rather than an idle callback: under Xvfb
    an idle handler routinely runs before the window has been mapped and
    painted, which grabs a blank surface.
    """
    state = {"done": False}

    def on_draw(widget, _cr):
        if state["done"]:
            return False
        state["done"] = True

        def grab():
            gdk_window = widget.get_window()
            pixbuf = Gdk.pixbuf_get_from_window(
                gdk_window,
                0,
                0,
                gdk_window.get_width(),
                gdk_window.get_height(),
            )
            if pixbuf is None:
                sys.exit(f"Could not grab the window contents for {path}")
            pixbuf.savev(path, "png", [], [])
            Gtk.main_quit()
            return False

        # One more turn of the loop after the first paint, so child widgets
        # that draw themselves later (spinner, level bar) are in the grab.
        GLib.timeout_add(400, grab)
        return False

    window.connect("draw", on_draw)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--theme", help="GTK theme name to render under")
    parser.add_argument("--screenshot", metavar="PATH", help="write a PNG and exit")
    args = parser.parse_args()

    if args.theme:
        Gtk.Settings.get_default().set_property("gtk-theme-name", args.theme)

    window = build_window(args.theme)
    if args.screenshot:
        capture(window, args.screenshot)
    window.show_all()
    Gtk.main()


if __name__ == "__main__":
    main()
