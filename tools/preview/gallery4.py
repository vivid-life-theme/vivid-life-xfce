#!/usr/bin/python3
"""Renders every themed GTK4 widget in one window, for visual review.

Must run under /usr/bin/python3 — the Homebrew python3 on PATH has no gi.

Separate from gallery.py because gi.require_version pins one GTK major
version per interpreter: GTK3 and GTK4 cannot be imported into the same
process, so a shared script is not possible even in principle.

The sections mirror gallery.py's so the two contact sheets can be read
side by side, but the widgets differ where GTK4 removed or renamed one.
"""

import argparse
import sys

try:
    import gi

    gi.require_version("Gtk", "4.0")
    from gi.repository import Gtk, GLib
except (ImportError, ValueError):
    sys.exit(
        "gallery4.py needs PyGObject with GTK 4 bindings.\n"
        "Install them with: sudo apt install gir1.2-gtk-4.0\n"
        "Run it with /usr/bin/python3, not the python3 on PATH."
    )


def section(title):
    """A titled frame; every widget group in the gallery sits in one."""
    frame = Gtk.Frame(label=title)
    box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=6)
    box.set_margin_top(10)
    box.set_margin_bottom(10)
    box.set_margin_start(10)
    box.set_margin_end(10)
    frame.set_child(box)
    return frame, box


def row(*widgets, spacing=8):
    box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=spacing)
    for widget in widgets:
        box.append(widget)
    return box


def label(text, *style_classes):
    widget = Gtk.Label(label=text, xalign=0)
    for name in style_classes:
        widget.add_css_class(name)
    return widget


def surfaces_section():
    frame, box = section("Surfaces")
    # A flat set of panes here means the surface ramp collapsed — the exact
    # defect the GTK3 sweep opened with.
    for name in ("background", "view", "frame"):
        pane = Gtk.Box(orientation=Gtk.Orientation.VERTICAL)
        pane.add_css_class(name)
        pane.set_size_request(-1, 34)
        pane.append(label(f"  .{name}"))
        box.append(pane)
    box.append(Gtk.Separator())
    box.append(label("A horizontal separator sits above this line"))
    return frame


def buttons_section():
    frame, box = section("Buttons")
    normal = Gtk.Button(label="Normal")
    suggested = Gtk.Button(label="Suggested")
    suggested.add_css_class("suggested-action")
    destructive = Gtk.Button(label="Destructive")
    destructive.add_css_class("destructive-action")
    disabled = Gtk.Button(label="Disabled")
    disabled.set_sensitive(False)
    box.append(row(normal, suggested, destructive, disabled))

    linked = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL)
    linked.add_css_class("linked")
    for caption in ("One", "Two", "Three"):
        linked.append(Gtk.Button(label=caption))
    box.append(row(linked))

    # GtkToolbar was removed in GTK4; .toolbar on a box is what remains.
    toolbar = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=4)
    toolbar.add_css_class("toolbar")
    for caption in ("Open", "Save", "Undo"):
        flat = Gtk.Button(label=caption)
        flat.add_css_class("flat")
        toolbar.append(flat)
    box.append(toolbar)
    return frame


def inputs_section():
    frame, box = section("Inputs")
    entry = Gtk.Entry()
    entry.set_text("Editable text")
    placeholder = Gtk.Entry()
    placeholder.set_placeholder_text("Placeholder")
    box.append(row(entry, placeholder))

    spin = Gtk.SpinButton.new_with_range(0, 100, 1)
    spin.set_value(42)
    box.append(row(label("Spin:"), spin))

    scale = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 0, 100, 1)
    scale.set_value(60)
    scale.set_size_request(220, -1)
    marked = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 0, 100, 1)
    marked.set_value(35)
    marked.set_size_request(220, -1)
    for position in (0, 50, 100):
        marked.add_mark(position, Gtk.PositionType.BOTTOM, str(position))
    box.append(row(label("Scale:"), scale, marked))

    # Both states of each indicator, not just the active one. An unchecked box
    # and an unselected radio are the states that show whether the indicator
    # has an edge against the surface at all — the checked ones are filled with
    # accent and legible almost by construction. A sheet holding only the
    # active state cannot answer the question the sheet exists to answer.
    check = Gtk.CheckButton(label="Checked")
    check.set_active(True)
    unchecked = Gtk.CheckButton(label="Unchecked")
    radio = Gtk.CheckButton(label="Selected")
    unselected = Gtk.CheckButton(label="Unselected")
    unselected.set_group(radio)
    radio.set_active(True)
    box.append(row(check, unchecked, radio, unselected))

    # Both switch states, and the disabled pair — switch:disabled painted no
    # pixels at all until this round, and nothing on the sheet would have shown
    # it.
    toggle = Gtk.Switch()
    toggle.set_active(True)
    off = Gtk.Switch()
    disabled_on = Gtk.Switch()
    disabled_on.set_active(True)
    disabled_on.set_sensitive(False)
    disabled_off = Gtk.Switch()
    disabled_off.set_sensitive(False)
    box.append(row(label("Switch:"), toggle, off, disabled_on, disabled_off))

    # GtkComboBoxText is deprecated in GTK4; GtkDropDown is the replacement.
    drop = Gtk.DropDown.new_from_strings(["Midnight", "Twilight", "Dawn", "Noon"])
    box.append(row(label("Dropdown:"), drop))
    return frame


