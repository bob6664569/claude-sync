class SyncQueue {
    constructor(syncFunction) {
        this.queue = [];
        this.processing = false;
        this.syncFunction = syncFunction;
    }

    add(item) {
        this.queue.push(item);
        this.process();
    }

    async process() {
        if (this.processing || this.queue.length === 0) return;
        this.processing = true;

        while (this.queue.length > 0) {
            const item = this.queue.shift();
            try {
                await this.syncFunction(item);
            } catch (error) {
                console.error(`Error processing item ${JSON.stringify(item)}:`, error);
            }
        }

        this.processing = false;
    }
}

module.exports = SyncQueue;