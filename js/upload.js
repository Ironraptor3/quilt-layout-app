export const data = {
    csv: null,
    files: null,
    layout: null,
    meta: null,
};

const uploadButtons = [
];

const uploadInputs = [
];

const updateBegin = () => {
    const begin = document.getElementById("button_begin");
    
    let filled = true;
    let i = 0;
    for (const d in data) {
        if (data[d] == null) {
            uploadButtons[i].setAttribute("class", "");
            filled = false;
        }
        else {
            uploadButtons[i].setAttribute("class", "filled_button");
        }
        ++i;
    }

    begin.disabled = !filled;
}

// Fixes each element of the metrics data
const adjustData = (data) => {
    //May be problematic
    delete data['']
    //Update image path
    data['image'] = data['image'].replaceAll("\\", "/");
    //Find name of image to display
    const path = data['image']
    //Credit to https://stackoverflow.com/a/25221100
    data['name'] = path.split("/").pop();
}

// Loads the Metrics File
const loadMetricsFile = (input) => {
    if (input.files.length > 0) {
        const reader = new FileReader();
        reader.onload = () => {
            data.csv = $.csv.toObjects(reader.result);
            data.csv.forEach(adjustData);
            updateBegin();
        }
        reader.readAsBinaryString(input.files[0]);
    }
    else {
        data.csv = null;
        updateBegin();
    }
}

// Loads all metrics images
const loadMetricsFolder = (input) => {
    if (input.files.length > 0) {
        // Set up dictionary
        data.files = new Map();
        for (const file of input.files) {
            data.files.set(file["webkitRelativePath"], file);
        }
        // Update the begin button
        updateBegin();
    }
    // Set files = null
    else {
        data.files = null;
        updateBegin();
    }
}

const loadLayout = (input) => {
    if (input.files.length > 0) {
        data.layout = input.files[0];
        updateBegin();
    }
    else {
        data.layout = null;
        updateBegin();
    }
}

const loadMeta = (input) => {
    if (input.files.length > 0) {
        const reader = new FileReader();
        reader.onload = () => {
            data.meta = []
            //Help from https://stackoverflow.com/a/54502026/18789057
            for (const line of reader.result.split(/\r?\n/)) {
                if (line !== "") {
                    const vals = line.split(",");
                    const node = {
                        x: parseFloat(vals[1]),
                        y: parseFloat(vals[0]),
                        dists: []
                    };

                    for (let i = 2; i < vals.length; i+=2) {
                        node.dists.push({
                            index: parseInt(vals[i]),
                            dist: parseFloat(vals[i+1])
                        });
                    }

                    data.meta.push(node);
                }
            }
            updateBegin();
        }
        reader.readAsBinaryString(input.files[0]);
    }
    else {
        data.meta = null;
        updateBegin();
    }
}

const uploadNames = [
    "metrics",
    "images",
    "layout",
    "meta",
];

const changeFcns = [
    loadMetricsFile,
    loadMetricsFolder,
    loadLayout,
    loadMeta,
];

export const uploadInit = (doc)=> {
    for (let i = 0; i < uploadNames.length; ++i) {
        const name = uploadNames[i];

        const btn = doc.getElementById("button_"+name);
        const ipt = doc.getElementById("upload_"+name);

        btn.addEventListener("click", ()=>{ipt.click();});
        ipt.addEventListener("change",()=>{changeFcns[i](ipt);});

        uploadButtons.push(btn);
        uploadInputs.push(ipt);
    }
}