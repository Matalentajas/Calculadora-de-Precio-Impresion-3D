import React, { useState, useRef } from 'react';
import { 
  Weight, Clock, Zap, Layers, Settings, Database, ArrowLeft, Upload, 
  FileCode, RefreshCw, AlertTriangle, Edit3, Palette, Ruler, ScanFace, ArrowRight, Component, CheckCircle, FileText, Trash2
} from 'lucide-react';
import { jsPDF } from "jspdf";
import { useCalculatorStore } from './store/useCalculatorStore';

// --- PARSER G-CODE SEGURO (NO CRASHEA) ---
const parseGCode = (text, filename) => {
  const meta = { 
    timeHours: 0, timeMinutes: 0, 
    totalWeight: 0, layerHeight: 0, 
    thumbnail: null, slicer: 'Desconocido',
    filaments: [] 
  };
  
  try {
    // 1. TIEMPO
    const tMatch = text.match(/; ?(model|estimated) printing time\s*[:=]\s*(.*)/i);
    const tMatchCura = text.match(/;TIME:(\d+)/i);

    if (tMatch) {
      const timeStr = tMatch[2];
      const h = timeStr.match(/(\d+)h/);
      const m = timeStr.match(/(\d+)m/);
      if (h) meta.timeHours = parseInt(h[1]);
      if (m) meta.timeMinutes = parseInt(m[1]);
      meta.slicer = 'Bambu/Prusa';
    } else if (tMatchCura) {
      const s = parseInt(tMatchCura[1]);
      meta.timeHours = Math.floor(s / 3600);
      meta.timeMinutes = Math.floor((s % 3600) / 60);
      meta.slicer = 'Cura';
    } else {
      const nameMatch = filename.match(/(\d+)h(\d+)m/i);
      if (nameMatch) {
        meta.timeHours = parseInt(nameMatch[1]);
        meta.timeMinutes = parseInt(nameMatch[2]);
        meta.slicer = 'Archivo';
      }
    }

    // 2. MULTI-MATERIAL (Bambu style)
    const rawColors = text.match(/; ?filament_colour\s*=\s*(.*)/i);
    const rawWeights = text.match(/; ?(total filament|filament) (weight|used) \[g\]\s*[:=]\s*(.*)/i);
    
    if (rawColors && rawWeights) {
      // Limpieza agresiva para evitar errores
      const colorsList = rawColors[1].split(';').map(c => c.trim().replace(/"/g, ''));
      const weightsList = rawWeights[3].split(';').map(w => parseFloat(w.trim()) || 0);
      
      colorsList.forEach((color, index) => {
        const weight = weightsList[index] || 0;
        if (weight > 0) {
          meta.filaments.push({ color, weight, type: 'PLA', id: index }); // Default type PLA
          meta.totalWeight += weight;
        }
      });
    }

    // Fallback Cura
    if (meta.filaments.length === 0) {
      const wMatchCura = text.match(/;Filament used: (\d+\.?\d*)m/i);
      if (wMatchCura) {
        const weight = parseFloat(wMatchCura[1]) * 3; 
        meta.totalWeight = weight;
        meta.filaments.push({ color: '#FFFFFF', weight: weight, type: 'Generico', id: 0 });
      }
    }

    // 3. ALTURA CAPA
    const lhMatch = text.match(/; ?(layer_height|Layer height)\s*[:=]\s*(\d+\.?\d*)/i);
    if (lhMatch) meta.layerHeight = parseFloat(lhMatch[2]);

    // 4. THUMBNAIL (Método indexOf = Rápido y Seguro)
    const thumbStart = text.indexOf('; thumbnail begin');
    if (thumbStart !== -1) {
      const thumbEnd = text.indexOf('; thumbnail end', thumbStart);
      if (thumbEnd !== -1) {
        const block = text.substring(thumbStart, thumbEnd).split('\n');
        // Filtramos solo líneas que parecen datos base64 válidos
        const base64 = block
          .filter(l => l.trim().startsWith(';') && l.length > 30) 
          .map(l => l.replace(/^;\s?/, '').trim())
          .join('');
        
        if (base64.length > 50) {
          meta.thumbnail = `data:image/png;base64,${base64}`;
        }
      }
    }

  } catch (error) { console.error("Error parser:", error); }
  return meta;
};

// --- COMPONENTES UI ---
const DataPoint = ({ icon: Icon, label, value, unit, colorIndicator, editable, onChange, fontMono = true }) => (
  <div className="bg-[#0f172a] border border-slate-800 p-4 rounded-xl flex items-center gap-4 relative group transition-all hover:border-slate-600 h-full">
    <div className="bg-slate-900 p-2.5 rounded-lg text-slate-400 shrink-0 relative">
        {colorIndicator ? <div className="w-5 h-5 border-2 rounded-full shadow-sm border-slate-800" style={{backgroundColor: colorIndicator}}/> : <Icon size={18} />}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5 truncate leading-tight">{label}</p>
      <div className="flex items-baseline gap-1">
        {editable ? (
           <input 
             type="number" 
             value={value} 
             onChange={(e) => onChange && onChange(parseFloat(e.target.value) || 0)}
             className={`bg-transparent text-lg ${fontMono ? 'font-mono' : ''} font-bold text-white outline-none w-full border-b border-dashed border-slate-700 focus:border-blue-500 transition-colors p-0`}
           />
        ) : (
           <p className={`text-lg ${fontMono ? 'font-mono' : ''} font-bold text-white truncate leading-none`}>{value}</p>
        )}
        {unit && <span className="text-[10px] font-bold text-slate-500 self-end mb-0.5">{unit}</span>}
      </div>
    </div>
    {editable && <Edit3 size={12} className="absolute transition-opacity opacity-0 top-2 right-2 text-slate-600 group-hover:opacity-100" />}
  </div>
);

const FilamentRow = ({ fil }) => (
  <div className="flex items-center justify-between p-3 border bg-slate-900/50 border-slate-800/50 rounded-xl">
    <div className="flex items-center gap-3">
      <div className="w-4 h-4 border rounded-full shadow-sm border-slate-700" style={{backgroundColor: fil.color}}></div>
      <div>
        <p className="text-xs font-bold leading-none text-white">{fil.type || 'Material'}</p>
        <p className="text-[9px] font-mono text-slate-500 uppercase">{fil.color}</p>
      </div>
    </div>
    <div className="text-right">
        {/* PROTECCIÓN: .toFixed solo si es número */}
        <p className="font-mono text-sm font-bold leading-none text-white">{(fil.weight || 0).toFixed(1)}<span className="text-xs text-slate-500 ml-0.5">g</span></p>
    </div>
  </div>
);

// --- APP PRINCIPAL ---
export default function App() {
  const { data, updateData, resetWizard } = useCalculatorStore();
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);
  
  const processFile = async (file) => {
    if (!file.name.match(/\.(gcode|bgcode|3mf|txt)$/i)) return alert("Usa un archivo G-Code válido.");
    setIsProcessing(true);
    try {
      const text = await file.text();
      const metadata = parseGCode(text, file.name);
      
      const cleanData = {
        ...metadata,
        name: file.name.replace(/\.(gcode|bgcode|3mf|txt)$/i, '')
      };

      setTimeout(() => {
        updateData({ analyzedFile: cleanData, currentStep: 1 });
        setIsProcessing(false);
      }, 800);
    } catch (e) {
      console.error(e);
      alert("Error leyendo archivo. Verifica formato.");
      setIsProcessing(false);
    }
  };

  const handleDrop = (e) => { e.preventDefault(); setIsDragOver(false); if(e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]); };
  const updateFileStat = (key, val) => { 
      if(data.analyzedFile) updateData({ analyzedFile: { ...data.analyzedFile, [key]: val } }); 
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-50 font-sans flex flex-col selection:bg-blue-500 selection:text-white">
      <nav className="p-6 flex justify-between items-center border-b border-slate-800/50 bg-[#0f172a]/30 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center gap-3 cursor-pointer" onClick={resetWizard}>
          <h1 className="text-base italic font-black tracking-tighter uppercase">3DPrice Pro <span className="text-slate-500 not-italic text-[10px] ml-2 border border-slate-800 px-1.5 py-0.5 rounded-md font-mono">v11.1</span></h1>
        </div>
        <div className="flex gap-4">
           {data.currentStep > 0 && <button onClick={resetWizard} className="flex items-center gap-2 px-3 py-2 text-xs font-bold tracking-widest uppercase transition-colors rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"><RefreshCw size={12}/> Reiniciar</button>}
        </div>
      </nav>

      <main className="relative flex flex-col items-center justify-center flex-1 p-6 overflow-y-auto">
        
        {data.currentStep === 0 && (
          <div 
            onClick={() => fileInputRef.current.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            className={`w-full max-w-3xl h-[45vh] border-4 border-dashed rounded-[2.5rem] flex flex-col items-center justify-center transition-all duration-500 cursor-pointer group ${isDragOver ? 'border-blue-500 bg-blue-500/10 scale-105' : 'border-slate-800 bg-[#0f172a]/30 hover:border-slate-600 hover:bg-[#0f172a]/60'}`}
          >
            {isProcessing ? (
              <div className="text-center animate-in fade-in zoom-in"><RefreshCw size={48} className="mx-auto mb-4 text-blue-500 animate-spin" /><h2 className="text-2xl italic font-black tracking-tighter uppercase">Procesando...</h2></div>
            ) : (
              <>
                <div className="bg-[#0f172a] p-6 rounded-[2rem] mb-6 shadow-xl border border-slate-800 group-hover:scale-110 transition-transform duration-300"><Upload size={48} className="text-blue-500" /></div>
                <h2 className="mb-3 text-3xl italic font-black tracking-tighter text-center uppercase">Analizar Archivo</h2>
                <p className="text-xs font-bold tracking-widest uppercase text-slate-500">Soporte Multi-Material Activo</p>
              </>
            )}
            <input type="file" ref={fileInputRef} className="hidden" accept=".gcode,.bgcode,.3mf,.txt" onChange={(e) => e.target.files[0] && processFile(e.target.files[0])} />
          </div>
        )}

        {/* PASO 1: ANÁLISIS */}
        {data.currentStep === 1 && data.analyzedFile && (
          <div className="w-full max-w-6xl pb-10 duration-500 animate-in slide-in-from-bottom-8 fade-in">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <button onClick={resetWizard} className="p-3 transition-all bg-slate-800 rounded-xl hover:bg-slate-700 text-slate-400 hover:text-white"><ArrowLeft size={18}/></button>
                <div><p className="text-[10px] font-bold text-blue-500 uppercase tracking-[0.2em] mb-1">Análisis Completado</p><h2 className="max-w-md text-2xl italic font-black tracking-tighter text-white uppercase truncate">{data.analyzedFile.name}</h2></div>
              </div>
              <div className="px-4 py-2 bg-slate-900 rounded-lg border border-slate-800 text-[10px] font-mono text-slate-400 flex items-center gap-2"><ScanFace size={14}/> {data.analyzedFile.slicer}</div>
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
              
              {/* COL IZQ: IMAGEN + DATOS CLAVE */}
              <div className="space-y-4 lg:col-span-4">
                <div className="aspect-square bg-[#0f172a] rounded-[2rem] border-2 border-slate-800 p-4 flex items-center justify-center relative overflow-hidden shadow-xl group transition-all">
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:15px_15px] pointer-events-none"></div>
                  {data.analyzedFile.thumbnail ? ( 
                    <img src={data.analyzedFile.thumbnail} alt="Preview" className="relative z-10 object-contain w-full h-full drop-shadow-2xl" /> 
                  ) : ( 
                    <div className="z-10 text-center text-slate-700"><FileCode size={64} className="mx-auto mb-4 opacity-50"/><p className="text-xs font-black tracking-widest uppercase">Sin imagen</p></div> 
                  )}
                  {data.analyzedFile.layerHeight > 0 && <div className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur border border-slate-700 text-slate-300 px-2 py-1 rounded-md text-[8px] font-mono font-bold uppercase tracking-widest flex items-center gap-1"><Layers size={10}/> {(data.analyzedFile.layerHeight || 0).toFixed(2)}mm</div>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <DataPoint icon={Clock} label="Tiempo" value={`${data.analyzedFile.timeHours}h ${data.analyzedFile.timeMinutes}m`} editable={true} onChange={(v) => updateFileStat('timeHours', v)} />
                    <DataPoint icon={Weight} label="Peso Total" value={(data.analyzedFile.totalWeight || 0).toFixed(1)} unit="g" editable={true} onChange={(v) => updateFileStat('totalWeight', v)} />
                </div>
              </div>

              {/* COL DER: DESGLOSE MULTI-MATERIAL */}
              <div className="flex flex-col h-full lg:col-span-8">
                <div className="bg-[#0f172a] border border-slate-800 rounded-[2rem] p-6 flex-1 flex flex-col shadow-xl">
                    <h3 className="flex items-center gap-2 mb-6 text-xs font-black tracking-widest uppercase text-slate-400"><Component size={16}/> Desglose de Materiales ({(data.analyzedFile.filaments || []).length})</h3>
                    
                    <div className="flex-1 pr-2 mb-6 space-y-3 overflow-y-auto custom-scrollbar">
                        {data.analyzedFile.filaments && data.analyzedFile.filaments.length > 0 ? (
                            data.analyzedFile.filaments.map((fil, idx) => (
                                <FilamentRow key={idx} fil={fil} />
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full border-2 border-dashed text-slate-600 border-slate-800/50 rounded-xl">
                                <Package size={32} className="mb-2 opacity-50"/>
                                <p className="text-xs font-bold uppercase">No se detectaron materiales</p>
                                <p className="text-[10px]">El peso total se usará como genérico.</p>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-between p-4 border bg-slate-900/80 border-slate-800 rounded-xl">
                        <div>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Consumo Total</p>
                            <p className="font-mono text-xl font-black leading-none text-white">{(data.analyzedFile.totalWeight || 0).toFixed(1)}<span className="ml-1 text-sm text-slate-500">g</span></p>
                        </div>
                        <button 
                            onClick={() => alert("¡Paso a Configuración! (Próximamente en v12)")}
                            className="flex items-center gap-2 px-6 py-3 text-xs font-black tracking-widest text-white uppercase transition-all bg-blue-600 shadow-lg hover:bg-blue-500 rounded-xl hover:scale-105 active:scale-95"
                        >
                            Continuar <ArrowRight size={16}/>
                        </button>
                    </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}