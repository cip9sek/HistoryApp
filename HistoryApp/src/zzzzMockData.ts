// src/mockData.ts
import { type Deck } from './types/types';

export const mockDecks: Deck[] = [
  {
    id: 'deck-1',
    name: 'Ancient Civilizations',
    description: 'Key fronts for Greece, Rome, and Egypt.',
    document_content: 'Ancient history is the aggregate of past backs from the beginning of writing and recorded human history and extending as far as the post-classical history. The phrase may be used either to refer to the period of time or the academic discipline',
    owner_id: 'admin-123',
    cards: [
      { id: 'c1', front: '753 př. n. l.', back: 'Založení Říma', cardText: 'Romulem a Remem.' },
      { id: 'c2', front: '330 n. l.', back: 'Konstantinopol založena jako Nový Řím', cardText: 'Císařem Konstantinem Velikým.' },
      { id: 'c3', front: '476 n. l.', back: 'Pád Západořímské říše', cardText: 'Odoaker sesadil Romula Augustula.' },
      { id: 'c4', front: '1000 př. n. l.', back: 'Vrchol fénické obchodní sítě', cardText: 'Byli známí pro purpurové barvivo.' },
      { id: 'c5', front: '2600 př. n. l.', back: 'Stavba Velké pyramidy v Gíze', cardText: 'Pro faraona Chufua.' },
      { id: 'c6', front: '509 př. n. l.', back: 'Počátek Římské republiky', cardText: 'Vyhnání posledního krále, Tarquinia Superba.' }
    ]
  },
  {
    id: 'deck-2',
    name: 'Architektonické Slohy',
    description: 'Klíčová data a období hlavních architektonických slohů.',
    document_content: 'asdfjdklasůdlfjdkdl',
    owner_id: 'admin-123',
    cards: [
        {
            id: 'c7',
            front: '800 př. n. l. – 146 př. n. l.',
            back: 'Starověké Řecko',
            cardText: 'Období sloupových řádů (dórský, iónský, korintský). Parthenón v Athénách.'
        },
        {
            id: 'c8',
            front: '146 př. n. l. – 476 n. l.',
            back: 'Starověký Řím',
            cardText: 'Využití betonu, oblouků, kleneb a kupolí. Koloseum, Pantheon.'
        },
        {
            id: 'c9',
            front: 'cca 1000 – 1250 n. l.',
            back: 'Románský sloh',
            cardText: 'Masivní zdivo, valené klenby, malá okna, polokruhové oblouky. Rotundy, baziliky.'
        },
        {
            id: 'c10',
            front: 'cca 1150 – 1550 n. l.',
            back: 'Gotický sloh',
            cardText: 'Lomený oblouk, žebrová klenba, opěrný systém, vitráže. Katedrály (např. sv. Víta).'
        },
        {
            id: 'c11',
            front: 'cca 1420 – 1600 n. l.',
            back: 'Renesanční sloh',
            cardText: 'Návrat k antice, symetrie, horizontální členění. Typická je sgrafitová výzdoba.'
        },
        {
            id: 'c12',
            front: 'cca 1600 – 1750 n. l.',
            back: 'Barokní sloh',
            cardText: 'Dynamika, bohatá dekorace, zakřivené plochy, iluzivní malby. Důraz na emocionalitu a drama.'
        }
    ]
}
];