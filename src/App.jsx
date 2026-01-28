import React, { useState, useRef, useEffect } from 'react';
import { 
  Calculator, Package, Cpu, Weight, Clock, Euro, Zap, Search,
  Layers, RotateCcw, Star, Percent, Trash2, Plus, Edit3, 
  Palette, FileText, Check, X, UserCheck, Database, ChevronDown, Wrench, ChevronRight
} from 'lucide-react';
import { useCalculatorStore } from './store/useCalculatorStore';
import InputGroup from './components/InputGroup';

// --- CONSTANTES ---
const COLOR_PRESETS = [
  { name: 'Negro', hex: '#000000' }, { name: 'Blanco', hex: '#ffffff' }, { name: 'Gris', hex: '#808080' }, { name: 'Plata', hex: '#c0c0c0' },
  { name: 'Oro', hex: '#ffd700' }, { name: 'Cobre', hex: '#b87333' }, { name: 'Rojo', hex: '#ff0000' }, { name: 'Granate', hex: '#800000' },
  { name: 'Azul', hex: '#0000ff' }, { name: 'Navy', hex: '#000080' }, { name: 'Cian', hex: '#00ffff' }, { name: 'Verde', hex: '#008000' },
];

const PRINTER_LIBRARY = [
  { brand: "Creality", models: [ { name: "Ender 3 / Pro", watts: 125 }, { name: "Ender 3 V2 / Neo", watts: 150 }, { name: "K1 / K1 Max", watts: 350 } ] },
  { brand: "Bambu Lab", models: [ { name: "P1P / P1S", watts: 350 }, { name: "X1 Carbon", watts: 350 }, { name: "A1 Mini", watts: 150 } ] },
  { brand: "Prusa", models: [ { name: "i3 MK3S+", watts: 120 }, { name: "MK4", watts: 150 }, { name: "Mini+", watts: 90 } ] }
];

