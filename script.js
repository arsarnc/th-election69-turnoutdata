// Config - Columns
const columns = [
    { key: 'prov_id', label: 'ID', show: true },
    { key: 'province_name', label: 'Province', show: true },
    { key: 'turn_out', label: 'Turnout', type: 'number', show: true },
    { key: 'percent_turn_out', label: '% Turnout', type: 'percent', show: false },
    { key: 'party_list_turn_out', label: 'Party List Turnout', type: 'number', show: true },
    { key: 'party_list_percent_turn_out', label: '% PL Turnout', type: 'percent', show: false },
    { key: 'turn_out_diff', label: 'Turnout Diff', type: 'number', format: 'diff', show: true },
    { key: 'turn_out_diff_percent', label: '% Diff', type: 'percent', format: 'diff', show: true },
    { key: 'valid_votes', label: 'Valid', type: 'number', show: false },
    { key: 'invalid_votes', label: 'Invalid', type: 'number', show: false },
    { key: 'blank_votes', label: 'Blank', type: 'number', show: false },
    { key: 'party_list_valid_votes', label: 'InValid (PL)', type: 'number', show: false },
    { key: 'total_registered_vote', label: 'Registered', type: 'number', show: true },
    { key: 'total_vote_stations', label: 'Stations', type: 'number', show: false },
    { key: 'percent_count', label: '% Counted', type: 'percent', show: true }
];

// State
let state = {
    data: [],
    sortKey: 'turn_out_diff_percent',
    sortDesc: true,
    filter: '',
    draggedColumnKey: null,
    visibleColumns: columns.reduce((acc, col) => {
        acc[col.key] = col.show;
        return acc;
    }, {}),
    totalStats: null // Store root stats for re-rendering
};

// URLs
const DATA_URL = "data/stats_cons.json";
const PROVINCE_URL = "data/info_province.json";

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    init();
    fetchData();
});

function init() {
    renderColumnToggles();
    setupEventListeners();
    document.getElementById('rowCount').textContent = 'Loading...';
}

async function fetchData() {
    try {
        const [dataResponse, provinceResponse] = await Promise.all([
            fetch(DATA_URL),
            fetch(PROVINCE_URL)
        ]);

        if (!dataResponse.ok) throw new Error(`Failed to load data: ${dataResponse.status}`);
        if (!provinceResponse.ok) throw new Error(`Failed to load province info: ${provinceResponse.status}`);

        const jsonData = await dataResponse.json();
        const provinceInfo = await provinceResponse.json();

        if (!jsonData.result_province) throw new Error("Invalid data structure: missing result_province");
        if (!provinceInfo.province) throw new Error("Invalid province info structure");

        const provinceMap = {};
        provinceInfo.province.forEach(p => {
            provinceMap[p.prov_id] = p.province;
        });

        processData(jsonData.result_province, provinceMap);

        // Store root stats and render
        state.totalStats = jsonData;
        renderTotalStats();

        renderTable();

    } catch (error) {
        console.error("Fetch Error:", error);
        const tbody = document.querySelector('#dataTable tbody');
        tbody.innerHTML = `<tr><td colspan="${Object.keys(state.visibleColumns).length}" style="text-align:center; padding: 2rem; color: var(--danger-color);">
            Failed to load data: ${error.message}<br>
            <small style="color: var(--text-secondary);">Ensure you are running this on a local server (e.g., python3 -m http.server).</small>
        </td></tr>`;
        document.getElementById('rowCount').textContent = 'Error';
    }
}

function processData(rawData, provinceMap) {
    state.data = rawData.map(row => {
        // 1. Add Thai Name
        const provId = row.prov_id;
        row.province_name = provinceMap[provId] || provId;

        // 2. Convert Strings to Numbers
        Object.keys(row).forEach(key => {
            if (key !== 'prov_id' && key !== 'province_name' && key !== 'pause_report') {
                const val = row[key];
                if (typeof val === 'string') {
                    // Try to parse if it looks numeric
                    if (!isNaN(val) && val.trim() !== '') {
                        row[key] = parseFloat(val);
                    }
                }
            }
        });

        // 3. Calculate Diffs
        const turnOut = row.turn_out || 0;
        const plTurnOut = row.party_list_turn_out || 0;

        row.turn_out_diff = turnOut - plTurnOut;

        if (turnOut !== 0) {
            row.turn_out_diff_percent = (row.turn_out_diff / turnOut) * 100;
        } else {
            row.turn_out_diff_percent = 0;
        }

        return row;
    });
}

// Setup Listeners
function setupEventListeners() {
    // Search
    document.getElementById('searchInput').addEventListener('input', (e) => {
        state.filter = e.target.value.toLowerCase();
        renderTable();
    });

    // Column Toggle Dropdown
    const btn = document.getElementById('toggleDropdownBtn');
    const dropdown = document.getElementById('columnDropdown');

    btn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent closing immediately
        dropdown.classList.toggle('show');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target) && !btn.contains(e.target)) {
            dropdown.classList.remove('show');
        }
    });
}

function renderTotalStats(currentData) {
    let data;

    if (!currentData) {
        // Initial load or something went wrong, try state.totalStats
        data = state.totalStats;
    } else {
        // Calculate totals from currentData (which is filteredData)
        data = currentData.reduce((acc, row) => {
            acc.turn_out += (row.turn_out || 0);
            acc.valid_votes += (row.valid_votes || 0);
            acc.invalid_votes += (row.invalid_votes || 0);
            acc.blank_votes += (row.blank_votes || 0);
            acc.total_registered_vote += (row.total_registered_vote || 0); // Need this for %

            // For counted_vote_stations, it seems to be in a different format or might need summing
            // Looking at the root object structure is best, but here we sum what we have.
            // Assuming 'count_send_vote_stations' exists or similar in row if we want to sum it?
            // Checking previous view_file, row might not have everything.
            // Let's assume we sum what we can. 
            // If the row doesn't have 'counted_vote_stations', we might loose it.
            // However, usually detailed rows have 'total_vote_stations' and 'count_send_vote_stations'.
            // Let's just sum specific fields we display.

            // Note: 'count_send_vote_stations' might be the field name for counted.
            // Let's rely on valid_votes/invalid/blank which are definitely there.
            // Detailed station count might be tricky without field verification.
            // For now, let's keep it simple.

            return acc;
        }, {
            turn_out: 0,
            valid_votes: 0,
            invalid_votes: 0,
            blank_votes: 0,
            total_registered_vote: 0,
            counted_vote_stations: 0, // Placeholder
            total_vote_stations: 0    // Placeholder
        });

        // Fix for counted stations:
        // Rows usually have 'total_vote_stations' and 'percent_count' or similar?
        // Let's assume for now we just show what we can sum. 
        // Or if we can't sum it accurately (e.g. missing fields), we might hide it or show N/A?
        // Actually, if we filter, the "Counted Stations" % might be the average of % count?
        // Or sum of counted / sum of total stations.
        // Let's iterate again properly to catch keys.

        currentData.forEach(row => {
            // Assuming these fields exist in row based on columns config
            if (row.total_vote_stations) data.total_vote_stations += row.total_vote_stations;
            // We don't have a direct 'counted' field in columns, but we have percent_count.
            // counted = total * percent / 100
            if (row.total_vote_stations && row.percent_count) {
                data.counted_vote_stations += Math.round(row.total_vote_stations * (row.percent_count / 100));
            }
        });

        // Recalculate Percentages
        data.percent_turn_out = data.total_registered_vote ? (data.turn_out / data.total_registered_vote) * 100 : 0;
        data.percent_valid_votes = data.turn_out ? (data.valid_votes / data.turn_out) * 100 : 0;
        data.percent_invalid_votes = data.turn_out ? (data.invalid_votes / data.turn_out) * 100 : 0;
        data.percent_blank_votes = data.turn_out ? (data.blank_votes / data.turn_out) * 100 : 0;
        data.percent_count = data.total_vote_stations ? (data.counted_vote_stations / data.total_vote_stations) * 100 : 0;
    }

    if (!data) return;

    const container = document.getElementById('totalStats');

    const stats = [
        {
            key: 'turn_out',
            label: 'Total Turnout',
            value: data.turn_out,
            sub: `${data.percent_turn_out.toFixed(2)}%`,
            subClass: 'neutral'
        },
        {
            key: 'valid_votes',
            label: 'Valid Votes',
            value: data.valid_votes,
            sub: `${data.percent_valid_votes.toFixed(2)}%`,
            subClass: 'positive'
        },
        {
            key: 'invalid_votes',
            label: 'Invalid Votes',
            value: data.invalid_votes,
            sub: `${data.percent_invalid_votes.toFixed(2)}%`,
            subClass: 'negative'
        },
        {
            key: 'blank_votes',
            label: 'Blank Votes',
            value: data.blank_votes,
            sub: `${data.percent_blank_votes.toFixed(2)}%`,
            subClass: 'neutral'
        },
        {
            key: 'percent_count', // Linked to % Counted column
            label: 'Counted Stations',
            value: data.counted_vote_stations,
            sub: `${data.percent_count.toFixed(2)}%`,
            subClass: 'neutral'
        }
    ];

    let html = '';
    stats.forEach(stat => {
        // Check visibility based on column key
        if (state.visibleColumns[stat.key]) {
            html += `
                <div class="stat-card">
                    <div class="stat-label">${stat.label}</div>
                    <div class="stat-value">${stat.value.toLocaleString()}</div>
                    <div class="stat-sub ${stat.subClass}">${stat.sub}</div>
                </div>
            `;
        }
    });
    container.innerHTML = html;
}

// Renderers
function renderColumnToggles() {
    const container = document.getElementById('columnDropdown');
    container.innerHTML = '';

    columns.forEach(col => {
        const item = document.createElement('label');
        item.className = 'toggle-item';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = state.visibleColumns[col.key];
        checkbox.addEventListener('change', () => toggleColumn(col.key));

        item.appendChild(checkbox);
        item.appendChild(document.createTextNode(col.label));
        container.appendChild(item);
    });
}

