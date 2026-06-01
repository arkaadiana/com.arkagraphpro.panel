if (typeof JSON !== "object") {
    JSON = {};
}

if (typeof JSON.parse !== "function") {
    JSON.parse = function (value) {
        if (!value || value === "") return null;
        try {
            return eval("(" + value + ")");
        } catch (e) {
            return null;
        }
    };
}

if (typeof JSON.stringify !== "function") {
    JSON.stringify = function (value) {
        var items;
        var i;
        var key;
        var pairs;

        if (value === null) return "null";
        if (typeof value === "number" || typeof value === "boolean") return String(value);
        if (typeof value === "string") return "\"" + value.replace(/\\/g, "\\\\").replace(/"/g, "\\\"") + "\"";

        if (value instanceof Array) {
            items = [];
            for (i = 0; i < value.length; i++) {
                items.push(JSON.stringify(value[i]));
            }
            return "[" + items.join(",") + "]";
        }

        if (typeof value === "object") {
            pairs = [];
            for (key in value) {
                if (value.hasOwnProperty(key)) {
                    pairs.push("\"" + key + "\":" + JSON.stringify(value[key]));
                }
            }
            return "{" + pairs.join(",") + "}";
        }

        return "null";
    };
}