export default function App() {
  const { data, updateData, addMaterial, updateMaterial, deleteMaterial, addPrinter, updatePrinter, deletePrinter, saveProject, deleteProject } = useCalculatorStore();
  
  // Modales
  const [isMatFormOpen, setIsMatFormOpen] = useState(false);
  const [isPrinterFormOpen, setIsPrinterFormOpen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const colorPickerRef = useRef(null);
  
  // Estados búsqueda y edición
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [editingMatId, setEditingMatId] = useState(null);
  const [editingPrinterId, setEditingPrinterId] = useState(null);

  // Formularios limpios
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
  const costMaterial = (data.weight * data.pricePerKg) / 1000;
  const costEnergy = (data.printerWattage * totalTimeHours / 1000) * data.energyPrice;
  const costMaintenance = totalTimeHours * (data.maintenance || 0);
  const subtotal = (costMaterial + costEnergy + costMaintenance) * data.quantity + (((data.prepTime/60) + (data.postProcessTime*data.quantity)) * data.hourlyRate);
  const totalCost = subtotal * (1 + (data.failRate || 0) / 100); 
  const finalPrice = (totalCost * (1 + (data.profitMargin || 0) / 100)) * (data.includeTax ? (1 + data.taxRate / 100) : 1);

  // --- LÓGICA IMPRESORAS ---
  const handleSavePrinter = () => {
    if (!printerForm.name || !printerForm.watts) return alert("Datos obligatorios vacíos");
    const amort = printerForm.initialPrice ? (parseFloat(printerForm.initialPrice) / parseFloat(printerForm.lifespan)) : 0;
    const totalMaint = (parseFloat(printerForm.costPerHour || 0) + amort).toFixed(2);
    const printerData = { ...printerForm, maintenanceTotal: totalMaint, id: editingPrinterId || Date.now() };
    editingPrinterId ? updatePrinter(editingPrinterId, printerData) : addPrinter(printerData);
    setIsPrinterFormOpen(false);
    setEditingPrinterId(null);
  };

  const addFromLibrary = (model, brand) => {
    const newPrinter = { name: model.name, brand: brand, watts: model.watts, costPerHour: 0.05, maintenanceTotal: 0.05, id: Date.now() };
    addPrinter(newPrinter);
    setIsLibraryOpen(false);
  };

  const renderPrinters = () => (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 relative">
      <header className="flex justify-between items-center mb-8">
        <h3 className="text-xl font-black italic text-white flex items-center gap-3 uppercase tracking-tighter"><Cpu className="text-blue-500" /> Mi Taller</h3>
        <div className="flex gap-4">
          <button onClick={() => setIsLibraryOpen(true)} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-6 py-3.5 rounded-2xl font-black text-xs uppercase italic transition-all flex items-center gap-2 border border-slate-700 tracking-widest">Biblioteca</button>
          {/* BOTÓN MANUAL CORREGIDO AQUÍ */}
          <button onClick={() => { setEditingPrinterId(null); setPrinterForm({name:'', brand:'', watts:'', costPerHour:'', initialPrice:'', lifespan:5000}); setIsPrinterFormOpen(true); }} 
            className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase italic shadow-lg tracking-widest">Manual</button>
        </div>
      </header>

      {/* Modal Impresora Manual / Edición */}
      {isPrinterFormOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-[#020617]/95 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#0f172a] border border-slate-800 p-12 rounded-[3.5rem] shadow-2xl w-full max-w-6xl relative animate-in zoom-in-95">
            <button onClick={() => setIsPrinterFormOpen(false)} className="absolute top-10 right-10 text-slate-500 hover:text-white transition-colors"><X size={28}/></button>
            <h3 className="text-2xl font-black italic mb-12 text-white flex items-center gap-3 uppercase">{editingPrinterId ? 'Editar Máquina' : 'Nueva Configuración'}</h3>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-10 items-center justify-items-stretch">
              <div className="space-y-8 h-full flex flex-col justify-center">
                <InputGroup label="Modelo" type="text" placeholder="Ej: Ender 3 v2" value={printerForm.name} onChange={v => setPrinterForm({...printerForm, name: v})} />
                <InputGroup label="Marca" type="text" placeholder="Ej: Creality" value={printerForm.brand} onChange={v => setPrinterForm({...printerForm, brand: v})} />
              </div>
              <div className="space-y-8 h-full flex flex-col justify-center">
                <InputGroup label="Consumo (Vatios)" icon={Zap} suffix="W" value={printerForm.watts} onChange={v => setPrinterForm({...printerForm, watts: v})} />
                <InputGroup label="Vida Útil Est." icon={Clock} suffix="h" value={printerForm.lifespan} onChange={v => setPrinterForm({...printerForm, lifespan: v})} />
              </div>
              <div className="space-y-8 h-full flex flex-col justify-center">
                <InputGroup label="Mantenimiento" suffix="€/h" placeholder="Recambios" value={printerForm.costPerHour} onChange={v => setPrinterForm({...printerForm, costPerHour: v})} />
                <InputGroup label="Precio Compra" suffix="€" placeholder="Para amortización" value={printerForm.initialPrice} onChange={v => setPrinterForm({...printerForm, initialPrice: v})} />
              </div>
              <div className="bg-[#020617]/50 border border-slate-800 h-full p-8 rounded-[3rem] flex flex-col justify-center text-center shadow-inner h-full">
                <p className="text-[10px] font-black text-blue-400 uppercase mb-2">Coste de Máquina</p>
                <p className="text-5xl font-black text-white italic">{(parseFloat(printerForm.costPerHour||0) + (printerForm.initialPrice?parseFloat(printerForm.initialPrice)/parseFloat(printerForm.lifespan):0)).toFixed(2)}€<span className="text-xs ml-1">/h</span></p>
              </div>
            </div>
            <button onClick={handleSavePrinter} className="w-full mt-12 bg-blue-600 hover:bg-blue-500 text-white font-black py-6 rounded-3xl uppercase italic shadow-xl transition-all">Confirmar Máquina</button>
          </div>
        </div>
      )}

      {/* Modal Biblioteca */}
      {isLibraryOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-[#020617]/95 backdrop-blur-md">
          <div className="bg-[#0f172a] border border-slate-800 rounded-[3.5rem] shadow-2xl w-full max-w-5xl h-[80vh] flex flex-col overflow-hidden relative animate-in zoom-in-95">
            <button onClick={() => setIsLibraryOpen(false)} className="absolute top-8 right-8 text-slate-500 hover:text-white z-10"><X size={24}/></button>
            <div className="p-10 border-b border-slate-800"><h3 className="text-2xl font-black italic text-white uppercase mb-6 flex items-center gap-3">Biblioteca de Hardware</h3><div className="relative"><Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={18} /><input type="text" placeholder="Ender, P1S, MK4..." className="w-full bg-[#020617] border border-slate-800 rounded-2xl py-4 pl-14 text-white font-bold outline-none shadow-inner" onChange={(e) => setSearchTerm(e.target.value)} /></div></div>
            <div className="flex flex-1 overflow-hidden">
              <div className="w-64 border-r border-slate-800 overflow-y-auto p-4 space-y-2 bg-[#020617]/30">{PRINTER_LIBRARY.map(lib => ( <button key={lib.brand} onClick={() => setSelectedBrand(lib.brand)} className={`w-full text-left px-5 py-3 rounded-xl font-bold text-sm transition-all ${selectedBrand === lib.brand ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}>{lib.brand}</button> ))}</div>
              <div className="flex-1 overflow-y-auto p-10 bg-[#0f172a] grid grid-cols-1 md:grid-cols-2 gap-4 h-fit content-start">
                {PRINTER_LIBRARY.filter(lib => !selectedBrand || lib.brand === selectedBrand).flatMap(lib => lib.models.map(m => ({...m, brand: lib.brand}))).filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase())).map(m => (
                  <button key={m.name} onClick={() => addFromLibrary(m, m.brand)} className="p-6 bg-[#020617] border border-slate-800 rounded-[2rem] text-left hover:border-blue-600 transition-all group flex justify-between items-center"><div><p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{m.brand}</p><h4 className="text-lg font-black text-white italic">{m.name}</h4><p className="text-xs text-slate-500 font-bold mt-1">{m.watts}W</p></div><Plus className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" size={20}/></button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {data.customPrinters.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-40 border-2 border-dashed border-slate-800 rounded-[4rem] bg-slate-900/10 opacity-60"><Cpu size={64} className="text-slate-700 mb-6" /><h4 className="text-lg font-black uppercase italic text-slate-500 tracking-widest">El taller está vacío</h4><p className="text-slate-700 text-xs font-bold mt-2 uppercase text-center max-w-sm">Configura tus máquinas para calcular costes de energía y mantenimiento precisos</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {data.customPrinters.map(p => (
            <div key={p.id} className="bg-[#0f172a]/50 border border-slate-800 rounded-[2.5rem] p-8 group hover:border-blue-500/30 transition-all shadow-xl">
              <div className="flex justify-between items-start mb-4"><div><p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{p.brand}</p><h4 className="font-black text-white uppercase italic text-sm">{p.name}</h4></div><div className="flex gap-4"><button onClick={() => { setEditingPrinterId(p.id); setPrinterForm(p); setIsPrinterFormOpen(true); }} className="text-slate-600 hover:text-amber-500"><Edit3 size={16}/></button><button onClick={() => deletePrinter(p.id)} className="text-slate-600 hover:text-red-500"><Trash2 size={16}/></button></div></div>
              <p className="text-3xl font-black text-white italic tracking-tighter mb-6">{p.watts}W <span className="text-xs text-slate-500 not-italic uppercase ml-2">Mant: {p.maintenanceTotal}€/h</span></p>
              <button onClick={() => { updateData({ printerWattage: parseFloat(p.watts), maintenance: parseFloat(p.maintenanceTotal), activeTab: 'calculator' }) }} className="w-full bg-blue-600/10 text-blue-400 py-4 rounded-2xl font-black text-xs uppercase hover:bg-blue-600 transition-all italic">Usar Máquina</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // --- RENDER MATERIALES ---
  const renderMaterials = () => (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 relative">
      <header className="flex justify-between items-center mb-8">
        <h3 className="text-xl font-black italic text-white flex items-center gap-3 uppercase tracking-tighter"><Database className="text-emerald-500" /> Inventario</h3>
        {/* BOTÓN AÑADIR MATERIAL SIN EL ICONO "+" */}
        <button onClick={() => { setEditingMatId(null); setMatForm({name:'', brand:'', type:'PLA', color:'#000000', spoolWeight:1000, spoolPrice:'', description:''}); setIsMatFormOpen(true); }} 
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-10 py-3.5 rounded-2xl font-black text-xs uppercase italic transition-all shadow-lg shadow-emerald-900/40">
          Añadir Material
        </button>
      </header>

      {isMatFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#020617]/95 backdrop-blur-md">
          <div className="bg-[#0f172a] border border-slate-800 p-12 rounded-[3.5rem] shadow-2xl w-full max-w-6xl relative animate-in zoom-in-95">
            <button onClick={() => setIsMatFormOpen(false)} className="absolute top-10 right-10 text-slate-500 hover:text-white transition-colors"><X size={28}/></button>
            <h3 className="text-2xl font-black italic mb-12 text-white flex items-center gap-3 uppercase">{editingMatId ? 'Editar Filamento' : 'Nuevo Material'}</h3>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-10 items-center justify-items-stretch">
              <div className="space-y-8 h-full flex flex-col justify-center">
                <InputGroup label="Nombre" type="text" placeholder="Ej: PLA Seda" value={matForm.name} onChange={v => setMatForm({...matForm, name: v})} />
                <InputGroup label="Marca" type="text" placeholder="Ej: Sunlu" value={matForm.brand} onChange={v => setMatForm({...matForm, brand: v})} />
              </div>
              <div className="space-y-8 h-full flex flex-col justify-center relative" ref={colorPickerRef}>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 block mb-2 tracking-widest">Color</label>
                  <button onClick={() => setShowColorPicker(!showColorPicker)} className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl px-5 py-4 flex items-center justify-between hover:bg-slate-800 shadow-inner">
                    <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: matForm.color }}></div><span className="text-xs font-black text-white uppercase">{COLOR_PRESETS.find(c => c.hex === matForm.color.toLowerCase())?.name || 'MANUAL'}</span></div>
                    <ChevronDown size={14} className={`text-slate-500 transition-transform ${showColorPicker ? 'rotate-180' : ''}`} />
                  </button>
                  {showColorPicker && (
                    <div className="absolute z-[60] top-[75px] w-full bg-[#1e293b] border border-slate-700 rounded-2xl p-4 shadow-2xl animate-in zoom-in-95">
                      <div className="grid grid-cols-8 gap-2 mb-4">
                        {COLOR_PRESETS.map(c => ( <button key={c.hex} onClick={() => { setMatForm({...matForm, color: c.hex}); setShowColorPicker(false); }} className={`w-5 h-5 rounded-full border transition-all hover:scale-125 ${matForm.color === c.hex ? 'border-white ring-2 ring-blue-500/50' : 'border-white/10'}`} style={{ backgroundColor: c.hex }} /> ))}
                      </div>
                      <input type="color" className="w-full h-8 bg-transparent cursor-pointer" value={matForm.color} onChange={e => setMatForm({...matForm, color: e.target.value})} />
                    </div>
                  )}
                </div>
                <div className="space-y-2"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 block mb-2 tracking-widest">Tipo</label><select className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl px-5 py-4 text-xs font-black text-white uppercase shadow-inner" value={matForm.type} onChange={e => setMatForm({...matForm, type: e.target.value})}><option>PLA</option><option>PETG</option><option>ABS</option><option>TPU</option></select></div>
              </div>
              <div className="space-y-8 h-full flex flex-col justify-center"><InputGroup label="Peso (g)" suffix="g" value={matForm.spoolWeight} onChange={v => setMatForm({...matForm, spoolWeight: v})} /><InputGroup label="Precio (€)" suffix="€" value={matForm.spoolPrice} onChange={v => setMatForm({...matForm, spoolPrice: v})} /></div>
              <div className="bg-[#020617]/50 border border-slate-800 h-full p-8 rounded-[3rem] text-center shadow-inner flex flex-col justify-center h-full">
                <p className="text-[10px] font-black text-emerald-500 uppercase mb-2">Coste Real por Kilo</p>
                <p className="text-5xl font-black text-white italic tracking-tighter">{((matForm.spoolPrice / matForm.spoolWeight)*1000 || 0).toFixed(2)}€<span className="text-xs ml-1">/kg</span></p>
              </div>
            </div>
            <button onClick={handleSaveMaterial} className="w-full mt-12 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-6 rounded-3xl uppercase italic shadow-xl transition-all">Guardar en Biblioteca</button>
          </div>
        </div>
      )}

      {data.materials.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-40 border-2 border-dashed border-slate-800 rounded-[4rem] bg-slate-900/10 opacity-60"><Package size={64} className="text-slate-700 mb-6" /><h4 className="text-lg font-black uppercase italic text-slate-500 tracking-widest">El armario está vacío</h4><p className="text-slate-700 text-xs font-bold mt-2 uppercase">Añade tu primer filamento para empezar a calcular presupuestos</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {data.materials.map(m => (
            <div key={m.id} className="bg-[#0f172a]/50 border border-slate-800 rounded-[2.5rem] overflow-hidden group hover:border-emerald-600/30 transition-all shadow-xl">
              <div className="h-2" style={{ backgroundColor: m.color }}></div>
              <div className="p-8">
                <div className="flex justify-between items-start mb-4"><h4 className="font-black text-white uppercase italic text-sm tracking-tight">{m.name}</h4><div className="flex gap-4"><button onClick={() => { setEditingMatId(m.id); setMatForm(m); setIsMatFormOpen(true); }} className="text-slate-600 hover:text-amber-500"><Edit3 size={16}/></button><button onClick={() => deleteMaterial(m.id)} className="text-slate-600 hover:text-red-500"><Trash2 size={16}/></button></div></div>
                <p className="text-3xl font-black text-white italic tracking-tighter mb-6">{m.pricePerKg}€/kg</p>
                <button onClick={() => { updateData({ pricePerKg: parseFloat(m.pricePerKg), activeTab: 'calculator' }) }} className="w-full bg-emerald-600/10 text-emerald-400 py-4 rounded-2xl font-black text-xs uppercase hover:bg-emerald-600 transition-all">Cargar en Calculadora</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#020617] text-slate-50 font-sans">
      <aside className="w-64 bg-[#0f172a]/50 border-r border-slate-800 p-8 flex flex-col">
        <div className="flex items-center gap-3 mb-14"><div className="bg-blue-600 p-2.5 rounded-xl shadow-lg"><Calculator size={26} className="text-white" /></div><h1 className="text-xl font-black tracking-tight italic uppercase">3DPrice Pro</h1></div>
        <nav className="space-y-4 flex-1 font-black text-[10px] tracking-widest">
          <button onClick={() => updateData({ activeTab: 'calculator' })} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all ${data.activeTab === 'calculator' ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20 shadow-lg' : 'hover:bg-slate-800/50 text-slate-500'}`}><Calculator size={18} /> CALCULADORA</button>
          <button onClick={() => updateData({ activeTab: 'materials' })} className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl transition-all ${data.activeTab === 'materials' ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-600/20 shadow-lg' : 'hover:bg-slate-800/50 text-slate-500'}`}><div className="flex items-center gap-4"><Package size={18} /> MATERIALES</div></button>
          <button onClick={() => updateData({ activeTab: 'printers' })} className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl transition-all ${data.activeTab === 'printers' ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20 shadow-lg' : 'hover:bg-slate-800/50 text-slate-500'}`}><div className="flex items-center gap-4"><Cpu size={18} /> IMPRESORAS</div></button>
          <button onClick={() => updateData({ activeTab: 'projects' })} className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl transition-all ${data.activeTab === 'projects' ? 'bg-purple-600/10 text-purple-400 border border-purple-600/20 shadow-lg' : 'hover:bg-slate-800/50 text-slate-500'}`}><div className="flex items-center gap-4"><Layers size={18} /> PROYECTOS</div></button>
        </nav>
      </aside>

      <main className="flex-1 p-14 overflow-y-auto">
        <header className="mb-16 flex justify-between items-center">
          <h2 className="text-6xl font-black italic tracking-tighter uppercase text-white drop-shadow-sm">{data.activeTab === 'calculator' ? 'Calculator' : data.activeTab === 'materials' ? 'Materiales' : data.activeTab === 'printers' ? 'Taller' : 'Proyectos'}</h2>
          <div className="flex bg-[#0f172a] p-1.5 rounded-2xl border border-slate-800 shadow-inner">
            <button onClick={() => updateData({ isPremiumMode: false })} className={`px-10 py-3 rounded-xl text-xs font-black transition-all ${!data.isPremiumMode ? 'bg-slate-800 text-blue-400 shadow-md' : 'text-slate-500'}`}>BÁSICO</button>
            <button onClick={() => updateData({ isPremiumMode: true })} className={`px-10 py-3 rounded-xl text-xs font-black flex items-center gap-2 transition-all ${data.isPremiumMode ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-slate-500'}`}><Star size={14} fill={data.isPremiumMode ? "white" : "none"} /> PREMIUM</button>
          </div>
        </header>

        {data.activeTab === 'calculator' ? (
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-12 animate-in fade-in">
            <div className="bg-[#0f172a]/40 border border-slate-800 p-8 rounded-[3.5rem] space-y-8 h-fit">
              <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.25em] border-b border-slate-800 pb-4 italic">Hardware</h3>
              <div className="p-4 bg-slate-900/50 rounded-2xl border border-slate-800"><p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Máquina Activa</p><div className="flex justify-between items-center"><span className="text-white font-black italic">{data.printerWattage}W</span><span className="text-blue-400 font-bold text-xs">{data.maintenance}€/h</span></div></div>
              <div className="grid grid-cols-2 gap-4"><InputGroup label="Horas" value={data.timeHours} onChange={v => updateData({ timeHours: parseFloat(v)||0 })} /><InputGroup label="Mins" value={data.timeMinutes} onChange={v => updateData({ timeMinutes: parseFloat(v)||0 })} /></div>
              <InputGroup label="Peso Pieza" icon={Weight} suffix="g" value={data.weight} onChange={v => updateData({ weight: parseFloat(v)||0 })} />
            </div>
            <div className="bg-[#0f172a]/40 border border-slate-800 p-8 rounded-[3.5rem] space-y-8 h-fit">
              <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.25em] border-b border-slate-800 pb-4 italic">Costes</h3>
              <InputGroup label="Filamento" icon={Package} suffix="€/kg" value={data.pricePerKg} onChange={v => updateData({ pricePerKg: parseFloat(v)||0 })} />
              <InputGroup label="Energía" icon={Euro} suffix="€/kWh" value={data.energyPrice} onChange={v => updateData({ energyPrice: parseFloat(v)||0 })} />
              <div className="pt-6 border-t border-slate-800"><input type="range" min="0" max="300" value={data.profitMargin} onChange={e => updateData({ profitMargin: parseInt(e.target.value) })} className="w-full h-2 bg-slate-800 rounded-lg appearance-none accent-blue-600" /><p className="text-[10px] text-slate-500 mt-4 font-black text-center uppercase tracking-widest italic">Margen: {data.profitMargin}%</p></div>
            </div>
            <div className={`bg-[#0f172a]/40 border border-slate-800 p-8 rounded-[3.5rem] space-y-8 h-fit ${!data.isPremiumMode && 'opacity-20 grayscale pointer-events-none'}`}>
              <h3 className="text-[10px] font-black text-purple-500 uppercase tracking-[0.25em] border-b border-slate-800 pb-4 flex justify-between italic">Business Pro <Star size={12}/></h3>
              <InputGroup label="Cantidad" icon={Layers} suffix="uds" value={data.quantity} iconColor="text-purple-500" onChange={v => updateData({ quantity: parseInt(v)||1 })} />
              <InputGroup label="Mano de Obra" icon={UserCheck} suffix="€/h" value={data.hourlyRate} iconColor="text-purple-500" onChange={v => updateData({ hourlyRate: parseFloat(v)||0 })} />
              <InputGroup label="Fallo" icon={RotateCcw} suffix="%" value={data.failRate} iconColor="text-purple-500" onChange={v => updateData({ failRate: parseFloat(v)||0 })} />
            </div>
            <div className="space-y-12">
              <div className={`p-12 rounded-[4.5rem] shadow-2xl transition-all duration-700 ${data.isPremiumMode ? 'bg-gradient-to-br from-indigo-600 to-blue-700 shadow-blue-900/40 border border-white/10' : 'bg-[#0f172a] border border-slate-800'}`}>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mb-3">PVP Sugerido</p>
                <h2 className="text-7xl font-black tracking-tighter italic mb-12 drop-shadow-2xl">{finalPrice.toFixed(2)}€</h2>
                <div className="space-y-4 text-[11px] border-t border-white/10 pt-10 font-medium">
                  <div className="flex justify-between"><span>Producción</span><span>{(costMaterial + costEnergy + costMaintenance).toFixed(2)}€</span></div>
                  <div className="flex justify-between border-t border-white/10 pt-4 text-[15px] font-black italic tracking-tight uppercase"><span>Coste Neto</span><span>{totalCost.toFixed(2)}€</span></div>
                </div>
              </div>
            </div>
          </div>
        ) : data.activeTab === 'materials' ? renderMaterials() : data.activeTab === 'printers' ? renderPrinters() : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 animate-in slide-in-from-bottom-5 duration-500 pb-20">
            {data.savedProjects.map(p => (
              <div key={p.id} className="bg-[#0f172a]/60 p-12 rounded-[4rem] border border-slate-800 group hover:border-purple-500/50 transition-all shadow-2xl">
                <h4 className="font-black italic text-white uppercase text-[10px] tracking-widest opacity-60">{p.name}</h4>
                <p className="text-5xl font-black text-purple-400 my-5 tracking-tighter italic drop-shadow-md">{p.price}€</p>
                <div className="flex justify-between items-center mt-10 border-t border-slate-800 pt-8">
                  <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{p.date}</span>
                  <button onClick={() => deleteProject(p.id)} className="text-slate-700 hover:text-red-500 hover:scale-125 transition-all"><Trash2 size={18}/></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}