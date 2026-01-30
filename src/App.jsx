import React, { useState, useRef, useEffect } from 'react';
import { 
  Calculator, Package, Cpu, Weight, Clock, Euro, Zap, Search,
  Layers, RotateCcw, Star, Percent, Trash2, Plus, Edit3, 
  X, UserCheck, Database, ChevronDown, Wrench, ChevronRight, 
  Truck, Box, AlertTriangle, TrendingUp, ArrowRight
} from 'lucide-react';
import { useCalculatorStore } from './store/useCalculatorStore';
import InputGroup from './components/InputGroup';

// --- CONSTANTES GLOBALES ---
const COLOR_PRESETS = [
  { name: 'Negro', hex: '#000000' }, { name: 'Blanco', hex: '#ffffff' }, { name: 'Gris', hex: '#808080' }, { name: 'Plata', hex: '#c0c0c0' },
  { name: 'Oro', hex: '#ffd700' }, { name: 'Cobre', hex: '#b87333' }, { name: 'Rojo', hex: '#ff0000' }, { name: 'Azul', hex: '#0000ff' },
  { name: 'Verde', hex: '#008000' }, { name: 'Naranja', hex: '#ffa500' },
];

const PRINTER_LIBRARY = [
  { brand: "Creality", models: [ { name: "Ender 3 / Pro", watts: 125 }, { name: "Ender 3 V2 / Neo", watts: 150 }, { name: "K1 / K1 Max", watts: 350 } ] },
  { brand: "Bambu Lab", models: [ { name: "P1P / P1S", watts: 350 }, { name: "X1 Carbon", watts: 350 }, { name: "A1 Mini", watts: 150 } ] },
  { brand: "Prusa", models: [ { name: "MK3S+", watts: 120 }, { name: "MK4", watts: 150 }, { name: "Mini+", watts: 90 } ] }
];

