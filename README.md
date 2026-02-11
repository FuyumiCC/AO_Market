# Albion Online Market Scanner

A lightweight, web-based market analysis tool for **Albion Online**. This tool scans the data from the [Albion Data Project](https://www.albion-online-data.com/) to find profitable flipping and enchanting opportunities between Royal Cities and the Black Market.

![Project Status](https://img.shields.io/badge/status-passive-lightgrey) ![License](https://img.shields.io/badge/license-MIT-blue)

## 📖 What It Is
The **Albion Market Scanner** is a Node.js application that acts as a real-time trading assistant. It calculates profit margins for two specific strategies:
1.  **Direct Flips:** Buying an item in a Royal City and selling it immediately to the Black Market (Caerleon).
2.  **Enchanting Flips:** Buying a lower enchantment item (e.g., 5.0), buying the necessary runes/souls/relics, enchanting it, and selling the result to the Black Market.

## 🚀 What It Does
* **Batch Scanning:** Scans entire categories (Weapons, Armor, Off-hands) sequentially to prevent server overload.
* **Profit Calculation:** Automatically accounts for Market Taxes (Premium vs. Non-Premium) and Material Costs (Runes, Souls, Relics).
* **Smart Filtering:** Filter results by specific item types (e.g., "Bows", "Plate Armor") without re-scanning.
* **Live Verification:** The **Refresh Prices** feature double-checks listed items to ensure they are still profitable before you log in to buy them.
* **Sorting:** Sort by Highest Profit (Premium or Non-Premium).
* **Clutter Control:** "Hide" items you have already bought or aren't interested in; the app remembers your hidden items locally.

## 🛠️ How to Install & Run

### Prerequisites
* [Node.js](https://nodejs.org/) (Installed on your computer)
* [Git](https://git-scm.com/)

### Installation
1.  Clone the repository:
    ```bash
    git clone [https://github.com/YOUR_USERNAME/albion-market-tool.git](https://github.com/YOUR_USERNAME/albion-market-tool.git)
    cd albion-market-tool
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  **Start the Server:**
    * **Windows:** Double-click `start.bat`.
    * **Terminal:** Run `node server.js`.

4.  Open your browser and navigate to:
    `http://localhost:3000`

## 🕹️ How to Use
1.  **Select City:** Choose the Royal City where you are currently located (e.g., Martlock).
2.  **Scan:** Click **"Scan All Markets"**. The tool will fetch data for weapons, armor, and off-hands.
3.  **Analyze:**
    * Use the **Filter** dropdown to narrow down to specific item types (e.g., "Swords").
    * Click the **Profit (Prem)** header to sort by highest profit.
4.  **Verify:** Before traveling, click **"Refresh Prices"**. Any item that is no longer profitable (due to price changes) will automatically disappear from the list.
5.  **Clean Up:** Click the **Eye Icon** (👁️‍🗨️) next to an item to hide it from your list.

## ⚠️ Limitations
* **No Historical Database:** This tool does not save price history. It uses **Volatile Memory (RAM)**. If you restart the server, the scan results are wiped.
* **Data Source:** It relies entirely on the **Albion Data Project** API. If no player has scanned an item recently using the Albion Data Client, the price shown may be outdated (or missing).
* **Manual Trading Only:** This is an **Analysis Tool**, not a bot. It does not automate gameplay. You must manually buy, transport, and sell items in-game.

## ⚖️ Disclaimer
This project is not affiliated with Sandbox Interactive. Usage of this tool adheres to the Albion Online Terms of Service regarding third-party data analysis.

> **Note:** Automated data gathering (botting/macros) is strictly prohibited by Albion Online. Use the official Albion Data Client for passive data collection only.
