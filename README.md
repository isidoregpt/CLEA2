# ☀️ CLEAjs — Solar Rotation Analysis

```
 ██████╗██╗     ███████╗ █████╗      ██╗███████╗
██╔════╝██║     ██╔════╝██╔══██╗     ██║██╔════╝
██║     ██║     █████╗  ███████║     ██║███████╗
██║     ██║     ██╔══╝  ██╔══██║██   ██║╚════██║
╚██████╗███████╗███████╗██║  ██║╚█████╔╝███████║
 ╚═════╝╚══════╝╚══════╝╚═╝  ╚═╝ ╚════╝ ╚══════╝
```

> **Track sunspots. Measure the Sun. Do real astronomy — in your browser.**

---

## 🔥 What Is This?

CLEAjs is a **browser-based solar rotation analysis tool** that lets you do *actual science* on real solar images. Upload a series of solar photographs, click on sunspots, and watch the math unfold — heliographic coordinates, Carrington longitudes, differential rotation rates — all computed in real time using the same algorithms professional astronomers use.

No PhD required. No telescope required. Just a browser and a curiosity about the giant nuclear fireball 93 million miles away keeping you alive.

This is a modern JavaScript reimplementation of the classic **CLEA (Contemporary Laboratory Experiences in Astronomy)** solar rotation lab, rebuilt from the ground up for 2026.

---

## ⚡ Features That Slap

### 🌞 Real Solar Ephemeris Math
Not fake. Not approximated. CLEAjs computes **B₀, L₀, and P angles** using Meeus algorithms (the gold standard in positional astronomy) for every image you load — accounting for the Sun's axial tilt, Carrington rotation number, and the apparent position angle of the solar north pole.

### 📡 Native FITS Support
Astronomers use **FITS files**. So does CLEAjs. Drop in raw `.fits` or `.fit` files straight from your observatory or downloaded dataset and the app will:
- Parse the binary FITS header
- Extract observation timestamps (`DATE-OBS`, `TIME-OBS`)
- Pull sun centre coordinates from header keywords (`CRPIX1/2`, `FNDLMBXC/C`, `R_SUN`)
- Render the pixel data with percentile-clipped contrast stretching so sunspots actually *look* like sunspots

Also supports **JPG**, **PNG**, and **PNG+JSON** sidecar pairs for preprocessed datasets.

### 🎯 Click-to-Coordinate
Click anywhere on the solar disc. Instantly get:
- **Heliographic longitude** (Carrington system)
- **Heliographic latitude**
- Distance from disc centre in pixels and percent
- A **zoomed-in view** of exactly what you clicked on — with local contrast enhancement so fine features are visible

### 📊 Differential Rotation Tracking
Label the same sunspot across multiple images. CLEAjs will:
- Track its longitude drift over time
- Plot a **longitude vs. time graph** automatically
- Let you export all measurements as **CSV** for further analysis

This is how you *measure* that the Sun's equator rotates faster (~25 days) than its poles (~36 days). With your own data. For real.

### 🎬 Animation Mode
Load a time series of images and hit **Play**. Watch sunspots march across the solar disc in real time. Pause to measure. Resume to watch. Science has never looked this cool.

### 🔬 High-Resolution Zoom Viewer
The zoom viewer uses:
- **Percentile contrast clipping** (1st–99th percentile) for local feature enhancement
- **Pixelated rendering** for maximum crispness — no blurry interpolation
- Adjustable region size (up to 300px) and zoom factor (up to 12×)
- A pink crosshair so you know *exactly* what you measured

### 🎛️ Full Manual Control
When auto-detection isn't perfect, you've got:
- Radius correction slider
- X/Y centre offset sliders
- Luminance threshold for auto-detection tuning
- Off-disc click override for limb measurements

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Install & Run

