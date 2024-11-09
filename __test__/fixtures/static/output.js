class C {
  static _privMethod() {
    return this._privAssign;
  }
}
C.publAssign = 1;
C._privAssign = 0;
