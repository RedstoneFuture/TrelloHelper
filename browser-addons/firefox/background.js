let pendingClose = [];

browser.webRequest.onBeforeRequest.addListener((requestDetails) => {
        const url = new URL(requestDetails.url);
        // the following is a filter for links that refer to boards or cards (boards => '/b'; cards => '/c')
        if (url.hostname === "trello.com" && (url.pathname.startsWith("/b/") || url.pathname.startsWith("/c/")) ) {
            const newUrl = requestDetails.url.replace("https://", "trello://");
            pendingClose.push(requestDetails.tabId);
            return {
                redirectUrl: newUrl
            };
        }
    },
    {
        urls: ["*://trello.com/*"], 
        types: ["main_frame"] 
    },
    ["blocking"]
);

browser.windows.onFocusChanged.addListener((windowId) => {
    pendingClose.forEach(i => browser.tabs.remove(i));
});