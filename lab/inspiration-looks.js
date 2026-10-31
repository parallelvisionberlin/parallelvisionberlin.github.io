// PV LAB first-image Inspiration: photographic subjects are examples, never hidden reference images.
// The selected curated Mood supplies the aesthetic. Existing user text and uploaded images are authoritative.
const ROTATION_KEY='pv-lab-inspiration-rotation-v1';
// Chrome Couture signature preset: original Pinterest-derived first shot, then nineteen
// controlled adult editorial variations. It is not a separate server Mood.
export const CHROME_COUTURE_DEFAULTS=Object.freeze({engine:'qwen3',resolution:'2k',aspectRatio:'16:9',count:1});
const CHROME_COUTURE_ORIGINAL_PROMPT="High-fashion futuristic editorial, portrait of a woman in a silver metallic corset and sheer crystal mesh bodysuit, covered in reflective beadwork and shimmering details. She is posed in a crouched, intimate stance, partially hiding her face behind a sharp chrome blade resting against her shoulder. Long dark hair styled in soft vintage waves contrasts with the cold, futuristic materials. Spiked gloves and sculptural metallic accessories add a sense of danger and elegance. Deep black background, dramatic studio lighting with sparkling highlights, high contrast shadows, cinematic mood. Dark couture, sci-fi fantasy, femme warrior aesthetic, ultra-detailed textures, editorial realism. Add restrained vintage optical starburst diffraction and sparkling four-, six- or eight-point glints to genuine bright reflections, with delicate halation and believable direct-flash falloff.";
const CHROME_COUTURE_MASTER_PROMPT="High-fashion photographic editorial of an adult woman in a silver metallic corset and sheer crystal-mesh couture bodysuit, with fine reflective beadwork, delicate jewelry, sculptural chrome accents and spiked gloves. A polished chrome blade is an elegant fashion accessory, not a violent gesture. Long dark hair in soft vintage waves, individual facial features, believable skin and anatomy, tactile fabrics and precisely constructed metal. Deep black studio negative space, seductive yet sophisticated attitude, direct-flash fashion photography, dreamy glimmering crystal highlights, restrained real four-, six- and eight-point optical starbursts, halation and luminous sparkle. Darkly glamorous, sensual, cinematic, editorially realistic; never cosplay, plastic rendering, gore or cheesy sci-fi.";
const CHROME_COUTURE_SHOTS=Object.freeze([
  null,
  "Three-quarter portrait, a sensual low crouch, with the polished blade resting beside her shoulder and her eyes looking directly into the camera; deep velvet shadows.",
  "Seated sideways on a low black plinth with one leg folded, looking back over her bare shoulder, the chrome blade angled away from her face; soft controlled sparkle.",
  "Kneeling with one knee raised, back gently arched and chrome glove at her collarbone; the sculpted corset catches real flash starbursts against black.",
  "Intimate face-and-shoulder crop, gaze through loose vintage waves, the polished blade near the jawline as a nonthreatening couture prop; tiny crystal glints.",
  "Three-quarter body, one hand resting on the thigh, weight shifted into a fluid fashion pose, metal corset sharply defined and skin naturally textured.",
  "Low-angle full-body crouch, powerful and sensual rather than aggressive, long silhouette and chrome gloves reflecting isolated studio highlights.",
  "Elegant side profile, blade forming a clean diagonal silhouette in front of dark negative space, crystal-mesh sleeve sparkling across the shoulders.",
  "Front-facing symmetrical crouch with shoulders relaxed and knees angled outward naturally, direct eye contact and subtle star-filter highlights.",
  "Leaning forward over a low studio block, intense magnetic gaze, one arm extended, soft curls falling toward the face; corset and silver mesh remain precise.",
  "Seated on the studio floor with legs folded asymmetrically and one arm resting behind her, a relaxed intimate gaze and controlled chrome reflections.",
  "Waist-up fashion detail concentrating on the physically made silver corset, shimmering beadwork and collarbone, with the face partly in frame.",
  "Over-the-shoulder three-quarter pose with a slow twist of the torso, soft confident expression, fitted chrome silhouette and detailed natural skin.",
  "Diagonal composition with one gloved arm extended into shadow and the blade held down away from the body; intimate direct-flash editorial tension.",
  "One chrome glove holds the blade vertically as an accessory while the other rests on her collarbone; direct sensual gaze, crisp material detail.",
  "Side-body seated pose with a gentle twist at the waist, the silver corset and sheer beaded mesh skimming the natural silhouette, soft smoky blacks.",
  "A closer beauty portrait with starburst glints on real crystals, subtle dreamy lens diffusion and seductive expression; skin detail stays tactile, not airbrushed.",
  "Wide full-body fashion crouch surrounded by generous negative space; pointed chrome accessory balanced with natural limbs, a physically believable silhouette.",
  "Soft, self-possessed intimate expression, sitting upright with one knee drawn in, luxurious reflective mesh and a delicately glimmering silver corset.",
  "Bold front-facing three-quarter pose, one bent arm framing the face with the chrome blade held safely beside the shoulder; dramatic silver sparkle and a poised stare."
]);
const CHROME_COUTURE_OLD_EXAMPLES=Object.freeze([
  "High-fashion futuristic editorial, portrait of a woman in a silver metallic corset and sheer crystal mesh bodysuit, covered in reflective beadwork and shimmering details. She is posed in a crouched, intimate stance, partially hiding her face behind a sharp chrome blade resting against her shoulder. Long dark hair styled in soft vintage waves contrasts with the cold, futuristic materials. Spiked gloves and sculptural metallic accessories add a sense of danger and elegance. Deep black background, dramatic studio lighting with sparkling highlights, high contrast shadows, cinematic mood. Dark couture, sci-fi fantasy, femme warrior aesthetic, ultra-detailed textures, editorial realism. Add restrained vintage optical starburst diffraction and sparkling four-, six- or eight-point glints to genuine bright reflections, with delicate halation and believable direct-flash falloff.",
  "An adult Black male model in his thirties wears sculptural brushed-silver tailoring and black wide-leg trousers against a nearly black studio backdrop. Direct camera flash, tiny eight-point starbursts at real metal fasteners, natural skin pores, deep textured shadows, accurate fabric folds and fine chrome surface wear.",
  "Two adult models with distinct faces and body types are backstage wearing architectural metallic couture, one adjusting a crystal-covered sleeve in a dressing-room mirror. Restrained tungsten ambience with hard flash, scattered optical star glints on genuine crystal highlights, unretouched skin, detailed garment seams and candid magazine reportage.",
  "An older woman in her sixties with close-cropped grey hair wears a sharply tailored silver lamé coat outside a weathered concrete building at night. Hard off-axis flash catches individual threads, a few realistic starburst sparkles on buckles, natural hands and facial texture, black negative space, European couture editorial.",
  "A precision macro photograph of an adult hand fastening a jewel-studded chrome clasp to engineered mesh couture. Authentic weave, tiny scratches on metal, fine crystal dispersion and isolated six-point optical diffraction around the brightest glints, photographic depth of field and no artificial glitter overlay.",
  "An androgynous adult model in a sculptural mirror-metal dress stands against a graphite studio wall, full-length fashion portrait. Actual garment construction, natural fabric weight, a single controlled hard photographic light, subtle analog grain, restrained retro star-filter sparkles, detailed eyes and believable skin.",
  "A male model with natural curly hair moves through a dim industrial corridor in brushed titanium tailoring and silver jewelry, captured mid-stride with direct flash. Real skin texture and shadow falloff, worn metal reflections, one imperfect eight-point optical star on a bright chrome fixture, no generic futuristic props.",
  "Experimental haute couture still life of an empty crystal-beaded metal-mesh coat hanging from a simple rail against black velvet. Physical weight, fine threading, convincing chrome reflections, studio flash sculpting the deep blacks, a few delicate starburst diffraction points and analog photographic realism."
]);

