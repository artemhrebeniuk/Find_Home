# 🏠 FindHome — Automated Real Estate Search & Personal CRM

[![Next.js](https://img.shields.io/badge/Framework-Next.js_14_(App_Router)-black.svg?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/UI-React_18-blue.svg?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript_5-blue.svg?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![SQLite](https://img.shields.io/badge/Database-SQLite3-003B57.svg?style=flat-square&logo=sqlite)](https://www.sqlite.org/)
[![Leaflet](https://img.shields.io/badge/Map-Leaflet.js-199900.svg?style=flat-square&logo=leaflet)](https://leafletjs.com/)

> **Architecture Overview:** **FindHome** is a personalized real estate aggregator and CRM platform designed to automate the search and analysis of private houses in Ukraine. It fetches live data directly from major Ukrainian property portals (OLX, DOM.RIA) using smart pagination and bypassing anti-bot limits, displaying listings on an interactive geographical map and a real-time updating side-panel with custom CRM tracking (Favorites, Calls, Viewings).

An enterprise-grade full-stack web application built on **Next.js (App Router)** and **better-sqlite3**, featuring real-time web scraping, unified database mapping, interactive map clustering, and lead management wrapped in a premium Glassmorphism UI.

---

## 📐 System Topology & Data Flow

```text
+-----------------------------------------------------------------------------------+
|                        FindHome Client Dashboard                                  |
|    [ Glassmorphism UI / Interactive Map / Dynamic Filter Tabs ]                   |
+-----------------------------------------------------------------------------------+
       |                        |                              |
       | 1. Filter by Region    | 2. Sync from Portals         | 3. Set CRM Status
       v                        v                              v
+--------------------+  +-----------------------+  +--------------------------------+
|  /api/houses       |  |  /api/sync            |  |  /api/houses/[id]/status       |
|  Dynamic SQL Query |  |  Cheerio Web Scraper  |  |  SQLite State Management       |
|  (Price, Status)   |  |  & DOM.RIA REST API   |  |  (Favorite, Call, Viewed)      |
+--------------------+  +-----------------------+  +--------------------------------+
       |                        |                              |
       +------------------------+------------------------------+
                                |
                                v
+-----------------------------------------------------------------------------------+
|                  Local SQLite Database (findhome.db)                              |
|        Unified schema • ON CONFLICT DO UPDATE • Relational CRM mapping            |
+-----------------------------------------------------------------------------------+
```

---

## ⚙️ Technical Specifications

| Component | Technology / Protocol | Description |
| :--- | :--- | :--- |
| **Framework** | Next.js (App Router) | High-performance React framework utilizing Route Handlers |
| **Database** | SQLite (`better-sqlite3`) | High-speed synchronous local database for instant map filtering and CRM storage |
| **Data Scraping** | `cheerio` & `node-fetch` | Intelligent DOM parsing for OLX with automatic pagination and rate limiting |
| **Mapping Engine** | Leaflet.js & React-Leaflet | Interactive geographical map with optimized marker clustering (`leaflet.markercluster`) |
| **Styling** | Vanilla CSS (Glassmorphism) | Custom CSS design system with backdrop filters, dark mode, and dynamic color statuses |
| **Icons** | `lucide-react` | Clean, modern vector SVG icons |

---

## 🔬 Key Architectural Highlights

### 1. Unified Real Estate Sync Engine (`/api/sync`)
* **OLX Smart Scraper**: Bypasses basic limits by intelligently parsing the DOM, extracting high-resolution images via Apollo CDN regex mapping, and navigating up to 50 pages automatically with built-in anti-ban delays.
* **DOM.RIA Integration**: Connects via official API for structured data ingestion.
* **Upsert Logic**: Utilizes SQLite `ON CONFLICT(external_id) DO UPDATE` to ensure duplicate listings are never created, while keeping prices and descriptions up to date.

### 2. Interactive Map Clustering (`MapView.tsx`)
* **Leaflet MarkerCluster**: Handles thousands of property markers on the map without performance degradation.
* **Dynamic Status Colors**: Markers dynamically change colors based on their CRM status (e.g., Orange for "Favorite", Green for "Viewing").
* **Geo-coordinate Mapping**: Automatically maps listings to coordinates or snaps them to the nearest major Ukrainian city based on region parsing.

### 3. Built-in Personal CRM (`/api/houses/[id]/status`)
* **Relational Tracking**: A separate `house_crm` table allows storing personal statuses (`new`, `favorite`, `call`, `viewing`, `archived`) and custom text notes for each property.
* **Instant UI Feedback**: Updating a status instantly reflects on the map marker and the sidebar card without page reloads.

---

## 📁 Directory Structure

```text
FindHome/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── houses/route.ts          # Core API: Dynamic SQL filtering (Price, Region, Status)
│   │   │   ├── houses/[id]/status/      # CRM API: Update property statuses and notes
│   │   │   └── sync/route.ts            # Sync API: Triggers background OLX/DOM.RIA scraping
│   │   ├── globals.css                  # Glassmorphism design system & component styles
│   │   ├── layout.tsx                   # Root layout, metadata definitions
│   │   └── page.tsx                     # Main dashboard orchestration (Filters, Map, Sidebar)
│   ├── components/
│   │   ├── FilterPanel.tsx              # Top navigation, sync controls, and global filters
│   │   ├── Sidebar.tsx                  # Scrollable list of property cards with CRM tools
│   │   └── MapView.tsx                  # Leaflet map with dynamic marker clustering
│   └── lib/
│       ├── db.ts                        # SQLite database initialization and schema definitions
│       ├── domria.ts                    # DOM.RIA REST API fetcher
│       ├── olx.ts                       # Cheerio-based OLX HTML scraper
│       ├── geo.ts                       # Ukrainian regions boundary & coordinates dictionary
│       └── types.ts                     # TypeScript data interfaces
├── findhome.db                          # Auto-generated SQLite database (Ignored in Git)
└── next.config.ts                       # Next.js configuration and allowed Image CDNs
```

---

## 🚀 Quick Start

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Setup Environment Variables** (Optional, for DOM.RIA):
   Create a `.env.local` file:
   ```env
   DOMRIA_API_KEY=your_api_key_here
   ```

3. **Run Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

4. **Sync Data**:
   Click the **OLX** button in the top filter panel to begin scraping real estate listings into your local database.

---
*Developed for automated and efficient private real estate search in Ukraine.*
