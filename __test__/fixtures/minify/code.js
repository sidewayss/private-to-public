class C {
    #p;
    _q;
    constructor() {
        this.#p = null;
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
    static #s() {
        return false;
    }
}
class D extends C {
    #p;
    #q;
    constructor() {
        this.#p = null;
        this.#q = 0;
    }
    #r() {
        return true;
    }
    static #s() {
        return false;
    }
}

class E extends D {
    #p;
    #q;
    constructor() {
        this.#p = null;
        this.#q = 0;
    }
    #r() {
        return true;
    }
    static #s() {
        return false;
    }
}