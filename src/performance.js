// Opt-in local diagnostics. No network telemetry or changes to the simulation.
export function createPerformanceProbe(canvas) {
  if (new URLSearchParams(location.search).get('perf') !== '1') return {ready(){},progress(){},frame(){}};
  let frames=[],last=0,lastReport=0,mode='',renderCount=0;const stages={};
  return {
    ready(){canvas.dataset.readyMs=performance.now().toFixed(1);},
    progress(name){if(!(name in stages)){stages[name]=+performance.now().toFixed(1);canvas.dataset.loadStages=JSON.stringify(stages);}},
    frame(renderer,state,renderMs){
      const now=performance.now();canvas.dataset.renderCount=String(++renderCount);canvas.dataset.drawCalls=String(renderer.info.render.calls);
      if(state!==mode){frames=[];last=0;mode=state;}
      if(last)frames.push({dt:now-last,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,renderMs});
      last=now;if(frames.length>300)frames.shift();
      if(now-lastReport<1000||!frames.length)return;lastReport=now;
      const sorted=frames.map(f=>f.dt).sort((a,b)=>a-b),mean=k=>frames.reduce((n,f)=>n+f[k],0)/frames.length;
      canvas.dataset.performance=JSON.stringify({mode,samples:frames.length,fps:+(1000/mean('dt')).toFixed(1),frameP95Ms:+sorted[Math.floor(sorted.length*.95)].toFixed(2),drawCalls:Math.round(mean('calls')),triangles:Math.round(mean('triangles')),renderCpuMs:+mean('renderMs').toFixed(2)});
    }
  };
}
