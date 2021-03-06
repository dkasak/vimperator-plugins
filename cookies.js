/* Forked from teramako's cookieManager.js (https://raw.githubusercontent.com/vimpr/vimperator-plugins/master/cookieManager.js) */
var INFO = xml`
<plugin name="cookies" version="1.0"
        href="https://github.com/dkasak/vimperator-plugins/raw/master/cookie.js"
        summary="Manage cookies (list, show, remove, allow, deny)"
        lang="en_US"
        xmlns="http://vimperator.org/namespaces/liberator">
<author mail="teramako@gmail.com" homepage="http://vimperator.g.hatena.ne.jp/teramako/">teramako</author>
<author mail="reversed(ku.gro.animret@kasakd)">dkasak</author>
<project name="Vimperator" minVersion="3.6"/>
<license>MPL 1.1/GPL 2.0/LGPL 2.1</license>
<detail lang="en"><![CDATA[

=== Cookie manager ===

:cookie delete {host} {cookie name}:
    delete a cookie

:cookie delete-all {host}:
    delete all cookies for {host}

:cookie show {host}:
    show cookies for {host}

:cookie deny {host}:
    deny cookies for {host}

:cookie allow {host}:
    allow all cookies for {host}

:cookie permissions {host}:
    list cookie permissions for {host}

:cookie clear-permissions {host}:
    clear cookie permissions for {host}

:cookie allow-session {host}:
    allow session cookies for {host}

]]></detail>
</VimperatorPlugin>`;

