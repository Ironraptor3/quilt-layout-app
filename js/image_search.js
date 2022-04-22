import {data} from "./upload.js";

export let fsCSV = null; // Array of corresponding indices

// Holding onto elements here, could be refactored
let filterInput = null;
let sortInput = null;
let sortAsc = null;

// WARNING: Pages is 1-indexed to support user interface
const pages = new Map();
const pageInputs = new Map();
const pageMaxs = new Map();

let selected = -1;
let selectGrid = null;
let selectInfo = null;

export const getCSVIndex = (grid, offset) => {
    const fsIndex = (pages.get(grid)-1) * grid.children.length + offset;
    const csvIndex = fsCSV[fsIndex];
    return csvIndex == null?-1:csvIndex;
}

const updateInfo = () => {
    let info = "Click an image to display its metrics."
    if (selected !== -1) {
        const index = getCSVIndex(selectGrid, selected);
        if (index > -1) {
            const img = data.csv[index];
            info = `name: ${img.name}<br/>path: ${img.image}`;
            const metrics = getMetrics(); 
            for (const metric of metrics) {
                info += `<br/>${metric}: ${img[metric]}`;
            }
        }
    }
    selectInfo.innerHTML = info;
}

const setSelected = (index) => {
    if (selected === index) {
        selected = -1;
    }
    else {
        selected = index;
    }
    let i = 0;
    for (const child of selectGrid.children) {
        if (i===selected) {
            child.style.outline = "1px solid white";
        }
        else {
            child.style.outline = "";
        }
        ++i;
    }
    updateInfo();
}

const detailsInit = () => {
    selectGrid = document.getElementById("search_grid_large");
    selectInfo = document.getElementById("box_info");

    let i = 0;
    for (const child of selectGrid.children) {
        const index = i;
        child.addEventListener("click", ()=>{
            setSelected(index);
        });
        ++i;
    }
}

export const showImg = (element, path) => {
    element.style.display = "none";
    if (path != null) {
        const reader = new FileReader();
        reader.onload = () => {
            if (reader.result != null) {
                element.style.display = "";
                element.setAttribute("src", reader.result);
            }
        }
        reader.readAsDataURL(path);
    }
}

const showImgs = (grid) => {
    const children = grid.children;
    if (children.length > 0) {
        let i = 0;
        for (const child of children) {
            const imgIndex = getCSVIndex(grid, i);
            const img = imgIndex >= 0?
                data.files.get(data.csv[imgIndex]["image"])
                :null;
            showImg(child, img);
            ++i;
        }
    }
}

const updateGrids = () => {
    for (const grid of pages.keys()) {
        showImgs(grid);
    }
}

const getMaxPage = (element) => {
    return element.children.length < 1?
        1
        :Math.ceil(fsCSV.length / element.children.length);
}

const updateMaxPages = () => {
    for (const element of pageMaxs.keys()) {
        const maxPage = getMaxPage(element);
        pageMaxs.get(element).textContent = getMaxPage(element);
        pageInputs.get(element).setAttribute("max", maxPage);
    }
}

const setPages = (page, target) => {
    for (const element of pages.keys()) {
        let p = page; // This was a bad bug
        if (target != null) {
            const ratio = target.children.length/element.children.length;
            p = Math.floor(ratio*(p-1))+1;
        }
        pageInputs.get(element).value = p;
        pages.set(element,p);
    }
    updateGrids();

    // Redisplay Info
    if (selectInfo != null) {
        updateInfo();
    }
}

const updateFS = () => {
    // Check for empty string
    const filter = filterInput.value;
    fsCSV = data.csv.map(
        (_, index) => index // Save indices
    );
    if (filter !== "") {
        fsCSV = fsCSV.filter( (x) => {
            return data.csv[x]["name"].includes(filter);
        })
    }
    const sort = sortInput.value;
    const asc = sortAsc.checked;

    if (sort !== "None") {
        fsCSV.sort( (a,b) => {
            // Get Values
            const aval = data.csv[a][sort];
            const bval = data.csv[b][sort];
            let result = 0;
            // Trivial case
            if (aval == null && bval == null) {
                result = 0;
            }
            // Null checks (null should come first)
            else if (aval == null) {
                result = -1;
            }
            else if (bval == null) {
                result = 1;
            }
            // Simply, a - b
            else {
                result = aval - bval;
            }

            return result * (asc?1:-1); // Reverse if descending
        });
    }

    // Update pages
    updateMaxPages();
    setPages(1, null);
}

export const getMetrics = () => {
    // Tooling
    // Could be written slightly more neatly
    if (document.getElementById("input_group_select").checked) {
        return [];
    }
    else {
        const metrics = [];
        for (const metric in data.csv[0]) {
            if (metric !== "name" && metric !== "image") {
                metrics.push(metric);
            }
        }
        metrics.sort();
        return metrics;
    }
}

const sortInputInit = () => {
    const metrics = getMetrics();
    for (const metric of metrics) {
        const element = document.createElement("option");
        element.value = metric;
        element.innerHTML = metric;
        sortInput.appendChild(element);
    }
}

// Again, this may be too overspecific - TODO -
// Using 1-indexing here isn't great
const pageChangeInit = (controls_id, grid_id) => {
    const controls = document.getElementById(controls_id);
    const grid = document.getElementById(grid_id);

    // Back button
    controls.children[0].addEventListener("click", () => {
        let page = pages.get(grid) - 1;
        if (page < 1) {
            page = getMaxPage(grid)
        }
        setPages(page, grid);
    });
    // Page input
    pageInputs.set(grid,  controls.children[1]);
    controls.children[1].value = 1;
    controls.children[1].addEventListener("change", ()=>{
        setPages(parseInt(controls.children[1].value), grid);
    });
    // Page max
    pageMaxs.set(grid, controls.children[3]);
    // Forward button
    controls.children[4].addEventListener("click", ()=>{
        let page = pages.get(grid)+1;
        if (page > getMaxPage(grid)) {
            page = 1;
        }
        setPages(page, grid);
    });
}

const pageChangeAllInit = () => {
    pageChangeInit("search_controls_small", "search_grid_small");
    pageChangeInit("search_controls_large", "search_grid_large");
}

export const imageSearchInit = () => {
    // Start at 1 (first index)
    pages.set(document.getElementById("search_grid_small"), 1);
    pages.set(document.getElementById("search_grid_large"), 1);
    
    // Page changing elements
    pageChangeAllInit();
    
    // Filter sort elements
    filterInput = document.getElementById("search_filter");
    sortInput = document.getElementById("search_sort");
    sortAsc = document.getElementById("search_asc");
    const fsInputs = [filterInput, sortInput, sortAsc];
    for (const input of fsInputs) {
        input.addEventListener("change", updateFS);
    }
    sortInputInit();
    updateFS();

    // Details init
    detailsInit();
}