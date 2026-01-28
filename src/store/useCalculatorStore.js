import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useCalculatorStore = create(
  persist(
    (set) => ({
      // Valores iniciales
      data: {
        weight: 0,
        pricePerKg: 20,
        time: 0,
        energyPrice: 0.15,
        printerWattage: 300,
        profitMargin: 30
      },
      // Función para actualizar cualquier campo
      updateData: (newData) => 
        set((state) => ({ 
          data: { ...state.data, ...newData } 
        })),
    }),
    {
      name: '3d-print-storage', // Nombre de la "llave" en LocalStorage
    }
  )
);