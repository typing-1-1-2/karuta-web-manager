<div align="center">

# ☯ Karuta Web Manager

[![Built with Astro](https://img.shields.io/badge/Built%20with-Astro-FF5D01?style=flat-square&logo=astro&logoColor=white)](https://astro.build)
[![License: MIT](https://img.shields.io/badge/License-MIT-6366f1?style=flat-square)](LICENSE)
[![Node >=22](https://img.shields.io/badge/Node-%3E%3D22-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![Live](https://img.shields.io/badge/Live-GitHub%20Pages-6366f1?style=flat-square)](https://typing-1-1-2.github.io/karuta-web-manager/)

[🇪🇸 Español](README.md) · [🇯🇵 日本語](README_jp.md)

</div>

---

**A modern web interface for managing your [Karuta](https://karuta.com) Discord bot card collection.**

### ✨ Features

| Feature | Description |
|---------|-------------|
| 🎴 **Collection** | Browse cards with filters by quality, edition, print, frame and tag |
| 🖼 **Albums** | Visual albums with drag-and-drop, custom backgrounds and image export |
| 📚 **Series** | Grouped view by series with search and filters |
| ⚙️ **Workers** | Track workers and their effort |
| 🏷️ **Tags** | Bulk-assign tags and generate `k!tag` commands |
| 📊 **Stats** | Charts, KPIs, burn value, luck score and 14+ metrics |
| ✏️ **Sketches** | Convert images to Studio palette sketches with layer export |
| 🔍 **Rescaler** | Resize images to exact dimensions with presets |
| 💾 **Backup** | Export and import all your data |
| 🌐 **Languages** | Fully translated interface in ES / EN / JA |
| 🎨 **Themes** | 6 themes: Dark, AMOLED, Light, Sakura, Forest, Ocean |

### 🚀 Getting Started

```bash
git clone https://github.com/typing-1-1-2/karuta-web-manager.git
cd karuta-web-manager
npm install
npm run dev
```

Open [http://localhost:4321](http://localhost:4321) in your browser.

#### Importing your collection

1. Use `ksheet` in Discord where Karuta is active
2. Download the `.csv` file Karuta sends you
3. Drag it to the upload area or click **Select file**

### 🧭 Routes

| Route | Section |
|-------|---------|
| `/` | Home |
| `/characters` | Full collection |
| `/albums` | Album builder |
| `/series` | Series view |
| `/frames` | Frames |
| `/workers` | Workers |
| `/tags` | Tag manager |
| `/stats` | Statistics |
| `/sketches` | Sketches |
| `/rescaler` | Rescaler |

### 🛠️ Development

```bash
npm run dev      # localhost:4321
npm run build    # static build into /dist
npm run preview  # preview production build
```

### 🌐 Deployment

Live on GitHub Pages, auto-deployed on every push to `main`:

**[https://typing-1-1-2.github.io/karuta-web-manager/](https://typing-1-1-2.github.io/karuta-web-manager/)**

---

<div align="center">

**📄 MIT License · Made with ☯ for the Karuta community**

</div>
