import React, { useEffect } from 'react';
import { 
  Calculator, 
  Package, 
  Cpu, 
  TrendingUp, 
  Weight, 
  Clock, 
  Euro, 
  Zap 
} from 'lucide-react';
import { useCalculatorStore } from './store/useCalculatorStore';
import InputGroup from './components/InputGroup';

export default function App() {
  // 1. Registro de la PWA (Service Worker)
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(err => {
          console.log('Service Worker registration failed: ', err);
        });
      });
    }
  }, []);

  // 2. Conexión con el Store (Zustand)
  const { data, updateData } = useCalculatorStore();

  // 3. Lógica de cálculo dinámica
  const materialCost = (data.weight * data.pricePerKg) / 1000;
  const energyCost = (data.printerWattage * data.time / 1000) * data.energyPrice;
  const productionCost = materialCost + energyCost;
  const finalPrice = productionCost * (1 + (data.profitMargin / 100));

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-50 font-sans">
      {/* Sidebar Lateral */}
      <aside className="w-64 bg-slate-900/50 border-r border-slate-800 p-6 flex flex-col">
        <div className="flex items-center gap-3 mb-10">
          <div className="bg-blue-600 p-2 rounded-lg shadow-lg shadow-blue-900/20">
            <Calculator size={24} className="text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">3DPrice Pro</h1>
        </div>

        <nav className="space-y-2 flex-1">
          <button className="w-full flex items-center gap-3 px-4 py-2 bg-blue-600/10 text-blue-400 rounded-lg border border-blue-600/20">
            <Calculator size={18} /> Calculadora
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-2 text-slate-400 hover:bg-slate-800/50 hover:text-slate-100 rounded-lg transition-all text-left">
            <Package size={18} /> Materiales
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-2 text-slate-400 hover:bg-slate-800/50 hover:text-slate-100 rounded-lg transition-all text-left">
            <Cpu size={18} /> Impresoras
          </button>
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-800">
          <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-800/50 text-center">
            <p className="text-slate-500 text-xs uppercase font-semibold mb-1">Modo Offline</p>
            <p className="text-emerald-400 font-mono text-xs font-bold tracking-widest uppercase">Listo</p>
          </div>
        </div>
      </aside>

      {/* Contenido Principal */}
      <main className="flex-1 p-10 overflow-y-auto">
        <header className="mb-10">
          <h2 className="text-4xl font-extrabold mb-2 text-white tracking-tight">Calculadora de Costes</h2>
          <p className="text-slate-400 text-lg">Optimiza tus presupuestos con persistencia de datos local.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl">
              <h3 className="text-xl font-semibold mb-8 flex items-center gap-2 text-slate-100">
                <TrendingUp size={20} className="text-blue-500" /> 
                Parámetros de Impresión
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <InputGroup 
                  label="Peso de la pieza" 
                  icon={Weight} 
                  suffix="g" 
                  value={data.weight}
                  onChange={(val) => updateData({ weight: parseFloat(val) || 0 })}
                />
                <InputGroup 
                  label="Tiempo estimado" 
                  icon={Clock} 
                  suffix="h" 
                  value={data.time}
                  onChange={(val) => updateData({ time: parseFloat(val) || 0 })}
                />
                <InputGroup 
                  label="Precio del Filamento" 
                  icon={Euro} 
                  suffix="€/kg" 
                  value={data.pricePerKg}
                  onChange={(val) => updateData({ pricePerKg: parseFloat(val) || 0 })}
                />
                <InputGroup 
                  label="Precio Energía" 
                  icon={Zap} 
                  suffix="€/kWh" 
                  value={data.energyPrice}
                  onChange={(val) => updateData({ energyPrice: parseFloat(val) || 0 })}
                />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-blue-600 p-8 rounded-3xl shadow-2xl shadow-blue-900/40 text-white relative overflow-hidden group">
              <div className="relative z-10">
                <p className="text-blue-100 text-sm font-bold uppercase tracking-widest mb-2">Precio Final Sugerido</p>
                <p className="text-6xl font-black mb-8 tracking-tighter">
                  {finalPrice.toFixed(2)}€
                </p>
                
                <div className="space-y-4 pt-6 border-t border-blue-400/30">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-blue-100 opacity-80 font-medium">Coste Material</span>
                    <span className="font-mono font-bold bg-blue-700/30 px-2 py-1 rounded">{materialCost.toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-blue-100 opacity-80 font-medium">Coste Eléctrico</span>
                    <span className="font-mono font-bold bg-blue-700/30 px-2 py-1 rounded">{energyCost.toFixed(2)}€</span>
                  </div>
                </div>
              </div>
              <Calculator size={140} className="absolute -right-8 -bottom-8 text-white opacity-5 rotate-12" />
            </div>

            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
              <div className="flex justify-between mb-4">
                <label className="text-sm font-medium text-slate-400">Margen de Beneficio</label>
                <span className="text-blue-400 font-bold font-mono">{data.profitMargin}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="200" 
                value={data.profitMargin}
                onChange={(e) => updateData({ profitMargin: parseInt(e.target.value) })}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}