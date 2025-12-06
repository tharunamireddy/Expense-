import React, { useEffect, useState } from 'react';
import './ExpenseTracker.css';
import { FiPlus } from 'react-icons/fi';

const CATEGORY_OPTIONS = ['Food', 'Transport', 'Shopping', 'Bills', 'Income', 'Other'];
const RECURRENCE_OPTIONS = ['None','Monthly'];

function ExpenseForm({ onAdd, editItem, onUpdate, onCancelEdit }) {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [category, setCategory] = useState('Other');
  const [recurring, setRecurring] = useState(false);
  const [recurrence, setRecurrence] = useState('None');

  useEffect(() => {
    if (editItem) {
      setTitle(editItem.title || '');
      setAmount(editItem.amount != null ? String(editItem.amount) : '');
      setDate(editItem.date || new Date().toISOString().slice(0, 10));
      setCategory(editItem.category || 'Other');
      setRecurring(Boolean(editItem.recurring));
      setRecurrence(editItem.recurrence || 'None');
    }
  }, [editItem]);

  function submit(e) {
    e.preventDefault();
    if (!title.trim() || !amount || Number(amount) === 0) return;
    const payload = { title: title.trim(), amount: Number(amount), date: date || new Date().toISOString().slice(0, 10), category, recurring, recurrence };
    if (editItem && onUpdate) onUpdate({ ...editItem, ...payload });
    else onAdd(payload);
    reset();
  }

  function reset(){
    setTitle(''); setAmount(''); setDate(''); setCategory('Other');
    if (onCancelEdit) onCancelEdit();
  }

  return (
    <form className="exp-form card" onSubmit={submit}>
      <div className="exp-sub">Add or edit an expense</div>
      <div className="exp-row">
        <label>Title</label>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Groceries" />
      </div>

      <div className="exp-row">
        <label>Amount</label>
        <input value={amount} onChange={e => setAmount(e.target.value)} type="number" step="0.01" placeholder="0.00" />
      </div>

      <div className="exp-row">
        <label>Date</label>
        <input value={date} onChange={e => setDate(e.target.value)} type="date" />
      </div>

      <div className="exp-row">
        <label>Category</label>
        <select value={category} onChange={e=>setCategory(e.target.value)}>
          {CATEGORY_OPTIONS.map(c=> <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="exp-row" style={{display:'flex',gap:10,alignItems:'center'}}>
        <label style={{minWidth:80}}>Recurring</label>
        <input type="checkbox" checked={recurring} onChange={e=>setRecurring(e.target.checked)} />
        <select value={recurrence} onChange={e=>setRecurrence(e.target.value)} style={{marginLeft:8}}>
          {RECURRENCE_OPTIONS.map(r=> <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      <div className="exp-actions">
        <button type="submit" className="btn"><FiPlus style={{verticalAlign:'middle'}} /> {editItem? 'Update' : 'Add Expense'}</button>
        {editItem && <button type="button" className="exp-btn" onClick={reset} style={{marginLeft:8}}>Cancel</button>}
      </div>
    </form>
  );
}

export default ExpenseForm;
