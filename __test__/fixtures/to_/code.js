class C {
    #p;
    _q;
    constructor() {
        this.#p = this.#r();
        this._q = 0;
    }
    get p() {
        return this.#p;
    }
    get q() {
        return this._q;
    }
    #r() {
        return true;
    }
}