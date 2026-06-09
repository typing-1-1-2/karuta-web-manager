<div align="center">

# ☯ Karuta Web Manager

[![Built with Astro](https://img.shields.io/badge/Built%20with-Astro-FF5D01?style=flat-square&logo=astro&logoColor=white)](https://astro.build)
[![License: MIT](https://img.shields.io/badge/License-MIT-6366f1?style=flat-square)](LICENSE)
[![Node >=22](https://img.shields.io/badge/Node-%3E%3D22-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![Live](https://img.shields.io/badge/Live-GitHub%20Pages-6366f1?style=flat-square)](https://typing-1-1-2.github.io/karuta-web-manager/)

[🇪🇸 Español](README.md) · [🇬🇧 English](README_en.md)

</div>

---

**[Karuta](https://karuta.com) Discord ボットのカードコレクションを管理するモダンなウェブインターフェース。**

### ✨ 機能

| 機能 | 説明 |
|------|------|
| 🎴 **コレクション** | 品質・版・プリント・フレーム・タグでフィルター |
| 🖼 **アルバム** | ドラッグ＆ドロップ、カスタム背景、画像エクスポート |
| 📚 **シリーズ** | シリーズ別グループ表示と検索 |
| ⚙️ **ワーカー** | ワーカーと努力値の追跡 |
| 🏷️ **タグ** | 一括タグ付け、`k!tag` コマンド生成 |
| 📊 **統計** | グラフ、KPI、バーン値、ラックスコアなど14+指標 |
| ✏️ **スケッチ** | Studio用レイヤースケッチ変換・エクスポート |
| 🔍 **リサイズ** | プリセット付き精確サイズ変換 |
| 💾 **バックアップ** | 全データのエクスポート・インポート |
| 🌐 **多言語** | ES / EN / JA 完全対応 |
| 🎨 **テーマ** | 6種類: ダーク、AMOLED、ライト、桜、森、海 |

### 🚀 クイックスタート

```bash
git clone https://github.com/typing-1-1-2/karuta-web-manager.git
cd karuta-web-manager
npm install
npm run dev
```

ブラウザで [http://localhost:4321](http://localhost:4321) を開く。

#### コレクションのインポート

1. Karuta がいる Discord で `ksheet` を使用
2. Karuta が送る `.csv` ファイルをダウンロード
3. アップロードエリアにドラッグ、または **ファイルを選択** をクリック

### 🧭 ルート

| ルート | セクション |
|--------|-----------|
| `/` | ホーム |
| `/characters` | コレクション |
| `/albums` | アルバム |
| `/series` | シリーズ |
| `/frames` | フレーム |
| `/workers` | ワーカー |
| `/tags` | タグ管理 |
| `/stats` | 統計 |
| `/sketches` | スケッチ |
| `/rescaler` | リサイズ |

### 🛠️ 開発

```bash
npm run dev      # localhost:4321
npm run build    # /dist に静的ビルド
npm run preview  # ビルドプレビュー
```

### 🌐 デプロイ

`main` へのプッシュで GitHub Pages に自動デプロイ:

**[https://typing-1-1-2.github.io/karuta-web-manager/](https://typing-1-1-2.github.io/karuta-web-manager/)**

---

<div align="center">

**📄 MIT License · Made with ☯ for the Karuta community**

</div>
