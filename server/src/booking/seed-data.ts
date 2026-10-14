// Development-only fictional catalog snapshot. Preserve original frontend IDs.
export const serviceSeeds = [
  {
    "_id": "classic-cut",
    "slug": "classic-cut",
    "name": "Classic Cut",
    "description": "A tailored cut with scissor and clipper work, finished with styling that suits your everyday routine.",
    "durationMinutes": 45,
    "priceCents": 4500,
    "isActive": true,
    "displayOrder": 0
  },
  {
    "_id": "skin-fade",
    "slug": "skin-fade",
    "name": "Skin Fade",
    "description": "A close fade with carefully blended transitions, a considered shape on top, and a clean finish.",
    "durationMinutes": 60,
    "priceCents": 5500,
    "isActive": true,
    "displayOrder": 1
  },
  {
    "_id": "beard-sculpt",
    "slug": "beard-sculpt",
    "name": "Beard Sculpt",
    "description": "Thoughtful shaping, balanced length, and defined edges to bring your beard into focus.",
    "durationMinutes": 30,
    "priceCents": 3000,
    "isActive": true,
    "displayOrder": 2
  },
  {
    "_id": "cut-and-beard",
    "slug": "cut-and-beard",
    "name": "Cut & Beard",
    "description": "A tailored haircut and beard shaping, with time to consider how the two work together.",
    "durationMinutes": 75,
    "priceCents": 7000,
    "isActive": true,
    "displayOrder": 3
  },
  {
    "_id": "full-service",
    "slug": "the-full-service",
    "name": "The Full Service",
    "description": "A haircut, beard shaping, and hot-towel finish, with a little more time for the details.",
    "durationMinutes": 90,
    "priceCents": 9000,
    "isActive": true,
    "displayOrder": 4
  }
];
export const barberSeeds = [
  {
    "_id": "adrian-cole",
    "name": "Adrian Cole",
    "slug": "adrian-cole",
    "title": "Senior Barber",
    "biography": "Adrian takes a measured approach to shape and proportion, favouring scissor work and a finish that feels natural. His focus is a cut that fits comfortably into an everyday routine.",
    "specialty": "Classic scissor cuts",
    "portrait": "/images/portrait-verfe-800.webp",
    "isActive": true,
    "supportedServiceIds": [
      "classic-cut",
      "skin-fade",
      "beard-sculpt",
      "cut-and-beard",
      "full-service"
    ]
  },
  {
    "_id": "marcus-bennett",
    "name": "Marcus Bennett",
    "slug": "marcus-bennett",
    "title": "Barber",
    "biography": "Marcus considers the transition from a close fade to the shape on top. Clean lines, balanced texture and a thoughtful conversation about style guide his approach.",
    "specialty": "Modern fades & texture",
    "portrait": "/images/portrait-rdne-800.webp",
    "isActive": true,
    "supportedServiceIds": [
      "classic-cut",
      "skin-fade",
      "beard-sculpt",
      "cut-and-beard",
      "full-service"
    ]
  },
  {
    "_id": "elias-reed",
    "name": "Elias Reed",
    "slug": "elias-reed",
    "title": "Barber",
    "biography": "Elias pays attention to the relationship between haircut and beard. He favours considered shaping and defined edges, keeping the overall finish in balance.",
    "specialty": "Beard shaping & detail",
    "portrait": "/images/portrait-cottonbro-800.webp",
    "isActive": true,
    "supportedServiceIds": [
      "classic-cut",
      "skin-fade",
      "beard-sculpt",
      "cut-and-beard",
      "full-service"
    ]
  }
];
