export function fixtures(){
  let seed=611;const noise=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/2**32-.5};
  return {
    basic20:Array.from({length:20},(_,i)=>({X:i*.25,Y:2*i*.25+1})),
    scatter500:Array.from({length:500},(_,i)=>({X:i*.1,Y:Math.sin(i*.1)+noise()*.2})),
    nonuniform5000:Array.from({length:5000},(_,i)=>({X:(i+1)**1.21,Y:Math.sin(i*.007)+(i>=2500?10:0)})),
    multi10000:Array.from({length:10000},(_,i)=>({X:i*.03,Y:Math.sin(i*.01),Y2:Math.cos(i*.01),Y3:i*.001})),
    negativeZero:[{X:-2,Y:-4},{X:-1,Y:-2},{X:0,Y:0},{X:1,Y:2},{X:2,Y:4}],
    abrupt:Array.from({length:200},(_,i)=>({X:i,Y:i<100?0:1000})),
    noisy:Array.from({length:500},(_,i)=>({X:i/10,Y:i/10+noise()})),
    knownFit:Array.from({length:500},(_,i)=>({X:(i+1)**1.3,Y:3*(i+1)**1.3-7})),
  };
}