liberator.plugins.cookieManager = (function() {

const CM = Cc["@mozilla.org/cookiemanager;1"].getService(Ci.nsICookieManager2);
const PM = Cc["@mozilla.org/permissionmanager;1"].getService(Ci.nsIPermissionManager);
const I_CPM = Ci.nsICookiePermission;
const PERM_TYPE = "cookie";

function getIterator(_enum, interface) {
    while (_enum.hasMoreElements()) {
        let obj = _enum.getNext().QueryInterface(interface);
        yield obj;
    }
}

function cookieIterator() getIterator(CM.enumerator, Ci.nsICookie2);
function cookiePermissionIterator() {
    for (let perm in getIterator(PM.enumerator, Ci.nsIPermission)) {
        if (perm.type === PERM_TYPE)
            yield perm;
    }
}

function capabilityToString(capability) {
    switch (capability) {
        case I_CPM.ACCESS_ALLOW: // 1
            return "ALLOW";
        case I_CPM.ACCESS_DENY: // 2
            return "DENY";
        case I_CPM.ACCESS_SESSION: // 8
            return "ONLY_SESSION";
        default:
            return "DEFAULT";
    }
}

function stringToCapability(str) {
    switch (str) {
        case "ALLOW":
            return I_CPM.ACCESS_ALLOW;
        case "DENY":
            return I_CPM.ACCESS_DENY;
        case "ONLY_SESSION":
            return I_CPM.ACCESS_SESSION;
        default:
            return I_CPM.ACCESS_DEFAULT;
    }
}

function getHost() {
    var host;
    try {
        host = content.document.location.host;
    } catch (e) {}
    return host;
}

// --------------------------------------------------------
// PageInfo
// --------------------------------------------------------
buffer.addPageInfoSection("c", "Cookies", function(verbose) {
    var hostname;
    try {
        hostname = content.window.location.host;
    } catch (e) { return []; }
    return [[c.rawHost + c.path, c.name + " = " + c.value] for (c in cManager.getByHostAndPath(hostname))];
});

// --------------------------------------------------------
// Command
// -----------------------------------------------------{{{
commands.addUserCommand(["cookies"], "Cookie Management",
    function(args) {
        var host = args[1] || getHost();
        if (!host) return;
        switch (args[0]) {
            case "permissions":
                let list = cManager.permissions(host);
                liberator.echo(template.table("Cookie Permission", list));
                break;
            case "allow":
                if (cManager.add(host, "ALLOW")) {
                    liberator.echo("Allowed cookies for '" + host + "'");
                } else {
                    liberator.echo("Failed to allow cookies for '" + host + "'");
                }
                break;
            case "allow-session":
                if (cManager.add(host, "ONLY_SESSION")) {
                    liberator.echo("Allowed session cookies for '" + host + "'");
                } else {
                    liberator.echo("Failed to allow session cookies for '" + host + "'");
                }
                break;
            case "deny":
                if (cManager.add(host, "DENY")) {
                    liberator.echo("Denied cookies for '" + host + "'");
                } else {
                    liberator.echo("Failed to deny cookies for '" + host + "'");
                }
                break;
            case "show":
                let xml = ``;
                let tree = cManager.getTree(host);
                for (let name in tree) {
                    xml += template.table(name, [[c.name, c.value] for each(c in tree[name])]);
                }
                liberator.echo(xml, true);
                break;
            case "delete":
                if (args.length !== 3) {
                    liberator.echo("Invalid number of arguments.");
                    return;
                }
                var name = args[2];
                if(cManager.remove(host, name)) {
                    liberator.echo("Deleted cookie '" + name + "' for '" + host + "'");
                } else {
                    liberator.echo("No cookie '" + name + "' for '" + host + "'");
                }
                break;
            case "delete-all":
                if(cManager.removeAll(host)) {
                    liberator.echo("Deleted cookies for '" + host + "'");
                } else {
                    liberator.echo("Failed to delete cookies for '" + host + "'");
                }
                break;
            case "clear-permissions":
                cManager.clearPermissions(host);
                liberator.echo("Cleared permissions for '" + host + "'");
                break;
            default:
                liberator.echoerr("Invalid command.");
        }
    }, {
        completer: function(context, args) {
            plugins.cookieManager.completer(context, args);
        },
    }, true);
// Command End }}}
var cManager = {
    subcommands: [
        ["show", "show cookies"],
        ["delete", "delete a cookie"],
        ["delete-all", "delete all cookies for host"],
        ["allow", "allow setting cookies for host"],
        ["allow-session", "allow setting session cookies for host"],
        ["deny", "deny setting cookies for host"],
        ["permissions", "list cookie permissions"],
        ["clear-permissions", "clear permissions for host"],
    ],
    add: function(hostname, capability) {
        var uri = util.newURI("http://" + hostname);

        if (typeof capability === "string") {
            capability = stringToCapability(capability);
        } else {
            return false;
        }

        this.remove(hostname);
        PM.add(uri, PERM_TYPE, capability);
        return true;
    },
    clearPermissions: function(hostname) {
        if (this.getByHost(hostname)) {
            PM.remove(hostname, PERM_TYPE);
            return true;
        }
        return false;
    },
    permissions: function(filterReg) {
        if (filterReg && !(filterReg instanceof RegExp)) {
            filterReg = new RegExp(filterReg.toString());
        } else if (!filterReg) {
            filterReg = new RegExp("");
        }
        return [[p.host, capabilityToString(p.capability)]
            for (p in cookiePermissionIterator())].filter(function($_) filterReg.test($_[0]));
    },
    remove: function(hostAndPath, cookieName) {
        if (!hostAndPath) return false;
        var ret = false;
        for (let cookie in this.getByHostAndPath(hostAndPath)) {
            if (cookie.name === cookieName) {
                CM.remove(cookie.host, cookie.name, cookie.path, false);
                ret = true;
            }
        }
        return ret;
    },
    removeAll: function(hostAndPath) {
        if (!hostAndPath) return false;
        for (let cookie in this.getByHostAndPath(hostAndPath)) {
            CM.remove(cookie.host, cookie.name, cookie.path, false);
        }
        return true;
    },
    getByHostAndPath: function(hostAndPath) {
        for (let cookie in cookieIterator()) {
            if (!hostAndPath || (cookie.rawHost + cookie.path).indexOf(hostAndPath) === 0)
                yield cookie;
        }
    },
    getTree: function(hostAndPath) {
        var tree = {};
        function getTree(name) {
            if (name in tree) return tree[name];
            tree[name] = [];
            return tree[name];
        }
        for (let cookie in this.getByHostAndPath(hostAndPath)) {
            getTree(cookie.rawHost + cookie.path).push(cookie);
        }
        return tree;
    },
    getByHost: function(hostname) {
        for (let permission in cookiePermissionIterator()) {
            if (permission.host === hostname)
                return permission;
        }
        return null;
    },
    capabilityList: [
        ["ALLOW", "-"],
        ["DENY", "-"],
        ["ONLY_SESSION", "-"]
    ],
    completer: function(context, args) {
        if (args.length === 1) {
            context.title = ["Command", "Description"];
            context.completions = context.filter ?
                this.subcommands.filter(function(c) c[0].indexOf(context.filter) >= 0) :
                this.subcommands;
        } else {
            let suggestion = [];
            let command = args[0];
            if (args.length === 2) {
                let host = getHost();
                if (host) {
                    let hosts = [];
                    host.split(".").reduceRight(function(p, c) {
                        let domain = c + "." + p;
                        hosts.push([domain, "-"]);
                        return domain;
                    });
                    suggestion = hosts.reverse();
                    context.title = ["Current Host"];
                    context.completions = context.filter ?
                        suggestion.filter(function($_) $_[0].indexOf(context.filter) >= 0) : suggestion;
                    return;
                }
            } else if (args.length === 3 && command === "delete") {
                let host = args[1];
                let cookies = [];
                for (let cookie in this.getByHostAndPath(host)) {
                    cookies.push([cookie.name, cookie.value]);
                }

                context.title = ["Cookies for " + host];
                context.completions = context.filter ?
                    cookies.filter(function(c) c[0].indexOf(context.filter) >= 0) : cookies;
                return;
            }
        }
    },
};
return cManager;
})();

// vim: sw=4 ts=4 et fdm=marker:
