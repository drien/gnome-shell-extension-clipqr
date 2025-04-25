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
import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import St from 'gi://St';

import {
  Extension,
  gettext as _,
} from 'resource:///org/gnome/shell/extensions/extension.js';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import QRCode from './vendor/qrcode.js';

const Indicator = GObject.registerClass(
  class Indicator extends PanelMenu.Button {
    _init(extensionInfo) {

      super._init(0.0, _('ClipQR'));

      const icon = new St.Icon({
        style_class: 'system-status-icon',
      });
      icon.gicon = Gio.icon_new_for_string(
        `${extensionInfo.path}/resources/qr-code-symbolic.svg`
      );
      this.add_child(icon);

      let qrWidget;
      qrWidget = new St.Widget();
      this.menu.box.add_child(qrWidget);
      const emptyItem = new PopupMenu.PopupMenuItem(_('The clipboard is empty.'), {
        can_focus: false,
        hover: false,
        activate: false,
      });
      this.menu.addMenuItem(emptyItem);

      const tooBigItem = new PopupMenu.PopupMenuItem(_('The clipboard contents is too large to make into a QR Code.'), {
        can_focus: false,
        hover: false,
        activate: false,
      });
      this.menu.addMenuItem(tooBigItem);

      let file;
      this.menu.connect('open-state-changed', (menu, open) => {
        if (!open) {
          if (file) {
            file.delete(null);
          }
          return;
        }

        qrWidget.visible = false;
        emptyItem.visible = false;
        tooBigItem.visible = false;

        St.Clipboard.get_default().get_text(St.ClipboardType.CLIPBOARD, (clipboard, text) => {
          if (!text) {
            emptyItem.visible = true;
            return;
          }

          let qrCode;
          try {
            qrCode = new QRCode({
              content: text,
              padding: 1,
              width: 256,
              height: 256,
              color: '#000000',
              background: '#ffffff',
              ecl: 'M',
            });
          }
          catch (error) {
            console.warn('Got error generating QR Code:', error);
            // Assuming a crash here is because the data is too big for the QR. Other errors are possible, but this is fine.
            // The QR lib throws a few different errors around size, so better just to catch them all.
            tooBigItem.visible = true;
            return;
          }
          const fileInfo = Gio.File.new_tmp('clipqrXXXXXX');
          file = fileInfo[0];

          file.replace_contents(
            new TextEncoder().encode(qrCode.svg()),
            null,
            false,
            Gio.FileCreateFlags.REPLACE_DESTINATION,
            null,
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
  },
);

export default class ClipQRExtension extends Extension {
  enable() {
    this._indicator = new Indicator(this);
    Main.panel.addToStatusArea(this.uuid, this._indicator);
  }

  disable() {
    this._indicator.destroy();
    this._indicator = null;
  }
}
