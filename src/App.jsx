import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Weight, Clock, Layers, ArrowLeft, Upload, 
  FileCode, RefreshCw, Edit3, ScanFace, Component, CheckCircle, FileText, Trash2, RotateCcw, Printer, Zap, DollarSign, ChevronRight, ChevronDown, ChevronUp, Save, Search, X, CheckSquare, Square, Download, Palette, Layout, User, Globe, Mail, Phone, MapPin, Plus, FilePlus, Box, Calculator, Archive, BookOpen, Settings, Library
} from 'lucide-react';
import { jsPDF } from "jspdf";
import { useCalculatorStore } from './store/useCalculatorStore';

const PRINTER_LIBRARY = [
    { brand: 'Bambu Lab', model: 'X1-Carbon', watts: 350, maint: 0.15 },
    { brand: 'Bambu Lab', model: 'P1S / P1P', watts: 300, maint: 0.10 },
    { brand: 'Bambu Lab', model: 'A1 / A1 Mini', watts: 150, maint: 0.05 },
    { brand: 'Creality', model: 'Ender 3 V2/V3', watts: 350, maint: 0.05 },
    { brand: 'Prusa', model: 'MK4 / MK3S+', watts: 280, maint: 0.10 },
    { brand: 'Anycubic', model: 'Kobra 2', watts: 300, maint: 0.08 },
];

const COLORS = [
    { name: 'Azul', hex: '#3b82f6' }, { name: 'Esmeralda', hex: '#10b981' }, 
    { name: 'Violeta', hex: '#8b5cf6' }, { name: 'Rojo', hex: '#ef4444' }, 
    { name: 'Negro', hex: '#171717' }
];

