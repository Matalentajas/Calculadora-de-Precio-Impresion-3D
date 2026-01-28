# 🚀 RoadMap: Calculadora de Impresión 3D Pro

Este documento detalla la hoja de ruta para la reestructuración completa de la aplicación, transformándola en una herramienta profesional de nivel empresarial para el sector de la fabricación aditiva.

## 🎨 Fase 1: Rediseño de UI/UX (El "Lavado de Cara")
- [ ] **Migración a Tailwind CSS + Shadcn/ui:** Sustituir los estilos CSS manuales por un sistema de diseño basado en componentes modernos y accesibles.
- [ ] **Dashboard Principal:** Vista unificada con estadísticas rápidas (coste total, tiempo estimado, margen de beneficio).
- [ ] **Tematización Dinámica:** Implementación de un modo oscuro (Dark Mode) y modo claro optimizado para entornos de taller.
- [ ] **Feedback Visual:** Micro-interacciones con Framer Motion para mejorar la experiencia de usuario.

## 🛠️ Fase 2: Reestructuración de la Arquitectura
- [ ] **Migración a TypeScript:** Implementar tipado estricto para evitar errores en los cálculos matemáticos complejos.
- [ ] **Capa de Lógica Independiente:** Separar las fórmulas matemáticas (Filamento/Resina) en módulos `utils` puros, facilitando las pruebas unitarias.
- [ ] **Gestión de Estado Pro:** Implementar `Zustand` para manejar la persistencia de configuraciones de impresoras y precios de materiales de forma global.

## 📊 Fase 3: Nuevas Funcionalidades "Premium"
- [ ] **Gestor de Inventario:** Base de datos local para guardar perfiles de materiales (marca, precio por kg, densidad).
- [ ] **Calculadora de Consumo Eléctrico:** Cálculo dinámico basado en vatios de la impresora y precio del kWh actualizable.
- [ ] **Exportador de Presupuestos:** Generación automática de PDFs profesionales con el desglose de costes para clientes finales.

## 📦 Fase 4: Distribución y Despliegue
- [ ] **Optimización de Electron:** Configuración de auto-updates y empaquetado profesional para Windows/Linux.
- [ ] **PWA (Progressive Web App):** Configuración para que la versión web sea instalable en dispositivos móviles.
- [ ] **CI/CD:** Automatización de despliegues mediante GitHub Actions.