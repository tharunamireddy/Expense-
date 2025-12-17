import React, { useEffect, useMemo, useState } from 'react';
import ExpenseForm from './ExpenseForm';
import ExpenseList from './ExpenseList';
import ExpenseChart from './ExpenseChart';
import TransactionParser from './TransactionParser';
import './ExpenseTracker.css';
import { FiDownload, FiUpload, FiSearch } from 'react-icons/fi';

function csvFromExpenses(items){
  const headers = ['id','title','amount','date','category','recurring','recurrence'];
  const rows = items.map(it => headers.map(h=> JSON.stringify(it[h] ?? '')).join(','));
  return [headers.join(','), ...rows].join('\n');
}

function parseCSV(text){
  const lines = text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
  if (!lines.length) return [];
  const headers = lines[0].split(',').map(h=>h.replace(/(^"|"$)/g,''));
  return lines.slice(1).map(l=>{
    const cols = l.split(',').map(c=>c.replace(/(^"|"$)/g,''));
    const obj = {};
    headers.forEach((h,i)=> obj[h] = cols[i] ? cols[i].replace(/^"|"$/g,'') : '');
    // coerce amount
    if (obj.amount) obj.amount = Number(obj.amount);
    obj.id = obj.id || Date.now().toString() + Math.random().toString(36).slice(2);
    obj.recurring = obj.recurring === 'true' || obj.recurring === true;
    obj.recurrence = obj.recurrence || 'None';
    return obj;
  });
}

