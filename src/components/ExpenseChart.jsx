import React from 'react';

// Simple SVG bar chart that groups totals by month (YYYY-MM)
function ExpenseChart({ items = [] }){
  // aggregate by YYYY-MM
  const map = {};
  items.forEach(it=>{
    const key = it.date ? it.date.slice(0,7) : 'unknown';
    map[key] = (map[key]||0) + Number(it.amount || 0);
  });
  const entries = Object.entries(map).sort((a,b)=> a[0].localeCompare(b[0]));
  if (!entries.length) return <div style={{padding:12}} className="muted">No data for chart.</div>;

  const max = Math.max(...entries.map(e=>e[1]), 1);
  const width = 400; const height = 140; const padding = 20;
  const barWidth = Math.max(18, (width - padding*2) / entries.length - 8);

  return (
    <div className="card" style={{padding:12}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
        <div className="heading">Monthly Spend</div>
        <div className="muted" style={{fontSize:12}}>Last {entries.length} months</div>
      </div>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {entries.map(([k,v],i)=>{
          const x = padding + i * (barWidth + 8);
          const barH = (v/max) * (height - padding*2);
          const y = height - padding - barH;
          return (
            <g key={k}>
              <rect className="chart-bar" x={x} y={y} width={barWidth} height={barH} rx={6} fill={`url(#g${i})`} />
              <text x={x + barWidth/2} y={height - padding + 14} fontSize={11} style={{fill:'var(--muted)'}} textAnchor="middle">{k.slice(5)}</text>
            </g>
          );
        })}
        <defs>
          {entries.map((e,i)=> (
            <linearGradient key={i} id={`g${i}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="1" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="1" />
            </linearGradient>
          ))}
        </defs>
      </svg>
    </div>
  );
}

export default ExpenseChart;