```bash
git clone https://github.com/yourusername/cleajs-solar-rotation.git
cd cleajs-solar-rotation
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and you're doing astronomy.

### Build for Production

```bash
npm run build
npm start
```

---

## 🗂️ Supported File Formats

| Format | Image | Obs. Time | Sun Params |
|--------|-------|-----------|------------|
| `.fits` / `.fit` | ✅ Auto-rendered | ✅ From header | ✅ From header |
| `.png` + `.json` | ✅ | ✅ From JSON | ✅ From JSON |
| `.jpg` / `.png` | ✅ | ⚠️ Uses current time | 🔍 Auto-detected |

**Pro tip:** FITS files are the gold standard here. If your dataset comes with `.fits` files, use them — you get timestamps and sun geometry for free.

---

## 🧪 How to Run a Solar Rotation Lab

1. **Load your images** — drag and drop a series of solar images taken over several days. FITS files work best.
2. **Verify the boundary circle** — the red dashed circle should align with the solar limb. Use the radius and offset sliders if needed.
3. **Click a sunspot** — the zoom viewer will show you exactly what you've selected. The heliographic coordinates appear instantly.
4. **Label your measurement** — type a feature name like `Sunspot A` and hit **Record Measurement**.
5. **Move to the next image** — hit Next (or use the animation controls) and repeat.
6. **Filter by label** — in the Measurements panel, filter to `Sunspot A` and watch the longitude drift plot build automatically.
7. **Export your data** — hit **↓ CSV** to download all measurements for your lab report.

---

## 🔭 The Science Behind It

### Heliographic Coordinates
CLEAjs uses the **Carrington coordinate system** — the standard reference frame for solar surface features. Coordinates are computed via full spherical trigonometry:

```
B₀  =  heliographic latitude of the sub-Earth point
L₀  =  Carrington longitude of the central meridian  
P   =  position angle of the solar north pole
```

From these, any pixel on the disc maps to a unique **(longitude, latitude)** pair on the solar surface.

### Differential Rotation
The Sun is not a solid body. It rotates faster at the equator than the poles:

| Latitude | Rotation Period |
|----------|----------------|
| 0° (equator) | ~25.4 days |
| 30° | ~27.5 days |
| 60° | ~31.8 days |
| 90° (poles) | ~36+ days |

By tracking a sunspot's Carrington longitude across multiple days, you can *directly measure* this differential rotation. That's not a simulation — that's real data.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 13 |
| Canvas / Interaction | Konva + react-konva |
| Plotting | Plotly.js |
| File Parsing | Custom FITS binary parser |
| Math | Pure JavaScript (no astronomy libraries — the ephemeris is hand-implemented from Meeus) |
| Styling | Tailwind CSS |
| File Upload | react-dropzone |

---

## 📁 Project Structure

```
src/
├── pages/
│   └── index.js              # Main app — state, logic, layout
├── components/
│   ├── KonvaComponents.js    # Interactive image canvas
│   ├── SidebarControls.js    # All sliders, toggles, controls
│   ├── MeasurementsPanel.js  # Table, filter, rotation plot
│   ├── ImageInfoPanel.js     # Ephemeris + image metadata
│   ├── ZoomViewer.js         # High-res zoom window
│   └── UploadPanel.js        # Drag-and-drop file loader
└── utils/
    └── solarCalculations.js  # ALL the astronomy math lives here
```

---

## 🌌 Where to Get Solar Images

| Source | Format | Notes |
|--------|--------|-------|
| [NASA SDO](https://sdo.gsfc.nasa.gov/) | FITS/JPG | High-res full-disc images |
| [SOHO LASCO](https://soho.nascom.nasa.gov/) | FITS | Classic continuum images |
| [GONG Network](https://gong.nso.edu/) | FITS | Ground-based synoptic data |
| [Kanzelhohe Observatory](https://www.kso.ac.at/) | FITS | White-light & Hα |
| CLEA Student Data | FITS | The original lab dataset this tool was built for |

---

## 🤝 Contributing

Pull requests welcome. If you find a bug in the ephemeris math, please open an issue with the date, expected values, and computed values — astronomical accuracy matters here.

---

## 📜 License

MIT © 2026 Jonathan Graziola

---

## 🙏 Acknowledgements

- **CLEA Project** (Gettysburg College) — for the original lab curriculum that inspired this tool
- **Jean Meeus** — *Astronomical Algorithms* (the bible of positional astronomy math)
- **NASA / ESA / NSO** — for making solar image data publicly available
- Every student who has ever squinted at a sunspot and wondered why it moved

---

<div align="center">

**Built for curiosity. Powered by JavaScript. Fueled by a star.**

☀️ *Go measure something.*

</div>
