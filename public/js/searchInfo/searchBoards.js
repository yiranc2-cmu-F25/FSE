import { initializeSearchContext } from "../utils/searchCommon.js";
import { clearSearchResults, showFooter, hideNoResultsMessage, showNoResultsMessage, hideFooter, RESULT_BEGIN_INDEX, normalizeQuery, showNextButton, hideNextButton, showPreviousButton, hidePreviousButton } from "../utils/searchInit.js";
import { renderBoardSearchItem } from "../utils/renderBoardSearchItem.js";

const searchContext = "boards";
const lastCursors = [];
let lastQuery = "";
let begin = 1;

async function searchBoards(query) {
    const trimmed = normalizeQuery(query);
    if (!trimmed) {
        hideFooter();
        showNoResultsMessage();
        return;
    }

    const endpoint = [
        `/api/queries?type=${encodeURIComponent(searchContext)}`,
        `&content=${encodeURIComponent(trimmed)}`,
        `&limit=10`,
    ].join("");

    try {
        const res = await fetch(endpoint, { credentials: "include" });
        if (!res.ok) {
            throw new Error(`Search request failed with status ${res.status}`);
        }

        const data = await res.json();
        clearSearchResults();
        lastQuery = trimmed;
        lastCursors.length = 0;
        lastCursors.push(data.nextCursor || null);
        begin = 1;
        
        if (!data.count || data.count === 0) {
            showNoResultsMessage();
            hideFooter();
            return;
        }

        hideNoResultsMessage();
        const resultList = document.querySelector("#search-result-list");
        
        data.results?.forEach((board) => {
            const itemNode = renderBoardSearchItem({
                id: board.id,
                name: board.name,
                content: board.content,
                timestamp: board.timestamp,
            });
            resultList.appendChild(itemNode);
        });

        const listLength = resultList.children.length;
        showFooter({
            start: begin,
            end: begin + listLength - 1,
            total: data.count || 0,
        });
        
        showPreviousButton();
        if (begin === 1) {
            hidePreviousButton();
        }
        
        if (data.nextCursor) {
            showNextButton();
        } else {
            hideNextButton();
        }
    } catch (error) {
        console.error("Error during board search:", error);
    }
}

async function moreBoards() {
    if (lastCursors.at(-1) === null) {
        return;
    }

    const trimmed = normalizeQuery(lastQuery);
    const endpoint = [
        `/api/queries?type=${encodeURIComponent(searchContext)}`,
        `&content=${encodeURIComponent(trimmed)}`,
        `&limit=10`,
        `&cursor=${encodeURIComponent(lastCursors.at(-1))}`
    ].join("");

    try {
        const res = await fetch(endpoint, { credentials: "include" });
        if (!res.ok) {
            throw new Error(`Search request failed with status ${res.status}`);
        }

        const data = await res.json();
        lastCursors.push(data.nextCursor || null);
        begin += 10;
        
        const resultList = document.querySelector("#search-result-list");
        
        data.results?.forEach((board) => {
            const itemNode = renderBoardSearchItem({
                id: board.id,
                name: board.name,
                content: board.content,
                timestamp: board.timestamp,
            });
            resultList.appendChild(itemNode);
        });

        const listLength = resultList.children.length;
        showFooter({
            start: begin,
            end: begin + (data.results?.length || 0) - 1,
            total: data.count || 0,
        });
        
        showPreviousButton();
        if (data.nextCursor) {
            showNextButton();
        } else {
            hideNextButton();
        }
    } catch (error) {
        console.error("Error loading more boards:", error);
    }
}

async function lessBoards() {
    if (lastCursors.length < 2) {
        return;
    }

    const trimmed = normalizeQuery(lastQuery);
    const cursor = lastCursors.length === 2 ? "" : lastCursors.at(-3);

    const endpoint = [
        `/api/queries?type=${encodeURIComponent(searchContext)}`,
        `&content=${encodeURIComponent(trimmed)}`,
        `&limit=10`,
        cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""
    ].join("");

    try {
        const res = await fetch(endpoint, { credentials: "include" });
        if (!res.ok) {
            throw new Error(`Search request failed with status ${res.status}`);
        }

        const data = await res.json();
        lastCursors.length -= 1;
        begin -= 10;
        clearSearchResults();
        
        const resultList = document.querySelector("#search-result-list");
        
        data.results?.forEach((board) => {
            const itemNode = renderBoardSearchItem({
                id: board.id,
                name: board.name,
                content: board.content,
                timestamp: board.timestamp,
            });
            resultList.appendChild(itemNode);
        });

        const listLength = resultList.children.length;
        showFooter({
            start: begin,
            end: begin + listLength - 1,
            total: data.count || 0,
        });
        
        if (begin === 1) {
            hidePreviousButton();
        } else {
            showPreviousButton();
        }
        
        if (data.nextCursor) {
            showNextButton();
        } else {
            hideNextButton();
        }
    } catch (error) {
        console.error("Error loading previous boards:", error);
    }
}

initializeSearchContext(searchContext, "", {
    search: searchBoards,
    more: moreBoards,
    less: lessBoards,
});


