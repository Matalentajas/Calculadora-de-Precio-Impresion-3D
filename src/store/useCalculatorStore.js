import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useCalculatorStore = create(
  persist(
    (set) => ({
      data: {
        isPremiumMode: false,
        activeTab: 'calculator',
        weight: 0,
        pricePerKg: 20,
        timeHours: 0,
        timeMinutes: 0,
        energyPrice: 0.15,
        printerWattage: 0,
        maintenance: 0,
        profitMargin: 30,
        quantity: 1,
        hourlyRate: 10,
        prepTime: 0,
        postProcessTime: 0,
        extraMaterialsCost: 0,
        failRate: 0,
        taxRate: 21,
        includeTax: false,
        materials: [],
        savedProjects: [],
        customPrinters: []
      },
      updateData: (newData) => 
        set((state) => ({ data: { ...state.data, ...newData } })),
      
      addMaterial: (mat) => set((state) => ({
        data: { ...state.data, materials: [mat, ...state.data.materials] }
      })),
      updateMaterial: (id, updatedMat) => set((state) => ({
        data: { ...state.data, materials: state.data.materials.map(m => m.id === id ? { ...m, ...updatedMat } : m) }
      })),
      deleteMaterial: (id) => set((state) => ({
        data: { ...state.data, materials: state.data.materials.filter(m => m.id !== id) }
      })),

      addPrinter: (printer) => set((state) => ({
        data: { ...state.data, customPrinters: [printer, ...state.data.customPrinters] }
      })),
      updatePrinter: (id, updatedPrinter) => set((state) => ({
        data: { ...state.data, customPrinters: state.data.customPrinters.map(p => p.id === id ? { ...p, ...updatedPrinter } : p) }
      })),
      deletePrinter: (id) => set((state) => ({
        data: { ...state.data, customPrinters: state.data.customPrinters.filter(p => p.id !== id) }
      })),

      saveProject: (project) => set((state) => ({
        data: { ...state.data, savedProjects: [project, ...state.data.savedProjects] }
      })),
      deleteProject: (id) => set((state) => ({
        data: { ...state.data, savedProjects: state.data.savedProjects.filter(p => p.id !== id) }
      }))
    }),
    { name: '3d-print-pro-master-v4.4' }
  )
);