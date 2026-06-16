# 🧭 Descrollify

> A lightweight, open-source browser extension that helps you stop doomscrolling short-form video feeds (starting with YouTube Shorts) and spend less time on autopilot.

Descrollify lets you switch between three modes — **Off**, **Limit**, and **Focus** — to gently cap or fully block short videos, hide their thumbnails, and keep simple, fully local usage stats. No accounts, no servers, no tracking.

---

## ✨ Features

- **Three modes** — _Off_ (do nothing), _Limit_ (allow N videos, then block), _Focus_ (block everything and stop Shorts links from opening).
- **Configurable redirect** — choose where you land when a Short is blocked.
- **Hide thumbnails** — optionally remove Shorts previews so they don't tempt you.
- **Local-only stats** — counts what you scroll past, stored entirely on your machine.
- **Manifest V3** — built on the current Chrome extension platform.

---

## 🚀 Install

### From source (for development / latest version)

1. Clone the repo:
   ```bash
   git clone https://github.com/xtt7even/descrollify-extension.git
   ```
2. Open `chrome://extensions` in Chrome or Edge.
3. Enable **Developer mode** (top-right).
4. Click **Load unpacked** and select the cloned folder.

The Descrollify icon will appear in your toolbar.

> Compatible with Chromium-based browsers (Chrome, Edge). Other browsers are planned.

---

## 🕹️ Usage

1. Click the Descrollify icon in the toolbar.
2. Pick a mode: **Off**, **Limit**, or **Focus**.
3. Adjust extra settings (max videos, block duration, redirect target, hide thumbnails) to taste.

For a full walkthrough of every option, open the extension's **Info / Help** page.

---

## 🗂️ Project structure

| Path                                    | Purpose                                        |
| --------------------------------------- | ---------------------------------------------- |
| `manifest.json`                         | Extension manifest (MV3)                       |
| `background.js`                         | Service worker — timers, state, block logic    |
| `content.js` / `blocker.css`            | Injected into YouTube to detect & block Shorts |
| `popup.html` / `popup.js` / `popup.css` | Toolbar popup UI                               |
| `options.html` / `options.js`           | Settings page                                  |
| `info.html` / `info.js`                 | Help / FAQ page                                |
| `fonts/`, `images/`                     | Bundled assets                                 |

---

## 🛠️ Tech stack

Vanilla JavaScript, HTML, and CSS

---

## 🤝 Contributing

Contributions are welcome! Whether it's a bug fix, a new platform, or a docs tweak:

1. Fork the repo and create a branch (`git checkout -b my-change`).
2. Make your change and test it by loading the unpacked extension.
3. Open a pull request describing what you changed and why.

For larger ideas, please open an issue first so we can discuss the approach. Bug reports and feature requests are also very welcome in the [issues](https://github.com/xtt7even/descrollify-extension/issues).

---

## 🔒 Privacy

Descrollify collects **nothing**. It never reads your watch or browser history and makes no network requests. The only data it creates are local usage counts, stored on your own device and cleared whenever you reset statistics.

---

## ❤️ Support

If Descrollify helps you reclaim some time, you can [buy me a coffee](https://www.buymeacoffee.com/kirillgr1).

---

## 📄 License

Copyright (C) 2026 Kirill Grabar

Descrollify is free software, released under the [GNU General Public License v3.0](LICENSE). You are free to use, study, share, and modify it — and any distributed derivative work must also remain free and open under the same license.
