export function countTotalRequests(node) {
    var count = (node.requests ? node.requests.length : 0);
    if (node.children && node.children.length) {
        node.children.forEach(function(child) {
            count += countTotalRequests(child);
        });
    }
    return count;
}
