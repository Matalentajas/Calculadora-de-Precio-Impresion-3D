# 🌍 3DPrice Pro: Master Roadmap

> **Nuestra Visión:** Convertir 3DPrice Pro en el estándar industrial (ERP) para la gestión, cotización y automatización de granjas de impresión 3D a nivel global.

Este documento delinea la evolución estratégica del proyecto, desde una herramienta de cálculo local hasta un ecosistema conectado en la nube.

---

## 🏗️ Fase 1: Consolidación del Core (Actual - v1.x)
*El objetivo es perfeccionar la experiencia "Local-First" y la estabilidad.*

- [x] **Core Engine:** Parser G-Code universal (Bambu/Prusa/Cura/Orca) y Motor de Cálculo Financiero.
- [x] **Production Suite:** Gestión de Lotes, Kits Multi-archivo y Librerías (Materiales/Impresoras).
- [x] **Invoice Builder:** Generador PDF WYSIWYG con branding personalizado.
- [ ] **Data Portability:** Sistema de Backup/Restore (Importar/Exportar `.json`) para seguridad de datos local.
- [ ] **UX/UI Polish:** Modo Oscuro/Claro (Theme Toggle) y soporte i18n (Internacionalización Español/Inglés).
- [ ] **Dashboard Analytics:** Gráficos locales de "Beneficio Mensual Proyectado" y "Material Estimado".

---

## ☁️ Fase 2: La Nube Colaborativa (SaaS Transition - v2.0)
*Salto a una arquitectura Backend para permitir el trabajo en equipo y el acceso ubicuo.*

- [ ] **Cloud Sync (Supabase/Firebase):** Sincronización de bases de datos en tiempo real. Empieza un presupuesto en el PC, termínalo en el móvil.
- [ ] **Auth System:** Cuentas de usuario y perfiles de "Organización".
- [ ] **Team Roles:** Permisos diferenciados (Administrador vs Operario). El operario ve archivos, el admin ve precios.
- [ ] **Client Portal:** En lugar de enviar un PDF, enviar un "Enlace Mágico" donde el cliente puede ver el modelo 3D (visor STL integrado), aprobar el presupuesto y pagar online (Stripe Integration).

---

## 📦 Fase 3: Smart Inventory & ERP (v3.0)
*Gestión real de recursos físicos. El software sabe lo que tienes en la estantería.*

- [ ] **Spool Tracking:** "Restar" gramos automáticamente de la bobina virtual al confirmar un trabajo.
- [ ] **QR Management:** Generación de etiquetas QR para pegar en las bobinas físicas. Escanear con el móvil para ver cuánto queda.
- [ ] **Alertas de Stock:** Notificaciones automáticas: *"Te quedan 50g de PLA Rojo, insuficiente para el proyecto actual"*.
- [ ] **Gestión de Proveedores:** Base de datos de proveedores y comparador de costes de compra.

---

## 🤖 Fase 4: IoT & Farm Automation (v4.0)
*Conexión directa con el hardware. El software habla con las máquinas.*

- [ ] **API Integrations:** Conexión nativa con **OctoPrint**, **Moonraker (Klipper)** y **Bambu Lab API**.
- [ ] **Real-Time Status:** Ver en el dashboard qué impresoras están libres, imprimiendo o en error.
- [ ] **Coste Energético Real:** Lectura de consumo real desde enchufes inteligentes (Tasmota/Shelly) o telemetría de la impresora, sustituyendo la estimación teórica.
- [ ] **Auto-Queue:** Enviar G-Codes directamente desde 3DPrice Pro a la impresora disponible más adecuada.

---

## 🧠 Fase 5: AI & "God Mode" (Futuro)
*Inteligencia Artificial aplicada a la optimización de costes.*

- [ ] **AI Failure Prediction:** Análisis de G-Code para advertir riesgos de fallo antes de imprimir (detectando voladizos extremos o configuraciones arriesgadas).
- [ ] **Smart Pricing:** Sugerencia de precios dinámica basada en la demanda del mercado o la complejidad de la geometría (Geometry Analysis sin G-Code).
- [ ] **Computer Vision:** Detección de errores mediante cámara web integrada en el flujo de trabajo.

---

### 🤝 ¿Quieres formar parte de esto?
Este proyecto es Open Source. Si eres desarrollador React, diseñador UX o Maker, tus PRs son bienvenidas.