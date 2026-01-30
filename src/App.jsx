import React, { useState, useRef, useEffect } from 'react';
import { 
  Calculator, Package, Cpu, Weight, Clock, Euro, Zap, Search,
  Layers, RotateCcw, Star, Percent, Trash2, Plus, Edit3, Info,
  X, UserCheck, Database, ChevronDown, Wrench, ChevronRight, 
  Truck, Box, AlertTriangle, TrendingUp, RefreshCw
} from 'lucide-react';
import { useCalculatorStore } from './store/useCalculatorStore';

// --- COMPONENTE INPUTGROUP (SOLUCIONA EL CERO Y TEXTO) ---
const InputGroup = ({ label, icon: Icon, suffix, value, onChange, type = "number", placeholder }) => {
  const handleInputChange = (e) => {
    const val = e.target.value;
    if (type === "text") return onChange(val);
    if (val === "") return onChange(""); 
    onChange(parseFloat(val));
  };
  return (
    <div className="w-full space-y-2">
      <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 block tracking-[0.2em]">{label}</label>
      <div className="relative group">
        {Icon && <Icon className="absolute transition-colors -translate-y-1/2 left-4 top-1/2 text-slate-500 group-focus-within:text-blue-500" size={16} />}
        <input
          type={type === "number" ? "text" : type}
          inputMode={type === "number" ? "decimal" : "text"}
          placeholder={placeholder}
          value={value === 0 && type === "number" ? "" : value}
          onChange={handleInputChange}
          className={`w-full bg-[#020617] border border-slate-800 rounded-2xl py-4 ${Icon ? 'pl-12' : 'pl-5'} pr-14 text-white font-bold text-sm outline-none focus:ring-2 focus:ring-blue-600/50 transition-all shadow-inner`}
        />
        {suffix && <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-600 uppercase italic pointer-events-none">{suffix}</span>}
      </div>
    </div>
  );
};

// --- CONSTANTES ---
const COLOR_PRESETS = [
  { name: 'Negro', hex: '#000000' }, { name: 'Blanco', hex: '#ffffff' }, { name: 'Gris', hex: '#808080' }, { name: 'Plata', hex: '#c0c0c0' },
  { name: 'Rojo', hex: '#ff0000' }, { name: 'Azul', hex: '#0000ff' }, { name: 'Verde', hex: '#008000' }, { name: 'Naranja', hex: '#ffa500' }
];

const PRINTER_LIBRARY = [
  { brand: "Creality", models: [ { name: "Ender 3 / Pro", watts: 125 }, { name: "Ender 3 V2", watts: 150 }, { name: "K1 / K1 Max", watts: 350 }, { name: "Ender 5 S1", watts: 350 } ] },
  { brand: "Bambu Lab", models: [ { name: "P1P / P1S", watts: 350 }, { name: "X1 Carbon", watts: 350 }, { name: "A1 Mini", watts: 150 }, { name: "A1", watts: 200 } ] },
  { brand: "Prusa", models: [ { name: "i3 MK3S+", watts: 120 }, { name: "MK4", watts: 150 }, { name: "Mini+", watts: 90 }, { name: "XL", watts: 450 } ] },
  { brand: "Anycubic", models: [ { name: "Kobra 2", watts: 300 }, { name: "Vyper", watts: 350 }, { name: "Photon Mono", watts: 50 } ] }
];

// --- GRÁFICO ---
const CostDonutChart = ({ segments }) => {
  const total = segments.reduce((acc, s) => acc + s.value, 0);
  let currentOffset = 0;
  return (
    <div className="relative flex items-center justify-center flex-shrink-0 w-64 h-64 mx-auto"> 
      <svg viewBox="0 0 32 32" className="w-full h-full -rotate-90 drop-shadow-2xl">
        <circle cx="16" cy="16" r="14" fill="transparent" stroke="#1e293b" strokeWidth="2.5" />
        {segments.map((s, i) => {
          if (total === 0 || s.value === 0) return null;
          const percentage = (s.value / total) * 100;
          const strokeDash = `${percentage} 100`;
          const strokeOffset = -currentOffset;
          currentOffset += percentage;
          return ( <circle key={i} cx="16" cy="16" r="14" fill="transparent" stroke={s.color} strokeWidth="4" strokeDasharray={strokeDash} strokeDashoffset={strokeOffset} className="transition-all duration-1000 ease-out" /> );
        })}
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Coste Neto</span>
        <span className="text-3xl italic font-black leading-none text-white">{total.toFixed(2)}€</span>
      </div>
    </div>
  );
};

export default function App() {
  const { data, updateData, addMaterial, updateMaterial, deleteMaterial, addPrinter, updatePrinter, deletePrinter, saveProject, deleteProject } = useCalculatorStore();
  
  // UI States
  const [openSection, setOpenSection] = useState('technical');
  const [activeAlert, setActiveAlert] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  
  // Modales
  const [isMatFormOpen, setIsMatFormOpen] = useState(false);
  const [isPrinterFormOpen, setIsPrinterFormOpen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const colorPickerRef = useRef(null);

  // Edición
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [editingMatId, setEditingMatId] = useState(null);
  const [editingPrinterId, setEditingPrinterId] = useState(null);

  // Forms
  const [matForm, setMatForm] = useState({ name: '', brand: '', type: 'PLA', color: '#000000', spoolWeight: 1000, spoolPrice: '' });
  const [printerForm, setPrinterForm] = useState({ name: '', brand: '', watts: '', costPerHour: '', initialPrice: '', lifespan: 5000 });

  useEffect(() => {
    function handleClickOutside(e) { if (colorPickerRef.current && !colorPickerRef.current.contains(e.target)) setShowColorPicker(false); }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- MOTOR DE CÁLCULO ---
  const totalTimeHours = (data.timeHours || 0) + ((data.timeMinutes || 0) / 60);
  const matCost = ((data.weight * data.pricePerKg) / 1000) * data.quantity;
  const energyCost = ((data.printerWattage * totalTimeHours / 1000) * data.energyPrice) * data.quantity;
  const maintCost = (totalTimeHours * (data.maintenance || 0)) * data.quantity;
  const laborCost = (((data.prepTime / 60) || 0) + ((data.postProcessTime || 0) * data.quantity)) * data.hourlyRate;
  const logiCost = parseFloat(data.packagingCost || 0) + parseFloat(data.shippingCost || 0) + (parseFloat(data.extraMaterialsCost || 0) * data.quantity);
  
  const totalBase = matCost + energyCost + maintCost + laborCost + logiCost;
  const totalWithRisk = totalBase * (1 + (data.failRate || 0) / 100);
  const finalPrice = (totalWithRisk * (1 + (data.profitMargin || 0) / 100)) * (data.urgency || 1) * (data.includeTax ? (1 + data.taxRate / 100) : 1);

  const chartData = [
    { label: 'Material', value: matCost, color: '#10b981' },
    { label: 'Energía', value: energyCost, color: '#3b82f6' },
    { label: 'Máquina', value: maintCost, color: '#f59e0b' },
    { label: 'Labor', value: laborCost, color: '#a855f7' },
    { label: 'Otros', value: logiCost, color: '#64748b' }
  ];

  // --- RENDER CALCULADORA ---
  const renderCalculatorDashboard = () => (
    <div className="flex flex-col gap-10 duration-500 lg:flex-row animate-in fade-in">
      {activeAlert && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#020617]/95 backdrop-blur-md">
          <div className="bg-[#0f172a] border border-slate-800 p-10 rounded-[3.5rem] shadow-2xl max-w-md w-full text-center">
            <AlertTriangle size={48} className="mx-auto mb-6 text-amber-500" />
            <h3 className="mb-4 text-xl italic font-black tracking-tighter text-white uppercase">Falta Configuración</h3>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-8 leading-relaxed">No tienes {activeAlert === 'printer' ? 'impresoras' : 'materiales'} guardados.</p>
            <div className="space-y-3">
              <button onClick={() => { updateData({activeTab: activeAlert === 'printer' ? 'printers' : 'materials'}); setActiveAlert(null); }} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase italic tracking-widest flex items-center justify-center gap-2">Configurar ahora</button>
              <button onClick={() => setActiveAlert(null)} className="w-full bg-slate-800 text-slate-400 py-4 rounded-2xl font-black text-[10px] uppercase italic">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full lg:w-[450px] space-y-4">
        {/* Identidad */}
        <div className={`border border-slate-800 rounded-3xl overflow-hidden transition-all ${openSection === 'identity' ? 'bg-[#0f172a]' : 'bg-[#0f172a]/40'}`}>
          <button onClick={() => setOpenSection('identity')} className="flex items-center justify-between w-full p-6 text-xs italic font-black tracking-widest text-white uppercase"><span className="flex items-center gap-3"><Layers size={16} className="text-blue-500"/> 1. Proyecto</span><ChevronDown size={16}/></button>
          {openSection === 'identity' && <div className="p-6 pt-0 space-y-6 animate-in slide-in-from-top-2"><InputGroup label="Nombre Proyecto" type="text" placeholder="Ej: Casco Pro" value={data.projectName} onChange={v => updateData({projectName: v})} /><div className="grid grid-cols-2 gap-4"><InputGroup label="Cantidad" suffix="uds" value={data.quantity} onChange={v => updateData({quantity: v})} /><div className="space-y-2"><label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Urgencia</label><select className="w-full bg-[#020617] border border-slate-800 rounded-2xl px-4 py-4 text-xs font-black text-white outline-none" value={data.urgency} onChange={e => updateData({urgency: parseFloat(e.target.value)})}><option value="1">Normal (1.0x)</option><option value="1.2">Urgente (1.2x)</option><option value="1.5">Crítico (1.5x)</option></select></div></div></div>}
        </div>

        {/* Hardware (CON BLINDAJE DE ERRORES ?. ) */}
        <div className={`border border-slate-800 rounded-3xl overflow-hidden transition-all ${openSection === 'technical' ? 'bg-[#0f172a]' : 'bg-[#0f172a]/40'}`}>
          <button onClick={() => setOpenSection('technical')} className="flex items-center justify-between w-full p-6 text-xs italic font-black tracking-widest text-white uppercase"><span className="flex items-center gap-3"><Zap size={16} className="text-emerald-500"/> 2. Hardware / Material</span><ChevronDown size={16}/></button>
          {openSection === 'technical' && <div className="p-6 pt-0 space-y-6 animate-in slide-in-from-top-2"><div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Máquina</label>{data.customPrinters.length === 0 ? <button onClick={() => setActiveAlert('printer')} className="w-full bg-[#020617] border border-slate-800 rounded-2xl px-4 py-4 text-xs font-black text-slate-500 flex justify-between items-center italic">Vacío <ChevronRight size={12}/></button> : <select className="w-full bg-[#020617] border border-slate-800 rounded-2xl px-4 py-4 text-xs font-black text-white outline-none" value={data.selectedPrinterId || ''} onChange={e => { const p = data.customPrinters.find(x => x.id === parseInt(e.target.value)); if(p) updateData({selectedPrinterId: p.id, printerWattage: p.watts, maintenance: p.maintenanceTotal}); }}><option value="">Seleccionar...</option>{data.customPrinters.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>}</div>
            <div className="space-y-2"><label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Material</label>{data.materials.length === 0 ? <button onClick={() => setActiveAlert('material')} className="w-full bg-[#020617] border border-slate-800 rounded-2xl px-4 py-4 text-xs font-black text-slate-500 flex justify-between items-center italic">Vacío <ChevronRight size={12}/></button> : <select className="w-full bg-[#020617] border border-slate-800 rounded-2xl px-4 py-4 text-xs font-black text-white outline-none" value={data.selectedMaterialId || ''} onChange={e => { const m = data.materials.find(x => x.id === parseInt(e.target.value)); if(m) updateData({selectedMaterialId: m.id, pricePerKg: m.pricePerKg}); }}><option value="">Seleccionar...</option>{data.materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select>}</div>
          </div><div className="grid grid-cols-2 gap-4"><InputGroup label="Horas" value={data.timeHours} onChange={v => updateData({timeHours: v})} /><InputGroup label="Minutos" value={data.timeMinutes} onChange={v => updateData({timeMinutes: v})} /></div><InputGroup label="Peso Final (g)" suffix="gramos" value={data.weight} onChange={v => updateData({weight: v})} /></div>}
        </div>

        <div className={`border border-slate-800 rounded-3xl overflow-hidden bg-[#0f172a]/40 transition-all`}><button onClick={() => setOpenSection('logistics')} className="flex items-center justify-between w-full p-6 text-xs italic font-black tracking-widest text-white uppercase"><span className="flex items-center gap-3"><Truck size={16} className="text-purple-500"/> 3. Logística</span><ChevronDown size={16}/></button>
          {openSection === 'logistics' && <div className="p-6 pt-0 space-y-6 animate-in slide-in-from-top-2"><InputGroup label="Mano de Obra" suffix="€/h" icon={UserCheck} value={data.hourlyRate} onChange={v => updateData({hourlyRate: v})} /><div className="grid grid-cols-2 gap-4"><InputGroup label="Embalaje" suffix="€" icon={Box} value={data.packagingCost} onChange={v => updateData({packagingCost: v})} /><InputGroup label="Envío" suffix="€" icon={Truck} value={data.shippingCost} onChange={v => updateData({shippingCost: v})} /></div></div>}
        </div>
      </div>

      <div className="flex flex-col flex-1 gap-8">
        <div className="p-16 rounded-[4.5rem] shadow-2xl relative overflow-hidden border border-white/5 bg-[#0f172a]">
          <p className="text-[10px] font-black uppercase tracking-[0.5em] opacity-50 mb-3 leading-none">PVP Sugerido</p>
          <h2 className="text-[10rem] font-black italic tracking-tighter leading-none drop-shadow-2xl">{finalPrice.toFixed(2)}€</h2>
          <div className="flex gap-12 pt-12 mt-12 border-t border-white/10">
             <div><p className="text-[9px] font-bold opacity-40 uppercase mb-2">Coste Fab.</p><p className="text-2xl italic font-black">{totalBase.toFixed(2)}€</p></div>
             <div><p className="text-[9px] font-bold opacity-40 uppercase mb-2">Neto Ganado</p><p className="text-2xl italic font-black text-emerald-400">{(finalPrice / (data.includeTax ? (1+data.taxRate/100) : 1) - totalWithRisk).toFixed(2)}€</p></div>
          </div>
        </div>
        <div className="bg-[#0f172a]/40 border border-slate-800 p-10 rounded-[4rem] flex-1 flex flex-col lg:flex-row items-center gap-12">
           <CostDonutChart segments={chartData} />
           <div className="flex-1 w-full space-y-4">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 italic">Desglose Técnico</h4>
              {chartData.map(s => (
                <div key={s.label} className="flex items-center justify-between pb-2 border-b border-slate-800/50"><div className="flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }}></div><span className="text-[10px] font-black text-white uppercase italic">{s.label}</span></div><span className="text-xs font-black text-slate-500">{totalBase > 0 ? ((s.value / totalBase) * 100).toFixed(0) : 0}%</span></div>
              ))}
              <button onClick={() => {
                const project = { 
                  id: data.editingProjectId || Date.now(),
                  date: new Date().toLocaleDateString(), 
                  snapshotPrice: finalPrice.toFixed(2), 
                  ...data, 
                  materials: undefined, customPrinters: undefined, savedProjects: undefined, editingProjectId: undefined 
                };
                saveProject(project);
                updateData({ activeTab: 'projects', editingProjectId: null });
              }} className="w-full mt-6 py-6 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-3xl uppercase italic text-[10px] tracking-widest shadow-2xl transition-all">
                {data.editingProjectId ? 'Actualizar Proyecto' : 'Archivar Proyecto'}
              </button>
           </div>
        </div>
      </div>
    </div>
  );

  const renderProjects = () => (
    <div className="pb-20 space-y-8 animate-in fade-in">
      <header className="flex items-center justify-between mb-8"><h3 className="flex items-center gap-3 text-xl italic font-black tracking-tighter text-white uppercase"><Layers className="text-purple-500" /> Historial</h3></header>
      {selectedProject && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#020617]/95 backdrop-blur-md">
          <div className="bg-[#0f172a] border border-slate-800 p-12 rounded-[4rem] shadow-2xl max-w-4xl w-full relative animate-in zoom-in-95">
            <button onClick={() => setSelectedProject(null)} className="absolute transition-colors top-10 right-10 text-slate-500 hover:text-white"><X size={28}/></button>
            <div className="flex items-end justify-between pb-8 mb-12 border-b border-slate-800"><div><p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-2">{selectedProject.date}</p><h3 className="text-4xl italic font-black text-white uppercase">{selectedProject.projectName || 'Sin Nombre'}</h3></div><p className="text-6xl italic font-black text-white">{selectedProject.snapshotPrice}€</p></div>
            <div className="grid grid-cols-2 gap-8 mb-12 lg:grid-cols-4">
               <div className="flex flex-col"><span className="text-[8px] font-black text-slate-500 uppercase mb-1">Mano Obra</span><span className="text-lg font-bold tracking-tighter text-white">{selectedProject.hourlyRate}€/h</span></div>
               <div className="flex flex-col"><span className="text-[8px] font-black text-slate-500 uppercase mb-1">Margen</span><span className="text-lg font-bold tracking-tighter text-white">{selectedProject.profitMargin}%</span></div>
               <div className="flex flex-col"><span className="text-[8px] font-black text-slate-500 uppercase mb-1">Peso</span><span className="text-lg font-bold tracking-tighter text-white">{selectedProject.weight}g</span></div>
               <div className="flex flex-col"><span className="text-[8px] font-black text-slate-500 uppercase mb-1">Urgencia</span><span className="text-lg font-bold tracking-tighter text-white">x{selectedProject.urgency}</span></div>
            </div>
            {/* CARGA SEGURA DE PROYECTO (EVITA PANTALLA NEGRA) */}
            <button onClick={() => { 
                const { id, date, snapshotPrice, materials, customPrinters, savedProjects, ...cleanSettings } = selectedProject;
                updateData({ ...cleanSettings, editingProjectId: id, activeTab: 'calculator' }); 
                setSelectedProject(null); 
              }} className="flex items-center justify-center w-full gap-3 py-6 text-xs italic font-black tracking-widest text-white uppercase bg-blue-600 shadow-xl hover:bg-blue-500 rounded-3xl"><RefreshCw size={18}/> Cargar y Editar</button>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {data.savedProjects.map(p => (<div key={p.id} className="bg-[#0f172a]/60 border border-slate-800 p-10 rounded-[3.5rem] group hover:border-purple-500 shadow-2xl relative transition-all"><div className="flex items-start justify-between mb-6"><div><h4 className="text-[10px] font-black text-purple-400 uppercase mb-1">{p.date}</h4><h3 className="text-2xl font-black italic text-white uppercase truncate max-w-[180px]">{p.projectName || 'Sin nombre'}</h3></div><button onClick={() => setSelectedProject(p)} className="p-3 text-white shadow-lg bg-slate-800 rounded-2xl hover:bg-purple-600"><Info size={20} /></button></div><p className="mb-8 text-5xl italic font-black text-white">{p.snapshotPrice}€</p><div className="flex justify-between pt-6 border-t border-slate-800"><span className="text-[8px] font-black text-slate-500 uppercase">Peso: {p.weight}g</span><button onClick={() => deleteProject(p.id)} className="text-slate-600 hover:text-red-500"><Trash2 size={16}/></button></div></div>))}
      </div>
    </div>
  );

  const renderMaterials = () => (
    <div className="relative pb-20 space-y-8 animate-in fade-in">
      <header className="flex items-center justify-between mb-8"><h3 className="flex items-center gap-3 text-xl italic font-black tracking-tighter text-white uppercase"><Database className="text-emerald-500" /> Inventario</h3><button onClick={() => { setEditingMatId(null); setMatForm({name:'', brand:'', type:'PLA', color:'#000000', spoolWeight:1000, spoolPrice:''}); setIsMatFormOpen(true); }} className="bg-emerald-600 text-white px-10 py-3.5 rounded-2xl font-black text-xs uppercase shadow-lg">Añadir Material</button></header>
      {isMatFormOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-6 bg-[#020617]/95 backdrop-blur-md"><div className="bg-[#0f172a] border border-slate-800 p-12 rounded-[3.5rem] shadow-2xl w-full max-w-6xl relative animate-in zoom-in-95"><button onClick={() => setIsMatFormOpen(false)} className="absolute transition-colors top-10 right-10 text-slate-500 hover:text-white"><X size={28}/></button><h3 className="mb-12 text-2xl italic font-black tracking-tighter text-white uppercase">Gestión de Material</h3><div className="grid items-center grid-cols-1 gap-10 lg:grid-cols-4"><div className="flex flex-col justify-center h-full gap-8"><InputGroup label="Nombre" type="text" placeholder="Ej: PLA Mate" value={matForm.name} onChange={v => setMatForm({...matForm, name: v})} /><InputGroup label="Marca" type="text" placeholder="Ej: Sunlu" value={matForm.brand} onChange={v => setMatForm({...matForm, brand: v})} /></div>
        <div className="relative flex flex-col justify-center h-full gap-8" ref={colorPickerRef}>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 block mb-2 tracking-widest">Color</label>
            <button onClick={() => setShowColorPicker(!showColorPicker)} className="flex items-center justify-between w-full px-5 py-4 border bg-slate-900/50 border-slate-800 rounded-2xl"><div className="flex items-center gap-3"><div className="w-4 h-4 border rounded-full border-white/20" style={{ backgroundColor: matForm.color }}></div><span className="text-xs font-black text-white uppercase">Elegir Color</span></div><ChevronDown size={14}/></button>
            {/* CORRECCIÓN: Renderizamos los colores explícitamente */}
            {showColorPicker && <div className="absolute z-[90] top-[75px] w-full bg-[#1e293b] p-4 rounded-2xl shadow-xl animate-in zoom-in-95"><div className="grid grid-cols-6 gap-2 mb-4">{COLOR_PRESETS.map(c => ( <button key={c.hex} onClick={() => { setMatForm({...matForm, color: c.hex}); setShowColorPicker(false); }} className="w-6 h-6 transition-transform border rounded-full border-white/10 hover:scale-110" style={{ backgroundColor: c.hex }} title={c.name} /> ))}</div><input type="color" className="w-full h-8 bg-transparent cursor-pointer" value={matForm.color} onChange={e => setMatForm({...matForm, color: e.target.value})} /></div>}
          </div>
          <div className="space-y-2"><label className="text-[10px] font-bold text-slate-500 uppercase ml-1 block mb-2 tracking-widest">Tipo</label><select className="w-full px-5 py-4 text-xs font-black text-white uppercase border outline-none bg-slate-900/50 border-slate-800 rounded-2xl" value={matForm.type} onChange={e => setMatForm({...matForm, type: e.target.value})}><option>PLA</option><option>PETG</option><option>ABS</option><option>TPU</option></select></div>
        </div>
        <div className="flex flex-col justify-center h-full gap-8"><InputGroup label="Peso (g)" value={matForm.spoolWeight} onChange={v => setMatForm({...matForm, spoolWeight: v})} /><InputGroup label="Precio (€)" value={matForm.spoolPrice} onChange={v => setMatForm({...matForm, spoolPrice: v})} /></div><div className="bg-[#020617]/50 border border-slate-800 h-full p-8 rounded-[3rem] text-center flex flex-col justify-center"><p className="text-[10px] font-black text-emerald-500 uppercase mb-2">Coste Kilo</p><p className="text-5xl italic font-black tracking-tighter text-white">{((matForm.spoolPrice / matForm.spoolWeight)*1000 || 0).toFixed(2)}€</p></div></div><button onClick={() => { if (!matForm.name || !matForm.spoolPrice) return alert("Faltan datos"); const priceKg = (parseFloat(matForm.spoolPrice) / parseFloat(matForm.spoolWeight)) * 1000; const matData = { ...matForm, pricePerKg: priceKg.toFixed(2), id: editingMatId || Date.now() }; editingMatId ? updateMaterial(editingMatId, matData) : addMaterial(matData); setIsMatFormOpen(false); }} className="w-full py-6 mt-12 italic font-black text-white uppercase transition-all shadow-xl bg-emerald-600 hover:bg-emerald-500 rounded-3xl">Confirmar Material</button></div></div>
      )}
      {data.materials.length === 0 ? <div className="py-40 border-2 border-dashed border-slate-800 rounded-[4rem] text-center opacity-60"><Package size={64} className="mx-auto mb-6"/><h4 className="text-lg italic font-black uppercase text-slate-500">Vacío</h4></div> : <div className="grid grid-cols-1 gap-8 md:grid-cols-3">{data.materials.map(m => (<div key={m.id} className="bg-[#0f172a]/50 border border-slate-800 rounded-[2.5rem] overflow-hidden group hover:border-emerald-600 shadow-xl transition-all"><div className="h-2" style={{ backgroundColor: m.color }}></div><div className="p-8"><div className="flex items-start justify-between mb-4"><h4 className="text-sm italic font-black text-white uppercase">{m.name}</h4><div className="flex gap-4"><button onClick={() => { setEditingMatId(m.id); setMatForm(m); setIsMatFormOpen(true); }} className="text-slate-600 hover:text-amber-500"><Edit3 size={16}/></button><button onClick={() => deleteMaterial(m.id)} className="text-slate-600 hover:text-red-500"><Trash2 size={16}/></button></div></div><p className="mb-6 text-3xl italic font-black tracking-tighter text-white">{m.pricePerKg}€/kg</p><button onClick={() => { updateData({ pricePerKg: parseFloat(m.pricePerKg), selectedMaterialId: m.id, activeTab: 'calculator' }) }} className="w-full py-4 text-xs italic font-black tracking-widest uppercase transition-all bg-emerald-600/10 text-emerald-400 rounded-2xl hover:bg-emerald-600">Usar este Material</button></div></div>))}</div>}
    </div>
  );

  const renderPrinters = () => (
    <div className="relative pb-20 space-y-8 animate-in fade-in">
      <header className="flex items-center justify-between mb-8"><h3 className="flex items-center gap-3 text-xl italic font-black text-white uppercase"><Cpu className="text-blue-500" /> Mi Taller</h3><div className="flex gap-4"><button onClick={() => setIsLibraryOpen(true)} className="bg-slate-800 text-slate-300 px-6 py-3.5 rounded-2xl font-black text-xs uppercase italic border border-slate-700">Biblioteca</button><button onClick={() => { setPrinterForm({name:'', brand:'', watts:'', costPerHour:'', initialPrice:'', lifespan:5000}); setIsPrinterFormOpen(true); }} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase italic shadow-lg">Manual</button></div></header>
      
      {isLibraryOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#020617]/95 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#0f172a] border border-slate-800 rounded-[3.5rem] shadow-2xl w-full max-w-5xl h-[80vh] flex flex-col overflow-hidden relative animate-in zoom-in-95">
            <button onClick={() => setIsLibraryOpen(false)} className="absolute z-20 top-8 right-8 text-slate-500 hover:text-white"><X size={24}/></button>
            <div className="p-10 border-b border-slate-800"><h3 className="flex items-center gap-3 mb-6 text-2xl italic font-black tracking-tighter text-white uppercase">Biblioteca Pro</h3><div className="relative"><Search className="absolute -translate-y-1/2 left-5 top-1/2 text-slate-500" size={18} /><input type="text" placeholder="Ej: Ender, P1S, MK4..." className="w-full bg-[#020617] border border-slate-800 rounded-2xl py-4 pl-14 text-white font-bold outline-none shadow-inner" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div></div>
            <div className="flex flex-1 overflow-hidden">
              <div className="w-64 border-r border-slate-800 overflow-y-auto p-4 space-y-2 bg-[#020617]/30">{PRINTER_LIBRARY.map(lib => ( <button key={lib.brand} onClick={() => setSelectedBrand(lib.brand)} className={`w-full text-left px-5 py-3 rounded-xl font-bold text-xs transition-all uppercase tracking-widest ${selectedBrand === lib.brand ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-800'}`}>{lib.brand}</button> ))}</div>
              {/* SCROLL y BUSCADOR APLICADOS */}
              <div className="flex-1 overflow-y-auto p-10 bg-[#0f172a] max-h-[60vh]">
                <div className="grid content-start grid-cols-1 gap-4 md:grid-cols-2 h-fit">
                  {PRINTER_LIBRARY.filter(lib => !selectedBrand || lib.brand === selectedBrand).flatMap(lib => lib.models.map(m => ({...m, brand: lib.brand}))).filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase())).map(m => ( <button key={m.name} onClick={() => { addPrinter({ name: m.name, brand: m.brand, watts: m.watts, maintenanceTotal: 0.05, id: Date.now() }); setIsLibraryOpen(false); }} className="p-6 bg-[#020617] border border-slate-800 rounded-[2rem] text-left hover:border-blue-600 group transition-all flex justify-between items-center transition-all"><div><p className="text-[10px] font-black text-blue-500 uppercase tracking-widest leading-none mb-1">{m.brand}</p><h4 className="text-lg italic font-black leading-tight text-white">{m.name}</h4><p className="mt-2 text-xs font-bold uppercase text-slate-500">{m.watts} Vatios</p></div><Plus className="text-blue-500 transition-opacity opacity-0 group-hover:opacity-100" size={20}/></button> ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isPrinterFormOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-6 bg-[#020617]/95 backdrop-blur-md animate-in fade-in"><div className="bg-[#0f172a] border border-slate-800 p-12 rounded-[3.5rem] shadow-2xl w-full max-w-6xl relative animate-in zoom-in-95"><button onClick={() => setIsPrinterFormOpen(false)} className="absolute transition-colors top-10 right-10 text-slate-500 hover:text-white"><X size={28}/></button><h3 className="flex items-center gap-3 mb-12 text-2xl italic font-black tracking-tighter text-white uppercase">Máquina Manual</h3><div className="grid items-center grid-cols-1 gap-10 lg:grid-cols-4"><div className="flex flex-col justify-center h-full space-y-8"><InputGroup label="Modelo" type="text" placeholder="Ej: Creality K1" value={printerForm.name} onChange={v => setPrinterForm({...printerForm, name: v})} /><InputGroup label="Fabricante" type="text" placeholder="Ej: Creality" value={printerForm.brand} onChange={v => setPrinterForm({...printerForm, brand: v})} /></div><div className="flex flex-col justify-center h-full space-y-8"><InputGroup label="Consumo (W)" icon={Zap} suffix="W" value={printerForm.watts} onChange={v => setPrinterForm({...printerForm, watts: v})} /></div><div className="flex flex-col justify-center h-full space-y-8"><InputGroup label="Mantenimiento" suffix="€/h" placeholder="0.05" value={printerForm.costPerHour} onChange={v => setPrinterForm({...printerForm, costPerHour: v})} /></div><div className="bg-[#020617]/50 border border-slate-800 h-full p-8 rounded-[3rem] flex flex-col justify-center text-center shadow-inner h-full"><p className="text-[10px] font-black text-blue-400 uppercase mb-2 italic">Carga Horaria</p><p className="text-5xl italic font-black leading-none tracking-tighter text-white">{(parseFloat(printerForm.costPerHour||0)).toFixed(2)}€</p></div></div><button onClick={() => { if (!printerForm.name || !printerForm.watts) return alert("Faltan datos"); addPrinter({ ...printerForm, maintenanceTotal: printerForm.costPerHour || 0.05, id: Date.now() }); setIsPrinterFormOpen(false); }} className="w-full py-6 mt-12 italic font-black text-white uppercase transition-all bg-blue-600 shadow-xl hover:bg-blue-500 rounded-3xl">Confirmar Máquina</button></div></div>
      )}
      
      {data.customPrinters.length === 0 ? <div className="py-40 border-2 border-dashed border-slate-800 rounded-[4rem] text-center opacity-60"><Cpu size={64} className="mx-auto mb-6"/><h4 className="text-lg italic font-black leading-none tracking-widest uppercase text-slate-500">Vacío</h4></div> : <div className="grid grid-cols-1 gap-8 md:grid-cols-3">{data.customPrinters.map(p => (<div key={p.id} className="bg-[#0f172a]/50 border border-slate-800 rounded-[2.5rem] p-8 group hover:border-blue-500 shadow-xl transition-all"><div className="flex items-start justify-between mb-4"><div><p className="text-[10px] font-black text-blue-500 uppercase tracking-widest leading-none mb-1 uppercase">{p.brand}</p><h4 className="text-sm italic font-black text-white uppercase">{p.name}</h4></div><button onClick={() => deletePrinter(p.id)} className="text-slate-600 hover:text-red-500"><Trash2 size={16}/></button></div><p className="mb-6 text-3xl italic font-black leading-none tracking-tighter text-white">{p.watts}W <span className="ml-2 text-xs not-italic leading-none uppercase text-slate-500">Mant: {p.maintenanceTotal}€/h</span></p><button onClick={() => { updateData({ printerWattage: parseFloat(p.watts), maintenance: parseFloat(p.maintenanceTotal), selectedPrinterId: p.id, activeTab: 'calculator' }) }} className="w-full py-4 text-xs italic font-black leading-none text-blue-400 uppercase transition-all bg-blue-600/10 rounded-2xl hover:bg-blue-600 hover:text-white">Usar Máquina</button></div>))}</div>}
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#020617] text-slate-50 font-sans selection:bg-blue-600 selection:text-white">
      <aside className="w-64 bg-[#0f172a]/50 border-r border-slate-800 p-8 flex flex-col">
        <div className="flex items-center gap-3 mb-14"><div className="bg-blue-600 p-2.5 rounded-xl shadow-lg shadow-blue-900/40"><Calculator size={26} className="text-white" /></div><h1 className="text-xl italic font-black leading-none tracking-tighter tracking-tight uppercase">3DPrice Pro</h1></div>
        <nav className="space-y-4 flex-1 font-black text-[10px] tracking-widest uppercase">
          <button onClick={() => updateData({ activeTab: 'calculator' })} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all ${data.activeTab === 'calculator' ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20 shadow-lg' : 'hover:bg-slate-800/50 text-slate-500'}`}><Calculator size={18} /> Calculadora</button>
          <button onClick={() => updateData({ activeTab: 'materials' })} className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl transition-all ${data.activeTab === 'materials' ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-600/20 shadow-lg' : 'hover:bg-slate-800/50 text-slate-500'}`}><div className="flex items-center gap-4"><Package size={18} /> Materiales</div></button>
          <button onClick={() => updateData({ activeTab: 'printers' })} className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl transition-all ${data.activeTab === 'printers' ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20 shadow-lg' : 'hover:bg-slate-800/50 text-slate-500'}`}><div className="flex items-center gap-4"><Cpu size={18} /> Impresoras</div></button>
          <button onClick={() => updateData({ activeTab: 'projects' })} className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl transition-all ${data.activeTab === 'projects' ? 'bg-purple-600/10 text-purple-400 border border-purple-600/20 shadow-lg' : 'hover:bg-slate-800/50 text-slate-500'}`}><div className="flex items-center gap-4"><Layers size={18} /> Historial</div></button>
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto p-14">
        <header className="flex items-center justify-between mb-16"><h2 className="text-6xl italic font-black tracking-tighter text-white uppercase drop-shadow-sm">{data.activeTab === 'calculator' ? 'Calculator' : data.activeTab === 'materials' ? 'Materiales' : data.activeTab === 'printers' ? 'Taller' : 'Proyectos'}</h2></header>
        {data.activeTab === 'calculator' ? renderCalculatorDashboard() : 
         data.activeTab === 'materials' ? renderMaterials() : 
         data.activeTab === 'printers' ? renderPrinters() : renderProjects()}
      </main>
    </div>
  );
}