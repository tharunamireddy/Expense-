import React from 'react';
import { FiEdit, FiTrash2 } from 'react-icons/fi';

function ExpenseList({ items = [], onDelete, onEdit }) {
  if (!items.length) return <div className="exp-empty">No expenses yet.</div>;

  return (
    <ul className="exp-list">
      {items.map(i => (
        <li className="exp-item" key={i.id}>
          <div className="exp-item-left">
            <div style={{display:'flex',gap:10,alignItems:'center'}}>
              <div className="exp-title">{i.title}</div>
              <div className="chip">{i.category || 'Other'}</div>
              {i.recurring && <div className="chip recurring">↻ {i.recurrence || 'Monthly'}</div>}
            </div>
            <div className="exp-date">{i.date}</div>
          </div>
          <div className="exp-actions-row">
            <div className="exp-amount">₹{Number(i.amount).toFixed(2)}</div>
            <button className="exp-btn" title="Edit" onClick={() => onEdit && onEdit(i)}><FiEdit /></button>
            <button className="exp-delete" title="Delete" onClick={() => onDelete(i.id)}><FiTrash2 /></button>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default ExpenseList;
