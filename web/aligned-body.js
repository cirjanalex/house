// Walk only. Reserve a small crown above the optical centre, including on stairs/in flight.
const WALK_BODY=Object.freeze({
  eye:1.80, get head(){return this.eye+.035;}, near:.012,
  roofAt(surface,x,z){
    const r=.035;
    return Math.min(surface(x,z),surface(x-r,z),surface(x+r,z),surface(x,z-r),surface(x,z+r));
  }
});
