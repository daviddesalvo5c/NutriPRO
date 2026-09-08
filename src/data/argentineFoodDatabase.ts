// Base de Datos Nutricional de Argentina para NutriFit Pro
// Contiene alimentos comunes, platos tradicionales, desayunos, carnes, guarniciones y lácteos argentinos.
// Valores basados en tablas de composición de alimentos (Argenfoods / USDA / Tablas Nutricionales Argentinas).

export interface ArgentineFood {
  id: string;
  name: string;
  category: ArgentineCategory;
  tags: string[];
  unitName: string; // ej: "unidad", "huevo", "empanada", "medialuna", "cucharada", "rebanada", "filete"
  gramsPerUnit: number;
  per100g: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  defaultUnitCount?: number;
  popular?: boolean;
}

export type ArgentineCategory = 
  | 'Huevos y Desayuno'
  | 'Infusiones y Bebidas'
  | 'Carnes y Asado'
  | 'Pastas y Arroces'
  | 'Lácteos y Quesos'
  | 'Panificados y Dulces'
  | 'Guarniciones y Verduras'
  | 'Comidas Típicas Argentinas'
  | 'Frutas'
  | 'Snacks y Suplementos';

export const ARGENTINE_FOOD_DATABASE: ArgentineFood[] = [
  // ==========================================
  // HUEVOS Y PREPARACIONES CON HUEVO
  // ==========================================
  {
    id: 'arg_huevo_duro',
    name: 'Huevo duro / cocido',
    category: 'Huevos y Desayuno',
    tags: ['huevo', 'huevos', 'duro', 'cocido', 'hervido', 'proteina', 'desayuno'],
    unitName: 'unidad (mediano)',
    gramsPerUnit: 50,
    per100g: { calories: 155, protein: 12.6, carbs: 1.1, fat: 10.6 },
    defaultUnitCount: 2,
    popular: true,
  },
  {
    id: 'arg_huevos_revueltos',
    name: 'Huevos revueltos',
    category: 'Huevos y Desayuno',
    tags: ['huevo', 'huevos', 'revueltos', 'revuelto', 'desayuno', 'proteina'],
    unitName: 'huevo revuelto',
    gramsPerUnit: 60,
    per100g: { calories: 168, protein: 11.3, carbs: 1.3, fat: 12.9 },
    defaultUnitCount: 2,
    popular: true,
  },
  {
    id: 'arg_huevo_frito',
    name: 'Huevo frito (en aceite/manteca)',
    category: 'Huevos y Desayuno',
    tags: ['huevo', 'huevos', 'frito', 'fritos'],
    unitName: 'unidad frita',
    gramsPerUnit: 55,
    per100g: { calories: 209, protein: 11.8, carbs: 0.8, fat: 17.5 },
    defaultUnitCount: 1,
    popular: true,
  },
  {
    id: 'arg_clara_huevo',
    name: 'Clara de huevo cocida',
    category: 'Huevos y Desayuno',
    tags: ['huevo', 'clara', 'claras', 'proteina', 'fit', 'fitness'],
    unitName: 'clara',
    gramsPerUnit: 33,
    per100g: { calories: 52, protein: 10.9, carbs: 0.7, fat: 0.2 },
    defaultUnitCount: 3,
    popular: true,
  },
  {
    id: 'arg_omelette_queso',
    name: 'Omelette con queso cremoso / por salut',
    category: 'Huevos y Desayuno',
    tags: ['huevo', 'omelette', 'tortilla', 'queso', 'cena', 'desayuno'],
    unitName: 'omelette (2 huevos + queso)',
    gramsPerUnit: 140,
    per100g: { calories: 185, protein: 13.5, carbs: 1.5, fat: 14.0 },
    defaultUnitCount: 1,
    popular: true,
  },
  {
    id: 'arg_huevo_poche',
    name: 'Huevo poché / pasado por agua',
    category: 'Huevos y Desayuno',
    tags: ['huevo', 'poche', 'pasado por agua'],
    unitName: 'unidad',
    gramsPerUnit: 50,
    per100g: { calories: 143, protein: 12.5, carbs: 0.7, fat: 9.9 },
    defaultUnitCount: 2,
  },

  // ==========================================
  // CARNES VACUNAS Y ASADO ARGENTINO
  // ==========================================
  {
    id: 'arg_bife_chorizo',
    name: 'Bife de chorizo a la plancha / parrilla',
    category: 'Carnes y Asado',
    tags: ['carne', 'bife', 'chorizo', 'asado', 'vaca', 'parrilla'],
    unitName: 'bife mediano',
    gramsPerUnit: 250,
    per100g: { calories: 215, protein: 25.0, carbs: 0.0, fat: 12.8 },
    defaultUnitCount: 1,
    popular: true,
  },
  {
    id: 'arg_lomo_vacuno',
    name: 'Lomo vacuno magro a la plancha',
    category: 'Carnes y Asado',
    tags: ['carne', 'lomo', 'magro', 'vaca', 'bife'],
    unitName: 'bife de lomo',
    gramsPerUnit: 200,
    per100g: { calories: 165, protein: 28.0, carbs: 0.0, fat: 5.8 },
    defaultUnitCount: 1,
    popular: true,
  },
  {
    id: 'arg_asado_tira',
    name: 'Asado de tira vacuno a la parrilla',
    category: 'Carnes y Asado',
    tags: ['carne', 'asado', 'tira', 'costilla', 'parrilla'],
    unitName: 'porción servida',
    gramsPerUnit: 200,
    per100g: { calories: 290, protein: 22.0, carbs: 0.0, fat: 22.5 },
    defaultUnitCount: 1,
    popular: true,
  },
  {
    id: 'arg_vacio',
    name: 'Vacío vacuno a la parrilla / horno',
    category: 'Carnes y Asado',
    tags: ['carne', 'vacio', 'asado', 'parrilla', 'horno'],
    unitName: 'porción',
    gramsPerUnit: 200,
    per100g: { calories: 235, protein: 24.5, carbs: 0.0, fat: 15.2 },
    defaultUnitCount: 1,
    popular: true,
  },
  {
    id: 'arg_cuadril',
    name: 'Colita de cuadril / Bife de cuadril',
    category: 'Carnes y Asado',
    tags: ['carne', 'cuadril', 'colita', 'bife'],
    unitName: 'bife',
    gramsPerUnit: 200,
    per100g: { calories: 180, protein: 26.5, carbs: 0.0, fat: 8.2 },
    defaultUnitCount: 1,
  },
  {
    id: 'arg_milanesa_ternera_horno',
    name: 'Milanesa de ternera al horno (sin aceite)',
    category: 'Carnes y Asado',
    tags: ['milanesa', 'milanesas', 'ternera', 'carne', 'horno', 'clasico'],
    unitName: 'milanesa mediana',
    gramsPerUnit: 140,
    per100g: { calories: 195, protein: 21.0, carbs: 12.0, fat: 6.8 },
    defaultUnitCount: 1,
    popular: true,
  },
  {
    id: 'arg_milanesa_ternera_frita',
    name: 'Milanesa de ternera frita',
    category: 'Carnes y Asado',
    tags: ['milanesa', 'milanesas', 'ternera', 'frita'],
    unitName: 'milanesa mediana',
    gramsPerUnit: 140,
    per100g: { calories: 275, protein: 19.5, carbs: 14.5, fat: 15.5 },
    defaultUnitCount: 1,
  },
  {
    id: 'arg_milanesa_napolitana',
    name: 'Milanesa napolitana (salsa + jamón + queso)',
    category: 'Carnes y Asado',
    tags: ['milanesa', 'napolitana', 'queso', 'jamon', 'ternera'],
    unitName: 'porción napolitana',
    gramsPerUnit: 220,
    per100g: { calories: 235, protein: 22.5, carbs: 11.0, fat: 11.2 },
    defaultUnitCount: 1,
    popular: true,
  },
  {
    id: 'arg_pechuga_pollo',
    name: 'Pechuga de pollo a la plancha / grill',
    category: 'Carnes y Asado',
    tags: ['pollo', 'pechuga', 'grill', 'plancha', 'fit', 'fitness', 'proteina'],
    unitName: 'pechuga mediana',
    gramsPerUnit: 180,
    per100g: { calories: 130, protein: 28.5, carbs: 0.0, fat: 1.8 },
    defaultUnitCount: 1,
    popular: true,
  },
  {
    id: 'arg_pata_muslo_horno',
    name: 'Pata muslo de pollo al horno (sin piel)',
    category: 'Carnes y Asado',
    tags: ['pollo', 'pata', 'muslo', 'horno'],
    unitName: 'pata muslo',
    gramsPerUnit: 160,
    per100g: { calories: 155, protein: 24.0, carbs: 0.0, fat: 6.5 },
    defaultUnitCount: 1,
  },
  {
    id: 'arg_milanesa_pollo_horno',
    name: 'Milanesa de pollo (Suprema) al horno',
    category: 'Carnes y Asado',
    tags: ['milanesa', 'pollo', 'suprema', 'horno'],
    unitName: 'suprema',
    gramsPerUnit: 150,
    per100g: { calories: 180, protein: 23.5, carbs: 11.5, fat: 4.5 },
    defaultUnitCount: 1,
    popular: true,
  },
  {
    id: 'arg_carne_picada_magra',
    name: 'Carne picada especial / magra cocida',
    category: 'Carnes y Asado',
    tags: ['carne', 'picada', 'magra', 'especial', 'hamburguesa'],
    unitName: 'hamburguesa casera',
    gramsPerUnit: 120,
    per100g: { calories: 190, protein: 25.0, carbs: 0.0, fat: 10.0 },
    defaultUnitCount: 1,
  },

  // ==========================================
  // COMIDAS TÍPICAS Y CLÁSICOS ARGENTINOS
  // ==========================================
  {
    id: 'arg_empanada_carne_horno',
    name: 'Empanada de carne al horno (criolla)',
    category: 'Comidas Típicas Argentinas',
    tags: ['empanada', 'empanadas', 'carne', 'horno', 'criolla'],
    unitName: 'empanada',
    gramsPerUnit: 100,
    per100g: { calories: 245, protein: 9.5, carbs: 24.0, fat: 12.5 },
    defaultUnitCount: 2,
    popular: true,
  },
  {
    id: 'arg_empanada_jyq',
    name: 'Empanada de jamón y queso al horno',
    category: 'Comidas Típicas Argentinas',
    tags: ['empanada', 'empanadas', 'jamon', 'queso', 'horno'],
    unitName: 'empanada',
    gramsPerUnit: 90,
    per100g: { calories: 270, protein: 11.0, carbs: 25.5, fat: 14.0 },
    defaultUnitCount: 2,
    popular: true,
  },
  {
    id: 'arg_empanada_pollo',
    name: 'Empanada de pollo al horno',
    category: 'Comidas Típicas Argentinas',
    tags: ['empanada', 'pollo', 'horno'],
    unitName: 'empanada',
    gramsPerUnit: 100,
    per100g: { calories: 230, protein: 10.5, carbs: 24.0, fat: 10.2 },
    defaultUnitCount: 2,
  },
  {
    id: 'arg_tarta_acelga_pascualina',
    name: 'Tarta pascualina de acelga/espinaca y huevo (1 porción)',
    category: 'Comidas Típicas Argentinas',
    tags: ['tarta', 'pascualina', 'acelga', 'espinaca', 'huevo'],
    unitName: 'porción (1/8 de tarta)',
    gramsPerUnit: 150,
    per100g: { calories: 175, protein: 6.5, carbs: 18.0, fat: 8.8 },
    defaultUnitCount: 1,
    popular: true,
  },
  {
    id: 'arg_tarta_jamon_queso',
    name: 'Tarta de jamón y queso (1 porción)',
    category: 'Comidas Típicas Argentinas',
    tags: ['tarta', 'jamon', 'queso'],
    unitName: 'porción (1/8 de tarta)',
    gramsPerUnit: 150,
    per100g: { calories: 260, protein: 12.0, carbs: 22.0, fat: 14.0 },
    defaultUnitCount: 1,
  },
  {
    id: 'arg_choripan',
    name: 'Choripán con chimichurri / salsa criolla',
    category: 'Comidas Típicas Argentinas',
    tags: ['choripan', 'chorizo', 'pan', 'asado', 'parrilla'],
    unitName: 'choripán completo',
    gramsPerUnit: 180,
    per100g: { calories: 310, protein: 13.0, carbs: 24.0, fat: 18.5 },
    defaultUnitCount: 1,
  },

  // ==========================================
  // PASTAS, ARROCES Y GUARNICIONES
  // ==========================================
  {
    id: 'arg_arroz_blanco_cocido',
    name: 'Arroz blanco cocido',
    category: 'Pastas y Arroces',
    tags: ['arroz', 'blanco', 'guarnicion', 'carbohidrato'],
    unitName: 'plato / taza cocida',
    gramsPerUnit: 180,
    per100g: { calories: 130, protein: 2.7, carbs: 28.2, fat: 0.3 },
    defaultUnitCount: 1,
    popular: true,
  },
  {
    id: 'arg_arroz_integral_cocido',
    name: 'Arroz integral cocido',
    category: 'Pastas y Arroces',
    tags: ['arroz', 'integral', 'fibra', 'saludable'],
    unitName: 'plato / taza cocida',
    gramsPerUnit: 180,
    per100g: { calories: 112, protein: 2.6, carbs: 23.5, fat: 0.9 },
    defaultUnitCount: 1,
  },
  {
    id: 'arg_fideos_secos_cocidos',
    name: 'Fideos secos cocidos (tallarines / tirabuzón)',
    category: 'Pastas y Arroces',
    tags: ['fideos', 'pasta', 'tallarines', 'spaghetti', 'tirabuzon', 'guiso'],
    unitName: 'plato mediano cocido',
    gramsPerUnit: 200,
    per100g: { calories: 140, protein: 5.2, carbs: 27.8, fat: 0.8 },
    defaultUnitCount: 1,
    popular: true,
  },
  {
    id: 'arg_pure_papas',
    name: 'Puré de papas con leche descremada y manteca',
    category: 'Guarniciones y Verduras',
    tags: ['pure', 'papa', 'papas', 'guarnicion'],
    unitName: 'porción servida',
    gramsPerUnit: 200,
    per100g: { calories: 95, protein: 2.0, carbs: 16.5, fat: 2.4 },
    defaultUnitCount: 1,
    popular: true,
  },
  {
    id: 'arg_papa_al_horno',
    name: 'Papa asada / al horno con cáscara',
    category: 'Guarniciones y Verduras',
    tags: ['papa', 'papas', 'horno', 'asada'],
    unitName: 'papa mediana',
    gramsPerUnit: 180,
    per100g: { calories: 85, protein: 2.1, carbs: 19.0, fat: 0.2 },
    defaultUnitCount: 1,
    popular: true,
  },
  {
    id: 'arg_batata_horno',
    name: 'Batata / Camote al horno',
    category: 'Guarniciones y Verduras',
    tags: ['batata', 'camote', 'horno', 'carbohidrato'],
    unitName: 'batata mediana',
    gramsPerUnit: 180,
    per100g: { calories: 90, protein: 2.0, carbs: 20.7, fat: 0.1 },
    defaultUnitCount: 1,
  },
  {
    id: 'arg_lentejas_cocidas',
    name: 'Lentejas hervidas / cocidas',
    category: 'Pastas y Arroces',
    tags: ['lentejas', 'guiso', 'legumbre', 'hierro', 'fibra', 'proteina'],
    unitName: 'plato hondo cocido',
    gramsPerUnit: 200,
    per100g: { calories: 116, protein: 9.0, carbs: 20.1, fat: 0.4 },
    defaultUnitCount: 1,
    popular: true,
  },
  {
    id: 'arg_avena_tradicional',
    name: 'Avena en hojuelas / arrollada',
    category: 'Pastas y Arroces',
    tags: ['avena', 'quaker', 'desayuno', 'porridge', 'fibra', 'fit'],
    unitName: 'porción / 4 cdas soperas',
    gramsPerUnit: 40,
    per100g: { calories: 375, protein: 13.5, carbs: 64.0, fat: 6.5 },
    defaultUnitCount: 1,
    popular: true,
  },

  // ==========================================
  // LÁCTEOS Y QUESOS ARGENTINOS
  // ==========================================
  {
    id: 'arg_queso_por_salut',
    name: 'Queso Por Salut clásico / La Serenísima',
    category: 'Lácteos y Quesos',
    tags: ['queso', 'por salut', 'port salut', 'desayuno', 'cremoso'],
    unitName: 'feta / porción estándar',
    gramsPerUnit: 30,
    per100g: { calories: 245, protein: 22.0, carbs: 1.5, fat: 17.0 },
    defaultUnitCount: 1,
    popular: true,
  },
  {
    id: 'arg_queso_por_salut_light',
    name: 'Queso Por Salut Light / Descremado 0% sal',
    category: 'Lácteos y Quesos',
    tags: ['queso', 'light', 'por salut', 'diet', 'fit', 'magro'],
    unitName: 'feta / porción estándar',
    gramsPerUnit: 30,
    per100g: { calories: 190, protein: 24.5, carbs: 1.8, fat: 9.5 },
    defaultUnitCount: 1,
    popular: true,
  },
  {
    id: 'arg_queso_cremoso_cuartirolo',
    name: 'Queso Cremoso / Cuartirolo',
    category: 'Lácteos y Quesos',
    tags: ['queso', 'cremoso', 'cuartirolo', 'pizza'],
    unitName: 'porción (30g)',
    gramsPerUnit: 30,
    per100g: { calories: 295, protein: 19.5, carbs: 1.2, fat: 23.5 },
    defaultUnitCount: 1,
    popular: true,
  },
  {
    id: 'arg_queso_untable_descremado',
    name: 'Queso blanco untable descremado (Casandrem / Finlandia Light)',
    category: 'Lácteos y Quesos',
    tags: ['queso', 'untable', 'casancrem', 'finlandia', 'light', 'tostada'],
    unitName: 'cucharada sopera colmada',
    gramsPerUnit: 30,
    per100g: { calories: 95, protein: 8.5, carbs: 4.5, fat: 4.8 },
    defaultUnitCount: 1,
    popular: true,
  },
  {
    id: 'arg_leche_descremada',
    name: 'Leche descremada fluida (La Serenísima / Ilolay)',
    category: 'Lácteos y Quesos',
    tags: ['leche', 'descremada', 'cafe', 'cortado', 'desayuno'],
    unitName: 'taza / vaso (200ml)',
    gramsPerUnit: 200,
    per100g: { calories: 43, protein: 3.2, carbs: 4.8, fat: 1.2 },
    defaultUnitCount: 1,
    popular: true,
  },
  {
    id: 'arg_leche_entera',
    name: 'Leche entera fluida (3% grasa)',
    category: 'Lácteos y Quesos',
    tags: ['leche', 'entera'],
    unitName: 'taza / vaso (200ml)',
    gramsPerUnit: 200,
    per100g: { calories: 59, protein: 3.1, carbs: 4.7, fat: 3.0 },
    defaultUnitCount: 1,
  },
  {
    id: 'arg_yogur_descremado',
    name: 'Yogur bebible / firme descremado con frutas',
    category: 'Lácteos y Quesos',
    tags: ['yogur', 'descremado', 'desayuno', 'merienda'],
    unitName: 'vasito (140g)',
    gramsPerUnit: 140,
    per100g: { calories: 60, protein: 3.5, carbs: 10.5, fat: 0.4 },
    defaultUnitCount: 1,
    popular: true,
  },
  {
    id: 'arg_yogur_griego_natural',
    name: 'Yogur estilo griego natural sin azúcar',
    category: 'Lácteos y Quesos',
    tags: ['yogur', 'griego', 'proteina', 'fit', 'fitness'],
    unitName: 'pote (150g)',
    gramsPerUnit: 150,
    per100g: { calories: 85, protein: 9.5, carbs: 4.0, fat: 3.2 },
    defaultUnitCount: 1,
    popular: true,
  },

  // ==========================================
  // PANIFICADOS, FACTURAS Y DULCES ARGENTINOS
  // ==========================================
  {
    id: 'arg_medialuna_manteca',
    name: 'Medialuna de manteca porteña',
    category: 'Panificados y Dulces',
    tags: ['medialuna', 'medialunas', 'manteca', 'factura', 'cafe', 'desayuno'],
    unitName: 'unidad (medialuna)',
    gramsPerUnit: 45,
    per100g: { calories: 385, protein: 7.2, carbs: 48.0, fat: 18.5 },
    defaultUnitCount: 1,
    popular: true,
  },
  {
    id: 'arg_medialuna_grasa',
    name: 'Medialuna de grasa / salada',
    category: 'Panificados y Dulces',
    tags: ['medialuna', 'grasa', 'factura', 'mate'],
    unitName: 'unidad (medialuna)',
    gramsPerUnit: 40,
    per100g: { calories: 395, protein: 7.0, carbs: 45.0, fat: 20.8 },
    defaultUnitCount: 1,
    popular: true,
  },
  {
    id: 'arg_dulce_de_leche',
    name: 'Dulce de leche clásico / colonial',
    category: 'Panificados y Dulces',
    tags: ['dulce de leche', 'dulce', 'postre', 'tostada', 'clasico'],
    unitName: 'cucharada sopera',
    gramsPerUnit: 20,
    per100g: { calories: 315, protein: 6.2, carbs: 55.0, fat: 7.5 },
    defaultUnitCount: 1,
    popular: true,
  },
  {
    id: 'arg_pan_lactal_integral',
    name: 'Pan lactal integral (Fargo / Bimbo)',
    category: 'Panificados y Dulces',
    tags: ['pan', 'lactal', 'integral', 'tostada', 'sandwich', 'fibra'],
    unitName: 'rebanada / feta',
    gramsPerUnit: 25,
    per100g: { calories: 235, protein: 9.0, carbs: 42.0, fat: 3.2 },
    defaultUnitCount: 2,
    popular: true,
  },
  {
    id: 'arg_pan_frances_miñon',
    name: 'Pan francés / miñón de panadería',
    category: 'Panificados y Dulces',
    tags: ['pan', 'frances', 'miñon', 'panaderia'],
    unitName: 'miñón (unidad)',
    gramsPerUnit: 50,
    per100g: { calories: 265, protein: 8.5, carbs: 54.0, fat: 1.2 },
    defaultUnitCount: 1,
    popular: true,
  },
  {
    id: 'arg_tostadas_arroz',
    name: 'Tostadas / Galletas de arroz (Gallo)',
    category: 'Panificados y Dulces',
    tags: ['tostada', 'arroz', 'galleta', 'gallo', 'diet', 'fit'],
    unitName: 'galleta / unidad',
    gramsPerUnit: 10,
    per100g: { calories: 370, protein: 7.5, carbs: 80.0, fat: 2.0 },
    defaultUnitCount: 3,
    popular: true,
  },
  {
    id: 'arg_alfajor_chocolate',
    name: 'Alfajor de chocolate con dulce de leche (Havanna / Guaymallén)',
    category: 'Panificados y Dulces',
    tags: ['alfajor', 'chocolate', 'dulce de leche', 'havanna', 'guaymallen', 'golosina'],
    unitName: 'alfajor (unidad)',
    gramsPerUnit: 55,
    per100g: { calories: 395, protein: 5.5, carbs: 62.0, fat: 14.0 },
    defaultUnitCount: 1,
    popular: true,
  },

  // ==========================================
  // FRUTAS Y VEGETALES COMUNES
  // ==========================================
  {
    id: 'arg_banana',
    name: 'Banana / Plátano maduro',
    category: 'Frutas',
    tags: ['banana', 'fruta', 'potasio', 'entrenamiento', 'merienda'],
    unitName: 'banana mediana pelada',
    gramsPerUnit: 120,
    per100g: { calories: 89, protein: 1.1, carbs: 22.8, fat: 0.3 },
    defaultUnitCount: 1,
    popular: true,
  },
  {
    id: 'arg_manzana',
    name: 'Manzana roja / verde',
    category: 'Frutas',
    tags: ['manzana', 'fruta', 'fibra', 'snack'],
    unitName: 'manzana mediana',
    gramsPerUnit: 160,
    per100g: { calories: 52, protein: 0.3, carbs: 13.8, fat: 0.2 },
    defaultUnitCount: 1,
    popular: true,
  },
  {
    id: 'arg_palta_aguacate',
    name: 'Palta fresca (Hass / criolla)',
    category: 'Guarniciones y Verduras',
    tags: ['palta', 'aguacate', 'grasa saludable', 'ensalada', 'tostada'],
    unitName: 'media palta limpia',
    gramsPerUnit: 80,
    per100g: { calories: 160, protein: 2.0, carbs: 8.5, fat: 14.7 },
    defaultUnitCount: 1,
    popular: true,
  },
  {
    id: 'arg_tomate_redondo',
    name: 'Tomate redondo / perita fresco',
    category: 'Guarniciones y Verduras',
    tags: ['tomate', 'ensalada', 'verdura'],
    unitName: 'tomate mediano',
    gramsPerUnit: 120,
    per100g: { calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2 },
    defaultUnitCount: 1,
  },
  {
    id: 'arg_lechuga',
    name: 'Lechuga mantecosa / criolla',
    category: 'Guarniciones y Verduras',
    tags: ['lechuga', 'ensalada', 'verde'],
    unitName: 'plato de ensalada',
    gramsPerUnit: 100,
    per100g: { calories: 15, protein: 1.4, carbs: 2.9, fat: 0.2 },
    defaultUnitCount: 1,
  },
  {
    id: 'arg_aceite_oliva',
    name: 'Aceite de oliva extra virgen',
    category: 'Guarniciones y Verduras',
    tags: ['aceite', 'oliva', 'ensalada', 'aderezo'],
    unitName: 'cucharada sopera (12ml)',
    gramsPerUnit: 12,
    per100g: { calories: 884, protein: 0.0, carbs: 0.0, fat: 100.0 },
    defaultUnitCount: 1,
    popular: true,
  },

  // ==========================================
  // SNACKS Y SUPLEMENTOS
  // ==========================================
  {
    id: 'arg_proteina_whey',
    name: 'Proteína Whey 80% (Star Nutrition / ENA)',
    category: 'Snacks y Suplementos',
    tags: ['proteina', 'whey', 'star nutrition', 'ena', 'batido', 'gym', 'fit'],
    unitName: 'scoop / medida',
    gramsPerUnit: 30,
    per100g: { calories: 380, protein: 78.0, carbs: 6.0, fat: 4.5 },
    defaultUnitCount: 1,
    popular: true,
  },

  // ==========================================
  // INFUSIONES Y BEBIDAS ARGENTINAS (Café, Mate, Té, Cocido, Kéfir, Aguas)
  // ==========================================
  {
    id: 'arg_cafe_espresso',
    name: 'Café espresso (pocillo solo / negro)',
    category: 'Infusiones y Bebidas',
    tags: ['cafe', 'café', 'espresso', 'pocillo', 'negro', 'infusion', 'bebida', 'sin calorias', 'desayuno'],
    unitName: 'pocillo (60ml)',
    gramsPerUnit: 60,
    per100g: { calories: 2, protein: 0.1, carbs: 0.3, fat: 0.0 },
    defaultUnitCount: 1,
    popular: true,
  },
  {
    id: 'arg_cafe_filtrado',
    name: 'Café filtrado / americano (taza)',
    category: 'Infusiones y Bebidas',
    tags: ['cafe', 'café', 'filtrado', 'americano', 'negro', 'taza', 'jarrito', 'infusion', 'bebida', 'desayuno'],
    unitName: 'taza (200ml)',
    gramsPerUnit: 200,
    per100g: { calories: 2, protein: 0.2, carbs: 0.3, fat: 0.0 },
    defaultUnitCount: 1,
    popular: true,
  },
  {
    id: 'arg_cafe_con_leche',
    name: 'Café con leche tradicional',
    category: 'Infusiones y Bebidas',
    tags: ['cafe', 'café', 'leche', 'cafe con leche', 'cortado', 'lagrima', 'taza', 'desayuno', 'merienda', 'infusion', 'bebida'],
    unitName: 'taza (200ml: 100ml café + 100ml leche)',
    gramsPerUnit: 200,
    per100g: { calories: 35, protein: 2.1, carbs: 3.2, fat: 1.4 },
    defaultUnitCount: 1,
    popular: true,
  },
  {
    id: 'arg_cafe_cortado',
    name: 'Café cortado en jarrito',
    category: 'Infusiones y Bebidas',
    tags: ['cafe', 'café', 'cortado', 'lagrima', 'jarrito', 'infusion', 'bebida', 'leche'],
    unitName: 'jarrito (150ml: café + chorro leche)',
    gramsPerUnit: 150,
    per100g: { calories: 24, protein: 1.4, carbs: 2.2, fat: 1.0 },
    defaultUnitCount: 1,
    popular: true,
  },
  {
    id: 'arg_mate_amargo',
    name: 'Mate cebado amargo (yerba mate en calabaza)',
    category: 'Infusiones y Bebidas',
    tags: ['mate', 'yerba', 'cebado', 'amargo', 'yerba mate', 'infusion', 'bebida', 'termo', 'mateada'],
    unitName: 'mateada / ronda (50g yerba)',
    gramsPerUnit: 50,
    per100g: { calories: 40, protein: 1.5, carbs: 8.0, fat: 0.2 },
    defaultUnitCount: 1,
    popular: true,
  },
  {
    id: 'arg_mate_dulce',
    name: 'Mate cebado dulce (con azúcar)',
    category: 'Infusiones y Bebidas',
    tags: ['mate', 'yerba', 'dulce', 'azucar', 'cebado', 'infusion', 'bebida', 'mateada'],
    unitName: 'mateada dulce (50g yerba + azúcar)',
    gramsPerUnit: 65,
    per100g: { calories: 130, protein: 1.2, carbs: 30.5, fat: 0.1 },
    defaultUnitCount: 1,
    popular: true,
  },
  {
    id: 'arg_mate_cocido',
    name: 'Mate cocido clásico (saquito o colado)',
    category: 'Infusiones y Bebidas',
    tags: ['mate cocido', 'cocido', 'mate', 'saquito', 'taza', 'infusion', 'bebida', 'desayuno', 'merienda'],
    unitName: 'taza (200ml sin azúcar)',
    gramsPerUnit: 200,
    per100g: { calories: 2, protein: 0.1, carbs: 0.4, fat: 0.0 },
    defaultUnitCount: 1,
    popular: true,
  },
  {
    id: 'arg_mate_cocido_leche',
    name: 'Mate cocido con leche',
    category: 'Infusiones y Bebidas',
    tags: ['mate cocido', 'cocido', 'mate', 'leche', 'mate cocido con leche', 'taza', 'infusion', 'bebida', 'desayuno'],
    unitName: 'taza (200ml: 100ml leche + cocido)',
    gramsPerUnit: 200,
    per100g: { calories: 33, protein: 2.0, carbs: 3.1, fat: 1.3 },
    defaultUnitCount: 1,
    popular: true,
  },
  {
    id: 'arg_te_clasico',
    name: 'Té en saquito (negro, verde o hierbas)',
    category: 'Infusiones y Bebidas',
    tags: ['te', 'té', 'infusion', 'negro', 'verde', 'hierbas', 'manzanilla', 'boldo', 'taza', 'bebida'],
    unitName: 'taza (200ml sin azúcar)',
    gramsPerUnit: 200,
    per100g: { calories: 1, protein: 0.1, carbs: 0.2, fat: 0.0 },
    defaultUnitCount: 1,
    popular: true,
  },
  {
    id: 'arg_te_con_leche',
    name: 'Té con leche',
    category: 'Infusiones y Bebidas',
    tags: ['te', 'té', 'te con leche', 'infusion', 'leche', 'taza', 'bebida'],
    unitName: 'taza (200ml: 50ml leche + té)',
    gramsPerUnit: 200,
    per100g: { calories: 18, protein: 1.0, carbs: 1.6, fat: 0.7 },
    defaultUnitCount: 1,
    popular: true,
  },
  {
    id: 'arg_agua_saborizada_cero',
    name: 'Agua saborizada sin azúcar / 0% (Levité Cero, Ser, Aquarius)',
    category: 'Infusiones y Bebidas',
    tags: ['agua saborizada', 'saborizada', 'levite', 'ser', 'aquarius', 'cero', 'sin azucar', 'vaso', 'bebida', 'hidratacion', 'agua'],
    unitName: 'vaso (250ml)',
    gramsPerUnit: 250,
    per100g: { calories: 1, protein: 0.0, carbs: 0.2, fat: 0.0 },
    defaultUnitCount: 1,
    popular: true,
  },
  {
    id: 'arg_agua_saborizada_regular',
    name: 'Agua saborizada regular con azúcar (Levité / Aquarius)',
    category: 'Infusiones y Bebidas',
    tags: ['agua saborizada', 'saborizada', 'levite', 'aquarius', 'jugo', 'azucar', 'vaso', 'bebida', 'agua'],
    unitName: 'vaso (250ml)',
    gramsPerUnit: 250,
    per100g: { calories: 22, protein: 0.0, carbs: 5.4, fat: 0.0 },
    defaultUnitCount: 1,
    popular: true,
  },
  {
    id: 'arg_kefir_agua',
    name: 'Kéfir de agua artesanal (probiótico fermentado)',
    category: 'Infusiones y Bebidas',
    tags: ['kefir', 'kéfir', 'kefir de agua', 'probiotico', 'fermentado', 'nodulos', 'tibicos', 'salud', 'digestivo', 'bebida'],
    unitName: 'vaso (250ml)',
    gramsPerUnit: 250,
    per100g: { calories: 18, protein: 0.2, carbs: 4.2, fat: 0.0 },
    defaultUnitCount: 1,
    popular: true,
  },
  {
    id: 'arg_kefir_leche',
    name: 'Kéfir de leche / yogur de kéfir probiótico',
    category: 'Infusiones y Bebidas',
    tags: ['kefir', 'kéfir', 'kefir de leche', 'yogur', 'bulgaros', 'probiotico', 'lacteo', 'proteina', 'bebida', 'fermentado'],
    unitName: 'vaso / taza (200ml)',
    gramsPerUnit: 200,
    per100g: { calories: 60, protein: 3.5, carbs: 4.0, fat: 3.2 },
    defaultUnitCount: 1,
    popular: true,
  },
];

