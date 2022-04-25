import { currentData, selectNode, changeNode } from "./layout.js";

// Root of the saves
let root = null;
// A listing of saves
const saves = new Map();
// A listing of the save HTML
const saveHTML = new Map();

// Holds textual information for the saves
let saveContainer = null;
// The text entry box for renaming saves
let textEntry = null;
// Id of the current save
let currentSave = 0;
// Id of the hovered save
let hoverSave = 0;
// Next ID to use
let maxID = 0;

// Init save import functionality
const importInit = () => {
    const uploadSave = document.getElementById("upload_save");
    document.getElementById("button_import_save")
        .addEventListener("click", () => {
            uploadSave.click();
        });
    uploadSave.addEventListener("change", ()=> {
        if (uploadSave.files.length > 0) {
            const reader = new FileReader();
            reader.onload = () => {
                importSave(reader.result);
            };
            reader.readAsBinaryString(uploadSave.files[0]);
        }
    })
}

// Init all save based functionality
export const saveInit = () => {
    // Get div
    saveContainer = document.getElementById("save_container");
    
    // Get input
    textEntry = document.getElementById("input_save_name");

    // Spawn root node
    root = initNode();
    selectSave(root);
    updateHover(root);

    // Init event handlers
    document.getElementById("button_save_current")
        .addEventListener("click", () => {
            saveData(currentSave, currentData);
        });
    document.getElementById("button_save_name")
        .addEventListener("click", () => {
            updateName(hoverSave, textEntry.value);
        });
    document.getElementById("button_load_hover")
        .addEventListener("click", () => {
            selectSave(hoverSave);
        });
    document.getElementById("button_branch_hover")
        .addEventListener("click", ()=>{
            makeBranch(hoverSave, saves.get(hoverSave).data)
        })
    document.getElementById("button_delete_hover")
        .addEventListener("click", ()=> {
            deleteBranch(hoverSave);
        });
    document.getElementById("button_export_save")
        .addEventListener("click", ()=>{
            exportSave();
        });

    // Take care of the importing separately
    importInit();
}

// Updates the name of the given id
const updateName = (id, name) => {
    const s = saves.get(id);
    const finalName = name.replace(",", " ");
    s.name = finalName;

    saveHTML.get(id)[1].textContent = finalName;
}

// Changes the hover to the new id
const updateHover = (hoverID) => {
    // Remove previous color
    if (hoverSave !== currentSave) {
        const old = saveHTML.get(hoverSave);
        if (old != null) {
            old[1].style.color = "";
        }
    }
    // Update value
    hoverSave = hoverID;
    // Add new color
    if (hoverSave !== currentSave) {
        saveHTML.get(hoverSave)[1].style.color = "red";
    }
    // Update the textEntry value
    textEntry.value = saves.get(hoverSave).name;
}

// Makes a new save node
const initNode = (name="Default", parentID=-1, data=[], id=null) => {
    const nodeID = id==null?maxID++:id;
    const node = {
        id: nodeID,
        name: name,
        data: data,
        children: [],
        parent: parentID,
    };
    // Append node
    saves.set(node.id, node);
    
    // Create an unordered list and list item
    const nodeUl = document.createElement("ul");
    const nodeLi = document.createElement("li");

    nodeLi.textContent = name;
    nodeLi.addEventListener("click", (event)=> {
        updateHover(node.id);
        event.stopPropagation();
    });
    nodeUl.appendChild(nodeLi); // Append list item to list

    // Append to the save container if its the root save
    if (parentID < 0) {
        saveContainer.appendChild(nodeUl);
    }
    // Append to the parent of the node
    else {
        saves.get(parentID).children.push(node.id);
        saveHTML.get(parentID)[0].appendChild(nodeUl);
    }

    // Append HTML
    saveHTML.set(node.id, [nodeUl, nodeLi] );
    
    // Return result
    return node.id;
}