export const INSPIRATION_VARIATIONS=Object.freeze({
  // Reuse the approved Fisheye recipe. This direction also works on a Base
  // preserving the Base people while letting the requested Y2K world scale with intensity.
  "fisheye-2000": [
    "Apply Fisheye 2000: a circa-2000 Japanese street-fashion photograph, true 15mm fisheye perspective, raw direct flash, muted negative-film color and tactile magazine-scan grain. Preserve the Base people, facial identity, body, pose and clothing. Let the selected intensity build the Japanese street atmosphere with real shop signs, storefronts and utility wires; follow any explicit instruction to retain a particular location."
  ],
  "dream-blur": [
    "A documentary 35mm photograph of a middle-aged woman seen through a moving tram window at blue hour, city lights streaking beyond her reflection, restrained cobalt shadows, real motion blur, imperfect film exposure.",
    "A young Black man crosses a Berlin intersection after rain, photographed handheld at 1/15 second with a brief flash catching his face; passing headlights smear blue across the street, grain visible.",
    "Two friends in oversized coats walk past a night bus, one sharply caught by flash and the other dissolving into a long-exposure trail; spontaneous framing and deep blue night atmosphere.",
    "An older man leans at a late-night diner window as cyclists pass outside, shot through imperfect glass with slow-shutter streaks, cobalt reflections and warm practical lights.",
    "Close framing of a hand holding a small silver camera through an open taxi window, blue traffic lights dragged across the background by motion, tactile analog grain, unposed detail.",
    "A woman with closely cropped hair moves down an underground staircase, fluorescent lights trailing around her while her face remains briefly visible; candid 35mm photograph, unpolished shadows.",
    "Empty rain-soaked bus shelter at 2 a.m., a single abandoned scarf fluttering as a vehicle passes in blue motion blur, long exposure with physically believable light trails.",
    "Two people dance in a cramped kitchen at night, the handheld camera blurring their movements while blue light from the window and amber lamp light register on imperfect film."
  ],
  "90s-cinema": [
    "Two friends browse vinyl records in a small independent record shop on an overcast afternoon, warm window light, lived-in wooden shelves, unposed gestures and grainy 1990s color-negative photography.",
    "A woman in her fifties listens to a record behind a shop counter, faded posters and handwritten price tags around her, soft tungsten lamps, slight 35mm focus falloff and unretouched skin.",
    "An androgynous young adult sits cross-legged on the floor sorting twelve-inch records in a cramped apartment, dusty sunlight through curtains, loose framing and warm analog colors.",
    "Close-up of two hands lowering a needle onto a worn record, chipped nail polish and scratched black vinyl, a dim desk lamp, a tactile 1990s documentary film still.",
    "A Black female DJ pauses beside a mixer in a narrow backstage room, sweat on her forehead, cables and stacked record bags behind, harsh practical lighting and honest film grain.",
    "An older couple in everyday clothes stand outside a neighborhood music store holding one used vinyl sleeve, late-afternoon sun and slightly faded 35mm color.",
    "Two adult friends in their twenties sit on the steps of a record shop, casual layered clothing, passing strangers half out of focus, imperfect snapshot framing.",
    "Wide interior of an independent record store just before closing, mismatched shelves, torn gig posters, a lone customer silhouetted by the door, warm muted 1990s film atmosphere."
  ],
  "fashion-editorial": [
    "A Black male fashion model in his thirties sits in a worn leather coat against an ordinary plaster wall; direct on-camera flash, sculptural dark shadows, textured skin and understated European editorial styling.",
    "A woman in her forties with a very short silver haircut stands full-length in a structured black leather jacket and wide trousers, spare daylight studio, believable creases and relaxed posture, 50mm fashion photograph.",
    "Two adult models backstage before a runway, different faces and body types, one adjusting the other's leather collar by a cluttered mirror; mixed tungsten and direct flash, candid magazine reportage.",
    "Close photographic study of mature hands fastening a heavy worn leather jacket, visible creases, rings and a metal zip, direct flash falling off into deep blacks; tactile fashion detail, no face required.",
    "A South Asian male model waiting alone at a bus stop after dark in a dark leather coat, direct flash against distant ambient street lights, rain on the pavement and loose documentary framing.",
    "An older woman in her late sixties wearing a minimal black leather trench in front of a weathered concrete facade, unretouched facial detail, candid side glance, restrained editorial daylight.",
    "An androgynous adult with cropped hair leaning against a stairwell window in an oversized vintage leather jacket, pale midday light, strong negative space, quiet off-center fashion composition.",
    "Experimental high-fashion photograph of two adults crossing a narrow corridor in leather and tailoring, one caught sharply by a direct flash while the other leaves a slight shutter-drag trace, natural movement and film texture."
  ],
  "chrome-couture": CHROME_COUTURE_SHOTS.map((shot,index)=>index===0?CHROME_COUTURE_ORIGINAL_PROMPT:CHROME_COUTURE_MASTER_PROMPT+' '+shot),
  "dreamcore": [
    "An empty indoor swimming pool with faded aqua tiles under a peach-colored evening sky seen through enormous windows, quiet reflections, believable architecture and soft opalescent light.",
    "An older woman in a simple cotton shirt stands beside an almost-empty spa pool, mist drifting past real tile and glass, pale lilac daylight, gentle editorial portrait with natural skin.",
    "A young Black man floats on his back in a calm hotel pool, face visible above the water and real caustics across his arms, airy pastel light, photographic stillness.",
    "Two friends sit at the edge of a quiet public bath after closing, feet in the water, ordinary wet hair and relaxed posture, distant pink-blue dawn light through frosted glass.",
    "A photograph of a mint-green tiled corridor with a lone wooden chair at its end, a shallow puddle catching peach-colored window light, peaceful liminal architecture.",
    "Close detail of wet fingers resting against pearl-colored pool tiles, real water droplets and tiny imperfections, dreamy reflected light, softly focused 35mm texture.",
    "An adult woman with a shaved head reads beside a large pool window on a cloudy morning, subdued pastel curtains, imperfect natural posture and gentle diffused highlights.",
    "A wide view of an old coastal hotel terrace with pale columns and a small empty pool beneath apricot clouds, realistic materials, subtle airborne haze and calm dreamlike color."
  ],
  "hong-kong-nights": [
    "A rain-darkened street corner outside an old jade-green-lit corner shop at night, hand-painted red shop sign, one distant pedestrian and a parked older dark sedan; humid 35mm night photography, deep shadows.",
    "A woman in her fifties in a plain coat waits beneath a fluorescent green awning outside a late-night shop, red reflections on her cheek, candid half-profile and imperfect 35mm grain.",
    "A young man with a buzz cut seen from inside a night bus, blurred green street lamps and small warm storefront lights passing outside the window, documentary night frame.",
    "An older street-food vendor working alone under greenish fluorescent tubes and a single orange bulb, worn metal counter, drifting steam and natural low-light film grain.",
    "Wide night photograph of a narrow humid alley with bicycles against a stained wall, emerald ambient spill and two distant red practical lights; no people posed for the camera.",
    "Two adult friends emerge from a late-night cinema into wet pavement, one laughing out of focus, mixed jade and amber practical lighting, loose 35mm street photograph.",
    "Close cropped photograph of an ordinary woman's face near a rainy cafe window, green neon reflected only in the glass, warm interior light on natural skin and a soft 50mm focus falloff.",
    "A tiny corner restaurant after midnight, chairs stacked under a red sign, green street light bleeding through the door and a lone worker cleaning the floor; atmospheric photographed city detail."
  ],
  "80s-film": [
    "An older woman on a sun-warmed seaside balcony at the end of a long summer afternoon, faded curtains moving in a breeze, amber film highlights and bold photochemical color.",
    "A young adult man in a worn white shirt walks alone across an almost empty beach at sunset, lens flare through sea spray, saturated 1980s motion-picture color and quiet drama.",
    "Two female friends in their forties talk beside a laundromat window in late summer, honey-colored sunlight and cool shadows, candid theatrical 35mm framing.",
    "Extreme close photograph of a hand gripping a faded red bicycle handlebar on a coastal road, low sun, tactile color-negative grain and warm halation around distant reflections.",
    "A mixed-age family sits at a long outdoor table after dinner, wind catching a tablecloth, deep blue dusk entering the background, rich amber practical lights and believable human gestures.",
    "A woman with short dark hair stands at an open kitchen window in a small Mediterranean apartment, late-afternoon orange light, dark cyan interior shadows and real motion-picture grain.",
    "Wide photograph of an old outdoor swimming pool at the last hour of daylight, one adult swimmer at the far end, peach sky and saturated but imperfect 35mm chemistry.",
    "Two adult strangers cross paths on a quiet boulevard at golden hour, slight camera movement, dramatic warm backlight and natural 1980s film color without retro costumes or fake overlays."
  ]
});
export const LEGACY_INSPIRATION_PROMPTS=Object.freeze({
  "dream-blur": "A photographic blue motion blur, passing headlights and rain-streaked reflections, intimate fragmented detail, realistic long exposure, deep cobalt shadows and light trails, natural film grain and beautiful imperfection.",
  "90s-cinema": "An atmospheric 1990s film still of two friends browsing vinyl records in a dim independent record shop, warm window light, relaxed gestures, layered clothing, believable interior, realistic photography.",
  "fashion-editorial": "A contemporary high-fashion editorial portrait of a woman in a black leather jacket, direct soft flash, natural wet hair, compelling gaze, authentic skin texture, rich deep blacks, striking camera presence, photographic realism.",
  "dreamcore": "An uncanny tranquil indoor swimming pool with pastel pink and peach clouds beyond enormous windows, water reflecting the sunset, quiet tiled architecture, soft ambient light, believable photographed materials, dreamlike serenity.",
  "hong-kong-nights": "Rainy East Asian street at night. A jade-green-lit corner shop with a red sign, one distant pedestrian and an older dark sedan; wet asphalt, deep shadows, humid emerald haze and realistic 35mm film grain.",
  "80s-film": "A quiet golden sunset over a wide ocean beach, ripples breaking on wet sand, a distant dark rocky island, deep orange dusk, tactile analog color, soft warm film grain, peaceful natural landscape photography."
});
const examples=new Set([...Object.values(INSPIRATION_VARIATIONS).flat(),...Object.values(LEGACY_INSPIRATION_PROMPTS),...CHROME_COUTURE_OLD_EXAMPLES].map(text=>text.trim()));
export function isInspirationExample(text){return examples.has(String(text||'').trim());}
export function createInspirationRotation(storage=null){
  const positions=Object.create(null);
  try{
    const stored=JSON.parse(storage?.getItem(ROTATION_KEY)||'{}');
    if(stored&&typeof stored==='object'&&!Array.isArray(stored))
      for(const [id,variants] of Object.entries(INSPIRATION_VARIATIONS))
        if(Number.isSafeInteger(stored[id])&&stored[id]>=0&&(id!=='chrome-couture'||stored.chromeCoutureRecipeVersion===2))positions[id]=stored[id]%variants.length;
  }catch{/* Private browsing or disabled session storage must never block Inspiration. */}
  return Object.freeze({
    select(id,currentPrompt=''){
      const variants=INSPIRATION_VARIATIONS[id];
      if(!variants)return null;
      const existing=String(currentPrompt||'').trim();
      // A modified example is now a user's own direction. Never overwrite it.
      if(existing&&!isInspirationExample(existing))
        return {prompt:existing,preserved:true};
      const index=positions[id]||0;
      positions[id]=(index+1)%variants.length;
      try{storage?.setItem(ROTATION_KEY,JSON.stringify({...positions,chromeCoutureRecipeVersion:2}));}catch{/* Selection works without storage. */}
      return {prompt:variants[index],preserved:false,index};
    }
  });
}
