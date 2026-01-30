import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useCalculatorStore = create(
  persist(
    (set) => ({
      data: {
        hourlyRate: 15,
        energyPrice: 0.15,
        profitMargin: 30,
        taxRate: 21,
        includeTax: true,
        failRate: 5,
        
        currentStep: 0,
        analyzedFile: null,
        
        selectedPrinterId: null,
        selectedMaterialId: null,
        
        materials: [],
        customPrinters: [],
        savedProjects: []
      },
      
      updateData: (newData) => set((state) => ({ data: { ...state.data, ...newData } })),
      
      addMaterial: (mat) => set((state) => ({ data: { ...state.data, materials: [mat, ...state.data.materials] } })),
      deleteMaterial: (id) => set((state) => ({ data: { ...state.data, materials: state.data.materials.filter(m => m.id !== id) } })),
      
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
          selectedMaterialId: null 
        } 
      }))
    }),
    { name: '3d-price-pro-v11.1-safe' } // NOMBRE NUEVO PARA LIMPIAR ERRORES
  )
);