function toggleColumn(key) {
    state.visibleColumns[key] = !state.visibleColumns[key];
    renderTable(); // renderTable calls renderTotalStats now
}

function renderTable() {
    const table = document.getElementById('dataTable');
    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');
    const rowCountSpan = document.getElementById('rowCount');

    // 1. Filter Data
    let filteredData = state.data.filter(row => {
        if (!state.filter) return true;
        const searchStr = `${row.prov_id} ${row.province_name}`.toLowerCase();
        return searchStr.includes(state.filter);
    });

    // 2. Sort Data
    filteredData.sort((a, b) => {
        let valA = a[state.sortKey];
        let valB = b[state.sortKey];

        // Handle string comparison for non-numbers
        if (typeof valA === 'string' && typeof valB === 'string') {
            return state.sortDesc ? valB.localeCompare(valA) : valA.localeCompare(valB);
        }

        // Handle numbers
        return state.sortDesc ? valB - valA : valA - valB;
    });

    // 3. Render Header
    let theadHtml = '<tr>';
    columns.forEach(col => {
        if (!state.visibleColumns[col.key]) return;

        const sortClass = state.sortKey === col.key
            ? (state.sortDesc ? 'sort-desc' : 'sort-asc')
            : '';

        theadHtml += `<th 
            class="${sortClass}" 
            draggable="true"
            data-key="${col.key}"
            onclick="handleSort('${col.key}')"
            ondragstart="handleDragStart(event, '${col.key}')"
            ondragover="handleDragOver(event)"
            ondragleave="handleDragLeave(event)"
            ondrop="handleDrop(event, '${col.key}')"
            ondragend="handleDragEnd(event)"
        >${col.label}</th>`;
    });
    theadHtml += '</tr>';
    thead.innerHTML = theadHtml;

    // 4. Render Body
    let tbodyHtml = '';
    filteredData.forEach(row => {
        tbodyHtml += '<tr>';
        columns.forEach(col => {
            if (!state.visibleColumns[col.key]) return;

            let value = row[col.key];
            let cellContent = value;
            let cellClass = '';

            // Formatting
            if (col.type === 'number') {
                cellClass = 'num';
                cellContent = Number(value).toLocaleString();
            } else if (col.type === 'percent') {
                cellClass = 'num';
                cellContent = Number(value).toFixed(2) + '%';
            }

            // Special Coloring for Diffs
            if (col.format === 'diff') {
                const numVal = Number(value);
                if (numVal > 0) cellClass += ' diff-pos';
                if (numVal < 0) cellClass += ' diff-neg';
                if (numVal > 0) cellContent = '+' + cellContent;
            }

            // ID Badge
            if (col.key === 'prov_id') {
                cellContent = `<span class="badge">${value}</span>`;
            }

            tbodyHtml += `<td class="${cellClass}">${cellContent}</td>`;
        });
        tbodyHtml += '</tr>';
    });

    if (filteredData.length === 0) {
        if (state.data.length === 0) {
            // Still loading or error
        } else {
            const visibleColCount = Object.values(state.visibleColumns).filter(Boolean).length;
            tbodyHtml = `<tr><td colspan="${visibleColCount}" style="text-align:center; padding: 2rem; color: var(--text-secondary);">No results found</td></tr>`;
        }
    }

    tbody.innerHTML = tbodyHtml;
    rowCountSpan.textContent = filteredData.length;

    // Update Total Stats based on filtered data
    renderTotalStats(filteredData);
}

function handleSort(key) {
    if (state.sortKey === key) {
        state.sortDesc = !state.sortDesc;
    } else {
        state.sortKey = key;
        state.sortDesc = true;
    }
    renderTable();
}

// Drag and Drop Handlers
function handleDragStart(e, key) {
    state.draggedColumnKey = key;
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', key);
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const th = e.target.closest('th');
    if (th && th.getAttribute('data-key') !== state.draggedColumnKey) {
        th.classList.add('drag-over');
    }
}

function handleDragLeave(e) {
    const th = e.target.closest('th');
    if (th) {
        th.classList.remove('drag-over');
    }
}

function handleDrop(e, targetKey) {
    e.preventDefault();
    const sourceKey = state.draggedColumnKey;

    if (sourceKey !== targetKey) {
        const sourceIndex = columns.findIndex(col => col.key === sourceKey);
        const targetIndex = columns.findIndex(col => col.key === targetKey);

        if (sourceIndex > -1 && targetIndex > -1) {
            const [movedCol] = columns.splice(sourceIndex, 1);
            columns.splice(targetIndex, 0, movedCol);
            renderTable();
            renderColumnToggles();
        }
    }
    handleDragEnd(e);
}

function handleDragEnd(e) {
    state.draggedColumnKey = null;
    document.querySelectorAll('th').forEach(th => {
        th.classList.remove('dragging', 'drag-over');
    });
}

// Global scope
window.handleSort = handleSort;
window.handleDragStart = handleDragStart;
window.handleDragOver = handleDragOver;
window.handleDragLeave = handleDragLeave;
window.handleDrop = handleDrop;
window.handleDragEnd = handleDragEnd;

