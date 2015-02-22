/*
 * history-skip-domain.js
 *
 * Copyright (C) 2015 Denis Kasak
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
 * DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
 * TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE
 * OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */


/* Adds mappings to go back or forward in history to a previous/next domain (as
 * in Pentadactyl).
 *
 * Mappings:
 *   <count>[d - go back to a <count>th previous domain in history
 *   <count>]d - go forward to a <count>th next domain in history
 */

var INFO = xml`
<plugin name="history-skip-domain" version="1.0"
        href="https://github.com/dkasak/vimperator-plugins/blob/master/history-skip-domain.js"
        summary="Skip to a previous/next domain in browser history"
        lang="en_US"
        xmlns="http://vimperator.org/namespaces/liberator">
    <author email="reversed(ku.gro.animret@kasakd)">Denis Kasak</author>
    <project name="Vimperator" minVersion="3.6"/>
    <license>MIT</license>
    <p>Adds mappings to go back or forward in history to a previous/next domain.</p>
    <item>
        <tags>[d</tags>
        <spec>[count][d</spec>
        <description>
            <p>Go back to a [count]th previous domain in history.</p>
        </description>
    </item>
    <item>
        <tags>]d</tags>
        <spec>[count]]d</spec>
        <description>
            <p>Go forward to a [count]th next domain in history.</p>
        </description>
    </item>
</plugin>`;

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