const parseGCode = (text, filename) => {
  const meta = { timeHours: 0, timeMinutes: 0, originalTimeHours: 0, originalTimeMinutes: 0, totalWeight: 0, layerHeight: 0, layerCount: 0, slicer: 'Desconocido', filaments: [] };
  const lines = text.split(/\r?\n/);
  let tempWeights = [], tempColors = [], tempTypes = [], activeSlots = []; 
  for (const line of lines) {
    const l = line.trim(); if(!l) continue;
    if (l.includes('total estimated time')) { const tMatch = l.match(/(\d+)h\s*(\d+)m/); if (tMatch) { meta.timeHours = parseInt(tMatch[1]); meta.timeMinutes = parseInt(tMatch[2]); meta.slicer = 'Bambu/Prusa'; } } 
    else if (meta.timeHours === 0 && l.includes('model printing time')) { const tMatch = l.match(/(\d+)h\s*(\d+)m/); if (tMatch) { meta.timeHours = parseInt(tMatch[1]); meta.timeMinutes = parseInt(tMatch[2]); meta.slicer = 'Bambu/Prusa'; } }
    if (l.startsWith(';TIME:')) { const s = parseInt(l.split(':')[1]); if (!isNaN(s)) { meta.timeHours = Math.floor(s/3600); meta.timeMinutes = Math.floor((s%3600)/60); meta.slicer = 'Cura'; } }
    if (l.includes('total filament used [g]') || l.includes('total filament weight [g]')) { const valStr = l.split(/[:=]/)[1]; if (valStr) { tempWeights = valStr.split(/[,;]/).map(v => parseFloat(v.replace(/[^\d.]/g, ''))).filter(n => !isNaN(n)); if (tempWeights.length > 0) meta.totalWeight = tempWeights.reduce((a,b)=>a+b, 0); } }
    if (l.match(/filament_colou?r/i)) { const colors = l.match(/#[0-9a-fA-F]{6}/g); if (colors) tempColors = colors; }
    if (l.includes('filament_type')) { const valStr = l.split(/[:=]/)[1]; if (valStr) tempTypes = valStr.split(/[,;]/).map(t => t.trim().replace(/['"]/g, '')); }
    if (l.match(/^; filament(_id)?\s*[:=]/)) { const valStr = l.split(/[:=]/)[1]; if (valStr) activeSlots = valStr.split(/[,;]/).map(v => parseInt(v.trim())).filter(n => !isNaN(n)); }
    if (l.includes('layer_height') && !l.includes('min') && !l.includes('max')) { const val = parseFloat(l.split(/[:=]/)[1]); if (!isNaN(val)) meta.layerHeight = val; }
    if (l.includes('total layer number')) { const val = parseInt(l.split(/[:=]/)[1]); if (!isNaN(val)) meta.layerCount = val; }
  }
  if (tempWeights.length > 0) {
      meta.filaments = tempWeights.map((weight, i) => {
          const slotReal = (activeSlots.length > i) ? activeSlots[i] : (i + 1);
          const colorIndex = Math.max(0, slotReal - 1);
          return { id: i, slot: slotReal, weight: weight, color: tempColors[colorIndex] || tempColors[0] || '#FFFFFF', type: tempTypes[colorIndex] || tempTypes[0] || 'PLA' };
      });
  } else if (meta.totalWeight > 0) { meta.filaments = [{ id: 0, slot: 1, weight: meta.totalWeight, color: tempColors[0] || '#FFFFFF', type: 'Generico' }]; }
  if (meta.timeHours === 0 && meta.timeMinutes === 0) { const nameMatch = filename.match(/(\d+)h(\d+)m/i); if (nameMatch) { meta.timeHours = parseInt(nameMatch[1]); meta.timeMinutes = parseInt(nameMatch[2]); meta.slicer = 'Archivo'; } }
  meta.originalTimeHours = meta.timeHours; meta.originalTimeMinutes = meta.timeMinutes;
  return meta;
};

const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [0, 0, 0];
};

// --- COMPONENTS UI ---
const FileInfoCard = ({ slicer, layerHeight, layerCount }) => (
    <div className="bg-[#0f172a] border border-slate-800 p-5 rounded-[2rem] h-full flex flex-col justify-between relative overflow-hidden group hover:border-slate-600 transition-all shadow-lg">
        <div className="absolute top-0 right-0 p-6 transition-opacity pointer-events-none opacity-5 group-hover:opacity-10"><FileCode size={100} /></div>
        <div><div className="flex items-center gap-2 mb-3"><div className="p-2 text-blue-400 rounded-lg bg-blue-900/30"><Printer size={16} /></div><span className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">Ficha Técnica</span></div><h3 className="text-lg font-bold text-white mb-0.5 truncate">{slicer}</h3><p className="text-[10px] text-slate-500 font-medium">Laminador Detectado</p></div>
        <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-slate-900/50 p-2 rounded-xl border border-slate-800 flex flex-col items-center justify-center min-h-[70px]"><p className="text-[9px] text-slate-500 uppercase font-bold mb-1 tracking-widest">Altura</p><div className="flex items-baseline"><p className="font-mono text-2xl font-bold text-white">{(layerHeight || 0).toFixed(2)}</p><span className="text-[10px] ml-0.5 text-slate-600 font-bold">mm</span></div></div>
            <div className="bg-slate-900/50 p-2 rounded-xl border border-slate-800 flex flex-col items-center justify-center min-h-[70px]"><p className="text-[9px] text-slate-500 uppercase font-bold mb-1 tracking-widest">Capas</p><div className="flex items-baseline"><p className="font-mono text-2xl font-bold text-white">{layerCount > 0 ? layerCount : '-'}</p></div></div>
        </div>
    </div>
);
const TimeCard = ({ h, m, originalH, originalM, onUpdate, onReset }) => (
    <div className="bg-[#0f172a] border border-slate-800 p-4 rounded-[2rem] flex flex-col justify-center relative group hover:border-slate-600 h-full shadow-lg">
        <div className="flex items-center justify-between mb-3"><div className="flex items-center gap-2"><div className="bg-slate-900 p-1.5 rounded-lg text-blue-500"><Clock size={16} /></div><p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Tiempo</p></div>{(h!==originalH || m!==originalM) && (<button onClick={onReset} className="transition-colors text-emerald-500 hover:text-white" title="Restaurar"><RotateCcw size={12} /></button>)}</div>
        <div className="flex items-baseline justify-center gap-1"><div className="flex items-baseline"><input type="number" value={h} onChange={(e) => onUpdate('timeHours', parseInt(e.target.value) || 0)} className="w-12 p-0 font-mono text-2xl font-bold text-center text-white transition-colors bg-transparent border-b border-dashed outline-none border-slate-700 focus:border-blue-500"/><span className="text-[10px] font-bold text-slate-500 ml-1">h</span></div><span className="mx-1 text-lg font-bold text-slate-600">:</span><div className="flex items-baseline"><input type="number" value={m} onChange={(e) => onUpdate('timeMinutes', parseInt(e.target.value) || 0)} className="w-12 p-0 font-mono text-2xl font-bold text-center text-white transition-colors bg-transparent border-b border-dashed outline-none border-slate-700 focus:border-blue-500"/><span className="text-[10px] font-bold text-slate-500 ml-1">m</span></div></div>
    </div>
);
const WeightCard = ({ value, onUpdate }) => (
    <div className="bg-[#0f172a] border border-slate-800 p-4 rounded-[2rem] flex flex-col justify-center relative group hover:border-slate-600 h-full shadow-lg">
        <div className="flex items-center gap-2 mb-3"><div className="bg-slate-900 p-1.5 rounded-lg text-slate-400 shrink-0"><Weight size={16} /></div><p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Peso</p></div>
        <div className="flex items-baseline justify-center gap-1"><input type="number" value={value} onChange={(e) => onUpdate('totalWeight', parseFloat(e.target.value) || 0)} className="w-24 p-0 font-mono text-2xl font-bold text-center text-white transition-colors bg-transparent border-b border-dashed outline-none border-slate-700 focus:border-blue-500"/><span className="text-[10px] font-bold text-slate-500">g</span></div>
    </div>
);
const FilamentRow = ({ fil }) => (
  <div className="flex items-center justify-between p-3 transition-colors border bg-slate-900/50 border-slate-800/50 rounded-xl hover:bg-slate-900">
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg border border-slate-700 shadow-sm flex items-center justify-center bg-[#020617] relative overflow-hidden group/color"><div className="w-full h-full" style={{backgroundColor: fil.color}}></div><div className="absolute inset-0 border rounded-lg pointer-events-none border-white/10"></div></div>
      <div><p className="mb-1 text-xs font-bold leading-none text-white">Slot {fil.slot} <span className="font-normal text-slate-500">- {fil.type}</span></p><p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">{fil.color}</p></div>
    </div>
    <div className="text-right"><p className="font-mono text-sm font-bold leading-none text-white">{(fil.weight || 0).toFixed(1)}<span className="text-xs text-slate-500 ml-0.5">g</span></p></div>
  </div>
);
const ConfigSection = ({ title, icon: Icon, children }) => (
    <div className="bg-[#0f172a] border border-slate-800 rounded-[2rem] p-6 shadow-xl mb-6 animate-in slide-in-from-bottom-4 fade-in duration-500">
        <h3 className="flex items-center gap-2 mb-6 text-xs font-black tracking-widest uppercase text-slate-400"><Icon size={16} className="text-blue-500"/> {title}</h3>
        {children}
    </div>
);
const UniformInput = ({ label, value, onChange, unit, type="text", placeholder }) => (
    <div className="flex items-center justify-between p-3 border bg-slate-900/50 border-slate-800 rounded-xl h-14">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate mr-2">{label}</span>
        <div className="flex items-center gap-1 bg-slate-950/50 px-3 py-1.5 rounded-lg border border-slate-800/50 focus-within:border-blue-500/50 transition-colors">
            <input type={type} value={value} onChange={e => onChange(e.target.value)} className="w-full font-mono text-sm font-bold text-right text-white bg-transparent outline-none" placeholder={placeholder || "0.00"} />
            {unit && <span className="text-[10px] font-bold text-slate-500 w-6 text-right">{unit}</span>}
        </div>
    </div>
);

// --- PREVIEW ---
const InvoicePreview = ({ data, calculationData }) => {
    const { profile } = data;
    const { totalMaterialCost, energyCost, maintCost, laborCost, subtotal, failCost, marginCost, ivaCost, finalPrice, filamentsSummary, printer, totalHours } = calculationData;
    const brandColor = profile.brandColor || '#3b82f6';
    const stableRef = useMemo(() => {
        const str = data.analyzedFiles.map(f=>f.name).join(""); let hash = 0; for (let i = 0; i < str.length; i++) hash = (hash << 5) - hash + str.charCodeAt(i);
        return "REF-" + Math.abs(hash).toString().slice(0, 6);
    }, [data.analyzedFiles]);

    // RENDER COMÚN
    const renderRows = () => (
        <>
            {filamentsSummary.map((fil, i) => (
                <tr key={i}><td className="p-3 border-b">Material Slot {fil.slot} ({fil.totalWeight.toFixed(1)}g)</td><td className="p-3 font-mono text-right border-b">{fil.cost.toFixed(2)}€</td></tr>
            ))}
            <tr><td className="p-3 border-b">Energía y Mantenimiento</td><td className="p-3 font-mono text-right border-b">{calculationData.opsCost.toFixed(2)}€</td></tr>
            <tr><td className="p-3 border-b">Mano de Obra</td><td className="p-3 font-mono text-right border-b">{parseFloat(data.laborCost).toFixed(2)}€</td></tr>
        </>
    );

    if (profile.template === 'modern') {
        return (
            <div className="w-[210mm] h-[297mm] bg-white text-slate-900 font-sans flex shadow-2xl overflow-hidden text-[12px] leading-tight select-none">
                <div className="w-[70mm] p-8 text-white flex flex-col" style={{backgroundColor: brandColor}}>
                    {profile.logo ? <img src={profile.logo} className="object-contain w-24 h-24 p-2 mb-6 bg-white/10 rounded-xl" /> : <div className="flex items-center justify-center w-24 h-24 mb-6 font-bold bg-white/20 rounded-xl">LOGO</div>}
                    <h1 className="mb-2 text-2xl font-bold break-words">{profile.companyName || "Tu Empresa"}</h1>
                    <div className="mt-6 space-y-3 text-sm text-white/90">
                        {profile.email && <p className="flex items-center gap-2 break-all"><Mail size={14}/> {profile.email}</p>}
                        {profile.phone && <p className="flex items-center gap-2"><Phone size={14}/> {profile.phone}</p>}
                        {profile.website && <p className="flex items-center gap-2 break-all"><Globe size={14}/> {profile.website}</p>}
                        {profile.address && <p className="flex items-center gap-2 break-all"><MapPin size={14}/> {profile.address}</p>}
                    </div>
                </div>
                <div className="flex flex-col flex-1 p-10">
                    <div className="flex items-end justify-between pb-6 mb-8 border-b-2" style={{borderColor: brandColor}}>
                        <div><h2 className="text-4xl font-black text-slate-800">PRESUPUESTO</h2><p className="mt-1 font-bold text-slate-500">#{stableRef}</p></div>
                        <div className="text-right"><p className="text-sm font-bold text-slate-400">Fecha</p><p className="text-lg text-slate-800">{new Date().toLocaleDateString()}</p></div>
                    </div>
                    <div className="p-4 mb-8 bg-slate-50 rounded-xl">
                        <h3 className="mb-1 text-lg font-bold text-slate-700">Proyecto ({data.quantity} uds)</h3>
                        <p className="text-slate-500">{data.analyzedFiles.length} Archivos • {totalHours.toFixed(1)}h Impresión</p>
                    </div>
                    <table className="w-full mb-8 text-sm">
                        <thead className="font-bold bg-slate-100 text-slate-600"><tr><th className="p-3 text-left rounded-l-lg">Concepto</th><th className="p-3 text-right rounded-r-lg">Importe</th></tr></thead>
                        <tbody>{renderRows()}</tbody>
                    </table>
                    <div className="self-end w-64 mt-auto space-y-2 text-right">
                        <div className="flex justify-between text-slate-500"><span>Subtotal:</span><span>{subtotal.toFixed(2)}€</span></div>
                        {data.failRate > 0 && <div className="flex justify-between text-slate-500"><span>Tasa Fallo:</span><span>{failCost.toFixed(2)}€</span></div>}
                        <div className="flex justify-between text-slate-500"><span>Beneficio:</span><span>{marginCost.toFixed(2)}€</span></div>
                        {data.includeTax && <div className="flex justify-between text-slate-500"><span>IVA (21%):</span><span>{ivaCost.toFixed(2)}€</span></div>}
                        <div className="flex items-center justify-between pt-4 mt-2 text-3xl font-black border-t-2" style={{color: brandColor, borderColor: brandColor}}>
                            <span className="mr-4 text-sm font-bold opacity-50">TOTAL</span>{finalPrice.toFixed(2)}€
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (profile.template === 'minimal') {
        return (
            <div className="w-[210mm] h-[297mm] bg-white text-slate-900 font-sans p-12 shadow-2xl text-sm leading-tight select-none flex flex-col">
                <div className="flex items-start justify-between mb-12">
                    {profile.logo ? <img src={profile.logo} className="object-contain h-16" /> : <div className="w-16 h-16 rounded bg-slate-100"></div>}
                    <div className="text-right">
                        <h1 className="mb-2 text-4xl font-bold tracking-widest uppercase" style={{color: brandColor}}>PRESUPUESTO</h1>
                        <p className="text-lg font-bold">{profile.companyName}</p>
                        <p className="text-slate-500">{[profile.email, profile.phone, profile.website].filter(Boolean).join(" | ")}</p>
                        <p className="text-slate-500">{profile.address}</p>
                    </div>
                </div>
                <div className="flex items-center justify-between py-6 mb-8 border-t-2 border-b-2" style={{borderColor: brandColor}}>
                    <div><h2 className="text-2xl font-bold">Proyecto x{data.quantity}</h2><p className="mt-1 text-slate-500">Ref: #{stableRef}</p></div>
                    <div className="text-right"><p className="text-xs tracking-widest uppercase text-slate-400">Total Proyecto</p><p className="font-mono text-3xl font-black">{finalPrice.toFixed(2)}€</p></div>
                </div>
                <div className="flex-1 space-y-4">
                    <div className="flex justify-between py-4 text-lg border-b border-slate-100"><span>Coste Materiales</span><span className="font-mono">{calculationData.totalMaterialCost.toFixed(2)}€</span></div>
                    <div className="flex justify-between py-4 text-lg border-b border-slate-100"><span>Coste Operativo</span><span className="font-mono">{(calculationData.opsCost + parseFloat(data.laborCost)).toFixed(2)}€</span></div>
                    <div className="flex justify-between py-4 text-lg border-b border-slate-100 text-slate-400"><span>Margen y Garantía</span><span className="font-mono">{(failCost + marginCost).toFixed(2)}€</span></div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-[210mm] h-[297mm] bg-white text-slate-900 font-sans flex flex-col shadow-2xl text-sm leading-tight select-none origin-top">
            <div className="flex items-center justify-between w-full h-32 p-10 text-white" style={{backgroundColor: brandColor}}>
                {profile.logo ? <img src={profile.logo} className="object-contain h-20 p-2 bg-white/20 rounded-xl" /> : <div className="flex items-center justify-center w-20 h-20 font-bold bg-white/20 rounded-xl">LOGO</div>}
                <div className="text-right">
                    <h1 className="text-4xl font-bold">PRESUPUESTO</h1>
                    <p className="text-lg opacity-90">{profile.companyName}</p>
                    <p className="mt-1 text-xs opacity-70">{[profile.email, profile.phone, profile.website].filter(Boolean).join(" | ")}</p>
                    {profile.address && <p className="text-xs opacity-70">{profile.address}</p>}
                </div>
            </div>
            <div className="flex flex-col flex-1 p-12">
                <div className="mb-10">
                    <h2 className="mb-2 text-3xl font-bold text-slate-800">Proyecto Completo ({data.quantity} uds)</h2>
                    <div className="flex gap-6 text-lg text-slate-500">
                        <span className="flex items-center gap-2"><Printer size={18}/> {printer?.name}</span>
                        <span className="flex items-center gap-2"><FileText size={18}/> Ref: #{stableRef}</span>
                    </div>
                </div>
                <table className="w-full mb-10 text-base">
                    <thead className="border-b-2 text-slate-500" style={{borderColor: brandColor}}><tr><th className="p-4 text-left">Descripción</th><th className="p-4 text-right">Total</th></tr></thead>
                    <tbody>
                        <tr><td className="p-4 border-b border-slate-100">Materiales de Impresión</td><td className="p-4 font-mono text-right border-b border-slate-100">{totalMaterialCost.toFixed(2)}€</td></tr>
                        <tr><td className="p-4 border-b border-slate-100">Energía y Desgaste</td><td className="p-4 font-mono text-right border-b border-slate-100">{(energyCost + maintCost).toFixed(2)}€</td></tr>
                        <tr><td className="p-4 border-b border-slate-100">Servicio de Impresión (Mano de Obra)</td><td className="p-4 font-mono text-right border-b border-slate-100">{laborCost.toFixed(2)}€</td></tr>
                    </tbody>
                </table>
                <div className="self-end w-1/2 p-8 mt-auto bg-slate-50 rounded-2xl">
                    <div className="flex justify-between mb-2 text-lg text-slate-500"><span>Base Imponible</span><span>{(subtotal + failCost + marginCost).toFixed(2)}€</span></div>
                    {data.includeTax && <div className="flex justify-between mb-4 text-lg text-slate-500"><span>IVA (21%)</span><span>{ivaCost.toFixed(2)}€</span></div>}
                    <div className="flex justify-between pt-4 text-3xl font-black border-t border-slate-200" style={{color: brandColor}}><span>TOTAL</span><span>{finalPrice.toFixed(2)}€</span></div>
                </div>
            </div>
        </div>
    );
};

export default function App() {
  const { data, updateData, resetWizard, addPrinter, saveProject, deleteProject, setFilamentCost, updateProfile, addAnalyzedFile, removeAnalyzedFile, selectFile, addMaterial, deleteMaterial, loadProject, deletePrinter } = useCalculatorStore();
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedFileIndex, setExpandedFileIndex] = useState(null); 
  const [libraryDropdown, setLibraryDropdown] = useState(null); // { x, y, slot }
  
  const fileInputRef = useRef(null);
  const logoInputRef = useRef(null);
  const [showConfigModal, setShowConfigModal] = useState(null); 
  const [printerSearchTerm, setPrinterSearchTerm] = useState(""); 
  const [libraryTab, setLibraryTab] = useState("materials"); 
  
  const [newMatName, setNewMatName] = useState("");
  const [newMatPrice, setNewMatPrice] = useState("");
  const [newPrinterName, setNewPrinterName] = useState("");
  const [newPrinterWatts, setNewPrinterWatts] = useState("");
  const [newPrinterMaint, setNewPrinterMaint] = useState("");

  useEffect(() => { if (data.analyzedFile && data.analyzedFiles.length === 0) { addAnalyzedFile(data.analyzedFile); updateData({ analyzedFile: null }); } }, [data.analyzedFile]);
  useEffect(() => { if (data.customPrinters.length === 0) addPrinter({ id: 1, name: 'Impresora Genérica', watts: 250, maintenanceTotal: 0.10 }); }, []);

  const processFile = async (file) => {
    if (!file.name.match(/\.(gcode|bgcode|3mf|txt)$/i)) return alert("Archivo no válido.");
    setIsProcessing(true);
    try {
      const text = await file.text();
      const metadata = parseGCode(text, file.name);
      setTimeout(() => {
        addAnalyzedFile({ ...metadata, name: file.name.replace(/\.(gcode|bgcode|3mf|txt)$/i, '') });
        setIsProcessing(false);
      }, 500);
    } catch (e) { alert("Error leyendo archivo."); setIsProcessing(false); }
  };
  const handleDrop = (e) => { e.preventDefault(); setIsDragOver(false); if(e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]); };
  const updateFileStat = (key, val) => {
      const updatedFiles = [...data.analyzedFiles];
      updatedFiles[data.selectedFileIndex] = { ...updatedFiles[data.selectedFileIndex], [key]: val };
      updateData({ analyzedFiles: updatedFiles });
  };
  const restoreTime = () => {
      const f = data.analyzedFiles[data.selectedFileIndex];
      updateFileStat('timeHours', f.originalTimeHours); updateFileStat('timeMinutes', f.originalTimeMinutes);
  };
  
  const handleLogoUpload = (e) => {
      const file = e.target.files[0];
      if (file) { const reader = new FileReader(); reader.onloadend = () => { updateProfile({ logo: reader.result }); }; reader.readAsDataURL(file); }
  };

  const getCalculationData = (sourceData) => {
      const src = sourceData || data;
      if (src.analyzedFiles.length === 0) return null;
      let totalMaterialCost = 0; let totalHours = 0;
      const filamentsSummary = [];

      const slotWeights = {};
      src.analyzedFiles.forEach(file => {
          totalHours += (file.timeHours + file.timeMinutes/60);
          file.filaments.forEach(fil => {
              if(!slotWeights[fil.slot]) slotWeights[fil.slot] = 0;
              slotWeights[fil.slot] += fil.weight;
          });
      });

      Object.keys(slotWeights).forEach(slot => {
          const s = parseInt(slot);
          const weight = slotWeights[s];
          const costPerKg = parseFloat(src.filamentCosts[s]) || 20.00;
          const cost = (weight * costPerKg / 1000);
          totalMaterialCost += cost;
          filamentsSummary.push({ slot: s, totalWeight: weight, cost, costPerKg });
      });

      const qty = src.quantity || 1;
      const printer = data.customPrinters.find(p => p.id == src.selectedPrinterId) || data.customPrinters[0];
      const watts = printer?.watts || 250;
      
      const energyCost = ((watts * totalHours) / 1000) * src.energyPrice; 
      const maintCost = totalHours * (printer?.maintenanceTotal || 0.05);
      const laborCost = parseFloat(src.laborCost || 0);
      
      const finalMaterialCost = totalMaterialCost * qty;
      const finalOpsCost = (energyCost + maintCost) * qty;
      const subtotal = finalMaterialCost + finalOpsCost + laborCost; 
      
      const failCost = subtotal * ((src.failRate || 0)/100);
      const subtotalWithFail = subtotal + failCost;
      const marginCost = subtotalWithFail * ((src.profitMargin || 0)/100);
      const baseImponible = subtotalWithFail + marginCost;
      const ivaCost = src.includeTax ? (baseImponible * 0.21) : 0;
      const finalPrice = baseImponible + ivaCost;

      return { totalMaterialCost: finalMaterialCost, opsCost: finalOpsCost, energyCost: energyCost * qty, maintCost: maintCost * qty, laborCost, subtotal, failCost, marginCost, ivaCost, finalPrice, filamentsSummary, printer, totalHours: totalHours * qty };
  };

  const calculateTotal = () => { const d = getCalculationData(); return d ? d.finalPrice.toFixed(2) : "0.00"; };

  const saveToHistory = () => {
      const calc = getCalculationData();
      const project = { 
          id: Date.now(), 
          date: new Date().toLocaleDateString(), 
          snapshotPrice: calc.finalPrice.toFixed(2), 
          projectName: "Proyecto " + new Date().toLocaleDateString(),
          // SNAPSHOT COMPLETA
          analyzedFiles: data.analyzedFiles,
          quantity: data.quantity,
          filamentCosts: data.filamentCosts,
          laborCost: data.laborCost,
          energyPrice: data.energyPrice,
          profitMargin: data.profitMargin,
          failRate: data.failRate,
          includeTax: data.includeTax,
          selectedPrinterId: data.selectedPrinterId
      }; 
      saveProject(project); updateData({ activeTab: 'projects' }); resetWizard();
  };

  const downloadPDF = (projectSource) => {
      try {
          const doc = new jsPDF();
          const source = projectSource || data;
          const calc = getCalculationData(source); if(!calc) return;
          const { profile } = data; const brandColorHex = profile.brandColor || '#3b82f6'; const brandRgb = hexToRgb(brandColorHex); const template = profile.template || 'corporate';
          const { totalMaterialCost, opsCost, laborCost, subtotal, failCost, marginCost, ivaCost, finalPrice, filamentsSummary, printer, totalHours } = calc;
          
          const str = source.analyzedFiles.map(f=>f.name).join(""); let hash = 0; for (let i = 0; i < str.length; i++) hash = (hash << 5) - hash + str.charCodeAt(i);
          const stableRef = "REF-" + Math.abs(hash).toString().slice(0, 6);

          if (template === 'minimal') {
              if (profile.logo) try { doc.addImage(profile.logo, 'PNG', 15, 15, 25, 25, undefined, 'FAST'); } catch(e){}
              doc.setTextColor(...brandRgb); doc.setFontSize(24); doc.setFont("helvetica", "bold"); doc.text("PRESUPUESTO", 195, 25, { align: 'right' });
              doc.setTextColor(0); doc.setFontSize(14); doc.text(profile.companyName || "Empresa", 195, 35, { align: 'right' });
              doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.text([profile.email || "", profile.phone || "", profile.website || "", profile.address || ""].filter(Boolean), 195, 42, { align: 'right' });
              let y = 60; doc.setDrawColor(...brandRgb); doc.setLineWidth(0.5); doc.line(15, y-5, 195, y-5);
              doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.text(`Proyecto x${source.quantity}`, 15, y); y+=8;
              doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.text(`Impresora: ${printer?.name || 'Impresora'}`, 15, y); doc.text(`Ref: #${stableRef}`, 195, y, {align:'right'}); y+=15;
              doc.text("Coste Materiales", 15, y); doc.text(`${totalMaterialCost.toFixed(2)} €`, 195, y, {align:'right'}); y+=8;
              doc.text("Coste Operativo", 15, y); doc.text(`${(opsCost + laborCost).toFixed(2)} €`, 195, y, {align:'right'}); y+=8;
              doc.setTextColor(150); doc.text("Margen y Garantía", 15, y); doc.text(`${(failCost + marginCost).toFixed(2)} €`, 195, y, {align:'right'}); y+=15;
              doc.setDrawColor(...brandRgb); doc.line(15, y, 195, y); y+=10;
              doc.setTextColor(0); doc.setFont("helvetica", "bold"); doc.text("TOTAL", 15, y); 
              doc.setTextColor(...brandRgb); doc.setFontSize(16); doc.text(`${finalPrice.toFixed(2)} €`, 195, y, {align:'right'});

          } else if (template === 'modern') {
              doc.setFillColor(...brandRgb); doc.rect(0, 0, 70, 297, 'F');
              if (profile.logo) try { doc.addImage(profile.logo, 'PNG', 10, 15, 50, 50, undefined, 'FAST'); } catch(e){}
              
              doc.setTextColor(255,255,255); 
              let ySide = 80;
              doc.setFontSize(16); doc.setFont("helvetica", "bold"); 
              const splitTitle = doc.splitTextToSize(profile.companyName || "Empresa", 50);
              doc.text(splitTitle, 35, ySide, {align:'center'});
              ySide += (splitTitle.length * 7) + 5;

              doc.setFontSize(9); doc.setFont("helvetica", "normal"); 
              const contactLines = [profile.email, profile.phone, profile.website, profile.address].filter(Boolean);
              contactLines.forEach(line => {
                  const splitLine = doc.splitTextToSize(line, 50);
                  doc.text(splitLine, 35, ySide, {align:'center'});
                  ySide += (splitLine.length * 5) + 2;
              });
              
              let y = 30; doc.setTextColor(0); doc.setFontSize(24); doc.setFont("helvetica", "bold"); doc.text("PRESUPUESTO", 80, y); 
              doc.setFontSize(12); doc.setTextColor(100); doc.text(`#${stableRef}`, 195, y, {align:'right'}); y+=15;
              y = 60; doc.setTextColor(0); doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.text(`Proyecto x${source.quantity}`, 80, y); y+=8;
              doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.text(`${printer?.name || 'Impresora'} - ${totalHours.toFixed(1)}h`, 80, y); y+=15;
              doc.setFillColor(240,240,240); doc.rect(80, y, 115, 8, 'F'); doc.setFont("helvetica", "bold"); doc.text("CONCEPTO", 83, y+5); doc.text("IMPORTE", 192, y+5, {align:'right'}); y+=12;
              doc.setFont("helvetica", "normal");
              doc.text(`Materiales (${filamentsSummary.length})`, 83, y); doc.text(`${totalMaterialCost.toFixed(2)} €`, 192, y, {align:'right'}); y+=8;
              doc.text("Operaciones", 83, y); doc.text(`${(opsCost+laborCost).toFixed(2)} €`, 192, y, {align:'right'}); y+=8;
              doc.setDrawColor(200); doc.line(80, y, 195, y); y+=8;
              doc.text("Subtotal", 140, y); doc.text(`${subtotal.toFixed(2)} €`, 192, y, {align:'right'}); y+=6;
              doc.text("Beneficio", 140, y); doc.text(`${marginCost.toFixed(2)} €`, 192, y, {align:'right'}); y+=6;
              if(source.includeTax) { doc.text("IVA", 140, y); doc.text(`${ivaCost.toFixed(2)} €`, 192, y, {align:'right'}); y+=8; }
              doc.setTextColor(...brandRgb); doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.text("TOTAL", 140, y); doc.text(`${finalPrice.toFixed(2)} €`, 192, y, {align:'right'});

          } else { // CORPORATE
              doc.setFillColor(...brandRgb); doc.rect(0, 0, 210, 45, 'F');
              if (profile.logo) try { doc.addImage(profile.logo, 'PNG', 15, 7, 30, 30, undefined, 'FAST'); } catch(e){}
              doc.setTextColor(255); doc.setFontSize(22); doc.setFont("helvetica", "bold"); doc.text("PRESUPUESTO", 195, 18, { align: 'right' });
              doc.setFontSize(14); doc.text(profile.companyName || "Empresa", 195, 28, { align: 'right' });
              doc.setFontSize(9); doc.setFont("helvetica", "normal");
              
              let yInfo = 36;
              [profile.email, profile.phone, profile.website, profile.address].filter(Boolean).forEach(line => {
                  doc.text(line, 195, yInfo, { align: 'right' });
                  yInfo += 4;
              });
              
              let y = 60; doc.setTextColor(0); doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.text(`Proyecto x${source.quantity}`, 15, y); y += 8;
              doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.text(`Impresora: ${printer?.name || 'Impresora'}`, 15, y); 
              doc.text(`Ref: #${stableRef}`, 195, y, {align:'right'}); y += 15;
              doc.setFillColor(240,240,240); doc.rect(15, y, 180, 8, 'F'); doc.setFont("helvetica", "bold"); doc.text("CONCEPTO", 18, y+5); doc.text("TOTAL", 190, y+5, {align:'right'}); y+=12;
              doc.setFont("helvetica", "normal");
              doc.text("Materiales", 18, y); doc.text(`${totalMaterialCost.toFixed(2)} €`, 190, y, {align:'right'}); y+=8;
              doc.text("Operaciones", 18, y); doc.text(`${(opsCost+laborCost).toFixed(2)} €`, 190, y, {align:'right'}); y+=12;
              doc.setDrawColor(0); doc.setLineWidth(0.1); doc.line(100, y, 195, y); y+=8;
              doc.text("Base Imponible", 140, y); doc.text(`${(subtotal+marginCost+failCost).toFixed(2)} €`, 190, y, {align:'right'}); y+=6;
              if(source.includeTax) { doc.text("IVA (21%)", 140, y); doc.text(`${ivaCost.toFixed(2)} €`, 190, y, {align:'right'}); y+=10; }
              doc.setFillColor(...brandRgb); doc.rect(135, y-6, 60, 10, 'F'); doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.text("TOTAL", 140, y); doc.text(`${finalPrice.toFixed(2)} €`, 190, y, {align:'right'});
          }
          doc.save(`Presupuesto.pdf`);
      } catch (err) { console.error(err); alert("Error PDF: " + err.message); }
  };

  const handleAddMaterial = () => { if(!newMatName || !newMatPrice) return alert("Nombre y precio requeridos"); addMaterial({ id: Date.now(), name: newMatName, price: newMatPrice, color: "#ffffff" }); setNewMatName(""); setNewMatPrice(""); };
  const handleAddPrinter = () => { if(!newPrinterName) return alert("Nombre requerido"); addPrinter({ id: Date.now(), name: newPrinterName, watts: parseFloat(newPrinterWatts)||0, maintenanceTotal: parseFloat(newPrinterMaint)||0 }); setNewPrinterName(""); setNewPrinterWatts(""); setNewPrinterMaint(""); };

  // HANDLE OPEN LIBRARY POPUP
  const handleOpenLibrary = (e, slotId) => {
      e.stopPropagation();
      const rect = e.currentTarget.getBoundingClientRect();
      // Guardamos la posición relativa a la ventana para el PORTAL
      setLibraryDropdown({ x: rect.left, y: rect.bottom + 5, slot: slotId });
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-50 font-sans flex flex-col selection:bg-blue-500 selection:text-white" onClick={() => setLibraryDropdown(null)}>
      {isProcessing && (<div className="fixed inset-0 z-[200] bg-[#0f172a]/90 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in"><RefreshCw size={64} className="mb-6 text-blue-500 animate-spin"/><h2 className="text-2xl font-black tracking-widest text-white uppercase animate-pulse">Procesando...</h2></div>)}
      
      {/* MENU FLOTANTE (PORTAL) - FIXED Z-INDEX & COLOR */}
      {libraryDropdown && (
          <div 
            className="fixed z-[9999] w-56 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-100"
            style={{ top: libraryDropdown.y, left: libraryDropdown.x }}
            onClick={(e) => e.stopPropagation()}
          >
              <p className="text-[9px] text-slate-400 uppercase tracking-widest mb-2 px-2">Biblioteca</p>
              {data.customMaterials.length === 0 ? <p className="px-2 text-xs italic text-slate-500">Vacío (Añade en Librería)</p> : 
                  <div className="overflow-y-auto max-h-48 custom-scrollbar">
                      {data.customMaterials.map(m => (
                          <button key={m.id} onClick={() => { setFilamentCost(libraryDropdown.slot, m.price); setLibraryDropdown(null); }} className="flex items-center justify-between w-full p-2 text-xs text-left text-white rounded hover:bg-slate-700 group">
                              <span className="truncate">{m.name}</span>
                              <span className="font-bold bg-slate-900/50 px-1.5 py-0.5 rounded text-emerald-400 group-hover:bg-slate-900">{m.price}€</span>
                          </button>
                      ))}
                  </div>
              }
          </div>
      )}

      <nav className="p-6 flex justify-between items-center border-b border-slate-800/50 bg-[#0f172a]/30 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center gap-3 cursor-pointer" onClick={resetWizard}>
          <h1 className="text-base italic font-black tracking-tighter uppercase">3DPrice Pro <span className="text-emerald-500 not-italic text-[10px] ml-2 border border-slate-800 px-1.5 py-0.5 rounded-md font-mono">v1.0</span></h1>
        </div>
        <div className="flex gap-4">
           <button onClick={() => setShowConfigModal('library')} className="flex items-center gap-2 px-4 py-2 text-xs font-bold tracking-widest uppercase transition-colors rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"><Library size={14}/> Librería</button>
           <button onClick={() => updateData({ activeTab: 'projects' })} className="flex items-center gap-2 px-4 py-2 text-xs font-bold tracking-widest uppercase transition-colors rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"><Layers size={14}/> Historial</button>
        </div>
      </nav>

      <main className="relative flex flex-col items-center justify-center flex-1 p-6 overflow-y-auto">
        
        {/* STEP 0 & 1 */}
        {data.activeTab !== 'projects' && data.currentStep <= 1 && (
          <div className="w-full pb-10 duration-500 max-w-7xl animate-in slide-in-from-bottom-8 fade-in">
             {data.analyzedFiles.length === 0 ? (
                 <div onClick={() => fileInputRef.current.click()} onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }} onDragLeave={() => setIsDragOver(false)} onDrop={handleDrop} className={`w-full h-[45vh] border-4 border-dashed rounded-[2.5rem] flex flex-col items-center justify-center transition-all duration-500 cursor-pointer group ${isDragOver ? 'border-blue-500 bg-blue-500/10 scale-105' : 'border-slate-800 bg-[#0f172a]/30 hover:border-slate-600 hover:bg-[#0f172a]/60'}`}>
                    <div className="bg-[#0f172a] p-6 rounded-[2rem] mb-6 shadow-xl border border-slate-800 group-hover:scale-110 transition-transform duration-300"><Upload size={48} className="text-blue-500" /></div><h2 className="mb-3 text-3xl italic font-black tracking-tighter text-center uppercase">Analizar Archivo</h2><p className="text-xs font-bold tracking-widest uppercase text-slate-500">Arrastra G-Code (.gcode)</p>
                 </div>
             ) : (
                 <div className="grid grid-cols-12 gap-8 h-[60vh]">
                    <div className="flex flex-col col-span-3 gap-4">
                        <div className="bg-[#0f172a] border border-slate-800 rounded-[2rem] p-4 flex-1 flex flex-col shadow-xl overflow-hidden">
                            <h3 className="px-2 mb-4 text-xs font-black tracking-widest uppercase text-slate-400">Archivos ({data.analyzedFiles.length})</h3>
                            <div className="flex-1 pr-2 space-y-2 overflow-y-auto custom-scrollbar">
                                {data.analyzedFiles.map((file, idx) => (
                                    <div key={idx} onClick={() => selectFile(idx)} className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex justify-between items-center group ${data.selectedFileIndex === idx ? 'bg-blue-900/20 border-blue-500 shadow-md' : 'bg-slate-900/50 border-transparent hover:border-slate-600'}`}>
                                        <div className="truncate">
                                            <p className={`text-xs font-bold truncate ${data.selectedFileIndex === idx ? 'text-blue-400' : 'text-slate-300'}`}>{file.name}</p>
                                            <p className="text-[10px] text-slate-500">{file.timeHours}h {file.timeMinutes}m</p>
                                        </div>
                                        <button onClick={(e) => { e.stopPropagation(); removeAnalyzedFile(idx); }} className="p-1.5 rounded-lg text-slate-500 hover:text-red-500 hover:bg-slate-800 transition-colors"><Trash2 size={14}/></button>
                                    </div>
                                ))}
                            </div>
                            <button onClick={() => fileInputRef.current.click()} className="flex items-center justify-center w-full gap-2 py-3 mt-4 text-xs font-bold uppercase transition-all border-2 border-dashed border-slate-700 text-slate-500 rounded-xl hover:text-white hover:border-slate-500 hover:bg-slate-800"><FilePlus size={16}/> Añadir Otro</button>
                        </div>
                        <button onClick={() => updateData({ currentStep: 2 })} className="bg-emerald-600 hover:bg-emerald-500 text-white p-4 rounded-[1.5rem] font-black text-sm uppercase tracking-widest shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3">Calcular Todo <ChevronRight size={18}/></button>
                    </div>
                    <div className="flex flex-col h-full col-span-9 overflow-hidden">
                        <div className="flex items-center justify-between mb-6">
                            <div><p className="text-[10px] font-bold text-blue-500 uppercase tracking-[0.2em] mb-1">Detalle del Archivo</p><h2 className="max-w-2xl text-3xl italic font-black tracking-tighter text-white uppercase truncate">{data.analyzedFiles[data.selectedFileIndex]?.name}</h2></div>
                            <div className="px-4 py-2 bg-slate-900 rounded-lg border border-slate-800 text-[10px] font-mono text-slate-400 flex items-center gap-2"><ScanFace size={14}/> {data.analyzedFiles[data.selectedFileIndex]?.slicer}</div>
                        </div>
                        <div className="grid flex-1 min-h-0 grid-cols-12 gap-6">
                            <div className="flex flex-col col-span-4 gap-4">
                                <div className="aspect-square"><FileInfoCard slicer={data.analyzedFiles[data.selectedFileIndex]?.slicer} layerHeight={data.analyzedFiles[data.selectedFileIndex]?.layerHeight} layerCount={data.analyzedFiles[data.selectedFileIndex]?.layerCount} /></div>
                                <div className="grid h-32 grid-cols-2 gap-4">
                                    <TimeCard h={data.analyzedFiles[data.selectedFileIndex]?.timeHours} m={data.analyzedFiles[data.selectedFileIndex]?.timeMinutes} originalH={data.analyzedFiles[data.selectedFileIndex]?.originalTimeHours} originalM={data.analyzedFiles[data.selectedFileIndex]?.originalTimeMinutes} onUpdate={updateFileStat} onReset={restoreTime} />
                                    <WeightCard value={(data.analyzedFiles[data.selectedFileIndex]?.totalWeight || 0).toFixed(1)} onUpdate={updateFileStat} />
                                </div>
                            </div>
                            <div className="h-full col-span-8">
                                <div className="bg-[#0f172a] border border-slate-800 rounded-[2rem] p-6 h-full flex flex-col shadow-xl">
                                    <h3 className="flex items-center gap-2 mb-6 text-xs font-black tracking-widest uppercase text-slate-400"><Component size={16}/> Materiales</h3>
                                    <div className="flex-1 pr-2 space-y-3 overflow-y-auto custom-scrollbar">
                                        {data.analyzedFiles[data.selectedFileIndex]?.filaments.map((fil, idx) => <FilamentRow key={idx} fil={fil} />)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                 </div>
             )}
             <input type="file" ref={fileInputRef} className="hidden" accept=".gcode,.bgcode,.3mf,.txt" onChange={(e) => e.target.files[0] && processFile(e.target.files[0])} />
          </div>
        )}

        {/* STEP 2: COTIZACIÓN */}
        {data.activeTab !== 'projects' && data.currentStep === 2 && data.analyzedFiles.length > 0 && (
            <div className="w-full pb-10 duration-500 max-w-7xl animate-in slide-in-from-right-8 fade-in">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4"><button onClick={() => updateData({ currentStep: 1 })} className="p-3 transition-all bg-slate-800 rounded-xl hover:bg-slate-700 text-slate-400 hover:text-white"><ArrowLeft size={18}/></button><div><p className="text-[10px] font-bold text-emerald-500 uppercase tracking-[0.2em] mb-1">Paso 2/2: Producción</p><h2 className="text-2xl italic font-black tracking-tighter text-white uppercase">Centro de Cotización</h2></div></div>
                </div>
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
                    <div className="space-y-6 lg:col-span-4">
                        <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-[2rem] text-center shadow-xl relative overflow-hidden">
                             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-emerald-500 to-purple-500"></div>
                             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Presupuesto Total</p>
                             <div className="mb-4 text-6xl font-black tracking-tighter text-white">{calculateTotal()}<span className="ml-1 text-2xl text-slate-500">€</span></div>
                             <div className="p-4 mb-4 border bg-slate-900/50 rounded-xl border-slate-800">
                                <UniformInput label="Cantidad (Lotes)" value={data.quantity} onChange={(v) => updateData({ quantity: parseInt(v) || 1 })} type="number" placeholder="1" />
                             </div>
                             <div className="flex gap-2">
                                <button onClick={saveToHistory} className="flex items-center justify-center flex-1 gap-2 p-3 text-xs font-bold tracking-widest uppercase transition-all border bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-500 border-emerald-600/30 rounded-xl"><Save size={16}/> Guardar</button>
                                <button onClick={() => setShowConfigModal('invoice_builder')} className="flex items-center justify-center flex-1 gap-2 p-3 text-xs font-bold tracking-widest text-white uppercase transition-all bg-blue-600 hover:bg-blue-500 rounded-xl"><FileText size={16}/> Factura</button>
                             </div>
                        </div>
                        <ConfigSection title="Config. Económica" icon={DollarSign}>
                            <div className="space-y-3">
                                <UniformInput label="Mano Obra" value={data.laborCost} onChange={(v) => updateData({ laborCost: v })} unit="€" />
                                <UniformInput label="Margen" value={data.profitMargin} onChange={(v) => updateData({ profitMargin: v })} unit="%" />
                                <UniformInput label="Tasa Fallo" value={data.failRate} onChange={(v) => updateData({ failRate: v })} unit="%" />
                                <div className="flex justify-end pt-2">
                                    <button onClick={() => updateData({ includeTax: !data.includeTax })} className="flex items-center justify-center w-full gap-2 px-3 py-2 transition-colors border rounded-lg bg-slate-900/50 border-slate-800 hover:border-blue-500">
                                        {data.includeTax ? <CheckSquare size={16} className="text-blue-500"/> : <Square size={16} className="text-slate-500"/>}
                                        <span className={`text-[10px] font-bold uppercase tracking-widest ${data.includeTax ? 'text-white' : 'text-slate-500'}`}>IVA (21%)</span>
                                    </button>
                                </div>
                            </div>
                        </ConfigSection>
                    </div>
                    <div className="space-y-6 lg:col-span-8">
                        <ConfigSection title="Máquina y Energía" icon={Printer}>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 block tracking-widest">Impresora</label>
                                    <button onClick={() => { setPrinterSearchTerm(""); setShowConfigModal('printer_search'); }} className="flex items-center justify-between w-full h-12 px-4 text-xs text-white transition-all border bg-slate-900 border-slate-800 hover:border-blue-500 rounded-xl group">
                                        <span className="font-bold truncate text-slate-300 group-hover:text-white">{data.customPrinters.find(p => p.id == data.selectedPrinterId)?.name || "Seleccionar..."}</span>
                                        <Search size={14} className="text-slate-500 group-hover:text-blue-500"/>
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 block tracking-widest">Precio Luz</label>
                                    <div className="flex items-center w-full h-12 px-4 transition-colors border bg-slate-900 border-slate-800 rounded-xl focus-within:border-blue-500">
                                        <input type="number" value={data.energyPrice} onChange={(e) => updateData({ energyPrice: e.target.value })} className="w-full font-mono text-sm font-bold text-white bg-transparent outline-none" />
                                        <span className="text-[10px] font-bold text-slate-500 shrink-0">€/kWh</span>
                                    </div>
                                </div>
                            </div>
                        </ConfigSection>
                        <div className="bg-[#0f172a] border border-slate-800 rounded-[2rem] p-6 shadow-xl">
                            <h3 className="flex items-center gap-2 mb-6 text-xs font-black tracking-widest uppercase text-slate-400"><Box size={16} className="text-blue-500"/> Desglose por Archivo</h3>
                            <div className="space-y-3">
                                {data.analyzedFiles.map((file, idx) => {
                                    const fileMatCost = file.filaments.reduce((acc, fil) => acc + (fil.weight * (parseFloat(data.filamentCosts[fil.slot]) || 20) / 1000), 0);
                                    const fileEnergy = ((300 * (file.timeHours + file.timeMinutes/60)) / 1000) * data.energyPrice; 
                                    const estimatedCost = (fileMatCost + fileEnergy) * (1 + data.profitMargin/100);
                                    const isExpanded = expandedFileIndex === idx;
                                    return (
                                        <div key={idx} className="overflow-hidden transition-all duration-300 ease-in-out border bg-slate-900/50 rounded-2xl border-slate-800">
                                            <div onClick={() => setExpandedFileIndex(isExpanded ? null : idx)} className="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-slate-800/50">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-2 text-xs font-bold text-blue-400 bg-blue-900/20 rounded-xl">{idx + 1}</div>
                                                    <div><p className="text-sm font-bold text-white">{file.name}</p><p className="text-[10px] text-slate-500 font-mono mt-0.5">{file.timeHours}h {file.timeMinutes}m • {file.totalWeight.toFixed(1)}g</p></div>
                                                </div>
                                                <div className="flex items-center gap-4"><div className="hidden text-right sm:block"><p className="text-[10px] text-slate-500 uppercase tracking-widest">Estimado</p><p className="font-mono text-sm font-bold text-white">~{estimatedCost.toFixed(2)}€</p></div>{isExpanded ? <ChevronUp size={18} className="text-slate-400"/> : <ChevronDown size={18} className="text-slate-400"/>}</div>
                                            </div>
                                            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                                                <div className="p-4 border-t bg-slate-950/50 border-slate-800">
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Materiales (Editar Precio/Kg)</p>
                                                    <div className="space-y-3">
                                                        {file.filaments.map((fil, fIdx) => {
                                                            const currentPrice = data.filamentCosts[fil.slot] || 20;
                                                            const cost = (fil.weight * (parseFloat(currentPrice) || 20) / 1000);
                                                            const dropdownId = `${idx}-${fIdx}`;
                                                            return (
                                                                <div key={fIdx} className="relative flex items-center justify-between p-2 text-xs border rounded-lg bg-slate-900/50 border-slate-800/50">
                                                                    <div className="flex items-center gap-3"><div className="w-3 h-3 border rounded-full border-slate-600" style={{backgroundColor: fil.color}}></div><div><p className="font-bold text-white">Slot {fil.slot} <span className="font-normal text-slate-500">({fil.type})</span></p><p className="text-slate-500 text-[10px]">{fil.weight.toFixed(1)}g</p></div></div>
                                                                    <div className="flex items-center gap-3">
                                                                        <button onClick={(e) => handleOpenLibrary(e, fil.slot)} className="bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white p-1.5 rounded transition-colors"><BookOpen size={14}/></button>
                                                                        <div className="flex items-center gap-1 px-2 py-1 transition-colors border rounded bg-slate-950 border-slate-800 focus-within:border-blue-500"><input type="number" value={currentPrice} onChange={(e) => setFilamentCost(fil.slot, e.target.value)} onClick={(e) => e.stopPropagation()} className="w-12 font-mono text-xs font-bold text-right text-white bg-transparent outline-none" placeholder="20"/><span className="text-[9px] font-bold text-slate-500">€/kg</span></div>
                                                                        <span className="w-16 font-mono font-bold text-right text-white">{cost.toFixed(2)}€</span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* HISTORIAL */}
        {data.activeTab === 'projects' && (
          <div className="w-full max-w-6xl pb-10 animate-in fade-in">
             <div className="flex items-center gap-4 mb-8"><button onClick={() => updateData({ activeTab: 'calculator' })} className="p-4 transition-all bg-slate-800 rounded-2xl hover:bg-slate-700"><ArrowLeft size={20}/></button><h2 className="text-3xl italic font-black uppercase">Historial de Proyectos</h2></div>
             {data.savedProjects.length === 0 ? <div className="p-20 text-center border-2 border-dashed border-slate-800 rounded-[3rem] opacity-50"><Archive size={48} className="mx-auto mb-4"/><p>No hay proyectos guardados</p></div> : 
             <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {data.savedProjects.map(p => (
                  <div key={p.id} className="bg-[#0f172a] border border-slate-800 p-6 rounded-[2rem] relative group hover:border-slate-600 transition-all flex flex-col justify-between h-64">
                    <div>
                        <div className="flex items-start justify-between mb-4">
                            <div className="p-3 text-blue-500 bg-slate-900 rounded-xl"><Box size={24}/></div>
                            <span className="text-[10px] font-bold bg-slate-900 text-slate-500 px-2 py-1 rounded-lg">{p.date}</span>
                        </div>
                        <h3 className="mb-2 text-lg font-black leading-tight text-white line-clamp-2">{p.projectName || "Sin Nombre"}</h3>
                        <p className="flex items-center gap-2 text-xs text-slate-500"><FileCode size={12}/> {p.analyzedFiles?.length || 1} Archivos • {p.quantity || 1} Lotes</p>
                    </div>
                    <div>
                        <p className="mb-4 text-3xl font-black text-white">{p.snapshotPrice}€</p>
                        <div className="flex gap-2">
                            <button onClick={() => loadProject(p)} className="flex items-center justify-center flex-1 gap-2 py-3 text-xs font-bold uppercase transition-all bg-emerald-900/20 text-emerald-500 hover:bg-emerald-900/40 rounded-xl"><Edit3 size={14}/> Editar</button>
                            <button onClick={() => downloadPDF(p)} className="p-3 text-white transition-all bg-slate-800 hover:bg-slate-700 rounded-xl"><FileText size={16}/></button>
                            <button onClick={() => deleteProject(p.id)} className="p-3 text-red-500 transition-all bg-red-900/10 hover:bg-red-900/30 rounded-xl"><Trash2 size={16}/></button>
                        </div>
                    </div>
                  </div>
                ))}
             </div>}
          </div>
        )}

        {/* MODAL: INVOICE BUILDER */}
        {showConfigModal === 'invoice_builder' && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#020617]/95 backdrop-blur-md animate-in fade-in">
                <div className="bg-[#0f172a] border border-slate-800 w-full max-w-7xl rounded-[2rem] shadow-2xl flex flex-col h-[90vh]">
                    <div className="flex items-center justify-between p-6 border-b border-slate-800"><h3 className="text-xl italic font-black text-white uppercase">Diseñador de Factura</h3><button onClick={() => setShowConfigModal(null)} className="p-2 rounded-full hover:bg-slate-800"><X size={20}/></button></div>
                    <div className="flex flex-1 overflow-hidden">
                        <div className="w-1/3 p-6 space-y-6 overflow-y-auto border-r border-slate-800 custom-scrollbar">
                            <h4 className="flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-slate-500"><User size={14}/> Datos Empresa</h4>
                            <div className="flex items-center gap-4 p-4 border bg-slate-900/50 rounded-xl border-slate-800">
                                <div className="relative flex items-center justify-center w-16 h-16 overflow-hidden border cursor-pointer bg-slate-800 rounded-xl border-slate-700 group" onClick={() => logoInputRef.current.click()}>
                                    {data.profile?.logo ? <img src={data.profile.logo} className="object-contain w-full h-full" /> : <Upload size={16} className="text-slate-500"/>}
                                    <input type="file" ref={logoInputRef} onChange={handleLogoUpload} accept="image/*" className="hidden" />
                                </div>
                                <div><p className="text-sm font-bold text-white">Logotipo</p><p className="text-[10px] text-slate-500">Click para subir</p></div>
                            </div>
                            <UniformInput label="Nombre" value={data.profile?.companyName} onChange={(v) => updateProfile({ companyName: v })} placeholder="Mi Empresa 3D" />
                            <UniformInput label="Email" value={data.profile?.email} onChange={(v) => updateProfile({ email: v })} placeholder="hola@empresa.com" />
                            <UniformInput label="Teléfono" value={data.profile?.phone} onChange={(v) => updateProfile({ phone: v })} placeholder="+34..." />
                            <UniformInput label="Web" value={data.profile?.website} onChange={(v) => updateProfile({ website: v })} placeholder="www..." />
                            <UniformInput label="Dirección" value={data.profile?.address} onChange={(v) => updateProfile({ address: v })} placeholder="Calle..." />
                            <hr className="border-slate-800"/>
                            <h4 className="flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-slate-500"><Palette size={14}/> Estilo</h4>
                            <div className="flex gap-2 mb-4">{COLORS.map(c => (<button key={c.hex} onClick={() => updateProfile({ brandColor: c.hex })} className={`w-8 h-8 rounded-full border-2 transition-all ${data.profile?.brandColor === c.hex ? 'border-white scale-110' : 'border-transparent opacity-50 hover:opacity-100'}`} style={{backgroundColor: c.hex}} title={c.name}/>))}</div>
                            <div className="grid grid-cols-3 gap-2">{['corporate', 'minimal', 'modern'].map(t => (<button key={t} onClick={() => updateProfile({ template: t })} className={`p-3 rounded-xl border-2 text-center transition-all ${data.profile?.template === t ? 'border-blue-500 bg-blue-500/10' : 'border-slate-800 bg-slate-900 hover:border-slate-700'}`}><p className="text-[10px] font-bold text-white capitalize">{t}</p></button>))}</div>
                        </div>
                        <div className="flex items-start justify-center w-2/3 p-8 overflow-y-auto bg-slate-950 custom-scrollbar">
                            <div style={{ transform: 'scale(0.65)', transformOrigin: 'top center', marginTop: '20px' }}>
                                <InvoicePreview data={data} calculationData={getCalculationData()} />
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end p-6 border-t border-slate-800 bg-slate-900/50">
                        <button onClick={() => downloadPDF(null)} className="flex items-center gap-3 px-8 py-4 text-sm font-black tracking-widest text-white uppercase transition-all bg-blue-600 shadow-lg hover:bg-blue-500 rounded-xl hover:scale-105 active:scale-95"><Download size={18}/> Descargar PDF Final</button>
                    </div>
                </div>
            </div>
        )}

        {/* MODAL: LIBRERÍA */}
        {showConfigModal === 'library' && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#020617]/95 backdrop-blur-md animate-in fade-in">
                <div className="bg-[#0f172a] border border-slate-800 w-full max-w-4xl rounded-[2rem] shadow-2xl flex flex-col h-[80vh]">
                    <div className="flex items-center justify-between p-6 border-b border-slate-800"><h3 className="text-xl italic font-black text-white uppercase">Gestor de Librería</h3><button onClick={() => setShowConfigModal(null)} className="p-2 rounded-full hover:bg-slate-800"><X size={20}/></button></div>
                    <div className="flex px-6 border-b border-slate-800">
                        <button onClick={() => setLibraryTab("materials")} className={`py-4 px-6 text-sm font-bold uppercase tracking-widest border-b-2 transition-colors ${libraryTab==="materials" ? "border-blue-500 text-white" : "border-transparent text-slate-500 hover:text-white"}`}>Materiales</button>
                        <button onClick={() => setLibraryTab("printers")} className={`py-4 px-6 text-sm font-bold uppercase tracking-widest border-b-2 transition-colors ${libraryTab==="printers" ? "border-blue-500 text-white" : "border-transparent text-slate-500 hover:text-white"}`}>Impresoras</button>
                    </div>
                    <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-slate-900/20">
                        {libraryTab === "materials" ? (
                            <div className="space-y-6">
                                <div className="flex items-end gap-4 p-4 border bg-slate-900/50 rounded-2xl border-slate-800">
                                    <div className="flex-1"><label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Nombre</label><input type="text" value={newMatName} onChange={(e)=>setNewMatName(e.target.value)} placeholder="Ej: Sunlu PLA+" className="w-full p-3 text-sm text-white border outline-none bg-slate-950 border-slate-800 rounded-xl focus:border-blue-500"/></div>
                                    <div className="w-24"><label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Precio/Kg</label><input type="number" value={newMatPrice} onChange={(e)=>setNewMatPrice(e.target.value)} placeholder="20" className="w-full p-3 text-sm text-white border outline-none bg-slate-950 border-slate-800 rounded-xl focus:border-blue-500"/></div>
                                    <button onClick={handleAddMaterial} className="p-3 text-white bg-blue-600 hover:bg-blue-500 rounded-xl"><Plus size={20}/></button>
                                </div>
                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                    {data.customMaterials.map(m => (
                                        <div key={m.id} className="flex justify-between items-center bg-[#0f172a] p-4 rounded-xl border border-slate-800">
                                            <p className="font-bold text-white">{m.name}</p>
                                            <div className="flex items-center gap-4"><span className="font-mono text-emerald-400">{m.price}€</span><button onClick={()=>deleteMaterial(m.id)} className="text-slate-600 hover:text-red-500"><Trash2 size={16}/></button></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="flex items-end gap-4 p-4 border bg-slate-900/50 rounded-2xl border-slate-800">
                                    <div className="flex-1"><label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Modelo</label><input type="text" value={newPrinterName} onChange={(e)=>setNewPrinterName(e.target.value)} placeholder="Ej: Voron 2.4" className="w-full p-3 text-sm text-white border outline-none bg-slate-950 border-slate-800 rounded-xl focus:border-blue-500"/></div>
                                    <div className="w-24"><label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Watts</label><input type="number" value={newPrinterWatts} onChange={(e)=>setNewPrinterWatts(e.target.value)} placeholder="300" className="w-full p-3 text-sm text-white border outline-none bg-slate-950 border-slate-800 rounded-xl focus:border-blue-500"/></div>
                                    <div className="w-24"><label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Mantenim.</label><input type="number" value={newPrinterMaint} onChange={(e)=>setNewPrinterMaint(e.target.value)} placeholder="0.10" className="w-full p-3 text-sm text-white border outline-none bg-slate-950 border-slate-800 rounded-xl focus:border-blue-500"/></div>
                                    <button onClick={handleAddPrinter} className="p-3 text-white bg-blue-600 hover:bg-blue-500 rounded-xl"><Plus size={20}/></button>
                                </div>
                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                    {data.customPrinters.map(p => (
                                        <div key={p.id} className="flex justify-between items-center bg-[#0f172a] p-4 rounded-xl border border-slate-800">
                                            <div><p className="font-bold text-white">{p.name}</p><p className="text-xs text-slate-500">{p.watts}W • {p.maintenanceTotal}€/h</p></div>
                                            <button onClick={()=>deletePrinter(p.id)} className="text-slate-600 hover:text-red-500"><Trash2 size={16}/></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* MODAL PRINTER SEARCH */}
        {showConfigModal === 'printer_search' && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#020617]/95 backdrop-blur-md animate-in fade-in">
                <div className="bg-[#0f172a] border border-slate-800 w-full max-w-2xl rounded-[2rem] shadow-2xl flex flex-col max-h-[80vh]">
                    <div className="flex items-center justify-between p-6 border-b border-slate-800"><h3 className="text-xl italic font-black text-white uppercase">Seleccionar Impresora</h3><button onClick={() => setShowConfigModal(null)} className="p-2 rounded-full hover:bg-slate-800"><X size={20}/></button></div>
                    <div className="relative p-6 border-b border-slate-800"><Search className="absolute -translate-y-1/2 left-10 top-1/2 text-slate-500" size={18} /><input type="text" placeholder="Buscar marca o modelo..." value={printerSearchTerm} onChange={(e) => setPrinterSearchTerm(e.target.value)} autoFocus className="w-full bg-[#020617] border border-slate-700 rounded-xl py-4 pl-12 pr-4 text-white font-bold outline-none focus:border-blue-500 transition-colors" /></div>
                    <div className="flex-1 p-6 overflow-y-auto custom-scrollbar"><div className="grid grid-cols-1 gap-3 md:grid-cols-2">{PRINTER_LIBRARY.filter(p => `${p.brand} ${p.model}`.toLowerCase().includes(printerSearchTerm.toLowerCase())).map((p, idx) => (<button key={idx} onClick={() => { const newPrinter = { id: Date.now(), name: `${p.brand} ${p.model}`, watts: p.watts, maintenanceTotal: p.maint }; addPrinter(newPrinter); updateData({ selectedPrinterId: newPrinter.id }); setShowConfigModal(null); }} className="p-4 text-left transition-all border bg-slate-900/50 hover:bg-blue-600/20 border-slate-800 hover:border-blue-500 rounded-xl group"><p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 group-hover:text-blue-300">{p.brand}</p><p className="text-lg font-bold text-white">{p.model}</p><div className="flex gap-3 mt-2"><span className="px-2 py-1 text-xs rounded bg-black/30 text-slate-400">{p.watts} W</span><span className="px-2 py-1 text-xs rounded bg-black/30 text-slate-400">{p.maint} €/h</span></div></button>))}</div></div>
                </div>
            </div>
        )}
      </main>
    </div>
  );
}