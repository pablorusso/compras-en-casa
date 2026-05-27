import { foldText } from "./text";

export type EmojiEntry = {
  char: string;
  name: string;
  keywords: string[];
};

export const EMOJI_CATALOG: EmojiEntry[] = [
  // Comercios y lugares
  { char: "🛒", name: "carrito de compras", keywords: ["super", "supermercado", "compras", "carro"] },
  { char: "🛍️", name: "bolsas de compras", keywords: ["bolsa", "compras", "shopping"] },
  { char: "🏪", name: "tienda", keywords: ["kiosco", "almacen", "negocio", "comercio", "shop"] },
  { char: "🏬", name: "centro comercial", keywords: ["shopping", "mall", "department"] },
  { char: "🏭", name: "fabrica", keywords: ["industria", "planta"] },
  { char: "🏠", name: "casa", keywords: ["hogar", "vivienda"] },
  { char: "🏡", name: "casa con jardin", keywords: ["hogar", "patio", "casa"] },
  { char: "🥖", name: "panaderia", keywords: ["pan", "baguette", "horno"] },
  { char: "🥩", name: "carniceria", keywords: ["carne", "bife", "vacuno", "asado"] },
  { char: "🐟", name: "pescaderia", keywords: ["pescado", "mar", "fish"] },
  { char: "🍎", name: "fruteria", keywords: ["fruta", "verduleria", "manzana"] },
  { char: "🥬", name: "verduleria", keywords: ["verdura", "verde", "lechuga", "hortalizas"] },
  { char: "💊", name: "farmacia", keywords: ["medicamento", "pildora", "remedio"] },
  { char: "💉", name: "vacuna", keywords: ["jeringa", "inyeccion", "medico"] },
  { char: "🍷", name: "vinoteca", keywords: ["vino", "bodega", "copa"] },
  { char: "🌸", name: "floreria", keywords: ["flor", "florista", "ramo"] },
  { char: "🔧", name: "ferreteria", keywords: ["herramienta", "llave", "tool"] },
  { char: "🔨", name: "herramientas", keywords: ["martillo", "obra", "construccion"] },
  { char: "📚", name: "libreria", keywords: ["libro", "libros", "lectura"] },
  { char: "✏️", name: "papeleria", keywords: ["lapiz", "utiles", "escolar"] },
  { char: "🐾", name: "veterinaria", keywords: ["mascota", "huellas", "pet"] },
  { char: "🏨", name: "hotel", keywords: ["hospedaje"] },
  { char: "☕", name: "cafe", keywords: ["cafeteria", "bar", "taza"] },
  { char: "🍔", name: "comida rapida", keywords: ["hamburguesa", "fast food", "burger"] },
  { char: "🍕", name: "pizzeria", keywords: ["pizza", "italiana"] },
  { char: "🍣", name: "sushi", keywords: ["japonesa", "pescado", "asiatica"] },
  { char: "🌮", name: "comida mexicana", keywords: ["taco", "mexicano"] },
  { char: "🍦", name: "heladeria", keywords: ["helado", "cono", "ice cream"] },
  { char: "🎂", name: "pasteleria", keywords: ["torta", "cumpleanos", "reposteria"] },
  { char: "🍞", name: "pan", keywords: ["panaderia", "bread"] },

  // Carnes y proteínas
  { char: "🍖", name: "carne con hueso", keywords: ["asado", "costilla"] },
  { char: "🥓", name: "panceta", keywords: ["bacon", "tocino", "cerdo"] },
  { char: "🍗", name: "pollo", keywords: ["ave", "muslo", "pata"] },
  { char: "🐓", name: "gallo", keywords: ["pollo", "ave"] },
  { char: "🐔", name: "gallina", keywords: ["pollo", "huevo"] },
  { char: "🥚", name: "huevo", keywords: ["huevos", "egg"] },
  { char: "🍳", name: "huevo frito", keywords: ["sarten", "desayuno", "frito"] },
  { char: "🐄", name: "vaca", keywords: ["res", "ganado", "lacteos"] },
  { char: "🐖", name: "cerdo", keywords: ["chancho", "puerco"] },
  { char: "🐑", name: "oveja", keywords: ["cordero", "lana"] },
  { char: "🦃", name: "pavo", keywords: ["ave", "navidad"] },
  { char: "🦐", name: "camaron", keywords: ["langostino", "marisco"] },
  { char: "🦞", name: "langosta", keywords: ["marisco"] },
  { char: "🦑", name: "calamar", keywords: ["marisco", "pulpo"] },
  { char: "🐙", name: "pulpo", keywords: ["marisco"] },
  { char: "🍤", name: "langostino frito", keywords: ["camaron", "rebozado"] },
  { char: "🐠", name: "pescado", keywords: ["mar", "tropical"] },
  { char: "🐡", name: "pez globo", keywords: ["pescado"] },

  // Verduras y frutas
  { char: "🍅", name: "tomate", keywords: ["verdura"] },
  { char: "🥑", name: "palta", keywords: ["aguacate", "avocado"] },
  { char: "🥒", name: "pepino", keywords: ["verdura"] },
  { char: "🥕", name: "zanahoria", keywords: ["verdura", "naranja"] },
  { char: "🌽", name: "choclo", keywords: ["maiz", "elote"] },
  { char: "🌶️", name: "aji picante", keywords: ["pimiento", "chile", "picante"] },
  { char: "🫑", name: "morron", keywords: ["pimiento", "verde"] },
  { char: "🥔", name: "papa", keywords: ["patata", "tuberculo"] },
  { char: "🍠", name: "batata", keywords: ["camote", "boniato"] },
  { char: "🧅", name: "cebolla", keywords: ["verdura"] },
  { char: "🧄", name: "ajo", keywords: ["condimento"] },
  { char: "🥦", name: "brocoli", keywords: ["verde", "verdura"] },
  { char: "🥗", name: "ensalada", keywords: ["verde", "verdura", "salad"] },
  { char: "🍄", name: "hongo", keywords: ["champinion", "seta", "mushroom"] },
  { char: "🍆", name: "berenjena", keywords: ["verdura"] },
  { char: "🌰", name: "castana", keywords: ["fruto seco"] },
  { char: "🥜", name: "mani", keywords: ["cacahuate", "frutos secos"] },
  { char: "🍌", name: "banana", keywords: ["platano", "fruta"] },
  { char: "🍏", name: "manzana verde", keywords: ["fruta", "granny"] },
  { char: "🍐", name: "pera", keywords: ["fruta"] },
  { char: "🍊", name: "naranja", keywords: ["fruta", "citrico"] },
  { char: "🍋", name: "limon", keywords: ["fruta", "citrico"] },
  { char: "🍇", name: "uvas", keywords: ["fruta", "racimo"] },
  { char: "🍉", name: "sandia", keywords: ["fruta", "verano"] },
  { char: "🍈", name: "melon", keywords: ["fruta"] },
  { char: "🍓", name: "frutilla", keywords: ["fresa", "fruta"] },
  { char: "🫐", name: "arandano", keywords: ["fruta", "blueberry"] },
  { char: "🍑", name: "durazno", keywords: ["melocoton", "fruta"] },
  { char: "🍒", name: "cereza", keywords: ["fruta", "guinda"] },
  { char: "🥥", name: "coco", keywords: ["fruta", "tropical"] },
  { char: "🍍", name: "ananas", keywords: ["pina", "fruta"] },
  { char: "🥭", name: "mango", keywords: ["fruta", "tropical"] },
  { char: "🥝", name: "kiwi", keywords: ["fruta"] },

  // Lácteos y derivados
  { char: "🥛", name: "leche", keywords: ["lacteo", "vaso", "milk"] },
  { char: "🧀", name: "queso", keywords: ["lacteo"] },
  { char: "🧈", name: "manteca", keywords: ["mantequilla", "butter"] },
  { char: "🍨", name: "helado en copa", keywords: ["postre"] },
  { char: "🍧", name: "granizado", keywords: ["raspado", "postre"] },
  { char: "🍮", name: "flan", keywords: ["postre", "dulce"] },

  // Panificados y dulces
  { char: "🥐", name: "medialuna", keywords: ["croissant", "panaderia"] },
  { char: "🥯", name: "bagel", keywords: ["pan", "rosquilla"] },
  { char: "🥨", name: "pretzel", keywords: ["panificado"] },
  { char: "🥧", name: "tarta", keywords: ["pastel", "pie"] },
  { char: "🍰", name: "porcion de torta", keywords: ["torta", "pastel"] },
  { char: "🧁", name: "cupcake", keywords: ["muffin", "magdalena"] },
  { char: "🍪", name: "galletita", keywords: ["galleta", "cookie"] },
  { char: "🍩", name: "donut", keywords: ["rosquilla", "dulce"] },
  { char: "🍫", name: "chocolate", keywords: ["dulce", "tableta"] },
  { char: "🍬", name: "caramelo", keywords: ["dulce", "candy"] },
  { char: "🍭", name: "chupetin", keywords: ["caramelo", "dulce"] },
  { char: "🍯", name: "miel", keywords: ["dulce", "tarro"] },

  // Granos, pastas, cereales
  { char: "🌾", name: "trigo", keywords: ["espiga", "cereal", "grano"] },
  { char: "🍚", name: "arroz cocido", keywords: ["arroz", "tazon"] },
  { char: "🍙", name: "onigiri", keywords: ["arroz", "japones"] },
  { char: "🍘", name: "galleta de arroz", keywords: ["arroz", "snack"] },
  { char: "🍜", name: "fideos", keywords: ["ramen", "sopa", "pasta"] },
  { char: "🍝", name: "pasta", keywords: ["spaghetti", "fideos", "tallarines"] },
  { char: "🥣", name: "tazon con cereal", keywords: ["cereal", "desayuno"] },
  { char: "🥡", name: "comida para llevar", keywords: ["takeaway", "delivery"] },

  // Bebidas
  { char: "💧", name: "agua", keywords: ["gota", "water"] },
  { char: "🧊", name: "hielo", keywords: ["cubo", "ice"] },
  { char: "🥤", name: "gaseosa", keywords: ["bebida", "vaso", "refresco"] },
  { char: "🧃", name: "jugo en caja", keywords: ["jugo", "tetra"] },
  { char: "🧋", name: "bubble tea", keywords: ["bebida"] },
  { char: "☕", name: "cafe en taza", keywords: ["cafe", "infusion"] },
  { char: "🍵", name: "te", keywords: ["mate", "infusion"] },
  { char: "🍺", name: "cerveza", keywords: ["chop", "birra"] },
  { char: "🍻", name: "brindis cerveza", keywords: ["cerveza", "brindis"] },
  { char: "🍶", name: "sake", keywords: ["bebida", "japones"] },
  { char: "🍾", name: "champagne", keywords: ["espumante", "champan", "festejo"] },
  { char: "🍹", name: "trago", keywords: ["coctel", "cocktail"] },
  { char: "🍸", name: "martini", keywords: ["trago", "coctel"] },
  { char: "🥂", name: "brindis", keywords: ["copas", "festejo"] },
  { char: "🥃", name: "whisky", keywords: ["vaso", "trago"] },
  { char: "🍼", name: "mamadera", keywords: ["bebe", "biberon", "leche"] },

  // Condimentos / despensa
  { char: "🧂", name: "sal", keywords: ["salero", "condimento"] },
  { char: "🫒", name: "aceituna", keywords: ["oliva"] },
  { char: "🥫", name: "lata", keywords: ["conserva", "enlatado"] },
  { char: "🍱", name: "vianda", keywords: ["bento", "almuerzo"] },

  // Limpieza e higiene del hogar
  { char: "🧼", name: "jabon", keywords: ["limpieza", "higiene"] },
  { char: "🧽", name: "esponja", keywords: ["limpieza"] },
  { char: "🧴", name: "botella con dispenser", keywords: ["shampoo", "crema", "limpieza"] },
  { char: "🧺", name: "canasto", keywords: ["ropa", "lavanderia", "picnic"] },
  { char: "🧻", name: "papel higienico", keywords: ["rollo", "bano"] },
  { char: "🧹", name: "escoba", keywords: ["limpieza", "barrer"] },
  { char: "🪣", name: "balde", keywords: ["limpieza"] },
  { char: "🪥", name: "cepillo de dientes", keywords: ["higiene", "dental"] },
  { char: "🪒", name: "afeitadora", keywords: ["higiene", "afeitar"] },
  { char: "🧯", name: "extintor", keywords: ["seguridad", "incendio"] },
  { char: "🚿", name: "ducha", keywords: ["bano", "higiene"] },
  { char: "🛁", name: "banera", keywords: ["bano"] },
  { char: "🛀", name: "persona banandose", keywords: ["bano"] },
  { char: "🧷", name: "alfiler de gancho", keywords: ["bebe", "panal"] },
  { char: "🧪", name: "tubo de ensayo", keywords: ["quimico", "laboratorio"] },
  { char: "🧬", name: "adn", keywords: ["ciencia"] },
  { char: "🪞", name: "espejo", keywords: ["bano"] },
  { char: "🪮", name: "peine", keywords: ["pelo", "cabello", "afro"] },
  { char: "💄", name: "labial", keywords: ["maquillaje", "cosmetico"] },
  { char: "💅", name: "esmalte", keywords: ["uñas", "manicura", "unas"] },

  // Hogar / muebles / cocina
  { char: "🛏️", name: "cama", keywords: ["dormir", "habitacion"] },
  { char: "🛋️", name: "sillon", keywords: ["mueble", "living"] },
  { char: "🚪", name: "puerta", keywords: ["hogar"] },
  { char: "🪟", name: "ventana", keywords: ["hogar"] },
  { char: "💡", name: "bombilla", keywords: ["luz", "lampara"] },
  { char: "🔌", name: "enchufe", keywords: ["electricidad"] },
  { char: "🔋", name: "pila", keywords: ["bateria", "energia"] },
  { char: "🍽️", name: "plato y cubiertos", keywords: ["vajilla", "comer"] },
  { char: "🍴", name: "cubiertos", keywords: ["tenedor", "cuchillo"] },
  { char: "🥄", name: "cuchara", keywords: ["cubierto"] },
  { char: "🔪", name: "cuchillo", keywords: ["cocina"] },
  { char: "🥢", name: "palitos", keywords: ["chopsticks", "asia"] },

  // Bebés y niños
  { char: "👶", name: "bebe", keywords: ["nino", "criatura"] },
  { char: "🧸", name: "peluche", keywords: ["oso", "juguete"] },
  { char: "🪀", name: "yoyo", keywords: ["juguete"] },
  { char: "🧩", name: "rompecabezas", keywords: ["puzzle", "juego"] },
  { char: "🎈", name: "globo", keywords: ["cumpleanos", "fiesta"] },
  { char: "🎁", name: "regalo", keywords: ["caja", "moño"] },

  // Mascotas
  { char: "🐶", name: "perro", keywords: ["mascota", "cachorro"] },
  { char: "🐱", name: "gato", keywords: ["mascota", "gatito"] },
  { char: "🐹", name: "hamster", keywords: ["mascota", "roedor"] },
  { char: "🐰", name: "conejo", keywords: ["mascota"] },
  { char: "🦜", name: "loro", keywords: ["pajaro", "ave"] },
  { char: "🐦", name: "pajaro", keywords: ["ave"] },
  { char: "🐢", name: "tortuga", keywords: ["mascota"] },

  // Tecnología y oficina
  { char: "📱", name: "celular", keywords: ["movil", "telefono", "phone"] },
  { char: "💻", name: "notebook", keywords: ["laptop", "computadora"] },
  { char: "🖥️", name: "computadora", keywords: ["monitor", "pc"] },
  { char: "⌨️", name: "teclado", keywords: ["computacion"] },
  { char: "🖱️", name: "mouse", keywords: ["raton"] },
  { char: "🖨️", name: "impresora", keywords: ["oficina"] },
  { char: "📷", name: "camara", keywords: ["foto"] },
  { char: "🎧", name: "auriculares", keywords: ["audio"] },
  { char: "🔦", name: "linterna", keywords: ["luz"] },
  { char: "📒", name: "cuaderno", keywords: ["libreta", "anotador"] },
  { char: "📝", name: "anotacion", keywords: ["nota", "escribir"] },
  { char: "📦", name: "caja", keywords: ["paquete", "envio"] },

  // Ropa y accesorios
  { char: "👕", name: "remera", keywords: ["camiseta", "ropa", "shirt"] },
  { char: "👖", name: "pantalon", keywords: ["jean", "ropa"] },
  { char: "🧦", name: "medias", keywords: ["calcetines", "ropa"] },
  { char: "🧥", name: "campera", keywords: ["abrigo", "chaqueta"] },
  { char: "🧤", name: "guantes", keywords: ["invierno"] },
  { char: "🧣", name: "bufanda", keywords: ["invierno"] },
  { char: "🧢", name: "gorra", keywords: ["sombrero", "cap"] },
  { char: "👟", name: "zapatillas", keywords: ["calzado", "deporte"] },
  { char: "👜", name: "cartera", keywords: ["bolso"] },
  { char: "🎒", name: "mochila", keywords: ["bolso", "escolar"] },

  // Misc / categorías comunes
  { char: "❤️", name: "corazon", keywords: ["amor", "favorito"] },
  { char: "⭐", name: "estrella", keywords: ["favorito", "destacado"] },
  { char: "✨", name: "destellos", keywords: ["brillo", "magia"] },
  { char: "🔥", name: "fuego", keywords: ["hot", "trending"] },
  { char: "💰", name: "bolsa de dinero", keywords: ["plata", "money"] },
  { char: "💵", name: "billete", keywords: ["dinero", "plata"] },
  { char: "💳", name: "tarjeta", keywords: ["debito", "credito"] },
  { char: "📅", name: "calendario", keywords: ["fecha", "agenda"] },
  { char: "🔔", name: "campana", keywords: ["notificacion", "aviso"] },
  { char: "🎯", name: "objetivo", keywords: ["meta", "diana"] },
  { char: "🧰", name: "caja de herramientas", keywords: ["tool", "ferreteria"] },
  { char: "🪴", name: "planta en maceta", keywords: ["plantas", "jardin"] },
  { char: "🌱", name: "brote", keywords: ["planta", "huerta"] },
  { char: "🌿", name: "hierba", keywords: ["yuyo", "verde"] },
  { char: "🌻", name: "girasol", keywords: ["flor"] },
  { char: "🌹", name: "rosa", keywords: ["flor"] },
  { char: "🌷", name: "tulipan", keywords: ["flor"] },
];

export function searchEmojis(query: string, limit = 120): EmojiEntry[] {
  const q = foldText(query.trim());
  if (!q) return EMOJI_CATALOG.slice(0, limit);

  type Scored = { entry: EmojiEntry; score: number };
  const results: Scored[] = [];

  for (const entry of EMOJI_CATALOG) {
    const name = foldText(entry.name);
    let score = 0;
    if (name === q) score = 100;
    else if (name.startsWith(q)) score = 80;
    else if (name.includes(q)) score = 60;
    else {
      for (const kw of entry.keywords) {
        const k = foldText(kw);
        if (k === q) {
          score = Math.max(score, 70);
          break;
        } else if (k.startsWith(q)) {
          score = Math.max(score, 50);
        } else if (k.includes(q)) {
          score = Math.max(score, 30);
        }
      }
    }
    if (score > 0) results.push({ entry, score });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit).map((r) => r.entry);
}
