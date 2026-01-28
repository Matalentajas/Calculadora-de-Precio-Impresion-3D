import React from 'react';

export default function InputGroup({ label, icon: Icon, value, onChange, type = "number", suffix = "" }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-400 flex items-center gap-2">
        {Icon && <Icon size={16} className="text-blue-500" />}
        {label}
      </label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
          placeholder="0.00"
        />
        {suffix && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-mono">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}