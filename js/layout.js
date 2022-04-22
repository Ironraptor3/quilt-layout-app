import { data } from "./upload.js"
import { showImg, getMetrics, getCSVIndex } from "./image_search.js";

let background = null;
let layoutImg = null;

let style = null;
let styleIndex = 0;

let natWidth = 0;
let natHeight = 0;

let zoom = 1;

let selected = -1; // Currently selected node

const nodeMap = []; // Meta index to HTML div
export let currentData = []; // Meta index to csv index

let grid = null;

const updateRule = (nz) => {
    const rules = style.sheet.cssRules || style.sheet.rules;
    rules[styleIndex].style.width = `${natWidth*nz}px`;
    rules[styleIndex].style.height = `${natHeight*nz}px`;

    const left = background.offsetLeft;
    const top = background.offsetTop;
    const dz = zoom-nz;

    background.style.left = left+dz*natWidth/2+"px";
    background.style.top = top+dz*natHeight/2+"px";

    zoom = nz;
}

const getRecommend = (i, distFunc=((_)=>1)) => {

    const metrics = getMetrics();
    // Map to 2d array to keep index and keep track of weights
    const recommend = data.csv
    .map(
        (csvData, csvIndex)=>[csvIndex, csvData, 0]
    )
    .filter(
        (_, csvIndex)=>!currentData.includes(csvIndex)
    );

    for (const meta of data.meta[i].dists) {
        const imgIndex = currentData[meta.index];
        if (imgIndex != undefined && imgIndex >= 0 && imgIndex < data.csv.length) {
            const img = data.csv[imgIndex];
            const dist = distFunc(meta.dist);
            for (const recImg of recommend) {
                let diff = 0;
                for (const metric of metrics) {
                    diff += Math.pow(recImg[1][metric]-img[metric], 2);
                }
                diff = Math.sqrt(diff);
                recImg[2] += dist*diff;
            }
        }
    }
    recommend.sort(
        (a,b)=>a[2]-b[2] // Sort on weights
    );

    return recommend.map(
        (recData) => recData[0] // Just return index
    );
}

export const changeNode = (csvIndex, metaIndex = selected) => {
    const node = nodeMap[metaIndex]
    if (node != undefined) {
        currentData[metaIndex] = csvIndex;
        // Get first direct img child
        const img = Array.from(node.getElementsByTagName("img"))
            .filter(
                (element)=>element.parentNode === node
            )[0];
        if (img != null) {
            const path = csvIndex >= 0 && csvIndex < data.csv.length?
                data.files.get(data.csv[csvIndex]["image"])
                :null;
            showImg(img, path);
        }
    }
}

export const selectNode = (i) => {
    // Deselect previous
    if (selected >= 0) {
        const prev = nodeMap[selected];
        const remove = prev.getElementsByTagName("div");
        for (const node of remove) {
            prev.removeChild(node);
        }
    }
    if (i === -1 || selected === i) {
        selected = -1;
    }
    //Select
    else {
        selected = i;
        
        const rec = document.createElement("div");
        rec.setAttribute("class", "recommend_div");
        nodeMap[selected].appendChild(rec);
        
        const recommend = getRecommend(selected); //Indices in order

        for (let j = 0; j < 3 && j < recommend.length; ++j) {
            const img = document.createElement("img");
            showImg(img, data.files.get(data.csv[recommend[j]]["image"]));
            // Constant for inline function
            const recConst = recommend[j];
            // On click, save choice
            img.addEventListener("click", (event)=>{
                event.stopPropagation(); // Prevents bubble up
                changeNode(recConst);
            });

            rec.appendChild(img);
        }
    }
}

const zoomBackground = (event) => {
    const scalar = .003; // Constant for change
    const nz = zoom + scalar*event.deltaY; // Get new zoom
    if (nz < 0.1) { // Check min
        updateRule(0.1)
    }
    else if (nz > 10) { // Check max
        updateRule(10);
    }
    else { // Apply change
        updateRule(nz);
    }
}

const resetCamera = () => {
    updateRule(1);
    background.style.left = "";
    background.style.top = "";
}

const trySelect = (index) => {
    // Coud add complexity / checks here
    changeNode(getCSVIndex(grid, index));
}

const initGridSelect = () => {
    grid = document.getElementById("search_grid_small");
    let i = 0;
    for (const child of grid.children) {
        const ci = i;
        child.addEventListener("click", () => {
            trySelect(ci);
        });
        ++i;
    }
}

export const layoutInit = () => {
    // Init style
    style = document.createElement("style");
    document.head.appendChild(style);
    // Get document elements
    background = document.getElementById("image_background");
    layoutImg = document.getElementById("image_layout");
    
    // Init layout image
    layoutImg.style.display = "none";
    const reader = new FileReader();
    reader.onload = () => {
        if (reader.result != null) {
            layoutImg.style.display = "";
            // When the image gets updated
            layoutImg.onload = () => {
                // Get natural dimensions
                natWidth = layoutImg.naturalWidth;
                natHeight = layoutImg.naturalHeight;

                // Update size of image in stylesheet
                styleIndex = style.sheet.insertRule(`#image_background{
                }`);
                updateRule(1);
            }
            // Load data into image
            layoutImg.src = reader.result;       
        }
    }
    // Load data
    reader.readAsDataURL(data.layout);

    // Set the background to being draggable
    $("#image_background").draggable();

    // Set the background to being zoomable
    background.addEventListener("wheel", zoomBackground);
    // Enable the reset button
    document.getElementById("button_reset_layout")
        .addEventListener("click", resetCamera);
    // Enable the clear button
    document.getElementById("button_remove_selection")
        .addEventListener("click", () => {
            changeNode(-1); // Remove selected index
        })
    // Init the ability to click on the side of the screen
    initGridSelect();

    // Init all design nodes
    let i = 0;
    for (const meta of data.meta) {
        // Create HTML
        const node = document.createElement("div");
        node.setAttribute("class", "image_node");
        // Update position
        node.style.left = 100*meta.x+"%";
        node.style.top = 100*meta.y +"%";
        // Append as child
        background.appendChild(node);

        // Create child image
        const img = document.createElement("img");
        node.appendChild(img);
        
        // Register click event
        const ci = i;
        node.addEventListener("click", ()=>{
            selectNode(ci);
        });
        // Update map [its an array now] (index=>node) (children not 1:1)
        nodeMap.push(node);
        currentData.push(-1); // Init selection to -1 (no selection)
        // Increment i
        ++i;
    }
}