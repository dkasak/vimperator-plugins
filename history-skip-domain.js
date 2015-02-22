let history = liberator.modules.history;
let mappings = liberator.modules.mappings;

history['skip_domain'] = function (steps) {
    let session_history = window.getWebNavigation().sessionHistory;
    let entry = function(i) session_history.getEntryAtIndex(i, false);

    let start = 0;
    let end = session_history.count - 1;
    let current = session_history.index;

    let direction = Math.sign(steps);
    let uri = entry(current).URI.hostPort;

    while (steps) {
        current += direction;

        if (current > end || current < start)
            break;

        let new_uri = entry(current).URI.hostPort;
        if (uri !== new_uri) {
            steps -= direction;
            uri = new_uri;
        }
    }

    if (current >= start && current <= end)
        window.getWebNavigation().gotoIndex(current);
    else
        liberator.beep();
}

mappings.add(config.browserModes,
    ["[d"], "Go back to the previous domain in the browser history",
    function (count) { history.skip_domain(-Math.max(count, 1)); },
    { count: true });

mappings.add(config.browserModes,
    ["]d"], "Go forward to the next domain in the browser history",
    function (count) { history.skip_domain(Math.max(count, 1)); },
    { count: true });