export default function App() {
  const { data, updateData, addMaterial, updateMaterial, deleteMaterial, addPrinter, updatePrinter, deletePrinter, saveProject, deleteProject } = useCalculatorStore();
  
  // Modales y UI
  const [isMatFormOpen, setIsMatFormOpen] = useState(false);
  const [isPrinterFormOpen, setIsPrinterFormOpen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [openSection, setOpenSection] = useState('technical');
  const [activeAlert, setActiveAlert] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBrand, setSelectedBrand] = useState(null);
  
  const colorPickerRef = useRef(null);
  const [editingMatId, setEditingMatId] = useState(null);
  const [editingPrinterId, setEditingPrinterId] = useState(null);

  // Formularios
  const [matForm, setMatForm] = useState({ name: '', brand: '', type: 'PLA', color: '#000000', spoolWeight: 1000, spoolPrice: '', description: '' });
  const [printerForm, setPrinterForm] = useState({ name: '', brand: '', watts: '', costPerHour: '', initialPrice: '', lifespan: 5000 });

  useEffect(() => {
    function handleClickOutside(event) {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target)) setShowColorPicker(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [colorPickerRef]);

  // --- MOTOR DE CÁLCULO ---
  const totalTimeHours = (data.timeHours || 0) + ((data.timeMinutes || 0) / 60);
  const costMaterialTotal = ((data.weight * data.pricePerKg) / 1000) * data.quantity;
  const costEnergyTotal = ((data.printerWattage * totalTimeHours / 1000) * data.energyPrice) * data.quantity;
  const costMaintenanceTotal = (totalTimeHours * (data.maintenance || 0)) * data.quantity;
  const laborCost = (((data.prepTime || 0) / 60) + ((data.postProcessTime || 0) * data.quantity)) * data.hourlyRate;
  
  const baseCost = costMaterialTotal + costEnergyTotal + costMaintenanceTotal + laborCost + 
                   (parseFloat(data.extraMaterialsCost || 0) * data.quantity) + 
                   parseFloat(data.packagingCost || 0) + parseFloat(data.shippingCost || 0);
  const totalCost = baseCost * (1 + (data.failRate || 0) / 100); 
  const finalPrice = (totalCost * (1 + (data.profitMargin || 0) / 100)) * (data.urgency || 1) * (data.includeTax ? (1 + data.taxRate / 100) : 1);

  // --- VISTAS: CALCULADORA ---
  const renderCalculatorDashboard = () => (
    <div className="relative duration-500 animate-in fade-in">
      {activeAlert && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#020617]/90 backdrop-blur-md">
          <div className="bg-[#0f172a] border border-slate-800 p-10 rounded-[3.5rem] shadow-2xl max-w-md w-full text-center animate-in zoom-in-95">
            <AlertTriangle size={48} className="mx-auto mb-6 text-amber-500" />
            <h3 className="mb-4 text-xl italic font-black tracking-tighter text-white uppercase">Falta Configuración</h3>
            <p className="mb-8 text-xs font-bold tracking-widest uppercase text-slate-400">Debes añadir al menos un elemento en la sección de {activeAlert === 'printer' ? 'impresoras' : 'materiales'}.</p>
            <div className="space-y-3">
              <button onClick={() => { updateData({activeTab: activeAlert === 'printer' ? 'printers' : 'materials'}); setActiveAlert(null); }} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase italic tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-[1.02]">Configurar ahora <ChevronRight size={14}/></button>
              <button onClick={() => setActiveAlert(null)} className="w-full bg-slate-800 text-slate-400 py-4 rounded-2xl font-black text-[10px] uppercase">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-10 lg:flex-row">
        <div className="w-full lg:w-[450px] space-y-4">
          <div className={`border border-slate-800 rounded-3xl overflow-hidden transition-all ${openSection === 'identity' ? 'bg-[#0f172a]' : 'bg-[#0f172a]/40'}`}>
            <button onClick={() => setOpenSection('identity')} className="flex items-center justify-between w-full p-6 text-xs italic font-black tracking-widest text-white uppercase"><span className="flex items-center gap-3"><Layers size={16} className="text-blue-500"/> 1. Proyecto</span><ChevronDown size={16} className={openSection === 'identity' ? 'rotate-180' : ''} /></button>
            {openSection === 'identity' && <div className="p-6 pt-0 space-y-6 animate-in slide-in-from-top-2"><InputGroup label="Nombre" type="text" placeholder="Ej: Casco Pro" value={data.projectName} onChange={v => updateData({projectName: v})} /><div className="grid grid-cols-2 gap-4"><InputGroup label="Cantidad" suffix="uds" value={data.quantity} onChange={v => updateData({quantity: parseInt(v)||1})} /><div className="space-y-2"><label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Urgencia</label><select className="w-full bg-[#020617] border border-slate-800 rounded-2xl px-4 py-4 text-xs font-black text-white" value={data.urgency} onChange={e => updateData({urgency: parseFloat(e.target.value)})}><option value="1">Normal (x1.0)</option><option value="1.2">Urgente (x1.2)</option><option value="1.5">Crítico (x1.5)</option></select></div></div></div>}
          </div>

          <div className={`border border-slate-800 rounded-3xl overflow-hidden transition-all ${openSection === 'technical' ? 'bg-[#0f172a]' : 'bg-[#0f172a]/40'}`}>
            <button onClick={() => setOpenSection('technical')} className="flex items-center justify-between w-full p-6 text-xs italic font-black tracking-widest text-white uppercase"><span className="flex items-center gap-3"><Zap size={16} className="text-emerald-500"/> 2. Hardware y Material</span><ChevronDown size={16} className={openSection === 'technical' ? 'rotate-180' : ''} /></button>
            {openSection === 'technical' && <div className="p-6 pt-0 space-y-6 animate-in slide-in-from-top-2"><div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Máquina</label>{data.customPrinters.length === 0 ? <button onClick={() => setActiveAlert('printer')} className="w-full bg-[#020617] border border-slate-800 rounded-2xl px-4 py-4 text-xs font-black text-slate-500 flex justify-between items-center italic">Vacío <ChevronRight size={12}/></button> : <select className="w-full bg-[#020617] border border-slate-800 rounded-2xl px-4 py-4 text-xs font-black text-white outline-none focus:ring-2 focus:ring-blue-600 transition-all" value={data.selectedPrinterId || ''} onChange={e => { const p = data.customPrinters.find(x => x.id === parseInt(e.target.value)); updateData({selectedPrinterId: p.id, printerWattage: p.watts, maintenance: p.maintenanceTotal}); }}><option value="">Seleccionar...</option>{data.customPrinters.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>}</div>
              <div className="space-y-2"><label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Filamento</label>{data.materials.length === 0 ? <button onClick={() => setActiveAlert('material')} className="w-full bg-[#020617] border border-slate-800 rounded-2xl px-4 py-4 text-xs font-black text-slate-500 flex justify-between items-center italic">Vacío <ChevronRight size={12}/></button> : <select className="w-full bg-[#020617] border border-slate-800 rounded-2xl px-4 py-4 text-xs font-black text-white outline-none focus:ring-2 focus:ring-blue-600 transition-all" value={data.selectedMaterialId || ''} onChange={e => { const m = data.materials.find(x => x.id === parseInt(e.target.value)); updateData({selectedMaterialId: m.id, pricePerKg: m.pricePerKg}); }}><option value="">Seleccionar...</option>{data.materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select>}</div>
            </div><div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800/50"><InputGroup label="Horas" value={data.timeHours} onChange={v => updateData({timeHours: parseFloat(v)||0})} /><InputGroup label="Minutos" value={data.timeMinutes} onChange={v => updateData({timeMinutes: parseFloat(v)||0})} /></div><InputGroup label="Peso (g)" suffix="gramos" value={data.weight} onChange={v => updateData({weight: parseFloat(v)||0})} /></div>}
          </div>

          <div className={`border border-slate-800 rounded-3xl overflow-hidden transition-all ${openSection === 'hidden' ? 'bg-[#0f172a]' : 'bg-[#0f172a]/40'}`}>
            <button onClick={() => setOpenSection('hidden')} className="flex items-center justify-between w-full p-6 text-xs italic font-black tracking-widest text-white uppercase"><span className="flex items-center gap-3"><Truck size={16} className="text-purple-500"/> 3. Logística y Labor</span><ChevronDown size={16} className={openSection === 'hidden' ? 'rotate-180' : ''} /></button>
            {openSection === 'hidden' && <div className="p-6 pt-0 space-y-6 animate-in slide-in-from-top-2"><InputGroup label="Mano de Obra" suffix="€/h" icon={UserCheck} value={data.hourlyRate} onChange={v => updateData({hourlyRate: parseFloat(v)||0})} /><div className="grid grid-cols-2 gap-4"><InputGroup label="Embalaje" suffix="€" icon={Box} value={data.packagingCost} onChange={v => updateData({packagingCost: v})} /><InputGroup label="Envío" suffix="€" icon={Truck} value={data.shippingCost} onChange={v => updateData({shippingCost: v})} /></div><InputGroup label="Extras" suffix="€" icon={Plus} value={data.extraMaterialsCost} onChange={v => updateData({extraMaterialsCost: v})} /></div>}
          </div>
        </div>

        <div className="flex flex-col flex-1 gap-10">
          <div className={`p-16 rounded-[4.5rem] shadow-2xl transition-all duration-700 relative overflow-hidden border border-white/5 ${data.isPremiumMode ? 'bg-gradient-to-br from-indigo-600 to-blue-700' : 'bg-[#0f172a]'}`}>
            <div className="absolute top-0 right-0 p-10 opacity-5"><Calculator size={240}/></div>
            <p className="text-[10px] font-black uppercase tracking-[0.5em] opacity-50 mb-3 leading-none">PVP Sugerido</p>
            <h2 className="text-[11rem] font-black italic tracking-tighter leading-none drop-shadow-2xl">{finalPrice.toFixed(2)}€</h2>
            <div className="flex gap-12 pt-12 mt-12 border-t border-white/10">
              <div><p className="text-[9px] font-bold opacity-40 uppercase mb-2">Coste Fab.</p><p className="text-2xl italic font-black">{(costMaterialTotal + costEnergyTotal + costMaintenanceTotal).toFixed(2)}€</p></div>
              <div><p className="text-[9px] font-bold opacity-40 uppercase mb-2">Beneficio</p><p className="text-2xl italic font-black text-emerald-400">{(finalPrice / (data.includeTax ? (1+data.taxRate/100) : 1) - totalCost).toFixed(2)}€</p></div>
            </div>
          </div>
          <button onClick={() => {saveProject({id: Date.now(), name: data.projectName || 'Sin nombre', price: finalPrice.toFixed(2), date: new Date().toLocaleDateString()}); updateData({ activeTab: 'projects' })}} className="w-full py-7 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-[2.5rem] shadow-2xl transition-all uppercase italic text-xs tracking-widest">Archivar Proyecto</button>
        </div>
      </div>
    </div>
  );

  // --- VISTAS: MATERIALES ---
  const handleSaveMaterial = () => {
    if (!matForm.name || !matForm.spoolPrice) return alert("Faltan datos");
    const priceKg = (parseFloat(matForm.spoolPrice) / parseFloat(matForm.spoolWeight)) * 1000;
    const matData = { ...matForm, pricePerKg: priceKg.toFixed(2), id: editingMatId || Date.now() };
    editingMatId ? updateMaterial(editingMatId, matData) : addMaterial(matData);
    setIsMatFormOpen(false);
  };

  const renderMaterials = () => (
    <div className="relative pb-20 space-y-8 animate-in fade-in">
      <header className="flex items-center justify-between mb-8">
        <h3 className="flex items-center gap-3 text-xl italic font-black tracking-tighter text-white uppercase"><Database className="text-emerald-500" /> Inventario</h3>
        <button onClick={() => { setEditingMatId(null); setMatForm({name:'', brand:'', type:'PLA', color:'#000000', spoolWeight:1000, spoolPrice:'', description:''}); setIsMatFormOpen(true); }} className="bg-emerald-600 hover:bg-emerald-500 text-white px-10 py-3.5 rounded-2xl font-black text-xs uppercase italic transition-all shadow-lg">Añadir Material</button>
      </header>
      {isMatFormOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-6 bg-[#020617]/95 backdrop-blur-md">
          <div className="bg-[#0f172a] border border-slate-800 p-12 rounded-[3.5rem] shadow-2xl w-full max-w-6xl relative animate-in zoom-in-95">
            <button onClick={() => setIsMatFormOpen(false)} className="absolute transition-colors top-10 right-10 text-slate-500 hover:text-white"><X size={28}/></button>
            <h3 className="flex items-center gap-3 mb-12 text-2xl italic font-black text-white uppercase">{editingMatId ? 'Editar Material' : 'Nuevo Material'}</h3>
            <div className="grid items-center grid-cols-1 gap-10 lg:grid-cols-4">
              <div className="flex flex-col justify-center h-full gap-8"><InputGroup label="Nombre" type="text" placeholder="PLA Seda" value={matForm.name} onChange={v => setMatForm({...matForm, name: v})} /><InputGroup label="Marca" type="text" placeholder="Sunlu" value={matForm.brand} onChange={v => setMatForm({...matForm, brand: v})} /></div>
              <div className="relative flex flex-col justify-center h-full gap-8" ref={colorPickerRef}>
                <div className="space-y-2"><label className="text-[10px] font-bold text-slate-500 uppercase ml-1 block mb-2 tracking-widest">Color</label><button onClick={() => setShowColorPicker(!showColorPicker)} className="flex items-center justify-between w-full px-5 py-4 transition-all border shadow-inner bg-slate-900/50 border-slate-800 rounded-2xl hover:bg-slate-800"><div className="flex items-center gap-3"><div className="w-4 h-4 border rounded-full border-white/20" style={{ backgroundColor: matForm.color }}></div><span className="text-xs font-black text-white uppercase">{COLOR_PRESETS.find(c => c.hex === matForm.color.toLowerCase())?.name || 'MANUAL'}</span></div><ChevronDown size={14}/></button>
                {showColorPicker && <div className="absolute z-[90] top-[75px] w-full bg-[#1e293b] border border-slate-700 rounded-2xl p-4 shadow-2xl"><div className="grid grid-cols-8 gap-2 mb-4">{COLOR_PRESETS.map(c => ( <button key={c.hex} onClick={() => { setMatForm({...matForm, color: c.hex}); setShowColorPicker(false); }} className={`w-5 h-5 rounded-full border transition-all hover:scale-125 ${matForm.color === c.hex ? 'border-white ring-2 ring-blue-500/50' : 'border-white/10'}`} style={{ backgroundColor: c.hex }} /> ))}</div><input type="color" className="w-full h-8 bg-transparent cursor-pointer" value={matForm.color} onChange={e => setMatForm({...matForm, color: e.target.value})} /></div>}</div>
                <div className="space-y-2"><label className="text-[10px] font-bold text-slate-500 uppercase ml-1 block mb-2 tracking-widest">Tipo</label><select className="w-full px-5 py-4 text-xs font-black text-white uppercase border shadow-inner bg-slate-900/50 border-slate-800 rounded-2xl" value={matForm.type} onChange={e => setMatForm({...matForm, type: e.target.value})}><option>PLA</option><option>PETG</option><option>ABS</option><option>TPU</option></select></div>
              </div>
              <div className="flex flex-col justify-center h-full gap-8"><InputGroup label="Peso" suffix="g" value={matForm.spoolWeight} onChange={v => setMatForm({...matForm, spoolWeight: v})} /><InputGroup label="Precio" suffix="€" value={matForm.spoolPrice} onChange={v => setMatForm({...matForm, spoolPrice: v})} /></div>
              <div className="bg-[#020617]/50 border border-slate-800 h-full p-8 rounded-[3rem] text-center shadow-inner flex flex-col justify-center h-full"><p className="text-[10px] font-black text-emerald-500 uppercase mb-2">Coste Real</p><p className="text-5xl italic font-black text-white">{((matForm.spoolPrice / matForm.spoolWeight)*1000 || 0).toFixed(2)}€<span className="ml-1 text-xs">/kg</span></p></div>
            </div>
            <button onClick={handleSaveMaterial} className="w-full py-6 mt-12 italic font-black text-white uppercase transition-all shadow-xl bg-emerald-600 hover:bg-emerald-500 rounded-3xl">Confirmar Guardado</button>
          </div>
        </div>
      )}
      {data.materials.length === 0 ? <div className="py-40 border-2 border-dashed border-slate-800 rounded-[4rem] text-center opacity-60"><Package size={64} className="mx-auto mb-6"/><h4 className="text-lg italic font-black uppercase text-slate-500">El armario está vacío</h4></div> : <div className="grid grid-cols-1 gap-8 md:grid-cols-3">{data.materials.map(m => (<div key={m.id} className="bg-[#0f172a]/50 border border-slate-800 rounded-[2.5rem] overflow-hidden group hover:border-emerald-600 shadow-xl"><div className="h-2" style={{ backgroundColor: m.color }}></div><div className="p-8"><div className="flex items-start justify-between mb-4"><h4 className="text-sm italic font-black text-white uppercase">{m.name}</h4><div className="flex gap-4"><button onClick={() => { setEditingMatId(m.id); setMatForm(m); setIsMatFormOpen(true); }} className="text-slate-600 hover:text-amber-500"><Edit3 size={16}/></button><button onClick={() => deleteMaterial(m.id)} className="text-slate-600 hover:text-red-500"><Trash2 size={16}/></button></div></div><p className="mb-6 text-3xl italic font-black text-white">{m.pricePerKg}€/kg</p><button onClick={() => { updateData({ pricePerKg: parseFloat(m.pricePerKg), selectedMaterialId: m.id, activeTab: 'calculator' }) }} className="w-full py-4 text-xs italic font-black uppercase transition-all bg-emerald-600/10 text-emerald-400 rounded-2xl hover:bg-emerald-600">Usar Material</button></div></div>))}</div>}
    </div>
  );

  // --- VISTAS: IMPRESORAS ---
  const handleSavePrinter = () => {
    if (!printerForm.name || !printerForm.watts) return alert("Faltan datos");
    const amort = printerForm.initialPrice ? (parseFloat(printerForm.initialPrice) / parseFloat(printerForm.lifespan)) : 0;
    const totalMaint = (parseFloat(printerForm.costPerHour || 0) + amort).toFixed(2);
    const printerData = { ...printerForm, maintenanceTotal: totalMaint, id: editingPrinterId || Date.now() };
    editingPrinterId ? updatePrinter(editingPrinterId, printerData) : addPrinter(printerData);
    setIsPrinterFormOpen(false);
  };

  const addFromLibrary = (model, brand) => {
    const newPrinter = { name: model.name, brand: brand, watts: model.watts, costPerHour: 0.05, maintenanceTotal: 0.05, id: Date.now() };
    addPrinter(newPrinter);
    setIsLibraryOpen(false);
  };

  const renderPrinters = () => (
    <div className="relative pb-20 space-y-8 animate-in fade-in">
      <header className="flex items-center justify-between mb-8">
        <h3 className="flex items-center gap-3 text-xl italic font-black tracking-tighter text-white uppercase"><Cpu className="text-blue-500" /> Mi Taller</h3>
        <div className="flex gap-4"><button onClick={() => setIsLibraryOpen(true)} className="bg-slate-800 text-slate-300 px-6 py-3.5 rounded-2xl font-black text-xs uppercase italic transition-all border border-slate-700 tracking-widest">Biblioteca</button><button onClick={() => { setEditingPrinterId(null); setPrinterForm({name:'', brand:'', watts:'', costPerHour:'', initialPrice:'', lifespan:5000}); setIsPrinterFormOpen(true); }} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase italic shadow-lg tracking-widest">Manual</button></div>
      </header>
      {isPrinterFormOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-6 bg-[#020617]/95 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#0f172a] border border-slate-800 p-12 rounded-[3.5rem] shadow-2xl w-full max-w-6xl relative animate-in zoom-in-95">
            <button onClick={() => setIsPrinterFormOpen(false)} className="absolute transition-colors top-10 right-10 text-slate-500 hover:text-white"><X size={28}/></button>
            <h3 className="flex items-center gap-3 mb-12 text-2xl italic font-black text-white uppercase">{editingPrinterId ? 'Editar Máquina' : 'Nueva Configuración'}</h3>
            <div className="grid items-center grid-cols-1 gap-10 lg:grid-cols-4">
              <div className="flex flex-col justify-center h-full space-y-8"><InputGroup label="Modelo" type="text" placeholder="Ender 3 v2" value={printerForm.name} onChange={v => setPrinterForm({...printerForm, name: v})} /><InputGroup label="Marca" type="text" placeholder="Creality" value={printerForm.brand} onChange={v => setPrinterForm({...printerForm, brand: v})} /></div>
              <div className="flex flex-col justify-center h-full space-y-8"><InputGroup label="Consumo" icon={Zap} suffix="W" value={printerForm.watts} onChange={v => setPrinterForm({...printerForm, watts: v})} /><InputGroup label="Vida Útil" icon={Clock} suffix="h" value={printerForm.lifespan} onChange={v => setPrinterForm({...printerForm, lifespan: v})} /></div>
              <div className="flex flex-col justify-center h-full space-y-8"><InputGroup label="Mant." suffix="€/h" placeholder="Recambios" value={printerForm.costPerHour} onChange={v => setPrinterForm({...printerForm, costPerHour: v})} /><InputGroup label="Precio" suffix="€" placeholder="Amortización" value={printerForm.initialPrice} onChange={v => setPrinterForm({...printerForm, initialPrice: v})} /></div>
              <div className="bg-[#020617]/50 border border-slate-800 h-full p-8 rounded-[3rem] flex flex-col justify-center text-center shadow-inner h-full"><p className="text-[10px] font-black text-blue-400 uppercase mb-2">Coste de Máquina</p><p className="text-5xl italic font-black text-white">{(parseFloat(printerForm.costPerHour||0) + (printerForm.initialPrice?parseFloat(printerForm.initialPrice)/parseFloat(printerForm.lifespan):0)).toFixed(2)}€<span className="ml-1 text-xs">/h</span></p></div>
            </div>
            <button onClick={handleSavePrinter} className="w-full py-6 mt-12 italic font-black text-white uppercase transition-all bg-blue-600 shadow-xl hover:bg-blue-500 rounded-3xl">Confirmar Máquina</button>
          </div>
        </div>
      )}
      {isLibraryOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-[#020617]/95 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#0f172a] border border-slate-800 rounded-[3.5rem] shadow-2xl w-full max-w-5xl h-[80vh] flex flex-col overflow-hidden relative animate-in zoom-in-95">
            <button onClick={() => setIsLibraryOpen(false)} className="absolute z-10 top-8 right-8 text-slate-500 hover:text-white"><X size={24}/></button>
            <div className="p-10 border-b border-slate-800"><h3 className="flex items-center gap-3 mb-6 text-2xl italic font-black text-white uppercase">Biblioteca Pro</h3><div className="relative"><Search className="absolute -translate-y-1/2 left-5 top-1/2 text-slate-500" size={18} /><input type="text" placeholder="Ender, P1S, MK4..." className="w-full bg-[#020617] border border-slate-800 rounded-2xl py-4 pl-14 text-white font-bold outline-none" onChange={(e) => setSearchTerm(e.target.value)} /></div></div>
            <div className="flex flex-1 overflow-hidden">
              <div className="w-64 border-r border-slate-800 overflow-y-auto p-4 space-y-2 bg-[#020617]/30">{PRINTER_LIBRARY.map(lib => ( <button key={lib.brand} onClick={() => setSelectedBrand(lib.brand)} className={`w-full text-left px-5 py-3 rounded-xl font-bold text-sm transition-all ${selectedBrand === lib.brand ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}>{lib.brand}</button> ))}</div>
              <div className="flex-1 overflow-y-auto p-10 bg-[#0f172a] grid grid-cols-1 md:grid-cols-2 gap-4 h-fit content-start">
                {PRINTER_LIBRARY.filter(lib => !selectedBrand || lib.brand === selectedBrand).flatMap(lib => lib.models.map(m => ({...m, brand: lib.brand}))).filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase())).map(m => (
                  <button key={m.name} onClick={() => addFromLibrary(m, m.brand)} className="p-6 bg-[#020617] border border-slate-800 rounded-[2rem] text-left hover:border-blue-600 transition-all group flex justify-between items-center"><div><p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{m.brand}</p><h4 className="text-lg italic font-black text-white">{m.name}</h4><p className="mt-1 text-xs font-bold text-slate-500">{m.watts}W</p></div><Plus className="text-blue-500 transition-opacity opacity-0 group-hover:opacity-100" size={20}/></button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      {data.customPrinters.length === 0 ? <div className="py-40 border-2 border-dashed border-slate-800 rounded-[4rem] text-center opacity-60"><Cpu size={64} className="mx-auto mb-6"/><h4 className="text-lg italic font-black uppercase text-slate-500">El taller está vacío</h4></div> : <div className="grid grid-cols-1 gap-8 md:grid-cols-3">{data.customPrinters.map(p => (<div key={p.id} className="bg-[#0f172a]/50 border border-slate-800 rounded-[2.5rem] p-8 group hover:border-blue-500/30 transition-all shadow-xl"><div className="flex items-start justify-between mb-4"><div><p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{p.brand}</p><h4 className="text-sm italic font-black text-white uppercase">{p.name}</h4></div><div className="flex gap-4"><button onClick={() => { setEditingPrinterId(p.id); setPrinterForm(p); setIsPrinterFormOpen(true); }} className="text-slate-600 hover:text-amber-500"><Edit3 size={16}/></button><button onClick={() => deletePrinter(p.id)} className="text-slate-600 hover:text-red-500"><Trash2 size={16}/></button></div></div><p className="mb-6 text-3xl italic font-black tracking-tighter text-white">{p.watts}W <span className="ml-2 text-xs not-italic uppercase text-slate-500">Mant: {p.maintenanceTotal}€/h</span></p><button onClick={() => { updateData({ printerWattage: parseFloat(p.watts), maintenance: parseFloat(p.maintenanceTotal), selectedPrinterId: p.id, activeTab: 'calculator' }) }} className="w-full py-4 text-xs italic font-black text-blue-400 uppercase transition-all bg-blue-600/10 rounded-2xl hover:bg-blue-600">Usar Máquina</button></div>))}</div>}
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#020617] text-slate-50 font-sans">
      <aside className="w-64 bg-[#0f172a]/50 border-r border-slate-800 p-8 flex flex-col">
        <div className="flex items-center gap-3 mb-14"><div className="bg-blue-600 p-2.5 rounded-xl shadow-lg shadow-blue-900/40"><Calculator size={26} className="text-white" /></div><h1 className="text-xl italic font-black tracking-tight uppercase">3DPrice Pro</h1></div>
        <nav className="space-y-4 flex-1 font-black text-[10px] tracking-widest uppercase">
          <button onClick={() => updateData({ activeTab: 'calculator' })} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all ${data.activeTab === 'calculator' ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20 shadow-lg' : 'hover:bg-slate-800/50 text-slate-500'}`}><Calculator size={18} /> Calculadora</button>
          <button onClick={() => updateData({ activeTab: 'materials' })} className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl transition-all ${data.activeTab === 'materials' ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-600/20 shadow-lg' : 'hover:bg-slate-800/50 text-slate-500'}`}><div className="flex items-center gap-4"><Package size={18} /> Materiales</div></button>
          <button onClick={() => updateData({ activeTab: 'printers' })} className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl transition-all ${data.activeTab === 'printers' ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20 shadow-lg' : 'hover:bg-slate-800/50 text-slate-500'}`}><div className="flex items-center gap-4"><Cpu size={18} /> Impresoras</div></button>
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto p-14">
        <header className="flex items-center justify-between mb-16">
          <h2 className="text-6xl italic font-black tracking-tighter text-white uppercase drop-shadow-sm">{data.activeTab === 'calculator' ? 'Calculator' : data.activeTab === 'materials' ? 'Materiales' : 'Taller'}</h2>
        </header>
        {data.activeTab === 'calculator' ? renderCalculatorDashboard() : data.activeTab === 'materials' ? renderMaterials() : renderPrinters()}
      </main>
    </div>
  );
}