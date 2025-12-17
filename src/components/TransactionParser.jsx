import React, { useState } from 'react';
import './ExpenseTracker.css';

// Best-effort parser for SMS/email-style transaction messages.
function parseTransactionMessage(text){
  if (!text || !text.trim()) return null;
  const t = text.replace(/\n/g,' ').replace(/\s+/g,' ').trim();
  const lower = t.toLowerCase();
  const isDebited = /\bdebited\b/.test(lower);
  const isCredited = /\bcredited\b/.test(lower);
  if (!isDebited && !isCredited) return null;

  // amount regex - captures ₹, Rs, INR or plain numbers with commas
  const amtMatch = t.match(/(?:₹|Rs\.?|INR\s?)?\s?([\d,]+(?:\.\d{1,2})?)/i);
  let amount = amtMatch ? amtMatch[1].replace(/,/g,'') : null;
  if (amount) amount = Number(amount);

  // try to find vendor using 'at' or 'to' or 'from'
  let vendor = null;
  const atMatch = t.match(/(?:at|to|via|from)\s+([A-Za-z0-9 &._-]{2,40})/i);
  if (atMatch) vendor = atMatch[1].trim();

  // try to find date in dd-mm-yyyy or yyyy-mm-dd
  const dateMatch = t.match(/(\d{4}-\d{2}-\d{2})|(\d{2}[-\/]\d{2}[-\/]\d{4})/);
  let dateStr = null;
  if (dateMatch){
    dateStr = dateMatch[0];
    // normalize dd-mm-yyyy to yyyy-mm-dd
    if (/\d{2}[-\/]\d{2}[-\/]\d{4}/.test(dateStr)){
      const parts = dateStr.split(/[-\/]/);
      dateStr = `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
    }
  }

  return {
    raw: text,
    type: isDebited ? 'debit' : 'credit',
    amount,
    vendor: vendor || null,
    date: dateStr || null,
  };
}

export default function TransactionParser({ onAdd, notify }){
  const [text, setText] = useState('');
  const [detected, setDetected] = useState(null);

  function handleParse(){
    const d = parseTransactionMessage(text);
    if (!d){
      setDetected(null);
      if (notify) notify('No transaction found', 'Message did not contain debit/credit keywords');
      return;
    }
    setDetected(d);
    if (notify) notify('Transaction detected', `${d.type==='debit' ? 'Debited' : 'Credited'} ${d.amount? '₹'+d.amount : ''}`);
  }

  function handleAdd(asIncome){
    if (!detected) return;
    const title = detected.vendor || (detected.type==='debit' ? 'Bank debit' : 'Bank credit');
    if (!detected.amount){
      // fallback: ask user to enter amount via prompt
      const v = window.prompt('Amount not detected. Enter amount:');
      if (!v) { setDetected(null); setText(''); return; }
      detected.amount = Number(String(v).replace(/,/g,''));
    }
    const payload = { title, amount: Number(detected.amount || 0), date: detected.date || new Date().toISOString().slice(0,10), category: asIncome ? 'Income' : 'Other' };
    if (onAdd) onAdd(payload);
    setDetected(null);
    setText('');
  }

  return (
    <div style={{marginBottom:12}}>
      <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:8}}>
        <input className="search-input" placeholder="Paste transaction message here (SMS/email)" value={text} onChange={e=>setText(e.target.value)} />
        <button className="btn" onClick={handleParse}>Parse</button>
      </div>

      {detected && (
        <div className="card" style={{padding:10}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8}}>
            <div>
              <div style={{fontWeight:700}}>{detected.vendor || (detected.type==='debit' ? 'Debited' : 'Credited')}</div>
              <div className="muted">{detected.raw}</div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontWeight:800,fontSize:16}}>{detected.amount ? `₹${detected.amount}` : 'Amount unknown'}</div>
              <div className="muted">{detected.date || ''}</div>
            </div>
          </div>
          <div style={{marginTop:10,display:'flex',gap:8}}>
            <button className="btn" onClick={()=>handleAdd(false)}>Add as Expense</button>
            <button className="btn" onClick={()=>handleAdd(true)}>Add as Income</button>
            <button className="exp-btn" onClick={()=>{ setDetected(null); }}>Ignore</button>
          </div>
        </div>
      )}
    </div>
  );
}
