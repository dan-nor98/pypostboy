export function buildSnapshotDefaultName() {
    var now = new Date();
    return 'Snapshot ' +
        now.getFullYear() + '-' +
        padSnapshotTimestampPart(now.getMonth() + 1) + '-' +
        padSnapshotTimestampPart(now.getDate()) + ' ' +
        padSnapshotTimestampPart(now.getHours()) + ':' +
        padSnapshotTimestampPart(now.getMinutes()) + ':' +
        padSnapshotTimestampPart(now.getSeconds());
}

function padSnapshotTimestampPart(value) {
    return String(value).padStart(2, '0');
}
