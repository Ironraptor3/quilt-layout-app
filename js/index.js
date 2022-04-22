import { imageSearchInit } from "./image_search.js";
import {uploadInit } from "./upload.js";
import {layoutInit} from "./layout.js";
import { saveInit } from "./save.js";

const sectionNames = [
    "main_menu",
    "layout_editor",
    "save_editor",
    "image_search",
];

const sections = [

];

const initSections = () => {
    for (let i = 0; i < sectionNames.length; ++i) {
        sections.push(document.getElementById(sectionNames[i]));
    }
}

const updateView = (view) => {
    for (let i = 0; i < sections.length; ++i) {
        const display = i==view?"":"none";
        sections[i].style.display = display;
    }
}

// This may be too specific
const initTransitions = () => { 
    for (let i = 0; i < sectionNames.length; ++i) {
        const name = sectionNames[i];
        for (const element of document.getElementsByName("button_"+name)) {
            element.addEventListener("click", () => {
                updateView(i);
            });
        }
    }
}

const initBegin = () => {
    const begin = document.getElementById("button_begin");
    begin.addEventListener("click", () => {
        // Init image search
        imageSearchInit();
        // Init layout
        layoutInit();
        // Init save data
        saveInit();
    });
}

export const init = () => {
    // Init sections
    initSections();
    // Init transition buttons
    initTransitions();
    // Init begin button
    initBegin();

    // Only show main menu
    updateView(0);

    // Init uploader
    uploadInit(document);
}