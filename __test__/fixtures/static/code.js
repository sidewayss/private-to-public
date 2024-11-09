class C {
    static #privy;
    static publy;
    static #privAssign = 0;
    static publAssign = 1;
    static #privMethod() {
        return this.#privAssign;
    }
}