// Helper: Calculate macros based on quantity and mode
export function calculateArgentineFoodNutrition(
  food: ArgentineFood,
  quantity: number,
  mode: 'unit' | 'grams'
): {
  amountGrams: number;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  portionDescription: string;
} {
  const safeQty = Math.max(0, quantity || 0);

  let totalGrams = 0;
  let desc = '';

  if (mode === 'unit') {
    totalGrams = Math.round(safeQty * food.gramsPerUnit);
    const unitText = safeQty === 1 ? food.unitName : `${food.unitName}s`;
    desc = `${safeQty} ${unitText} (${totalGrams}g)`;
  } else {
    totalGrams = Math.round(safeQty);
    desc = `${totalGrams} gramos`;
  }

  const factor = totalGrams / 100;

  return {
    amountGrams: totalGrams,
    calories: Math.round(food.per100g.calories * factor),
    proteinGrams: Number((food.per100g.protein * factor).toFixed(1)),
    carbsGrams: Number((food.per100g.carbs * factor).toFixed(1)),
    fatGrams: Number((food.per100g.fat * factor).toFixed(1)),
    portionDescription: desc,
  };
}

// Search helper with accent insensitivity, word boundaries, and relevance ranking
export function searchArgentineFoods(query: string, category?: string): ArgentineFood[] {
  const cleanQ = query
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  // Filter by category first if specified
  const baseList = ARGENTINE_FOOD_DATABASE.filter((item) => {
    if (category && category !== 'all' && item.category !== category) {
      return false;
    }
    return true;
  });

  if (!cleanQ) {
    if (category && category !== 'all') {
      return baseList;
    }
    return baseList.filter((item) => item.popular);
  }

  // Scoring results
  const resultsWithScore: { item: ArgentineFood; score: number }[] = [];

  for (const item of baseList) {
    const cleanName = item.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    const cleanTags = item.tags.map((t) =>
      t
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
    );

    const words = cleanName.split(/[\s,./\(\)\-]+/).filter(Boolean);

    let score = 0;

    if (cleanQ.length <= 2) {
      // For short queries like "té" or "te", match exact whole words in name or tags
      const exactWordInName = words.some((w) => w === cleanQ);
      const exactTag = cleanTags.some((t) => t === cleanQ);
      const tagWordMatch = cleanTags.some((t) => t.split(/\s+/).includes(cleanQ));

      if (exactWordInName) score += 100;
      else if (exactTag) score += 90;
      else if (tagWordMatch) score += 75;
    } else {
      // For longer queries like "café", "mate", "kefir"
      if (cleanName === cleanQ) {
        score += 120;
      } else if (cleanName.startsWith(cleanQ)) {
        score += 100;
      } else if (words.some((w) => w === cleanQ)) {
        score += 90;
      } else if (cleanTags.some((t) => t === cleanQ)) {
        score += 85;
      } else if (words.some((w) => w.startsWith(cleanQ))) {
        score += 70;
      } else if (cleanTags.some((t) => t.startsWith(cleanQ))) {
        score += 65;
      } else if (cleanTags.some((t) => t.includes(cleanQ))) {
        score += 50;
      } else if (cleanName.includes(cleanQ)) {
        // Lower weight for generic substring inside other words
        score += 30;
      }
    }

    if (score > 0) {
      if (item.popular) score += 5;
      resultsWithScore.push({ item, score });
    }
  }

  // Sort descending by score
  resultsWithScore.sort((a, b) => b.score - a.score);
  return resultsWithScore.map((r) => r.item);
}

