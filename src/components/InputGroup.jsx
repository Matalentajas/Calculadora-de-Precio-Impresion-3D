import React from 'react';

export default function InputGroup({ 
  label, 
  icon: Icon, 
  value, 
  onChange, 
  type = "number", 
  suffix = "", 
  placeholder = "0", // Ahora es dinámico
  iconColor = "text-blue-500" 
}) {
  return (
    <div className="w-full">
      {label && (
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block ml-1">
          {Icon && <Icon size={12} className={`inline mr-2 ${iconColor}`} />}
          {label}
        </label>
      )}
      <div className="relative">
        <input
          type={type}
          value={value}
          onFocus={(e) => e.target.select()}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-[#0f172a]/50 border border-slate-800 rounded-2xl px-5 py-4 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all font-bold text-sm shadow-inner"
          placeholder={placeholder} // Usamos el prop aquí
        />
        {suffix && (
          <span className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 text-[10px] font-black uppercase">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}