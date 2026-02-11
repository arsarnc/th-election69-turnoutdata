# Election 69 Turnout Data

A responsive web dashboard for visualizing election turnout statistics by province. This project provides a clear, interactive interface to explore voting data, including turnout percentages, valid/invalid vote counts, and station reporting progress.

## Features

-   **Interactive Data Table**:
    -   Sortable columns (Turnout, registered voters, etc.).
    -   Filter by Province Name or ID.
    -   **Drag-and-Drop Column Reordering**: Customize the table layout by dragging column headers.
    -   **Column Visibility Toggles**: Show or hide specific data points to focus on what matters.
    -   **Automatic Width Adjustment**: The table layout adapts to the visible content.

-   **Dynamic Total Statistics**:
    -   Top-level summary cards showing Total Turnout, Valid/Invalid/Blank Votes, and Counted Stations.
    -   **Context-Aware**: The summary cards automatically update based on your search filters (e.g., searching for "Bangkok" shows totals for Bangkok only).
    -   **Visibility Sync**: Hiding a column in the table also hides the corresponding summary card.

-   **Premium UI/UX**:
    -   Dark mode with glassmorphism design elements.
    -   Responsive layout for various screen sizes.
    -   Clear visual indicators for positive/negative trends.

## Technical Details

-   **Frontend**: Vanilla HTML5, CSS3, and JavaScript (ES6+).
-   **Data Processing**: Client-side parsing and aggregation of JSON data.
-   **No External Dependencies**: Built without frameworks or libraries for maximum performance and simplicity.

## Setup & Loading

This project fetches data from local JSON files using the `fetch` API. Due to browser security restrictions (CORS), **you cannot open `index.html` directly from the file system**. You must run it through a local web server.

### using Python (Recommended)

If you have Python installed, run one of the following commands in the project root directory:

```bash
# Python 3
python3 -m http.server 8080

# Python 2
python -m SimpleHTTPServer 8080
```

Then open your browser and navigate to:
[http://localhost:8080/index.html](http://localhost:8080/index.html)

### Using Node.js

If you have `http-server` installed globally:

```bash
http-server .
```

## Project Structure

-   `index.html`: Main entry point and page structure.
-   `script.js`: Handles data fetching, processing, rendering, and interactivity (sorting, filtering, drag-and-drop).
-   `style.css`: Contains all styling, including dark theme and responsive design.
-   `data/`: Directory containing the source JSON files:
    -   `stats_cons.json`: Main election statistics.
    -   `info_province.json`: Reference data for province names and IDs.

## Data Sources
-   `stats_cons.json`: Contains the raw vote counts and turnout data for each province.
-   `info_province.json`: Maps province IDs to their Thai and English names.
