import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useCalculatorStore = create(
  persist(
    (set) => ({
      data: {
        isPremiumMode: false,
        activeTab: 'calculator',
        editingProjectId: null,
        selectedPrinterId: null,
        selectedMaterialId: null,
        projectName: '',
        quantity: 1,
        urgency: 1,
        weight: 0,
        pricePerKg: 20,
        timeHours: 0,
        timeMinutes: 0,
        printerWattage: 0,
        maintenance: 0,
        energyPrice: 0.15,
        hourlyRate: 10,
        prepTime: 0,
        postProcessTime: 0,
        extraMaterialsCost: 0,
        packagingCost: 0,
        shippingCost: 0,
        profitMargin: 30,
        failRate: 0,
        taxRate: 21,
        includeTax: false,
        materials: [],
        savedProjects: [],
        customPrinters: []
      },
      // PROTECCIÓN: updateData extrae las bases de datos del input para no sobrescribirlas accidentalmente
      updateData: (newData) => set((state) => {
        const { materials, customPrinters, savedProjects, ...safeData } = newData; 
        return { data: { ...state.data, ...safeData } };
      }),
      addMaterial: (mat) => set((state) => ({ data: { ...state.data, materials: [mat, ...state.data.materials] } })),
      updateMaterial: (id, updatedMat) => set((state) => ({ data: { ...state.data, materials: state.data.materials.map(m => m.id === id ? { ...m, ...updatedMat } : m) } })),
      deleteMaterial: (id) => set((state) => ({ data: { ...state.data, materials: state.data.materials.filter(m => m.id !== id) } })),
      addPrinter: (printer) => set((state) => ({ data: { ...state.data, customPrinters: [printer, ...state.data.customPrinters] } })),
      updatePrinter: (id, updatedPrinter) => set((state) => ({ data: { ...state.data, customPrinters: state.data.customPrinters.map(p => p.id === id ? { ...p, ...updatedPrinter } : p) } })),
      deletePrinter: (id) => set((state) => ({ data: { ...state.data, customPrinters: state.data.customPrinters.filter(p => p.id !== id) } })),
      saveProject: (project) => set((state) => {
        const exists = state.data.savedProjects.find(p => p.id === project.id);
        const newProjects = exists 
          ? state.data.savedProjects.map(p => p.id === project.id ? project : p)
          : [project, ...state.data.savedProjects];
        return { data: { ...state.data, savedProjects: newProjects, editingProjectId: null } };
      }),
      deleteProject: (id) => set((state) => ({ data: { ...state.data, savedProjects: state.data.savedProjects.filter(p => p.id !== id) } }))
    }),
    { name: '3d-price-pro-v7.0-stable' }
  )
);