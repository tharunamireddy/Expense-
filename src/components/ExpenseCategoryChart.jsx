import React from 'react';

// Simple SVG horizontal bar chart for category totals
function ExpenseCategoryChart({ items = [] }){
  const map = {};
  items.forEach(it=>{
    const c = it.category || 'Other';
    map[c] = (map[c]||0) + Number(it.amount || 0);
  });
  const entries = Object.entries(map).sort((a,b)=> b[1]-a[1]);
  if (!entries.length) return <div style={{padding:12}} className="muted">No category data.</div>;

  const max = Math.max(...entries.map(e=>e[1]),1);

  return (
    <div style={{padding:12}} className="card">
      <div className="heading" style={{marginBottom:8}}>Spending by Category</div>
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {entries.map(([k,v])=> (
          <div key={k} style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:90,fontSize:13}} className="muted">{k}</div>
            <div style={{flex:1,background:'rgba(255,255,255,0.03)',height:12,borderRadius:999,overflow:'hidden'}}>
              <div className="category-fill" style={{width:`${(v/max)*100}%`}} />
            </div>
            <div style={{width:90,textAlign:'right'}} className="value">₹{v.toFixed(2)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ExpenseCategoryChart;
