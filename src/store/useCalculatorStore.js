import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useCalculatorStore = create(
  persist(
    (set) => ({
      data: {
        // --- CONFIGURACIÓN ECONÓMICA v31 ---
        laborCost: 0,          // Mano de Obra (FIJO, por pieza/proyecto)
        energyPrice: 0.11,     // Precio luz España
        
        profitMargin: 30,      // Margen beneficio (%)
        taxRate: 21,           // IVA (%)
        includeTax: true,      
        failRate: 5,           // Tasa de fallo (%)
        
        // Estado App
        activeTab: 'calculator', 
        currentStep: 0,
        analyzedFile: null, 
        
        selectedPrinterId: null,
        filamentCosts: {}, 
        
        customPrinters: [],
        savedProjects: []
      },
      
      updateData: (newData) => set((state) => ({ data: { ...state.data, ...newData } })),
      setFilamentCost: (slot, price) => set((state) => ({ data: { ...state.data, filamentCosts: { ...state.data.filamentCosts, [slot]: price } } })),
      addPrinter: (printer) => set((state) => ({ data: { ...state.data, customPrinters: [printer, ...state.data.customPrinters] } })),
      deletePrinter: (id) => set((state) => ({ data: { ...state.data, customPrinters: state.data.customPrinters.filter(p => p.id !== id) } })),
      saveProject: (project) => set((state) => ({ data: { ...state.data, savedProjects: [project, ...state.data.savedProjects] } })),
      deleteProject: (id) => set((state) => ({ data: { ...state.data, savedProjects: state.data.savedProjects.filter(p => p.id !== id) } })),
      
      resetWizard: () => set((state) => ({ 
        data: { 
          ...state.data, 
          currentStep: 0, 
          analyzedFile: null, 
          selectedPrinterId: null,
          filamentCosts: {},
          activeTab: 'calculator'
        } 
      }))
    }),
    { name: '3d-price-pro-v31' }
  )
);