def feedback_section():
    frame, box = section("Feedback")
    progress = Gtk.ProgressBar()
    progress.set_fraction(0.62)
    box.append(progress)
    for value, caption in ((15, "low"), (50, "filled"), (90, "high")):
        level = Gtk.LevelBar.new_for_interval(0, 100)
        level.set_value(value)
        # Without this the bar collapses to its ~2px minimum and the capture
        # shows a sliver, which reads as a theme defect but is not one: GTK4
        # sets min-width only for .discrete and .vertical level bars, so a
        # horizontal continuous bar collapses under Adwaita too.
        level.set_hexpand(True)
        # GtkLevelBar's built-in "low"/"high" offsets are defined against the
        # default 0-1 interval, so a bar built with new_for_interval(0, 100)
        # never applies those classes and every bar renders plain accent. The
        # .low/.high/.full rules then go unexercised, which looks like they
        # work. Restate the offsets in this interval's own units.
        level.add_offset_value("low", 25)
        level.add_offset_value("high", 75)
        level.add_offset_value("full", 100)
        box.append(row(label(f"Level ({caption}):"), level))
    spinner = Gtk.Spinner()
    spinner.start()
    box.append(row(label("Spinner:"), spinner))
    for name in ("warning", "error", "success"):
        box.append(label(f"{name} text", name))

    # GtkInfoBar — deprecated in 4.10, still present and still used by ported
    # apps. GTK4 paints its fill on `infobar > revealer > box`, not on the
    # infobar node, which is exactly the kind of structural difference a
    # sheet has to show rather than a stylesheet diff has to argue.
    for message_type, text in (
        (Gtk.MessageType.INFO, "Informational message"),
        (Gtk.MessageType.WARNING, "Warning message"),
        (Gtk.MessageType.ERROR, "Error message"),
        (Gtk.MessageType.QUESTION, "Question message"),
    ):
        bar = Gtk.InfoBar()
        bar.set_message_type(message_type)
        bar.add_child(Gtk.Label(label=text, xalign=0))
        box.append(bar)
    return frame


def lists_section():
    frame, box = section("Lists")
    listbox = Gtk.ListBox()
    # MULTIPLE so both the plain selected row and the semantic one below stay
    # selected on the same sheet; the default SINGLE would drop the first.
    listbox.set_selection_mode(Gtk.SelectionMode.MULTIPLE)
    for index, caption in enumerate(("First row", "Second row", "Third row")):
        listbox.append(Gtk.Label(label=caption, xalign=0))
        if index == 1:
            listbox.select_row(listbox.get_row_at_index(1))
    # A selected row carrying semantic text. Semantic and accent tokens are
    # both chosen against the background, so semantic text in its own colour
    # over the selection fill fails 4.5:1 on all 72 combination/role pairs;
    # phase 5 promotes it to accent_on. Without this row on the sheet that
    # rule is unverifiable by capture — the same gap that let three earlier
    # context defects ship.
    warned = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=8)
    warned.append(Gtk.Label(label="Selected row with", xalign=0))
    warned.append(label("warning", "warning"))
    warned.append(label("error", "error"))
    warned.append(label("success", "success"))
    listbox.append(warned)
    listbox.select_row(listbox.get_row_at_index(3))
    box.append(listbox)

    # A tree expander is the node phase 2 proved needs an explicit icon
    # source; GTK4 renders it as treeexpander, not treeview expander.
    expander = Gtk.Expander(label="An expander, expanded")
    expander.set_expanded(True)
    expander.set_child(label("Revealed content"))
    box.append(expander)

    calendar = Gtk.Calendar()
    calendar.set_halign(Gtk.Align.START)
    box.append(calendar)
    return frame


def chrome_section():
    frame, box = section("Chrome")
    notebook = Gtk.Notebook()
    for caption in ("First", "Second", "Third"):
        notebook.append_page(label(f"  {caption} page  "), Gtk.Label(label=caption))
    notebook.set_size_request(-1, 80)
    box.append(notebook)

    paned = Gtk.Paned(orientation=Gtk.Orientation.HORIZONTAL)
    left = Gtk.Box()
    left.add_css_class("sidebar")
    left.append(label("  Sidebar pane  "))
    right = Gtk.Box()
    right.add_css_class("view")
    right.append(label("  Content pane  "))
    paned.set_start_child(left)
    paned.set_end_child(right)
    paned.set_position(160)
    paned.set_size_request(-1, 70)
    box.append(paned)
    return frame


def build_window(app):
    window = Gtk.ApplicationWindow(application=app)
    window.set_title("Vivid Life — GTK4 widget gallery")
    window.set_default_size(760, 1180)

    header = Gtk.HeaderBar()
    header.pack_end(Gtk.Button(label="Action"))
    window.set_titlebar(header)

    outer = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=10)
    outer.set_margin_top(12)
    outer.set_margin_bottom(12)
    outer.set_margin_start(12)
    outer.set_margin_end(12)
    for build in (
        surfaces_section,
        buttons_section,
        inputs_section,
        feedback_section,
        lists_section,
        chrome_section,
    ):
        outer.append(build())

    scroller = Gtk.ScrolledWindow()
    scroller.set_child(outer)
    window.set_child(scroller)
    return window


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--theme", help="theme name, for the window title only")
    parser.add_argument(
        "--screenshot",
        help="hold the window open for an external capture, then quit",
    )
    args = parser.parse_args()

    app = Gtk.Application(application_id="de.vividlife.Gallery4")

    def on_activate(application):
        window = build_window(application)
        if args.theme:
            window.set_title(f"Vivid Life — GTK4 — {args.theme}")
        window.present()
        if args.screenshot:
            # GTK4 has no in-process window grab that works headlessly, so
            # the capture is left to import(1) in shots4.sh and this only
            # holds the window open long enough for it. Quitting on a timeout
            # rather than on a draw signal keeps the two scripts independent.
            GLib.timeout_add_seconds(6, lambda: application.quit() or False)

    app.connect("activate", on_activate)
    app.run([])


if __name__ == "__main__":
    main()
