import React, { useState, useEffect, useRef } from 'react';
import { 
  Weight, Clock, Layers, ArrowLeft, Upload, 
  FileCode, RefreshCw, Edit3, ScanFace, Component, CheckCircle, FileText, Trash2, RotateCcw, Printer, Zap, DollarSign, ChevronRight, Save, Search, X, CheckSquare, Square, Download
} from 'lucide-react';
import { jsPDF } from "jspdf";
import { useCalculatorStore } from './store/useCalculatorStore';

// --- DATA ---
const PRINTER_LIBRARY = [
    { brand: 'Bambu Lab', model: 'X1-Carbon', watts: 350, maint: 0.15 },
    { brand: 'Bambu Lab', model: 'P1S / P1P', watts: 300, maint: 0.10 },
    { brand: 'Bambu Lab', model: 'A1 / A1 Mini', watts: 150, maint: 0.05 },
    { brand: 'Creality', model: 'Ender 3 V2/V3', watts: 350, maint: 0.05 },
    { brand: 'Prusa', model: 'MK4 / MK3S+', watts: 280, maint: 0.10 },
    { brand: 'Elegoo', model: 'Neptune 4', watts: 300, maint: 0.08 },
    { brand: 'Anycubic', model: 'Kobra 2', watts: 300, maint: 0.08 },
];

// --- PARSER ---
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

// --- UI COMPONENTS ---
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
const TimeCard = ({ h, m, originalH, originalM, onUpdate, onReset }) => {
    const isModified = h !== originalH || m !== originalM;
    return (
        <div className="bg-[#0f172a] border border-slate-800 p-4 rounded-[2rem] flex flex-col justify-center relative group hover:border-slate-600 h-full shadow-lg">
            <div className="flex items-center justify-between mb-3"><div className="flex items-center gap-2"><div className="bg-slate-900 p-1.5 rounded-lg text-blue-500"><Clock size={16} /></div><p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Tiempo</p></div>{isModified && (<button onClick={onReset} className="transition-colors text-emerald-500 hover:text-white" title="Restaurar"><RotateCcw size={12} /></button>)}</div>
            <div className="flex items-baseline justify-center gap-1"><div className="flex items-baseline"><input type="number" value={h} onChange={(e) => onUpdate('timeHours', parseInt(e.target.value) || 0)} className="w-12 p-0 font-mono text-2xl font-bold text-center text-white transition-colors bg-transparent border-b border-dashed outline-none border-slate-700 focus:border-blue-500"/><span className="text-[10px] font-bold text-slate-500 ml-1">h</span></div><span className="mx-1 text-lg font-bold text-slate-600">:</span><div className="flex items-baseline"><input type="number" value={m} onChange={(e) => onUpdate('timeMinutes', parseInt(e.target.value) || 0)} className="w-12 p-0 font-mono text-2xl font-bold text-center text-white transition-colors bg-transparent border-b border-dashed outline-none border-slate-700 focus:border-blue-500"/><span className="text-[10px] font-bold text-slate-500 ml-1">m</span></div></div>
        </div>
    );
};
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

const UniformInput = ({ label, value, onChange, unit, type="number" }) => (
    <div className="flex items-center justify-between p-3 border bg-slate-900/50 border-slate-800 rounded-xl h-14">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate mr-2">{label}</span>
        <div className="flex items-center gap-1 bg-slate-950/50 px-3 py-1.5 rounded-lg border border-slate-800/50 focus-within:border-blue-500/50 transition-colors">
            <input type={type} value={value} onChange={e => onChange(e.target.value)} className="w-16 font-mono text-sm font-bold text-right text-white bg-transparent outline-none" placeholder="0.00" />
            {unit && <span className="text-[10px] font-bold text-slate-500 w-6 text-right">{unit}</span>}
        </div>
    </div>
);

