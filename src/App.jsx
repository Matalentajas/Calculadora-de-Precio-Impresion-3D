import React from 'react'
import { Calculator, Package, Cpu, TrendingUp } from 'lucide-react';

export default function App() {
  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-50">
      {/* Sidebar Lateral */}
      <aside className="w-64 bg-slate-900/50 border-r border-slate-800 p-6 flex flex-col">
        <div className="flex items-center gap-3 mb-10">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Calculator size={24} className="text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">3DPrice Pro</h1>
        </div>

        <nav className="space-y-2 flex-1">
          <button className="w-full flex items-center gap-3 px-4 py-2 bg-blue-600/10 text-blue-400 rounded-lg border border-blue-600/20">
            <Calculator size={18} /> Calculadora
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-2 text-slate-400 hover:bg-slate-800 rounded-lg transition-all">
            <Package size={18} /> Materiales
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-2 text-slate-400 hover:bg-slate-800 rounded-lg transition-all">
            <Cpu size={18} /> Impresoras
          </button>
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-800">
          <div className="bg-slate-800/50 p-4 rounded-xl text-sm">
            <p className="text-slate-400">Estado del Proyecto:</p>
            <p className="text-blue-400 font-mono">v2.0.0-alpha</p>
          </div>
        </div>
      </aside>

      {/* Contenido Principal */}
      <main className="flex-1 p-10 overflow-y-auto">
        <header className="mb-10">
          <h2 className="text-4xl font-extrabold mb-2">Calculadora de Costes</h2>
          <p className="text-slate-400 text-lg">Optimiza tus presupuestos de impresión 3D con precisión industrial.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Columna de Inputs (Formulario) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl">
              <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <TrendingUp size={20} className="text-blue-500" /> 
                Configuración de la Pieza
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Aquí pondremos los inputs en el siguiente paso */}
                <div className="h-32 border-2 border-dashed border-slate-800 rounded-xl flex items-center justify-center text-slate-600">
                  Próximamente: Inputs de Peso y Tiempo
                </div>
                <div className="h-32 border-2 border-dashed border-slate-800 rounded-xl flex items-center justify-center text-slate-600">
                  Próximamente: Inputs de Coste Eléctrico
                </div>
              </div>
            </div>
          </div>

          {/* Columna de Resultados (Resumen) */}
          <div className="space-y-6">
            <div className="bg-blue-600 p-8 rounded-2xl shadow-2xl shadow-blue-900/20 text-white">
              <p className="text-blue-100 text-sm font-medium uppercase tracking-wider mb-2">Precio Final Sugerido</p>
              <p className="text-5xl font-black">0.00€</p>
              <div className="mt-6 pt-6 border-t border-blue-500/50 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span>Coste Material</span>
                  <span className="font-mono">0.00€</span>
                </div>
                <div className="flex justify-between">
                  <span>Margen Beneficio</span>
                  <span className="font-mono">0.00€</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}