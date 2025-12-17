import React, { useState } from 'react';
import './ExpenseTracker.css';

// Best-effort parser for SMS/email-style transaction messages.
function parseTransactionMessage(text){
  if (!text || !text.trim()) return null;
  const t = text.replace(/\n/g,' ').replace(/\s+/g,' ').trim();
  const lower = t.toLowerCase();

  // detect direction: sent/received/credited/debited/dr/cr/transfer
  const isSent = /\bsent\b|\bdebited\b|\bdr\b|\bwithdrawn\b|\bpaid\b/i.test(t);
  const isReceived = /\breceived\b|\bcredited\b|\bcr\b|\bdeposit\b/i.test(t);
  if (!isSent && !isReceived) return null;

  const type = isSent ? 'debit' : 'credit';

  // amount regex - allow ₹, Rs, INR and formats like Rs.4000.00 or ₹4,000.00
  const amtMatch = t.match(/(?:₹|Rs\.?|INR\s?)\s*([0-9]{1,3}(?:[,0-9]*)(?:\.\d{1,2})?)|([0-9]{1,3}(?:[,0-9]*)(?:\.\d{1,2})?)\s*(?:INR|Rs\.?|₹)?/i);
  let amount = null;
  if (amtMatch){
    const rawAmt = (amtMatch[1] || amtMatch[2] || '').replace(/,/g,'');
    if (rawAmt) amount = Number(rawAmt);
  }

  // Date patterns: yyyy-mm-dd, dd-mm-yyyy, dd-mm-yy (assume 20yy)
  let dateStr = null;
  const dateY = t.match(/(\d{4}-\d{2}-\d{2})/);
  const dateDMY = t.match(/(\d{2}[-\/]\d{2}[-\/]\d{4})/);
  const dateDM2 = t.match(/(\d{2}[-\/]\d{2}[-\/]\d{2})/);
  if (dateY) dateStr = dateY[1];
  else if (dateDMY) {
    const parts = dateDMY[1].split(/[-\/]/);
    dateStr = `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
  } else if (dateDM2) {
    const parts = dateDM2[1].split(/[-\/]/);
    const yy = parts[2];
    const year = Number(yy) < 50 ? `20${yy}` : `20${yy}`; // assume 20xx
    dateStr = `${year}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
  }

  // vendor/source/target extraction: prefer 'to' for sent, 'from' for received, fallback to bank names
  let vendor = null;
  const toMatch = t.match(/\bto\b\s+([^,.;@\n]{2,80})/i);
  const fromMatch = t.match(/\bfrom\b\s+([^,.;@\n]{2,80})/i);
  const inYourMatch = t.match(/in your\s+([^,.;@\n]{2,80})/i);
  const bankMatch = t.match(/(kotak bank|kotak|airtel payments bank|airtel|uco bank|uco)/i);

  if (isSent && toMatch) vendor = toMatch[1].trim();
  else if (isReceived && fromMatch) vendor = fromMatch[1].trim();
  else if (inYourMatch) vendor = inYourMatch[1].trim();
  else if (bankMatch) vendor = bankMatch[1].trim();

  // clean vendor (remove trailing 'on', 'upi', 'ref' tokens and excess words)
  if (vendor){
    vendor = vendor.replace(/(on|upi|ref|upi ref).*$/i,'').trim();
    // limit length
    if (vendor.length > 40) vendor = vendor.slice(0,40) + '...';
  }

  return {
    raw: text,
    type,
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