export default function App() {
  const { data, updateData, resetWizard, addPrinter, saveProject, deleteProject, setFilamentCost } = useCalculatorStore();
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);
  
  const [showConfigModal, setShowConfigModal] = useState(null); 
  const [printerSearchTerm, setPrinterSearchTerm] = useState(""); 

  useEffect(() => { if (data.currentStep > 0 && !data.analyzedFile) resetWizard(); }, [data.currentStep, data.analyzedFile]);
  useEffect(() => { if (data.customPrinters.length === 0) addPrinter({ id: 1, name: 'Impresora Genérica', watts: 250, maintenanceTotal: 0.10 }); }, []);

  const processFile = async (file) => {
    if (!file.name.match(/\.(gcode|bgcode|3mf|txt)$/i)) return alert("Archivo no válido.");
    setIsProcessing(true);
    try {
      const text = await file.text();
      const metadata = parseGCode(text, file.name);
      setTimeout(() => {
        updateData({ analyzedFile: { ...metadata, name: file.name.replace(/\.(gcode|bgcode|3mf|txt)$/i, '') }, currentStep: 1 });
        setIsProcessing(false);
      }, 500);
    } catch (e) { alert("Error leyendo archivo."); setIsProcessing(false); }
  };
  const handleDrop = (e) => { e.preventDefault(); setIsDragOver(false); if(e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]); };
  const updateFileStat = (key, val) => { if(data.analyzedFile) updateData({ analyzedFile: { ...data.analyzedFile, [key]: val } }); };
  const restoreTime = () => { if(data.analyzedFile) { updateData({ analyzedFile: { ...data.analyzedFile, timeHours: data.analyzedFile.originalTimeHours, timeMinutes: data.analyzedFile.originalTimeMinutes }}); }};

  const calculateTotal = () => {
      if (!data.analyzedFile) return "0.00";
      
      let totalMaterialCost = 0;
      data.analyzedFile.filaments.forEach(fil => {
          const costPerKg = parseFloat(data.filamentCosts[fil.slot]) || 20.00;
          totalMaterialCost += (fil.weight * costPerKg / 1000);
      });

      const hours = (data.analyzedFile.timeHours || 0) + (data.analyzedFile.timeMinutes || 0)/60;
      const printer = data.customPrinters.find(p => p.id == data.selectedPrinterId) || data.customPrinters[0];
      const watts = printer?.watts || 250;
      const energyCost = ((watts * hours) / 1000) * data.energyPrice; 
      const maintenanceCost = hours * (printer?.maintenanceTotal || 0.05);
      const laborCost = parseFloat(data.laborCost || 0);
      
      const subtotal = totalMaterialCost + energyCost + maintenanceCost + laborCost;
      const withFail = subtotal * (1 + (data.failRate || 0)/100);
      const withMargin = withFail * (1 + (data.profitMargin || 0)/100);
      return (withMargin * (data.includeTax ? 1.21 : 1)).toFixed(2);
  };

  const saveToHistory = () => {
      const project = { id: Date.now(), date: new Date().toLocaleDateString(), snapshotPrice: calculateTotal(), ...data.analyzedFile, projectName: data.analyzedFile.name }; 
      saveProject(project); updateData({ activeTab: 'projects' }); resetWizard();
  };

  // --- GENERADOR PDF PROFESIONAL v33 ---
  const generatePDF = (projectSource) => {
      const doc = new jsPDF();
      
      // COLORES
      const darkBlue = [15, 23, 42];
      const lightGray = [241, 245, 249];
      const accentGreen = [16, 185, 129];

      // DATOS
      const src = projectSource.analyzedFile ? data : projectSource; // Si viene del historial o de live
      const fileData = src.analyzedFile || src; // Ajuste para estructura de datos
      const printer = data.customPrinters.find(p => p.id == src.selectedPrinterId) || data.customPrinters[0];
      
      // RE-CALCULO INTERNO PARA DESGLOSE
      // Necesitamos recalcular variables para pintarlas, no solo el total
      let totalMaterialCost = 0;
      const filamentsData = fileData.filaments.map(fil => {
          // Buscamos el precio guardado o en el estado actual
          let costPerKg = 20.00;
          if (src.filamentCosts && src.filamentCosts[fil.slot]) {
              costPerKg = parseFloat(src.filamentCosts[fil.slot]);
          }
          const cost = (fil.weight * costPerKg / 1000);
          totalMaterialCost += cost;
          return { ...fil, costPerKg, cost };
      });

      const hours = (fileData.timeHours || 0) + (fileData.timeMinutes || 0)/60;
      const watts = printer?.watts || 250;
      const energyCost = ((watts * hours) / 1000) * (src.energyPrice || 0.11);
      const maintCost = hours * (printer?.maintenanceTotal || 0.05);
      const laborCost = parseFloat(src.laborCost || 0);
      const subtotal = totalMaterialCost + energyCost + maintCost + laborCost;
      const failCost = subtotal * ((src.failRate || 0)/100);
      const subtotalWithFail = subtotal + failCost;
      const marginCost = subtotalWithFail * ((src.profitMargin || 0)/100);
      const baseImponible = subtotalWithFail + marginCost;
      const ivaCost = src.includeTax ? (baseImponible * 0.21) : 0;
      const finalPrice = baseImponible + ivaCost;

      // 1. CABECERA
      doc.setFillColor(...darkBlue);
      doc.rect(0, 0, 210, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("PRESUPUESTO 3D", 15, 20);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("3DPrice Pro", 15, 28);
      
      doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 195, 20, { align: 'right' });
      doc.text(`Ref: #${Date.now().toString().slice(-6)}`, 195, 28, { align: 'right' });

      let y = 55;

      // 2. DETALLES DEL PROYECTO
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(fileData.name || "Sin nombre", 15, y);
      y += 8;
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Impresora: ${printer.name}`, 15, y);
      doc.text(`Tiempo: ${fileData.timeHours}h ${fileData.timeMinutes}m`, 80, y);
      doc.text(`Peso Total: ${fileData.totalWeight.toFixed(1)}g`, 140, y);
      y += 15;

      // 3. TABLA DE MATERIALES
      doc.setFillColor(...lightGray);
      doc.rect(15, y, 180, 8, 'F');
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("MATERIAL (SLOT)", 18, y+5);
      doc.text("TIPO", 60, y+5);
      doc.text("PESO", 90, y+5);
      doc.text("COSTE/KG", 120, y+5);
      doc.text("SUBTOTAL", 180, y+5, { align: 'right' });
      y += 12;

      doc.setFont("helvetica", "normal");
      filamentsData.forEach(fil => {
          doc.text(`Slot ${fil.slot}`, 18, y);
          doc.text(fil.type, 60, y);
          doc.text(`${fil.weight.toFixed(1)} g`, 90, y);
          doc.text(`${fil.costPerKg.toFixed(2)} €`, 120, y);
          doc.text(`${fil.cost.toFixed(2)} €`, 180, y, { align: 'right' });
          y += 7;
      });
      
      // Línea separación
      doc.setDrawColor(200);
      doc.line(15, y, 195, y);
      y += 5;
      // Total Materiales
      doc.setFont("helvetica", "bold");
      doc.text("Total Materiales:", 120, y);
      doc.text(`${totalMaterialCost.toFixed(2)} €`, 180, y, { align: 'right' });
      y += 15;

      // 4. DESGLOSE DE OPERACIONES
      doc.setFillColor(...lightGray);
      doc.rect(15, y, 180, 8, 'F');
      doc.text("COSTES OPERATIVOS", 18, y+5);
      y += 12;

      doc.setFont("helvetica", "normal");
      
      doc.text("Energía Eléctrica", 18, y);
      doc.text(`${energyCost.toFixed(2)} €`, 180, y, { align: 'right' });
      y += 7;

      doc.text("Mantenimiento Máquina", 18, y);
      doc.text(`${maintCost.toFixed(2)} €`, 180, y, { align: 'right' });
      y += 7;

      doc.text("Mano de Obra (Preparación)", 18, y);
      doc.text(`${laborCost.toFixed(2)} €`, 180, y, { align: 'right' });
      y += 12; // Espacio extra

      // Línea final
      doc.setDrawColor(0);
      doc.setLineWidth(0.5);
      doc.line(100, y, 195, y);
      y += 8;

      // 5. TOTALES FINALES (Alineados a la derecha)
      const xLabel = 140;
      const xValue = 180;

      doc.text("Subtotal Costes:", xLabel, y);
      doc.text(`${subtotal.toFixed(2)} €`, xValue, y, { align: 'right' });
      y += 7;

      if (src.failRate > 0) {
          doc.text(`Tasa Fallo (+${src.failRate}%):`, xLabel, y);
          doc.text(`${failCost.toFixed(2)} €`, xValue, y, { align: 'right' });
          y += 7;
      }

      doc.text(`Margen (+${src.profitMargin}%):`, xLabel, y);
      doc.text(`${marginCost.toFixed(2)} €`, xValue, y, { align: 'right' });
      y += 7;

      if (src.includeTax) {
          doc.text("IVA (21%):", xLabel, y);
          doc.text(`${ivaCost.toFixed(2)} €`, xValue, y, { align: 'right' });
          y += 10;
      } else {
          y += 3;
      }

      // GRAN TOTAL
      doc.setFillColor(16, 185, 129); // Verde Esmeralda
      doc.rect(xLabel - 10, y - 6, 65, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("TOTAL:", xLabel - 5, y);
      doc.text(`${finalPrice.toFixed(2)} €`, xValue, y, { align: 'right' });

      // Footer
      doc.setTextColor(150);
      doc.setFontSize(8);
      doc.text("Presupuesto válido por 15 días. Generado con 3DPrice Pro.", 105, 280, { align: 'center' });

      doc.save(`Presupuesto_${fileData.name}.pdf`);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-50 font-sans flex flex-col selection:bg-blue-500 selection:text-white">
      <nav className="p-6 flex justify-between items-center border-b border-slate-800/50 bg-[#0f172a]/30 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center gap-3 cursor-pointer" onClick={resetWizard}>
          <h1 className="text-base italic font-black tracking-tighter uppercase">3DPrice Pro <span className="text-emerald-500 not-italic text-[10px] ml-2 border border-slate-800 px-1.5 py-0.5 rounded-md font-mono">v33.0</span></h1>
        </div>
        <div className="flex gap-4">
           <button onClick={() => updateData({ activeTab: 'projects' })} className="flex items-center gap-2 px-4 py-2 text-xs font-bold tracking-widest uppercase transition-colors rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"><Layers size={14}/> Historial</button>
           <button onClick={resetWizard} className="flex items-center gap-2 px-3 py-2 text-xs font-bold tracking-widest uppercase transition-colors rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"><RefreshCw size={12}/> Reiniciar</button>
        </div>
      </nav>

      <main className="relative flex flex-col items-center justify-center flex-1 p-6 overflow-y-auto">
        {data.activeTab !== 'projects' && data.currentStep === 0 && (
          <div onClick={() => fileInputRef.current.click()} onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }} onDragLeave={() => setIsDragOver(false)} onDrop={handleDrop} className={`w-full max-w-3xl h-[45vh] border-4 border-dashed rounded-[2.5rem] flex flex-col items-center justify-center transition-all duration-500 cursor-pointer group ${isDragOver ? 'border-blue-500 bg-blue-500/10 scale-105' : 'border-slate-800 bg-[#0f172a]/30 hover:border-slate-600 hover:bg-[#0f172a]/60'}`}>
            {isProcessing ? <div className="text-center animate-in fade-in zoom-in"><RefreshCw size={48} className="mx-auto mb-4 text-blue-500 animate-spin" /><h2 className="text-2xl italic font-black tracking-tighter uppercase">Procesando...</h2></div> : <><div className="bg-[#0f172a] p-6 rounded-[2rem] mb-6 shadow-xl border border-slate-800 group-hover:scale-110 transition-transform duration-300"><Upload size={48} className="text-blue-500" /></div><h2 className="mb-3 text-3xl italic font-black tracking-tighter text-center uppercase">Analizar Archivo</h2><p className="text-xs font-bold tracking-widest uppercase text-slate-500">Arrastra G-Code (.gcode)</p></>}
            <input type="file" ref={fileInputRef} className="hidden" accept=".gcode,.bgcode,.3mf,.txt" onChange={(e) => e.target.files[0] && processFile(e.target.files[0])} />
          </div>
        )}

        {data.activeTab !== 'projects' && data.currentStep === 1 && data.analyzedFile && (
          <div className="w-full max-w-6xl pb-10 duration-500 animate-in slide-in-from-bottom-8 fade-in">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4"><button onClick={resetWizard} className="p-3 transition-all bg-slate-800 rounded-xl hover:bg-slate-700 text-slate-400 hover:text-white"><ArrowLeft size={18}/></button><div><p className="text-[10px] font-bold text-blue-500 uppercase tracking-[0.2em] mb-1">Paso 1/2: Análisis</p><h2 className="max-w-md text-2xl italic font-black tracking-tighter text-white uppercase truncate">{data.analyzedFile.name}</h2></div></div>
              <div className="px-4 py-2 bg-slate-900 rounded-lg border border-slate-800 text-[10px] font-mono text-slate-400 flex items-center gap-2"><ScanFace size={14}/> {data.analyzedFile.slicer}</div>
            </div>
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
              <div className="space-y-4 lg:col-span-4">
                <div className="aspect-square"><FileInfoCard slicer={data.analyzedFile.slicer} layerHeight={data.analyzedFile.layerHeight} layerCount={data.analyzedFile.layerCount} /></div>
                <div className="grid grid-cols-2 gap-4 h-36">
                    <TimeCard h={data.analyzedFile.timeHours} m={data.analyzedFile.timeMinutes} originalH={data.analyzedFile.originalTimeHours} originalM={data.analyzedFile.originalTimeMinutes} onUpdate={updateFileStat} onReset={restoreTime} />
                    <WeightCard value={(data.analyzedFile.totalWeight || 0).toFixed(1)} onUpdate={updateFileStat} />
                </div>
              </div>
              <div className="flex flex-col h-full lg:col-span-8">
                <div className="bg-[#0f172a] border border-slate-800 rounded-[2rem] p-6 flex-1 flex flex-col shadow-xl">
                    <h3 className="flex items-center gap-2 mb-6 text-xs font-black tracking-widest uppercase text-slate-400"><Component size={16}/> Desglose Detectado</h3>
                    <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar mb-6 min-h-[150px]">{data.analyzedFile.filaments.map((fil, idx) => <FilamentRow key={idx} fil={fil} />)}</div>
                    <div className="flex items-center justify-between p-4 border bg-slate-900/80 border-slate-800 rounded-xl">
                        <p className="text-xs font-bold uppercase text-slate-500">¿Datos Correctos?</p>
                        <button onClick={() => updateData({ currentStep: 2 })} className="flex items-center gap-2 px-6 py-3 text-xs font-black tracking-widest text-white uppercase transition-all bg-blue-600 shadow-lg hover:bg-blue-500 rounded-xl hover:scale-105 active:scale-95">Configurar Precios <ChevronRight size={16}/></button>
                    </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {data.activeTab !== 'projects' && data.currentStep === 2 && data.analyzedFile && (
            <div className="w-full max-w-6xl pb-10 duration-500 animate-in slide-in-from-right-8 fade-in">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4"><button onClick={() => updateData({ currentStep: 1 })} className="p-3 transition-all bg-slate-800 rounded-xl hover:bg-slate-700 text-slate-400 hover:text-white"><ArrowLeft size={18}/></button><div><p className="text-[10px] font-bold text-emerald-500 uppercase tracking-[0.2em] mb-1">Paso 2/2: Cotización</p><h2 className="text-2xl italic font-black tracking-tighter text-white uppercase">Calculadora de Costes</h2></div></div>
                </div>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                    <div className="space-y-4 lg:col-span-4">
                        <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-[2rem] text-center shadow-xl relative overflow-hidden">
                             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-emerald-500 to-purple-500"></div>
                             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Precio Final (PVP)</p>
                             <div className="mb-4 text-5xl font-black tracking-tighter text-white">{calculateTotal()}<span className="ml-1 text-2xl text-slate-500">€</span></div>
                             <div className="flex gap-2 mt-4">
                                <button onClick={saveToHistory} className="flex items-center justify-center flex-1 gap-2 p-3 text-xs font-bold tracking-widest uppercase transition-all border bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-500 border-emerald-600/30 rounded-xl"><Save size={16}/> Guardar</button>
                                <button onClick={() => generatePDF(data)} className="flex items-center justify-center flex-1 gap-2 p-3 text-xs font-bold tracking-widest text-white uppercase transition-all border bg-slate-800 hover:bg-slate-700 border-slate-700 rounded-xl"><FileText size={16}/> PDF</button>
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
                                    <button onClick={() => { setPrinterSearchTerm(""); setShowConfigModal('printer_search'); }} className="flex items-center justify-between w-full px-4 text-xs text-white transition-all border h-14 bg-slate-900 border-slate-800 hover:border-blue-500 rounded-xl group">
                                        <span className="font-bold truncate text-slate-300 group-hover:text-white">{data.customPrinters.find(p => p.id == data.selectedPrinterId)?.name || "Seleccionar..."}</span>
                                        <Search size={14} className="text-slate-500 group-hover:text-blue-500"/>
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 block tracking-widest">Precio Luz</label>
                                    <div className="flex items-center w-full px-4 transition-colors border h-14 bg-slate-900 border-slate-800 rounded-xl focus-within:border-blue-500">
                                        <input type="number" value={data.energyPrice} onChange={(e) => updateData({ energyPrice: e.target.value })} className="w-full font-mono text-sm font-bold text-white bg-transparent outline-none" />
                                        <span className="text-[10px] font-bold text-slate-500 shrink-0">€/kWh</span>
                                    </div>
                                </div>
                            </div>
                        </ConfigSection>
                        <ConfigSection title="Costes de Material (Por Slot)" icon={Component}>
                            <div className="space-y-3">
                                {data.analyzedFile.filaments.map((fil) => (
                                    <div key={fil.id} className="flex items-center justify-between p-2 pl-4 border bg-slate-900/30 rounded-xl border-slate-800/50">
                                        <div className="flex items-center gap-3">
                                            <div className="w-5 h-5 border rounded-full border-slate-600" style={{backgroundColor: fil.color}}></div>
                                            <div><p className="text-xs font-bold text-white">Slot {fil.slot} <span className="font-normal text-slate-500">({fil.type})</span></p><p className="text-[9px] text-slate-500">{fil.weight}g</p></div>
                                        </div>
                                        <UniformInput label="Coste" value={data.filamentCosts[fil.slot] || 20} onChange={(v) => setFilamentCost(fil.slot, v)} unit="€/kg" />
                                    </div>
                                ))}
                            </div>
                        </ConfigSection>
                    </div>
                </div>
            </div>
        )}

        {data.activeTab === 'projects' && (
          <div className="w-full max-w-6xl animate-in fade-in">
             <div className="flex items-center gap-4 mb-8"><button onClick={() => updateData({ activeTab: 'calculator' })} className="p-4 transition-all bg-slate-800 rounded-2xl hover:bg-slate-700"><ArrowLeft size={20}/></button><h2 className="text-3xl italic font-black uppercase">Historial</h2></div>
             {data.savedProjects.length === 0 ? <div className="p-20 text-center border-2 border-dashed border-slate-800 rounded-[3rem] opacity-50"><Layers size={48} className="mx-auto mb-4"/><p>Vacío</p></div> : 
             <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {data.savedProjects.map(p => (
                  <div key={p.id} className="bg-[#0f172a] border border-slate-800 p-8 rounded-[2.5rem] relative group hover:border-slate-600 transition-all">
                    <h3 className="mb-2 text-xl italic font-black text-white truncate">{p.projectName}</h3><p className="mb-6 text-3xl italic font-black text-emerald-400">{p.snapshotPrice}€</p>
                    <div className="flex gap-2"><button onClick={() => generatePDF(p)} className="flex-1 py-3 transition-all bg-slate-800 rounded-xl hover:bg-slate-700"><FileText size={16} className="mx-auto"/></button><button onClick={() => deleteProject(p.id)} className="p-3 text-red-500 transition-all bg-red-900/20 rounded-xl hover:bg-red-900/40"><Trash2 size={16}/></button></div>
                  </div>
                ))}
             </div>}
          </div>
        )}

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