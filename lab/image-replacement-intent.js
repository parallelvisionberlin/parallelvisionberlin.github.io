// A local proposal for the Image selection review. This never submits a job.
const fold = value => String(value || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const actionPattern = /\b(replace|swap|change|switch|reemplaza(?:r|me|la|lo)?|sustituye(?:la|lo)?|sustituir|cambia(?:r|le|me|la|lo)?|ponle)\b/g;
const preserveTail = /(?:,\s*|\s+(?:and|y)\s+)(?:keep|preserve|retain|leave|maintain|conserva|manten|deja)\b/;
const facePattern = /\b(face|cara|rostro)\b/;
const personPattern = /\b(person|woman|man|girl|boy|model|subject|redhead|brunette|blonde|persona|mujer|hombre|chica|chico|modelo|pelirroja|pelirrojo)\b/;
const outfitPattern = /\b(outfit|look|wardrobe|clothing|clothes|atuendo|conjunto|ropa|vestuario)\b/;
const garmentPattern = /\b(jacket|coat|dress|shirt|top|pants|trousers|skirt|shoes|boots|sneakers|hat|jeans|sweater|blazer|hoodie|bra|underwear|lingerie|vest|bodysuit|chaqueta|abrigo|vestido|camisa|camiseta|pantalon(?:es)?|falda|zapatos|botas|sombrero|jersey|blusa|sujetador|lenceria)\b/;
const objectPattern = /\b(object|prop|product|pastry|cupcake|cake|phone|telephone|bicycle|bike|bag|handbag|backpack|cup|mug|glass|bottle|plate|chair|table|sofa|lamp|book|pen|watch|ring|necklace|earrings|umbrella|suitcase|car|truck|motorcycle|plant|flower|vase|sculpture|painting|laptop|computer|television|ball|guitar|headphones|microphone|objeto|producto|accesorio|pastel|telefono|bicicleta|bolso|mochila|taza|vaso|botella|plato|silla|mesa|lampara|libro|reloj|anillo|collar|paraguas|maleta|coche|carro|planta|flor|jarron|escultura|cuadro|portatil|ordenador|televisor|pelota|guitarra|auriculares|microfono)\b/;
const abstractTarget = /\b(lighting|light|mood|style|color|colour|palette|grain|texture|filter|resolution|quality|camera|framing|composition|pose|expression|background|location|scene|image|photo|picture|text|lettering|hair|eyes?|hands?|feet|head|skin|body|arms?|legs?|iluminacion|luz|estilo|grano|filtro|calidad|camara|encuadre|composicion|postura|expresion|fondo|ubicacion|escena|imagen|foto|texto|letras|pelo|cabello|ojos?|manos?|pies|cabeza|piel|cuerpo|brazos?|piernas?)\b/;

function referenceGroups(labels) {
  const groups = new Map();
  const stems = labels.map(raw => {
    const ref = typeof raw === 'string' ? {role:raw} : raw || {};
    if (ref.elementId || ref.elementName || !['identity','body'].includes(ref.role)) return '';
    const stem = fold(ref.name).replace(/\.(?:png|jpe?g|webp)$/i, '').replace(/(?:[-_ ](?:front|side|back|profile|portrait|close[-_ ]?up|full[-_ ]?body|headshot|body|face|view)(?:[-_ ]\d+)?|[-_ ]\d+)$/, '');
    return stem.length >= 3 && !/^(?:img|image|photo|reference|ref|character|portrait)\d*$/.test(stem) ? stem : '';
  });
  labels.forEach((raw, index) => {
    const ref = typeof raw === 'string' ? {role:raw} : raw || {};
    if (ref.role === 'base') return;
    const category = ref.elementCategory || ({identity:'characters', body:'characters', outfit:'outfits', object:'props'}[ref.role]);
    if (!['characters','outfits','props'].includes(category)) return;
    const name = String(ref.elementName || ref.name || '').replace(/\.(?:png|jpe?g|webp)$/i, '').trim();
    const sharedStem = stems[index] && stems.filter(stem => stem === stems[index]).length > 1 ? stems[index] : '';
    const key = category + ':' + (ref.elementId || fold(ref.elementName) || sharedStem || 'reference-' + index);
    if (!groups.has(key)) groups.set(key, {category, index, elementId:ref.elementId, names:new Set()});
    if (sharedStem) groups.get(key).names.add(sharedStem);
    if (name) {
      groups.get(key).names.add(fold(name));
      const first = fold(name).split(/\s+/)[0];
      if (first.length >= 3) groups.get(key).names.add(first);
    }
  });
  return [...groups.values()];
}

function referenceMatch(text, group) {
  const destination = text.replace(/^\s*@/, '').replace(/^(?:(?:the|a|an|this|that|provided|attached|selected|saved|reference|references|photo|photos|image|images|character|model|outfit|object|of|el|la|un|una|este|esta|referencia|referencias|personaje|de)\s+)+/, '').trim();
  return Math.max(0, ...[...group.names].filter(name => destination === name || destination.startsWith(name + ' ') || destination.startsWith(name + ',')).map(name => name.length));
}

function splitTarget(text, groups) {
  const separators = [...text.matchAll(/\b(with|using|por|con|to|for)\b/g)];
  const named = separators.find(separator => groups.some(group => referenceMatch(text.slice(separator.index + separator[0].length), group) > 0));
  const generic = separators.find(separator => /^(using|por)$/.test(separator[0]) ||
    /^\s*(?:this|that|the reference|the attached|the provided|provided|attached|selected|este|esta|la referencia|el personaje)\b/.test(text.slice(separator.index + separator[0].length)));
  const direct = separators.find(separator => /^(with|con|to|for)$/.test(separator[0]) &&
    !/^\s*(?:(?:a|the|un|una)\s+)?(?:red|black|brown|blonde|long|short|curly|straight|dark|light|blue|green|white|gold|silver|wood|wooden|metal|metallic|soft|hard|small|large|pelo|cabello|eyes|ojos|hair)\b/.test(text.slice(separator.index + separator[0].length)));
  const separator = named || generic || direct;
  return separator
    ? {target:text.slice(0, separator.index).trim(), destination:text.slice(separator.index + separator[0].length).trim()}
    : {target:text.trim(), destination:''};
}

function targetScope(target, verb) {
  if (!target || /\b(both|all|women|men|people|ambos|ambas|todos|todas|mujeres|hombres|personas)\b/.test(target)) return null;
  if (/^(?:the\s+)?(?:it|this|that|something|everything|anything|todo|algo|esto|eso)$/.test(target)) return null;
  // Multiple requested regions need a deliberate selection, rather than a guess.
  if (/\b(and|y|plus|ademas)\b|[&+]/.test(target)) return null;
  if (/\b(color|colour|material|texture|lighting|mood|style|filter|pose|expression|text|word|lettering|fit|size|length|brightness|contrast|saturation|textura|iluminacion|estilo|filtro|postura|expresion|texto|palabra|letras|talla|tamano|longitud|brillo|contraste|saturacion)\b/.test(target)) return null;
  const person = personPattern.exec(target);
  const face = facePattern.exec(target);
  if (face && (!person || face.index < person.index || !/\b(with|con|wearing|llevando)\b/.test(target.slice(person.index, face.index)))) return 'face';
  const outfit = outfitPattern.exec(target);
  const garment = garmentPattern.exec(target);
  const clothing = outfit || garment;
  const possessive = person && clothing && /^'s\b/.test(target.slice(person.index + person[0].length, clothing.index));
  if (clothing && (!person || clothing.index < person.index || possessive || verb === 'ponle')) return outfit ? 'outfit' : 'garment';
  if (person || /^(?:a\s+)?(?:her|him|them|ella|el|la|lo|le)$/.test(target.trim())) return 'person';
  if (abstractTarget.test(target)) return null;
  return objectPattern.test(target) ? 'object' : null;
}

function replacementRequest(prompt, referenceLabels) {
  if (typeof prompt !== 'string' || !Array.isArray(referenceLabels)) return null;
  const bases = referenceLabels.filter(ref => (typeof ref === 'string' ? ref : ref?.role) === 'base');
  if (bases.length !== 1) return null;
  const text = fold(prompt).replace(/[\u2018\u2019]/g, "'");
  const actions = [...text.matchAll(actionPattern)].filter(action => {
    const before = text.slice(0, action.index).split(/[.!?;,\n]/).pop();
    return !/\b(?:do not|don't|dont|never|no|sin|avoid)\b/.test(before);
  });
  if (actions.length !== 1) return null;
  const action = actions[0];
  const before = text.slice(0, action.index);
  if (/(?:\bsaying|\bcaption|\bquote|\btext|\bword|\bsign|\btexto|\bletrero|\bdice|\bescribe)\b[^.!?;]*$/.test(before)) return null;
  if (/\b(?:and|then|y|luego)\s+(?:make|turn|remove|add|recolor|transform|elimina|anade|quita|transforma)\b/.test(text)) return null;
  const groups = referenceGroups(referenceLabels);
  const clause = text.slice(action.index + action[0].length).split(/[.!?;\n]/)[0].split(preserveTail)[0].trim();
  const split = splitTarget(clause, groups);
  const target = !split.target && /(?:la|lo)$/.test(action[0]) ? 'person' : split.target;
  const destination = split.destination;
  if (/\b(?:and|y|plus)\s+(?:(?:her|his|their|the|su|el|la)\s+)?(?:face|body|outfit|jacket|person|woman|man|object|cara|cuerpo|ropa|mujer|hombre)\b/.test(destination)) return null;
  if ([...destination.matchAll(/(?:\band|\by|[&,])\s+/g)].some(join => groups.some(group => referenceMatch(destination.slice(join.index + join[0].length), group) > 0))) return null;
  const scope = targetScope(target, action[0]);
  if (!scope) return null;
  const category = {face:'characters', person:'characters', garment:'outfits', outfit:'outfits', object:'props'}[scope];
  const candidates = groups.filter(group => group.category === category);
  return {scope, targetPrompt:target, destination, candidates};
}

function resolveReference(request) {
  const {destination, candidates} = request;
  const score = Math.max(0, ...candidates.map(group => referenceMatch(destination, group)));
  const matches = score > 0 ? candidates.filter(group => referenceMatch(destination, group) === score) : [];
  const selected = matches.length === 1 ? matches[0] : matches.length === 0 && candidates.length === 1 ? candidates[0] : null;
  const label = {characters:'Character', outfits:'Clothing', props:'Object'}[candidates[0]?.category] || 'replacement';
  if (!selected) return {issue:candidates.length ? 'Name the ' + label + ' reference to use for this replacement.' : ''};
  const genericDestination = /^(?:this|that|these|those|provided|attached|selected|saved|este|esta|estos|estas)\b|^(?:the|el|la)\s+(?:reference|provided|attached|selected|saved|character|referencia|referencias|personaje)\b/;
  if (destination && score === 0 && selected.names.size && !genericDestination.test(destination))
    return {issue:'Choose the matching ' + label + ' reference or use its saved name in your request.'};
  return {selected};
}

export function replacementIntent(prompt, referenceLabels = []) {
  const request = replacementRequest(prompt, referenceLabels);
  if (!request) return null;
  const {selected} = resolveReference(request);
  if (!selected) return null;
  const targetPrompt = /^(?:a\s+)?(?:her|him|them|ella|el|la|lo|le)$/.test(request.targetPrompt) ? 'person' : request.targetPrompt;
  return {scope:request.scope, targetPrompt:targetPrompt.slice(0,180), referenceIndex:selected.index,
    ...(selected.elementId ? {referenceElementId:selected.elementId} : {})};
}

export function replacementIntentIssue(prompt, referenceLabels = []) {
  const request = replacementRequest(prompt, referenceLabels);
  return request ? resolveReference(request).issue || '' : '';
}
