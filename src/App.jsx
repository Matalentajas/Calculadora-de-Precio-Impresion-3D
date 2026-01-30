import React, { useState, useRef, useEffect } from 'react';
import { 
  Calculator, Package, Cpu, Weight, Clock, Euro, Zap, Search,
  Layers, RotateCcw, Star, Percent, Trash2, Plus, Edit3, Info,
  X, UserCheck, Database, ChevronDown, Wrench, ChevronRight, 
  Truck, Box, AlertTriangle, TrendingUp, RefreshCw, FileText
} from 'lucide-react';
import { jsPDF } from "jspdf";
import { useCalculatorStore } from './store/useCalculatorStore';

// --- COMPONENTE INPUTGROUP ---
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
  const [isMatFormOpen, setIsMatFormOpen] = useState(false);
  const [isPrinterFormOpen, setIsPrinterFormOpen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBrand, setSelectedBrand] = useState(null);
  const colorPickerRef = useRef(null);

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

  const chartData = [ { label: 'Material', value: matCost, color: '#10b981' }, { label: 'Energía', value: energyCost, color: '#3b82f6' }, { label: 'Máquina', value: maintCost, color: '#f59e0b' }, { label: 'Labor', value: laborCost, color: '#a855f7' }, { label: 'Otros', value: logiCost, color: '#64748b' } ];

  // --- FUNCIÓN GENERAR PDF (CORREGIDA) ---
  const generatePDF = (project) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFillColor(15, 23, 42); // Slate-900
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("3DPrice Pro", 20, 20);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("PRESUPUESTO DE IMPRESIÓN 3D", 20, 30);
    doc.text(`Fecha: ${project.date}`, pageWidth - 20, 20, { align: 'right' });
    doc.text(`ID: #${project.id.toString().slice(-6)}`, pageWidth - 20, 30, { align: 'right' });

    // Project Info
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`Proyecto: ${project.projectName || 'Sin Nombre'}`, 20, 60);
    
    // Details Grid
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const col1 = 20; const col2 = 80; const col3 = 140;
    let y = 75;
    
    doc.text("DETALLES TÉCNICOS:", 20, y); y += 10;
    doc.setDrawColor(200); doc.line(20, y-5, pageWidth-20, y-5);
    
    doc.text(`Material: ${data.materials.find(m => m.id === project.selectedMaterialId)?.name || 'Manual'}`, col1, y);
    doc.text(`Impresora: ${data.customPrinters.find(p => p.id === project.selectedPrinterId)?.name || 'Manual'}`, col2, y);
    doc.text(`Peso: ${project.weight}g`, col3, y);
    y += 10;
    doc.text(`Tiempo: ${project.timeHours}h ${project.timeMinutes}m`, col1, y);
    doc.text(`Copias: ${project.quantity}`, col2, y);
    doc.text(`Urgencia: x${project.urgency}`, col3, y);

    // Cost Breakdown
    y += 20;
    doc.setFont("helvetica", "bold");
    doc.text("DESGLOSE DE COSTES:", 20, y); y += 10;
    doc.setDrawColor(200); doc.line(20, y-5, pageWidth-20, y-5);
    
    const totalH = (project.timeHours || 0) + ((project.timeMinutes || 0) / 60);
    const p_mat = ((project.weight * project.pricePerKg) / 1000) * project.quantity;
    const p_en = ((project.printerWattage * totalH / 1000) * project.energyPrice) * project.quantity;
    const p_mac = (totalH * (project.maintenance || 0)) * project.quantity;
    const p_lab = (((project.prepTime / 60) || 0) + ((project.postProcessTime || 0) * project.quantity)) * project.hourlyRate;
    const p_log = parseFloat(project.packagingCost || 0) + parseFloat(project.shippingCost || 0);

    const items = [
      { name: "Coste Material", val: p_mat },
      { name: "Coste Energía", val: p_en },
      { name: "Amortización Máquina", val: p_mac },
      { name: "Mano de Obra", val: p_lab },
      { name: "Logística y Extras", val: p_log },
    ];

    doc.setFont("helvetica", "normal");
    items.forEach(item => {
      doc.text(item.name, 20, y);
      doc.text(`${item.val.toFixed(2)} €`, pageWidth - 20, y, { align: 'right' });
      y += 8;
    });

    // Total CORREGIDO (MÁS ESPACIO)
    y += 15; // Un poco más de separación vertical
    doc.setFillColor(240, 240, 240);
    // Movemos la caja a X=90 (antes 120) para dar espacio a la etiqueta
    doc.rect(90, y - 5, pageWidth - 110, 25, 'F');
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0); // Texto negro para la etiqueta
    doc.text("TOTAL ESTIMADO:", 95, y + 10); // Etiqueta alineada a la izq dentro de la caja
    
    doc.setTextColor(16, 185, 129); // Precio en verde
    doc.text(`${project.snapshotPrice} €`, pageWidth - 25, y + 10, { align: 'right' });

    // Footer
    doc.setTextColor(150);
    doc.setFontSize(8);
    doc.text("Este documento es un presupuesto estimado generado por 3DPrice Pro.", pageWidth / 2, 280, { align: 'center' });

    doc.save(`Presupuesto_${project.projectName}.pdf`);
  };

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
          <button onClick={() => setOpenSection('identity')} className="flex items-center justify-between w-full p-6 text-xs italic font-black tracking-widest text-white uppercase"><span className="flex items-center gap-3"><Layers size={16} className="text-blue-500"/> 1. Proyecto</span><ChevronDown size={16} className={openSection === 'identity' ? 'rotate-180' : ''}/></button>
          {openSection === 'identity' && <div className="p-6 pt-0 space-y-6 animate-in slide-in-from-top-2"><InputGroup label="Nombre Proyecto" type="text" placeholder="Ej: Casco Pro" value={data.projectName} onChange={v => updateData({projectName: v})} /><div className="grid grid-cols-2 gap-4"><InputGroup label="Cantidad" suffix="uds" value={data.quantity} onChange={v => updateData({quantity: v})} /><div className="space-y-2"><label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Urgencia</label><select className="w-full bg-[#020617] border border-slate-800 rounded-2xl px-4 py-4 text-xs font-black text-white outline-none" value={data.urgency} onChange={e => updateData({urgency: parseFloat(e.target.value)})}><option value="1">Normal (1.0x)</option><option value="1.2">Urgente (1.2x)</option><option value="1.5">Crítico (1.5x)</option></select></div></div></div>}
        </div>

        {/* Hardware */}
        <div className={`border border-slate-800 rounded-3xl overflow-hidden transition-all ${openSection === 'technical' ? 'bg-[#0f172a]' : 'bg-[#0f172a]/40'}`}>
          <button onClick={() => setOpenSection('technical')} className="flex items-center justify-between w-full p-6 text-xs italic font-black tracking-widest text-white uppercase"><span className="flex items-center gap-3"><Zap size={16} className="text-emerald-500"/> 2. Hardware / Material</span><ChevronDown size={16}/></button>
          {openSection === 'technical' && <div className="p-6 pt-0 space-y-6 animate-in slide-in-from-top-2"><div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Máquina</label>{data.customPrinters.length === 0 ? <button onClick={() => setActiveAlert('printer')} className="w-full bg-[#020617] border border-slate-800 rounded-2xl px-4 py-4 text-xs font-black text-slate-500 flex justify-between items-center italic">Vacío <ChevronRight size={12}/></button> : <select className="w-full bg-[#020617] border border-slate-800 rounded-2xl px-4 py-4 text-xs font-black text-white outline-none focus:ring-2 focus:ring-blue-600 transition-all" value={data.selectedPrinterId || ''} onChange={e => { const p = data.customPrinters.find(x => x.id === parseInt(e.target.value)); if(p) updateData({selectedPrinterId: p.id, printerWattage: p.watts, maintenance: p.maintenanceTotal}); }}><option value="">Seleccionar...</option>{data.customPrinters.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>}</div>
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
             <div><p className="text-[9px] font-bold opacity-40 uppercase mb-2">Ganancia</p><p className="text-2xl italic font-black text-emerald-400">{(finalPrice / (data.includeTax ? (1+data.taxRate/100) : 1) - totalWithRisk).toFixed(2)}€</p></div>
          </div>
        </div>
        <div className="bg-[#0f172a]/40 border border-slate-800 p-10 rounded-[4rem] flex-1 flex flex-col lg:flex-row items-center gap-12">
           <CostDonutChart segments={chartData} />
           <div className="flex-1 w-full space-y-4">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 italic">Análisis</h4>
              {chartData.map(s => (
                <div key={s.label} className="flex items-center justify-between pb-2 border-b border-slate-800/50"><div className="flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }}></div><span className="text-[10px] font-black text-white uppercase italic">{s.label}</span></div><span className="text-xs font-black text-slate-500">{totalBase > 0 ? ((s.value / totalBase) * 100).toFixed(0) : 0}%</span></div>
              ))}
              <button onClick={() => {
                const project = { id: data.editingProjectId || Date.now(), date: new Date().toLocaleDateString(), snapshotPrice: finalPrice.toFixed(2), ...data, materials: undefined, customPrinters: undefined, savedProjects: undefined, editingProjectId: undefined };
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#020617]/95 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#0f172a] border border-slate-800 p-12 rounded-[4rem] shadow-2xl max-w-4xl w-full relative animate-in zoom-in-95">
            <button onClick={() => setSelectedProject(null)} className="absolute transition-colors top-10 right-10 text-slate-500 hover:text-white"><X size={28}/></button>
            <div className="flex items-end justify-between pb-8 mb-12 border-b border-slate-800"><div><p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-2">{selectedProject.date}</p><h3 className="text-4xl italic font-black text-white uppercase">{selectedProject.projectName || 'Sin Nombre'}</h3></div><p className="text-6xl italic font-black text-white">{selectedProject.snapshotPrice}€</p></div>
            <div className="grid grid-cols-2 gap-8 mb-12 lg:grid-cols-4">
               <div className="flex flex-col"><span className="text-[8px] font-black text-slate-500 uppercase mb-1">Mano Obra</span><span className="text-lg font-bold tracking-tighter text-white">{selectedProject.hourlyRate}€/h</span></div>
               <div className="flex flex-col"><span className="text-[8px] font-black text-slate-500 uppercase mb-1">Margen</span><span className="text-lg font-bold tracking-tighter text-white">{selectedProject.profitMargin}%</span></div>
               <div className="flex flex-col"><span className="text-[8px] font-black text-slate-500 uppercase mb-1">Peso</span><span className="text-lg font-bold tracking-tighter text-white">{selectedProject.weight}g</span></div>
               <div className="flex flex-col"><span className="text-[8px] font-black text-slate-500 uppercase mb-1">Urgencia</span><span className="text-lg font-bold tracking-tighter text-white">x{selectedProject.urgency}</span></div>
            </div>
            <div className="flex gap-4">
              <button onClick={() => generatePDF(selectedProject)} className="flex items-center justify-center flex-1 gap-3 py-6 text-xs italic font-black tracking-widest text-white uppercase transition-all bg-slate-800 hover:bg-slate-700 rounded-3xl"><FileText size={18}/> Descargar PDF</button>
              <button onClick={() => { const { id, date, snapshotPrice, ...clean } = selectedProject; updateData({ ...clean, editingProjectId: id, activeTab: 'calculator' }); setSelectedProject(null); }} className="flex items-center justify-center flex-1 gap-3 py-6 text-xs italic font-black tracking-widest text-white uppercase bg-blue-600 shadow-xl hover:bg-blue-500 rounded-3xl"><RefreshCw size={18}/> Editar</button>
            </div>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {data.savedProjects.map(p => (<div key={p.id} className="bg-[#0f172a]/60 border border-slate-800 p-10 rounded-[3.5rem] group hover:border-purple-500/50 shadow-2xl relative transition-all"><div className="flex items-start justify-between mb-6"><div><h4 className="text-[10px] font-black text-purple-400 uppercase mb-1 leading-none">{p.date}</h4><h3 className="text-2xl font-black italic text-white uppercase truncate max-w-[150px]">{p.projectName || 'Sin nombre'}</h3></div><button onClick={() => setSelectedProject(p)} className="p-3 text-white transition-all shadow-lg bg-slate-800 rounded-2xl hover:bg-purple-600"><Info size={20} /></button></div><p className="mb-8 text-5xl italic font-black leading-none text-white">{p.snapshotPrice}€</p><div className="flex justify-between pt-6 border-t border-slate-800"><span className="text-[8px] font-black text-slate-500 uppercase">Peso: {p.weight}g</span><button onClick={() => deleteProject(p.id)} className="text-slate-600 hover:text-red-500"><Trash2 size={16}/></button></div></div>))}
      </div>
    </div>
  );

  const renderMaterials = () => (
    <div className="relative pb-20 space-y-8 animate-in fade-in">
      <header className="flex items-center justify-between mb-8"><h3 className="flex items-center gap-3 text-xl italic font-black tracking-tighter text-white uppercase"><Database className="text-emerald-500" /> Inventario</h3><button onClick={() => { setMatForm({name:'', brand:'', type:'PLA', color:'#000000', spoolWeight:1000, spoolPrice:''}); setIsMatFormOpen(true); }} className="bg-emerald-600 text-white px-10 py-3.5 rounded-2xl font-black text-xs uppercase shadow-lg">Añadir Material</button></header>
      {isMatFormOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-6 bg-[#020617]/95 backdrop-blur-md"><div className="bg-[#0f172a] border border-slate-800 p-12 rounded-[3.5rem] shadow-2xl w-full max-w-6xl relative animate-in zoom-in-95"><button onClick={() => setIsMatFormOpen(false)} className="absolute transition-colors top-10 right-10 text-slate-500 hover:text-white"><X size={28}/></button><h3 className="mb-12 text-2xl italic font-black tracking-tighter text-white uppercase">Nuevo Material</h3><div className="grid items-center grid-cols-1 gap-10 lg:grid-cols-4"><div className="flex flex-col justify-center h-full gap-8"><InputGroup label="Nombre" type="text" placeholder="Ej: PLA Mate" value={matForm.name} onChange={v => setMatForm({...matForm, name: v})} /><InputGroup label="Marca" type="text" placeholder="Ej: Sunlu" value={matForm.brand} onChange={v => setMatForm({...matForm, brand: v})} /></div><div className="relative flex flex-col justify-center h-full gap-8" ref={colorPickerRef}><div className="space-y-2"><label className="text-[10px] font-bold text-slate-500 uppercase ml-1 block mb-2 tracking-widest">Color</label><button onClick={() => setShowColorPicker(!showColorPicker)} className="flex items-center justify-between w-full px-5 py-4 border bg-slate-900/50 border-slate-800 rounded-2xl"><div className="flex items-center gap-3"><div className="w-4 h-4 rounded-full" style={{ backgroundColor: matForm.color }}></div><span className="text-xs font-black text-white uppercase">Elegir</span></div><ChevronDown size={14}/></button>{showColorPicker && <div className="absolute z-[90] top-[75px] w-full bg-[#1e293b] p-4 rounded-2xl shadow-xl animate-in zoom-in-95"><input type="color" className="w-full h-10 bg-transparent cursor-pointer" value={matForm.color} onChange={e => setMatForm({...matForm, color: e.target.value})} /></div>}</div><div className="space-y-2"><label className="text-[10px] font-bold text-slate-500 uppercase ml-1 block mb-2 tracking-widest">Tipo</label><select className="w-full px-5 py-4 text-xs font-black text-white uppercase border outline-none bg-slate-900/50 border-slate-800 rounded-2xl" value={matForm.type} onChange={e => setMatForm({...matForm, type: e.target.value})}><option>PLA</option><option>PETG</option><option>ABS</option><option>TPU</option></select></div></div><div className="flex flex-col justify-center h-full gap-8"><InputGroup label="Peso (g)" value={matForm.spoolWeight} onChange={v => setMatForm({...matForm, spoolWeight: v})} /><InputGroup label="Precio (€)" value={matForm.spoolPrice} onChange={v => setMatForm({...matForm, spoolPrice: v})} /></div><div className="bg-[#020617]/50 border border-slate-800 h-full p-8 rounded-[3rem] text-center flex flex-col justify-center"><p className="text-[10px] font-black text-emerald-500 uppercase mb-2">Coste Kilo</p><p className="text-5xl italic font-black tracking-tighter text-white">{((matForm.spoolPrice / matForm.spoolWeight)*1000 || 0).toFixed(2)}€</p></div></div><button onClick={() => { if (!matForm.name || !matForm.spoolPrice) return alert("Faltan datos"); addMaterial({ ...matForm, pricePerKg: ((matForm.spoolPrice / matForm.spoolWeight)*1000).toFixed(2), id: Date.now() }); setIsMatFormOpen(false); }} className="w-full py-6 mt-12 italic font-black text-white uppercase transition-all shadow-xl bg-emerald-600 hover:bg-emerald-500 rounded-3xl">Confirmar Material</button></div></div>
      )}
      {data.materials.length === 0 ? <div className="py-40 border-2 border-dashed border-slate-800 rounded-[4rem] text-center opacity-60"><Package size={64} className="mx-auto mb-6"/><h4 className="text-lg italic font-black uppercase text-slate-500">Vacío</h4></div> : <div className="grid grid-cols-1 gap-8 md:grid-cols-3">{data.materials.map(m => (<div key={m.id} className="bg-[#0f172a]/50 border border-slate-800 rounded-[2.5rem] overflow-hidden group hover:border-emerald-600 shadow-xl transition-all"><div className="h-2" style={{ backgroundColor: m.color }}></div><div className="p-8"><div className="flex items-start justify-between mb-4"><h4 className="text-sm italic font-black text-white uppercase">{m.name}</h4><button onClick={() => deleteMaterial(m.id)} className="text-slate-600 hover:text-red-500"><Trash2 size={16}/></button></div><p className="mb-6 text-3xl italic font-black tracking-tighter text-white">{m.pricePerKg}€/kg</p><button onClick={() => { updateData({ pricePerKg: parseFloat(m.pricePerKg), selectedMaterialId: m.id, activeTab: 'calculator' }) }} className="w-full py-4 text-xs italic font-black tracking-widest uppercase transition-all bg-emerald-600/10 text-emerald-400 rounded-2xl hover:bg-emerald-600">Usar este Material</button></div></div>))}</div>}
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
              <div className="flex-1 overflow-y-auto p-10 bg-[#0f172a] grid grid-cols-1 md:grid-cols-2 gap-4 h-fit content-start">
                {PRINTER_LIBRARY.filter(lib => !selectedBrand || lib.brand === selectedBrand).flatMap(lib => lib.models.map(m => ({...m, brand: lib.brand}))).filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase())).map(m => ( <button key={m.name} onClick={() => { addPrinter({ name: m.name, brand: m.brand, watts: m.watts, maintenanceTotal: 0.05, id: Date.now() }); setIsLibraryOpen(false); }} className="p-6 bg-[#020617] border border-slate-800 rounded-[2rem] text-left hover:border-blue-600 group transition-all flex justify-between items-center transition-all"><div><p className="text-[10px] font-black text-blue-500 uppercase tracking-widest leading-none mb-1">{m.brand}</p><h4 className="text-lg italic font-black leading-tight text-white">{m.name}</h4><p className="mt-2 text-xs font-bold uppercase text-slate-500">{m.watts} Vatios</p></div><Plus className="text-blue-500 transition-opacity opacity-0 group-hover:opacity-100" size={20}/></button> ))}
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
        <header className="flex items-center justify-between mb-16"><h2 className="text-6xl italic font-black tracking-tighter text-white uppercase drop-shadow-sm">{data.activeTab === 'calculator' ? 'Calculator' : data.activeTab === 'materials' ? 'Materiales' : data.activeTab === 'printers' ? 'Taller' : 'Historial'}</h2></header>
        {data.activeTab === 'calculator' ? renderCalculatorDashboard() : 
         data.activeTab === 'materials' ? renderMaterials() : 
         data.activeTab === 'printers' ? renderPrinters() : renderProjects()}
      </main>
    </div>
  );
}