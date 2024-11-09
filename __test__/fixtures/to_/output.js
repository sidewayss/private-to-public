class C {
  constructor() {
    this._p = this._r();
    this._q = 0;
  }
  get p() {
    return this._p;
  }
  get q() {
    return this._q;
  }
  _r() {
    return true;
  }
}