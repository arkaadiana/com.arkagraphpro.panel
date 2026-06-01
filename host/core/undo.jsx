function arkaGraphCloseUndoGroup(undoStarted) {
    if (!undoStarted) return;
    try {
        app.endUndoGroup();
    } catch (e) {
    }
}
