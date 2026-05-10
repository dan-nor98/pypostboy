export function tokenize(cmd) {
    var tokens = [];
    var i = 0;
    while (i < cmd.length) {
        while (i < cmd.length && cmd[i] === ' ') i++;
        if (i >= cmd.length) break;
        if (cmd[i] === "'" || cmd[i] === '"') {
            var q = cmd[i++];
            var tok = '';
            while (i < cmd.length && cmd[i] !== q) {
                if (cmd[i] === '\\' && i + 1 < cmd.length) { tok += cmd[++i]; }
                else tok += cmd[i];
                i++;
            }
            i++;
            tokens.push(tok);
        } else if (cmd[i] === '$' && cmd[i+1] === '(') {
            var depth = 1;
            i += 2;
            while (i < cmd.length && depth > 0) {
                if (cmd[i] === '(') depth++;
                if (cmd[i] === ')') depth--;
                i++;
            }
            tokens.push('$(...)');
        } else {
            var tok2 = '';
            while (i < cmd.length && cmd[i] !== ' ') { tok2 += cmd[i++]; }
            tokens.push(tok2);
        }
    }
    return tokens;
}
