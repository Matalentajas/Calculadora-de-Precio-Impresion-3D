export const parseGCode = (text) => {
  const metadata = {
    timeHours: 0,
    timeMinutes: 0,
    weight: 0,
    layerHeight: 0,
    filamentType: 'Unknown',
    thumbnail: null,
    slicer: 'Unknown'
  };

  // 1. Detectar Slicer y Tiempo
  // Cura: ;TIME:12345
  const curaTime = text.match(/;TIME:(\d+)/);
  if (curaTime) {
    const seconds = parseInt(curaTime[1]);
    metadata.timeHours = Math.floor(seconds / 3600);
    metadata.timeMinutes = Math.floor((seconds % 3600) / 60);
    metadata.slicer = 'Cura';
  }

  // Prusa/Bambu/Orca: ; estimated printing time = 1h 20m 30s
  const prusaTime = text.match(/; estimated printing time = (.*)/);
  if (prusaTime) {
    const t = prusaTime[1];
    const h = t.match(/(\d+)h/);
    const m = t.match(/(\d+)m/);
    if (h) metadata.timeHours = parseInt(h[1]);
    if (m) metadata.timeMinutes = parseInt(m[1]);
    metadata.slicer = 'Prusa/Bambu';
  }

  // 2. Detectar Peso
  // ; filament used [g] = 12.3
  const weightMatch = text.match(/; filament used \[g\] = (\d+\.?\d*)/);
  if (weightMatch) metadata.weight = parseFloat(weightMatch[1]);

  // Cura a veces usa metros, conversión aprox (3g/m para PLA 1.75) si no hay peso
  if (!weightMatch) {
    const lengthMatch = text.match(/;Filament used: (\d+\.?\d*)m/);
    if (lengthMatch) metadata.weight = parseFloat(lengthMatch[1]) * 3; 
  }

  // 3. Detectar Altura de Capa
  const layerMatch = text.match(/; Layer height: (\d+\.?\d*)/) || text.match(/;LAYER_HEIGHT:(\d+\.?\d*)/);
  if (layerMatch) metadata.layerHeight = parseFloat(layerMatch[1]);

  // 4. Detectar Tipo de Filamento
  const matMatch = text.match(/; filament_type = (\w+)/) || text.match(/;MATERIAL:(\w+)/);
  if (matMatch) metadata.filamentType = matMatch[1];

  // 5. EXTRACCIÓN DE MINIATURA (THUMBNAIL)
  // Busca bloques base64 entre headers de thumbnail
  const thumbStart = text.indexOf('; thumbnail begin');
  const thumbEnd = text.indexOf('; thumbnail end');
  
  if (thumbStart !== -1 && thumbEnd !== -1) {
    // Extraer el bloque, limpiar comentarios y espacios
    let base64Block = text.substring(thumbStart, thumbEnd);
    // Eliminar la línea de cabecera que suele tener dimensiones "; thumbnail begin 300x300 1234"
    base64Block = base64Block.split('\n').slice(1).join(''); 
    // Eliminar los "; " del inicio de cada línea
    base64Block = base64Block.replace(/; /g, '').replace(/\s/g, '');
    metadata.thumbnail = `data:image/png;base64,${base64Block}`;
  }

  return metadata;
};