function ExpenseTracker(){
  const [expenses, setExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [autoApplyRecurring, setAutoApplyRecurring] = useState(false);
  const [budget, setBudget] = useState('');
  const [categoryBudgets, setCategoryBudgets] = useState({});
  const [theme, setTheme] = useState('dark');
  const [toast, setToast] = useState(null);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sort, setSort] = useState('newest');
  const [editItem, setEditItem] = useState(null);

  useEffect(()=>{
    try{
      const raw = localStorage.getItem('expenses_v2');
      const stored = raw ? JSON.parse(raw) : [];
      console.log('Loading expenses from localStorage:', stored);
      setExpenses(stored);
      const savedBudgets = localStorage.getItem('category_budgets');
      if (savedBudgets) setCategoryBudgets(JSON.parse(savedBudgets));
      const savedTheme = localStorage.getItem('theme') || 'dark';
      setTheme(savedTheme);

      // load auto-apply pref and possibly apply recurring for current month
      const auto = localStorage.getItem('auto_apply_recurring') === 'true';
      setAutoApplyRecurring(auto);
      const lastApplied = localStorage.getItem('last_recurring_month') || '';
      const currentMonth = new Date().toISOString().slice(0,7);
      if (auto && lastApplied !== currentMonth){
        // compute recurring items from stored data
        const monthDate = new Date();
        const monthStr = monthDate.toISOString().slice(0,10);
        const toAdd = [];
        stored.forEach(it=>{
          if (it.recurring && (String(it.recurrence).toLowerCase()==='monthly')){
            const exists = stored.some(e=> e.title===it.title && e.date && e.date.slice(0,7)===monthDate.toISOString().slice(0,7));
            if (!exists) toAdd.push({ id: Date.now().toString()+Math.random().toString(36).slice(2), title:it.title, amount:it.amount, date: monthStr, category: it.category, recurring: true, recurrence: it.recurrence });
          }
        });
        if (toAdd.length){
          const merged = [...toAdd, ...stored];
          setExpenses(merged);
          localStorage.setItem('expenses_v2', JSON.stringify(merged));
          setToast({message:`Auto-applied ${toAdd.length} recurring items`, type:'success'});
        }
        // mark as applied for this month regardless
        localStorage.setItem('last_recurring_month', currentMonth);
      }
      setIsLoading(false);
    }catch(e){ console.error(e) }
  },[]);

  useEffect(()=>{
    if (isLoading) return; // Skip saving during initial load
    try{ 
      localStorage.setItem('expenses_v2', JSON.stringify(expenses));
      console.log('Expenses saved to localStorage:', expenses);
    }catch(e){ console.error('Failed to save expenses:', e) }
  },[expenses, isLoading]);

  function addExpense(exp){
    const newExpense = { id: Date.now().toString()+Math.random().toString(36).slice(2), ...exp };
    setExpenses(prev=> {
      const updated = [newExpense, ...prev];
      // save immediately
      try{ localStorage.setItem('expenses_v2', JSON.stringify(updated)); }catch(e){ console.error('Save failed:', e); }
      return updated;
    });
    setToast({message:'Expense added',type:'success'});
    clearToastAfter();
  }

  function updateExpense(obj){
    setExpenses(prev=> {
      const updated = prev.map(p=> p.id===obj.id? obj : p);
      try{ localStorage.setItem('expenses_v2', JSON.stringify(updated)); }catch(e){ console.error('Save failed:', e); }
      return updated;
    });
    setEditItem(null);
    setToast({message:'Expense updated',type:'success'});
    clearToastAfter();
  }

  function deleteExpense(id){ 
    setExpenses(prev=> {
      const updated = prev.filter(p=>p.id!==id);
      try{ localStorage.setItem('expenses_v2', JSON.stringify(updated)); }catch(e){ console.error('Save failed:', e); }
      return updated;
    });
  }

  function onEdit(item){ setEditItem(item); window.scrollTo({top:0,behavior:'smooth'}); }

  function exportCSV(){
    const csv = csvFromExpenses(expenses);
    const blob = new Blob([csv], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'expenses.csv'; a.click(); URL.revokeObjectURL(url);
  }

  function importCSV(file){
    const reader = new FileReader();
    reader.onload = e => {
      try{
        const items = parseCSV(String(e.target.result));
        if (items.length) {
          setExpenses(prev=> {
            const updated = [...items, ...prev];
            try{ localStorage.setItem('expenses_v2', JSON.stringify(updated)); }catch(err){ console.error('Save failed:', err); }
            return updated;
          });
        }
        setToast({message:'CSV imported',type:'success'});
        clearToastAfter();
      }catch(err){ console.error('CSV import failed',err); }
    };
    reader.readAsText(file);
  }

  function clearToastAfter(){
    setTimeout(()=> setToast(null), 2500);
  }

  function toggleAutoApply(v){
    setAutoApplyRecurring(v);
    localStorage.setItem('auto_apply_recurring', v ? 'true' : 'false');
    setToast({message: v ? 'Auto-apply enabled' : 'Auto-apply disabled', type:'info'});
    clearToastAfter();
  }

  // theme
  useEffect(()=>{
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  },[theme]);

  function toggleTheme(){ setTheme(t=> t==='dark' ? 'light' : 'dark'); }

  // category budgets persistence
  useEffect(()=>{
    try{ localStorage.setItem('category_budgets', JSON.stringify(categoryBudgets)); }catch(e){}
  },[categoryBudgets]);

  // desktop notification helper
  function notify(title, body){
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') new Notification(title, {body});
    else if (Notification.permission !== 'denied'){
      Notification.requestPermission().then(p=>{ if (p==='granted') new Notification(title, {body}); });
    }
  }

  const categories = useMemo(()=>{
    const s = new Set(expenses.map(e=> e.category || 'Other'));
    return ['All',...Array.from(s)];
  },[expenses]);

  const filtered = expenses.filter(e=>{
    const matchesQuery = !query || e.title.toLowerCase().includes(query.toLowerCase());
    const matchesCat = categoryFilter==='All' || (e.category||'Other')===categoryFilter;
    return matchesQuery && matchesCat;
  }).sort((a,b)=>{
    if (sort==='newest') return b.date.localeCompare(a.date);
    if (sort==='oldest') return a.date.localeCompare(b.date);
    if (sort==='largest') return b.amount - a.amount;
    if (sort==='smallest') return a.amount - b.amount;
    return 0;
  });

  const total = filtered.reduce((s,e)=> s + Number(e.amount || 0),0);
  // compute current month total for budget
  const today = new Date();
  const monthKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`;
  const monthTotal = expenses.filter(e=> e.date && e.date.slice(0,7)===monthKey).reduce((s,e)=> s + Number(e.amount||0),0);
  const budgetNum = Number(budget || 0);

  function applyRecurringForThisMonth(){
    const monthDate = new Date();
    const monthStr = monthDate.toISOString().slice(0,10);
    const toAdd = [];
    expenses.forEach(it=>{
      if (it.recurring && (it.recurrence==='Monthly' || it.recurrence==='monthly' || it.recurrence==='Monthly')){
        // check if already exists in this month (same title & month)
        const exists = expenses.some(e=> e.title===it.title && e.date && e.date.slice(0,7)===monthDate.toISOString().slice(0,7));
        if (!exists) toAdd.push({ id: Date.now().toString()+Math.random().toString(36).slice(2), title:it.title, amount:it.amount, date: monthStr, category: it.category, recurring: true, recurrence: it.recurrence });
      }
    });
    if (toAdd.length){ 
      setExpenses(prev=> {
        const updated = [...toAdd, ...prev];
        try{ localStorage.setItem('expenses_v2', JSON.stringify(updated)); }catch(e){ console.error('Save failed:', e); }
        return updated;
      });
      setToast({message:`Applied ${toAdd.length} recurring items`, type:'success'}); 
      clearToastAfter(); 
    }
    else{ setToast({message:'No recurring items to apply', type:'info'}); clearToastAfter(); }
  }

  // compute per-category totals
  const categoryTotals = useMemo(()=>{
    const m = {};
    expenses.forEach(e=> { const k = e.category || 'Other'; m[k] = (m[k]||0) + Number(e.amount||0); });
    return m;
  },[expenses]);

  // JSON backup / restore
  function exportJSON(){
    const payload = { expenses, categoryBudgets, settings:{ autoApplyRecurring, theme } };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'expenses-backup.json'; a.click(); URL.revokeObjectURL(url);
  }

  function importJSON(file){
    const reader = new FileReader();
    reader.onload = e => {
      try{
        const obj = JSON.parse(String(e.target.result));
        if (obj.expenses) {
          setExpenses(prev=> {
            const updated = [...obj.expenses, ...prev];
            try{ localStorage.setItem('expenses_v2', JSON.stringify(updated)); }catch(err){ console.error('Save failed:', err); }
            return updated;
          });
        }
        if (obj.categoryBudgets) setCategoryBudgets(Object.assign({}, categoryBudgets, obj.categoryBudgets));
        if (obj.settings){ if (obj.settings.autoApplyRecurring) toggleAutoApply(true); if (obj.settings.theme) setTheme(obj.settings.theme); }
        setToast({message:'JSON imported',type:'success'}); clearToastAfter();
      }catch(err){ setToast({message:'Invalid JSON', type:'error'}); clearToastAfter(); }
    };
    reader.readAsText(file);
  }

  // check category budgets and notify
  useEffect(()=>{
    Object.entries(categoryBudgets).forEach(([cat,bud])=>{
      const val = Number(bud||0);
      if (val>0){
        const spent = categoryTotals[cat] || 0;
        if (spent > val){
          setToast({message:`Budget exceeded for ${cat}: ₹${spent.toFixed(2)} / ₹${val}`, type:'error'});
          notify('Budget exceeded', `${cat}: ₹${spent.toFixed(2)} / ₹${val}`);
          clearToastAfter();
        } else if (spent > val*0.8){
          setToast({message:`Budget near limit for ${cat}: ₹${spent.toFixed(2)} / ₹${val}`, type:'info'});
          clearToastAfter();
        }
      }
    });
  },[categoryBudgets, categoryTotals]);

  return (
    <div className="exp-container">
      <div className="exp-header">
        <div>
          <div className="exp-title">Expense Tracker</div>
          <div className="exp-sub">Beautiful, responsive, and feature-rich</div>
        </div>
          <div className="exp-controls">
          <label className="switch" title="Auto-apply recurring each month">
            <input type="checkbox" checked={autoApplyRecurring} onChange={e=>toggleAutoApply(e.target.checked)} />
            <span className="slider" />
          </label>
          <div className="muted" style={{fontSize:12,marginRight:6}}>Auto apply recurring</div>
          <button className="btn" onClick={toggleTheme} style={{marginLeft:8}}>{theme==='dark' ? 'Light' : 'Dark'} Theme</button>
            <button className="btn" onClick={exportCSV}><FiDownload style={{verticalAlign:'middle'}}/> Export CSV</button>
            <label className="chip" style={{cursor:'pointer'}}>
              <input type="file" accept="text/csv" style={{display:'none'}} onChange={e=> e.target.files && importCSV(e.target.files[0])} />
              <FiUpload style={{verticalAlign:'middle'}}/> Import CSV
            </label>
            <button className="btn" onClick={exportJSON} style={{marginLeft:6}}>Export JSON</button>
            <label className="chip" style={{cursor:'pointer'}}>
              <input type="file" accept="application/json" style={{display:'none'}} onChange={e=> e.target.files && importJSON(e.target.files[0])} />
              Import JSON
            </label>
        </div>
      </div>
      {toast && <div className={`toast ${toast.type || ''}`}>{toast.message}</div>}
      {/* Transaction parser: paste incoming SMS/email text to detect debit/credit */}
      <div style={{marginTop:6}}>
        <TransactionParser onAdd={addExpense} notify={notify} />
      </div>
      <div className="exp-main">
        <div className="exp-left">
          <ExpenseForm onAdd={addExpense} editItem={editItem} onUpdate={updateExpense} onCancelEdit={()=>setEditItem(null)} />
          <div style={{height:12}} />
          <div className="card">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                  <div className="heading">Overview</div>
                  <div className="muted">Total: <strong className="value">₹{total.toFixed(2)}</strong></div>
            </div>
            <ExpenseChart items={expenses.slice(0,12)} />
            <div style={{marginTop:12}} />
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <input className="search-input" placeholder="Monthly budget (e.g. 20000)" value={budget} onChange={e=>setBudget(e.target.value)} />
              <button className="btn" onClick={applyRecurringForThisMonth}>Apply Recurring</button>
            </div>
            <div style={{marginTop:12}}>
              <div className="muted" style={{fontSize:13,marginBottom:6}}>This month spending: ₹{monthTotal.toFixed(2)}</div>
              <div className="budget-bar">
                <div className={`budget-fill ${budgetNum>0 && monthTotal>budgetNum? 'over':''}`} style={{width: `${budgetNum>0? Math.min(100,(monthTotal/budgetNum)*100):0}%`}} />
              </div>
            </div>
            <div style={{marginTop:12}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                <div className="heading">Category Budgets</div>
                <div className="muted">Set budgets per category</div>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {Object.keys(categoryTotals).map(cat=> (
                  <div key={cat} style={{display:'flex',gap:8,alignItems:'center'}}>
                    <div style={{width:110}} className="muted">{cat}</div>
                    <input className="search-input" style={{flex:1}} value={categoryBudgets[cat]||''} placeholder="0" onChange={e=> setCategoryBudgets(prev=> ({...prev,[cat]: e.target.value}))} />
                    <div style={{width:110,textAlign:'right'}} className="value">₹{(categoryTotals[cat]||0).toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="exp-right">
          <div className="card">
            <div className="meta-row">
              <div className="control-input"><FiSearch className="control-icon"/> <input className="search-input" placeholder="Search title" value={query} onChange={e=>setQuery(e.target.value)} /></div>
              <div className="filters">
                {categories.map(c=> <button key={c} className={`chip ${categoryFilter===c? 'active':''}`} onClick={()=>setCategoryFilter(c)}>{c}</button>)}
              </div>
              <div style={{marginLeft:'auto'}}>
                <select value={sort} onChange={e=>setSort(e.target.value)} className="search-input">
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="largest">Largest</option>
                  <option value="smallest">Smallest</option>
                </select>
              </div>
            </div>

            <ExpenseList items={filtered} onDelete={deleteExpense} onEdit={onEdit} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExpenseTracker;
