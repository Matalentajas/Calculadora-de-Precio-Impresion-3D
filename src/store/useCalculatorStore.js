import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useCalculatorStore = create(
  persist(
    (set, get) => ({
      data: {
        // PERFIL DE EMPRESA
        profile: {
            companyName: "",
            email: "",
            phone: "",
            website: "",
            address: "",
            logo: null,
            brandColor: '#3b82f6',
            template: 'corporate'
        },
        // LIBRERÍAS
        customMaterials: [], 
        customPrinters: [],  

        // ECONOMÍA DEFAULT
        laborCost: 0,
        energyPrice: 0.11,
        profitMargin: 30,
        taxRate: 21,
        includeTax: true,
        failRate: 5,
        
        // ESTADO ACTIVO
        activeTab: 'calculator', 
        currentStep: 0,
        analyzedFiles: [],
        selectedFileIndex: 0,
        quantity: 1,
        
        selectedPrinterId: null,
        filamentCosts: {}, 
        savedProjects: []
      },
      
      updateData: (newData) => set((state) => ({ data: { ...state.data, ...newData } })),
      updateProfile: (newProfile) => set((state) => ({ data: { ...state.data, profile: { ...state.data.profile, ...newProfile } } })),
      
      // GESTIÓN ARCHIVOS
      addAnalyzedFile: (fileData) => set((state) => ({ 
          data: { ...state.data, analyzedFiles: [...state.data.analyzedFiles, fileData], selectedFileIndex: state.data.analyzedFiles.length, currentStep: 1 } 
      })),
      removeAnalyzedFile: (index) => set((state) => {
          const newFiles = state.data.analyzedFiles.filter((_, i) => i !== index);
          return { data: { ...state.data, analyzedFiles: newFiles, selectedFileIndex: Math.max(0, index - 1), currentStep: newFiles.length > 0 ? 1 : 0 } };
      }),
      selectFile: (index) => set((state) => ({ data: { ...state.data, selectedFileIndex: index } })),

      // GESTIÓN COSTES Y LIBRERÍA
      setFilamentCost: (slot, price) => set((state) => ({ data: { ...state.data, filamentCosts: { ...state.data.filamentCosts, [slot]: price } } })),
      
      addPrinter: (printer) => set((state) => ({ data: { ...state.data, customPrinters: [...state.data.customPrinters, printer], selectedPrinterId: printer.id } })),
      deletePrinter: (id) => set((state) => ({ data: { ...state.data, customPrinters: state.data.customPrinters.filter(p => p.id !== id) } })),
      
      addMaterial: (mat) => set((state) => ({ data: { ...state.data, customMaterials: [...state.data.customMaterials, mat] } })),
      deleteMaterial: (id) => set((state) => ({ data: { ...state.data, customMaterials: state.data.customMaterials.filter(m => m.id !== id) } })),

      // GESTIÓN PROYECTOS
      saveProject: (project) => set((state) => ({ data: { ...state.data, savedProjects: [project, ...state.data.savedProjects] } })),
      deleteProject: (id) => set((state) => ({ data: { ...state.data, savedProjects: state.data.savedProjects.filter(p => p.id !== id) } })),
      
      loadProject: (project) => set((state) => ({
          data: {
              ...state.data,
              activeTab: 'calculator',
              currentStep: 2, 
              analyzedFiles: project.analyzedFiles || [],
              quantity: project.quantity || 1,
              filamentCosts: project.filamentCosts || {},
              laborCost: project.laborCost,
              energyPrice: project.energyPrice,
              profitMargin: project.profitMargin,
              failRate: project.failRate,
              includeTax: project.includeTax,
              selectedPrinterId: project.selectedPrinterId,
          }
      })),

      resetWizard: () => set((state) => ({ 
        data: { ...state.data, currentStep: 0, analyzedFiles: [], selectedFileIndex: 0, quantity: 1, filamentCosts: {}, activeTab: 'calculator' } 
      }))
    }),
    { name: '3d-price-pro-v1' }
  )
);