// Gets the name of a branch of the node
const getBranchName = (id) => {
    const s = saves.get(id);
    const nsplit = s.name.split(" ");
    
    // Look for a number
    if (nsplit.length > 1) {
        const num = parseInt(nsplit[nsplit.length-1]);
        if (!isNaN(num)) {
            return nsplit.slice(0,-1) + ` ${num+1}`; // Add 1 to the number
        }
    }
    
    return s.name + " 2"; // Next iteration is 2

}


// Makes a new branch for the node
const makeBranch = (id, data) => {
    return initNode(getBranchName(id), id, data);
}

// Deletes a branch
const deleteBranch = (id, recurse=false, regenRoot=true) => {
    const node = saves.get(id);
    if (!recurse) { // Do not bother with the children nodes updating
        const parent = saves.get(node.parent);
        if (parent != null) {
            //Credit to: https://stackoverflow.com/a/5767357/18789057
            const childIndex = parent.children.indexOf(id);
            if (childIndex > -1) {
                parent.children.splice(childIndex,1); // Remove child
            }
        }
    }
    for (const childID of node.children) { // Recursive delete
        deleteBranch(childID);
    }
    saves.delete(id); // Delete the save node

    const tup = saveHTML.get(id); // Get the corresponding HTML
    tup[0].remove(); // Delete
    tup[1].remove(); // Delete
    saveHTML.delete(id); // Remove from the map

    if (regenRoot) {
        if (saves.size < 1) {
            root = initNode();
            selectSave(root);
            updateHover(root);
        }
        else {
            if (currentSave === id) {
                selectSave(root);
            }
            if (hoverSave === id) {
                updateHover(root);
            }
        }
    }
}

// Saves the data given
const saveData = (id, data) => {
    const s = saves.get(id);
    const dataCopy = data.slice(); // Make a copy ( this was a bug )
    if (s.children.length > 0) { // Cannot save to branch with children, make a new child
        selectSave(makeBranch(id, dataCopy));
    }
    else {
        s.data = dataCopy;
    }
}

// Loads the data of id into the currentData of the layout
const loadAll = (id) => {
    selectNode(-1);
    const s = saves.get(id);
    const data = s.data;
    for (let i = 0; i < currentData.length; ++i) {
        let val = i<data.length?data[i]:-1;
        changeNode(val, i);
    }
}

// Updates a selection
const selectSave = (id) => {
    const old = saveHTML.get(currentSave);
    // Remove color
    if (old != null){
        old[1].style.color = "";
    }

    currentSave = id; // Change variable

    loadAll(currentSave); // Load the data
    updateHover(currentSave); // Update the hover to this as well
    saveHTML.get(currentSave)[1].style.color = "blue"; // Add new text color
}

// Imports a save
const importSave = (result) => {
    // Tooling

    // Deletes original tree
    deleteBranch(root, false, false);

    // Read lines
    const lines = result.split(/\r?\n/);
    const header = lines[0].split(",");
    maxID = parseInt(header[0]);
    // I am okay with how this looks aesthetically
    for (let i = 1; i < lines.length; ++i) {
        const line = lines[i].split(",");
        const id = parseInt(line[0]);
        const name = line[1];
        const parentID = parseInt(line[2]);
        const data = line.slice(3).map((d)=>parseInt(d));
        // Init nodes one at a time, with the data on each line
        initNode(name, parentID, data, id);
    }
    // Select the last selected save
    selectSave(parseInt(header[1]));
}

// Credit to https://stackoverflow.com/a/18197341/18789057
const download = (filename, text) => {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }

  // Downloads your current save data
const exportSave = () => {
    // Tooling
    // Node data
    // max, current
    let str = `${maxID},${currentSave}`;
    // Sort keys to be in correct order
    const ids = Array.from(saves.keys()).sort((a,b)=>a-b);
    for (const id of ids) {
        const save = saves.get(id);
        // Add save to the string
        str += `\n${id},${save.name},${save.parent}`
        for (const d of save.data) {
            str += `,${d}`;
        }
    }
    // Download the generated string
    download("layout_saves.txt", str);
}
