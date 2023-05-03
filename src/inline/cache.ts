/** @internal */

export class RemoteCache<TSource, TResult> {
    private content: Record<string, TResult> = {};
    constructor(
        private readonly accessor: (this: void, source: TSource) => string,
        private readonly reader: (this: void, source: TSource, response: Response) => Promise<TResult>
    ) { }
    public async get(source: TSource) {
        const url = this.accessor(source);
        if (this.content[url])
            return this.content[url];
        try {
            const response = await fetch(url);
            if (!response.ok)
                throw new Error("Fetch error: " + response.status);
            const data = await this.reader(source, response);
            this.content[url] = data;
            return data;
        }
        catch (e) {
            console.warn(`Failed to load data from: ${url}`, e);
            return null;
        }
    }
}
