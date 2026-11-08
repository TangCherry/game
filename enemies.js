/* Muscules v0.3 — datos de bestiario (sin implementar habilidades especiales).
 * Se preservan id, name, image y level de enemiesv1.js.
 * hp/atk/xp null = no confirmado o recompensa distinta a XP.
 * Los objetos/botines especiales quedan descritos en reward; el motor actual
 * NO los entrega automáticamente. Robapache y Lápida Llorona NO deben
 * habilitarse para combate normal hasta implementar/verificar sus reglas.
 * IMPORTANTE: actualizar este archivo NO activa las habilidades; requiere
 * cambios posteriores en combate.js. Para pruebas, no conceder XP ficticio
 * a enemigos cuya recompensa es un objeto.
 */
window.MUSCULES_ENEMIES = [
  {
    "id": "duendecillo",
    "name": "Duendecillo roba XP",
    "level": 1,
    "image": "assets/enemies/duendecillo-ropa-xp.png",
    "hp": 40,
    "atk": 4,
    "xp": 30,
    "armor": 0,
    "ability": "Roba 5 XP por cada contraataque",
    "effect": { "type": "steal_xp", "amount": 5 }
  },
  {
    "id": "ojo",
    "name": "Ojo piojo",
    "level": 1,
    "image": "assets/enemies/ojo-piojo.png",
    "hp": 50,
    "atk": 5,
    "xp": 10,
    "armor": 0,
    "ability": "Tiradas de 9 o menos no le hacen daño",
    "effect": { "type": "roll_immunity", "threshold": 9 }
  },
  {
    "id": "petunia",
    "name": "Petunia la Devoradora",
    "level": 1,
    "image": "assets/enemies/petunia-la-devoradora.png",
    "hp": 35,
    "atk": 6,
    "xp": 45,
    "armor": 0,
    "ability": "25% de atrapar a Neo con raíces y hacerle perder su siguiente ataque",
    "effect": { "type": "root_trap", "chance": 0.25 }
  },
  {
    "id": "slime",
    "name": "Lazy Slime",
    "level": 1,
    "image": "assets/enemies/lazy-slime.png",
    "hp": 35,
    "atk": 8,
    "xp": 50,
    "armor": 0,
    "ability": "Pereza contagiosa: 30% al iniciar; −3 daño en los primeros 2 ataques",
    "effect": { "type": "opening_sloth", "chance": 0.30, "amount": 3, "attacks": 2 }
  },
  {
    "id": "kitty",
    "name": "Kitty hongo",
    "level": 1,
    "image": "assets/enemies/kitty-hongo.png",
    "hp": 40,
    "atk": 8,
    "xp": 10,
    "armor": 0,
    "ability": "20% de reducir a la mitad el daño de tu ataque",
    "effect": { "type": "confusion", "chance": 0.20 }
  },
  {
    "id": "buho",
    "name": "Búho musgo",
    "level": 1,
    "image": "assets/enemies/buho-musgo.png",
    "hp": 45,
    "atk": 4,
    "xp": 10,
    "armor": 0,
    "ability": "Sabiduría del bosque: 25% por contraataque; −4 daño en el siguiente ataque",
    "effect": { "type": "owl_foresight", "chance": 0.25, "amount": 4 }
  },
  {
    "id": "bola",
    "name": "Bola vampiro",
    "level": 1,
    "image": "assets/enemies/bola-vampiro.png",
    "hp": 50,
    "atk": 6,
    "xp": 15,
    "armor": 0,
    "ability": "Quita 2 HP al iniciar el combate",
    "effect": { "type": "opening_damage", "amount": 2 }
  },
  {
    "id": "rama",
    "name": "Rama-miro",
    "level": 1,
    "image": "assets/enemies/ramamiro.png",
    "hp": 55,
    "atk": 5,
    "xp": 15,
    "armor": 0,
    "ability": "Espinas vengativas: 20% de devolver 2 HP cuando recibe daño",
    "effect": { "type": "thorns", "chance": 0.20, "amount": 2 }
  },
  {
    "id": "carrotnero",
    "name": "Carrotñero",
    "level": 1,
    "image": "assets/enemies/carrotñero.png",
    "hp": 45,
    "atk": 8,
    "xp": 30,
    "armor": 3,
    "ability": "Tus ataques hacen −3 de daño"
  },
  {
    "id": "lapida",
    "name": "Lápida Llorona",
    "level": 2,
    "image": "assets/enemies/lapida-llorona.png",
    "hp": 66,
    "atk": 6,
    "xp": 0,
    "armor": 0,
    "ability": "Peleas con la mitad de HP",
    "special": true,
    "reward": {
      "type": "extra_life",
      "amount": 1
    }
  },
  {
    "id": "robapache",
    "name": "Robapache",
    "level": 2,
    "image": "assets/enemies/robapache.png",
    "hp": null,
    "atk": null,
    "xp": null,
    "armor": 0,
    "ability": "Roba un objeto aleatorio; se ahuyenta (mecánica especial pendiente)",
    "reward": {
      "type": "special",
      "description": "Ahuyentarlo; roba objeto aleatorio"
    }
  },
  {
    "id": "diablillos",
    "name": "Diablillos",
    "level": 2,
    "image": "assets/enemies/diablillos.png",
    "hp": 60,
    "atk": 5,
    "xp": 25,
    "armor": 0,
    "ability": "Habilidad especial pendiente (v0.3)"
  },
  {
    "id": "pescado",
    "name": "Pescado a la hoja de ajo",
    "level": 2,
    "image": "assets/enemies/pescado-a-la-hoja-de-ajo.png",
    "hp": 35,
    "atk": 12,
    "xp": null,
    "armor": 0,
    "ability": "Habilidad especial pendiente (v0.3)",
    "reward": {
      "type": "item",
      "description": "Poción (por definir identificador)"
    }
  },
  {
    "id": "triangulon",
    "name": "Triangulón",
    "level": 2,
    "image": "assets/enemies/triangulon.png",
    "hp": 30,
    "atk": 15,
    "xp": null,
    "armor": 0,
    "ability": "Neo no puede atacar durante los primeros 2 turnos (pendiente)",
    "reward": {
      "type": "random_item",
      "description": "Botín aleatorio"
    }
  },
  {
    "id": "fantasma",
    "name": "Fantasma chupador",
    "level": 2,
    "image": "assets/enemies/fantasma-chupador.png",
    "hp": 35,
    "atk": 5,
    "xp": null,
    "armor": 0,
    "ability": "Roba 2 HP por turno mientras vive (pendiente)",
    "reward": {
      "type": "random_item",
      "description": "Botín aleatorio"
    }
  },
  {
    "id": "mimic",
    "name": "Mimic",
    "level": 2,
    "image": "assets/enemies/mimic.png",
    "hp": 65,
    "atk": 7,
    "xp": 25,
    "armor": 0,
    "ability": "Habilidad especial pendiente (v0.3)"
  },
  {
    "id": "mini",
    "name": "Mini demonio",
    "level": 3,
    "image": "assets/enemies/mini-demonio.png",
    "hp": 80,
    "atk": 15,
    "xp": 50,
    "armor": 0,
    "ability": "Veneno (pendiente de definir)"
  },
  {
    "id": "apostol",
    "name": "Apóstol",
    "level": 3,
    "image": "assets/enemies/apostol.png",
    "hp": 84,
    "atk": 18,
    "xp": null,
    "armor": 0,
    "ability": "Habilidad especial pendiente (v0.3)",
    "reward": {
      "type": "random_item",
      "description": "Botín aleatorio"
    }
  },
  {
    "id": "void",
    "name": "Void",
    "level": 3,
    "image": "assets/enemies/void.png",
    "hp": 60,
    "atk": 18,
    "xp": 10,
    "armor": 0,
    "ability": "Neo pelea con los puños (12 ATK; pendiente)"
  },
  {
    "id": "nega",
    "name": "Nega Neo",
    "level": 3,
    "image": "assets/enemies/nega-neo.png",
    "hp": 100,
    "atk": 20,
    "xp": 80,
    "armor": 0,
    "ability": "Refleja daño recibido (pendiente)"
  }
];
