/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */
 import Clutter from 'gi://Clutter';
 import GObject from 'gi://GObject';
 import Gio from 'gi://Gio';
 import GLib from 'gi://GLib';
 import St from 'gi://St';

 import {
  Extension,
  gettext as _
} from 'resource:///org/gnome/shell/extensions/extension.js';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import QRCode from './vendor/qrcode.js';

const CLIPBOARD_TYPE = St.ClipboardType.CLIPBOARD;

const Indicator = GObject.registerClass(
  class Indicator extends PanelMenu.Button {
    _init() {
      super._init(0.0, _('My Shiny Indicator'));

      const self = this;
      this.add_child(new St.Icon({
        icon_name: 'face-smile-symbolic',
        style_class: 'system-status-icon',
      }));

      let qrWidget;
      qrWidget = new St.Widget();
      self.menu.box.add_child(qrWidget);
      const emptyItem = new PopupMenu.PopupMenuItem(_('The clipboard is empty.'), {
        can_focus: false,
        hover: false,
        activate: false,
      });
      self.menu.addMenuItem(emptyItem);

      let file;
      this.menu.connect('open-state-changed', (menu, open) => {
        if (!open) {
          qrWidget.set_style('background-image: none;');
          if (file) {
            file.delete(null);
          }
          return
        }

        qrWidget.visible = false;
        emptyItem.visible = false;

        St.Clipboard.get_default().get_text(St.ClipboardType.CLIPBOARD, (clipboard, text) => {
          if (!text) {
            emptyItem.visible = true;
            return;
          }
          const qrCode = new QRCode({
            content: text,
            padding: 1,
            width: 256,
            height: 256,
            color: "#000000",
            background: "#ffffff",
            ecl: "M",
          });

          const fileInfo = Gio.File.new_tmp('clipqrXXXXXX');
          file = fileInfo[0];

          const [etag] = file.replace_contents(
            new TextEncoder().encode(qrCode.svg()), null, false,
            Gio.FileCreateFlags.REPLACE_DESTINATION, null
          );

          qrWidget.set_style(`
            background-image: url(${file.get_uri()});
            background-size: cover;
            width: 256px;
            height: 256px;
          `);
          qrWidget.visible = true;
        });
      });
    }
  });

export default class IndicatorExampleExtension extends Extension {
  enable() {
    this._indicator = new Indicator();
    Main.panel.addToStatusArea(this.uuid, this._indicator);
  }

  disable() {
    this._indicator.destroy();
    this._indicator = null;
  }
}