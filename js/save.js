import { currentData, selectNode, changeNode } from "./layout.js";

let root = null;
const saves = new Map();
const saveHTML = new Map();

let saveContainer = null;
let textEntry = null;
let currentSave = 0;
let hoverSave = 0;

let maxID = 0;

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

const updateName = (id, name) => {
    const s = saves.get(id);
    const finalName = name.replace(",", " ");
    s.name = finalName;

    saveHTML.get(id)[1].textContent = finalName;
}

const updateHover = (hoverID) => {
    if (hoverSave !== currentSave) {
        const old = saveHTML.get(hoverSave);
        if (old != null) {
            old[1].style.color = "";
        }
    }
    hoverSave = hoverID;
    if (hoverSave !== currentSave) {
        saveHTML.get(hoverSave)[1].style.color = "red";
    }

    textEntry.value = saves.get(hoverSave).name;
}

const initNode = (name="Default", parentID=-1, data=[], id=null) => {
    const nodeID = id==null?maxID++:id;
    const node = {
        id: nodeID,
        name: name,
        data: data,
        children: [],
        parent: parentID,
    };
    saves.set(node.id, node);
    
    const nodeUl = document.createElement("ul");
    const nodeLi = document.createElement("li");

    nodeLi.textContent = name;
    nodeLi.addEventListener("click", (event)=> {
        updateHover(node.id);
        event.stopPropagation();
    });
    nodeUl.appendChild(nodeLi);

    if (parentID < 0) {
        saveContainer.appendChild(nodeUl);
    }
    else {
        saves.get(parentID).children.push(node.id);
        saveHTML.get(parentID)[0].appendChild(nodeUl);
    }

    saveHTML.set(node.id, [nodeUl, nodeLi] );
    
    return node.id;
}

const getBranchName = (id) => {
    const s = saves.get(id);
    const nsplit = s.name.split(" ");
    
    if (nsplit.length > 1) {
        const num = parseInt(nsplit[nsplit.length-1]);
        if (!isNaN(num)) {
            return nsplit.slice(0,-1) + ` ${num+1}`;
        }
    }
    
    return s.name + " 2"; // Next iteration is 2

}

const makeBranch = (id, data) => {
    return initNode(getBranchName(id), id, data);
}

const deleteBranch = (id, recurse=false, regenRoot=true) => {
    const node = saves.get(id);
    if (!recurse) {
        const parent = saves.get(node.parent);
        if (parent != null) {
            //Credit to: https://stackoverflow.com/a/5767357/18789057
            const childIndex = parent.children.indexOf(id);
            if (childIndex > -1) {
                parent.children.splice(childIndex,1);
            }
        }
    }
    for (const childID of node.children) { // Recursive delete
        deleteBranch(childID);
    }
    saves.delete(id);

    const tup = saveHTML.get(id);
    tup[0].remove();
    tup[1].remove();
    saveHTML.delete(id);

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

const saveData = (id, data) => {
    const s = saves.get(id);
    const dataCopy = data.slice();
    if (s.children.length > 0) {
        selectSave(makeBranch(id, dataCopy));
    }
    else {
        s.data = dataCopy;
    }
}

const loadAll = (id) => {
    selectNode(-1);
    const s = saves.get(id);
    const data = s.data;
    for (let i = 0; i < currentData.length; ++i) {
        let val = i<data.length?data[i]:-1;
        changeNode(val, i);
    }
}

const selectSave = (id) => {
    const old = saveHTML.get(currentSave);
    if (old != null){
        old[1].style.color = "";
    }

    currentSave = id;

    loadAll(currentSave);
    updateHover(currentSave);
    saveHTML.get(currentSave)[1].style.color = "blue";
}

const importSave = (result) => {
    // Tooling

    deleteBranch(root, false, false);

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
        initNode(name, parentID, data, id);
    }
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

const exportSave = () => {
    // Tooling
    // Node data
    // max, current
    let str = `${maxID},${currentSave}`;
    const ids = Array.from(saves.keys()).sort((a,b)=>a-b);
    for (const id of ids) {
        const save = saves.get(id);
        str += `\n${id},${save.name},${save.parent}`
        for (const d of save.data) {
            str += `,${d}`;
        }
    }
    download("layout_saves.txt", str);
}