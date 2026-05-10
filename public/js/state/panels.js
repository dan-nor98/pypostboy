const SIDEBAR_WIDTH_KEY = 'postboy_sidebar_width';
const RIGHT_SIDEBAR_WIDTH_KEY = 'postboy_right_sidebar_width';
const RESPONSE_HEIGHT_KEY = 'postboy_response_height';

export function savePanelSize(panel, value) {
    var key = panel === 'sidebar' ? SIDEBAR_WIDTH_KEY : panel === 'rightSidebar' ? RIGHT_SIDEBAR_WIDTH_KEY : RESPONSE_HEIGHT_KEY;
    localStorage.setItem(key, String(Math.round(value)));
}

export function loadPanelSizes() {
    return {
        sidebar: parseInt(localStorage.getItem(SIDEBAR_WIDTH_KEY), 10),
        rightSidebar: parseInt(localStorage.getItem(RIGHT_SIDEBAR_WIDTH_KEY), 10),
        response: parseInt(localStorage.getItem(RESPONSE_HEIGHT_KEY), 10)
    };
}
