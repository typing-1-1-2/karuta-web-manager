<div align="center">

# ☯ Karuta Web Manager

[![Built with Astro](https://img.shields.io/badge/Built%20with-Astro-FF5D01?style=flat-square&logo=astro&logoColor=white)](https://astro.build)
[![License: MIT](https://img.shields.io/badge/License-MIT-6366f1?style=flat-square)](LICENSE)
[![Node >=22](https://img.shields.io/badge/Node-%3E%3D22-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![Live](https://img.shields.io/badge/Live-GitHub%20Pages-6366f1?style=flat-square)](https://typing-1-1-2.github.io/karuta-web-manager/)

[🇬🇧 English](README_en.md) · [🇯🇵 日本語](README_jp.md)

</div>

---

**Una interfaz web moderna para gestionar tu colección de cartas del bot de Discord [Karuta](https://karuta.com).**

### ✨ Características

| Función | Descripción |
|---------|-------------|
| 🎴 **Colección** | Explora tus cartas con filtros por calidad, edición, print, marco y tag |
| 🖼 **Álbumes** | Álbumes visuales con drag-and-drop, fondos personalizados y exportación |
| 📚 **Series** | Vista agrupada por serie con búsqueda y filtros |
| ⚙️ **Workers** | Seguimiento de workers y su esfuerzo |
| 🏷️ **Tags** | Asignación masiva de tags y generación de comandos `k!tag` |
| 📊 **Stats** | Gráficas, KPIs, burn value, luck score y más de 14 métricas |
| ✏️ **Sketches** | Convierte imágenes en sketches del Studio con exportación por capas |
| 🔍 **Rescalador** | Redimensiona imágenes a dimensiones exactas con presets |
| 💾 **Backup** | Exporta e importa todos tus datos |
| 🌐 **Idiomas** | Interfaz completamente traducida en ES / EN / JA |
| 🎨 **Temas** | 6 temas: Oscuro, AMOLED, Claro, Sakura, Bosque, Océano |

### 🚀 Inicio rápido

```bash
git clone https://github.com/typing-1-1-2/karuta-web-manager.git
cd karuta-web-manager
npm install
npm run dev
```

Abre [http://localhost:4321](http://localhost:4321) en tu navegador.

#### Importar tu colección

1. Usa `ksheet` en Discord donde Karuta esté activo
2. Descarga el `.csv` que Karuta te envía
3. Arrástralo a la zona de carga o haz clic en **Seleccionar archivo**

### 🧭 Rutas

| Ruta | Sección |
|------|---------|
| `/` | Inicio |
| `/characters` | Colección completa |
| `/albums` | Constructor de álbumes |
| `/series` | Vista por series |
| `/frames` | Marcos |
| `/workers` | Workers |
| `/tags` | Gestor de tags |
| `/stats` | Estadísticas |
| `/sketches` | Sketches |
| `/rescaler` | Rescalador |

### 🛠️ Desarrollo

```bash
npm run dev      # localhost:4321
npm run build    # genera /dist
npm run preview  # preview del build
```

### 🌐 Despliegue

Publicado en GitHub Pages con deploy automático en cada push a `main`:

**[https://typing-1-1-2.github.io/karuta-web-manager/](https://typing-1-1-2.github.io/karuta-web-manager/)**

---

<div align="center">

**📄 MIT License · Made with ☯ for the Karuta community**

</div>
