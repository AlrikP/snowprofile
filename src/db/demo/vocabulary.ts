// Words and sentences the demo generator combines. Every company, institution, and person
// here is invented; people's names are common Estonian first names and surnames paired at
// random.

export type Bilingual = { et: string; en: string }

export const FIRST_NAMES = [
  'Mari',
  'Kadri',
  'Liis',
  'Triin',
  'Kertu',
  'Maarja',
  'Helen',
  'Kristiina',
  'Annika',
  'Piret',
  'Merili',
  'Karin',
  'Laura',
  'Getter',
  'Tiina',
  'Andres',
  'Margus',
  'Rasmus',
  'Siim',
  'Tarmo',
  'Kristjan',
  'Mihkel',
  'Priit',
  'Ott',
  'Taavi',
  'Marko',
  'Rainer',
  'Indrek',
  'Kaspar',
  'Lauri',
  'Martin',
  'Tõnis',
  'Jüri',
  'Urmas',
] as const

export const LAST_NAMES = [
  'Tamm',
  'Saar',
  'Sepp',
  'Mägi',
  'Kask',
  'Kukk',
  'Rebane',
  'Ilves',
  'Pärn',
  'Koppel',
  'Lepik',
  'Oja',
  'Raud',
  'Luik',
  'Lill',
  'Vaher',
  'Kivi',
  'Mets',
  'Kuusk',
  'Põder',
  'Karu',
  'Rätsep',
  'Org',
  'Toom',
  'Paju',
  'Jõgi',
  'Kaasik',
  'Teder',
  'Lõhmus',
  'Nurk',
  'Kangur',
  'Sild',
  'Soosaar',
  'Kuusik',
] as const

// The short name goes into project names and email domains.
export const CUSTOMERS = [
  { name: 'Põhjaranniku Vesi AS', short: 'Põhjaranniku Vesi' },
  { name: 'Lõunaregiooni Haiglate SA', short: 'Lõunaregiooni Haiglad' },
  { name: 'Kesklinna Transpordikeskus', short: 'Transpordikeskus' },
  { name: 'Rahvaraamatukogude Liit', short: 'Raamatukogude Liit' },
  { name: 'Merivälja Energia AS', short: 'Merivälja Energia' },
  { name: 'Kaugkütte Võrgud OÜ', short: 'Kaugkütte Võrgud' },
  { name: 'Metsaregistri Keskus', short: 'Metsaregister' },
  { name: 'Ehituslubade Amet', short: 'Ehituslubade Amet' },
  { name: 'Kultuurivarade Agentuur', short: 'Kultuurivarade Agentuur' },
  { name: 'Saarte Liinid AS', short: 'Saarte Liinid' },
  { name: 'Põlevkivikandi Arenduskeskus', short: 'Põlevkivikandi Arenduskeskus' },
  { name: 'Haridusandmete Keskus', short: 'Haridusandmete Keskus' },
  { name: 'Maanteede Hoolduse AS', short: 'Maanteede Hooldus' },
  { name: 'Rannarootsi Kindlustus AS', short: 'Rannarootsi Kindlustus' },
  { name: 'Linnaosade Teenuskeskus', short: 'Teenuskeskus' },
  { name: 'Kalda Pank AS', short: 'Kalda Pank' },
  { name: 'Sadamate Logistika OÜ', short: 'Sadamate Logistika' },
  { name: 'Toetuste Haldamise Keskus', short: 'Toetuste Keskus' },
] as const

export const FORMER_EMPLOYERS = [
  'Virumaa Andmeteenused OÜ',
  'Kadaka Tarkvara OÜ',
  'Nordlys Systems AS',
  'Valgekivi Konsultatsioonid OÜ',
  'Telgi IT OÜ',
  'Pilvekoja Lahendused OÜ',
] as const

export const CONTACT_NOTES = {
  left: 'Ei tööta enam kliendi juures.',
  other: [
    'Eelistab suhtlust e-posti teel.',
    'Hanke kontaktisik, tehnilistes küsimustes küsi IT-juhilt.',
  ],
} as const

// A project for a customer is named "<customer short name> <name>".
export const SYSTEMS: readonly { name: string; description: Bilingual }[] = [
  {
    name: 'iseteenindus',
    description: {
      et: 'Klientide iseteeninduskeskkond, kus saab vaadata lepinguid, arveid ja teenuste ajalugu.',
      en: 'A customer self-service portal for viewing contracts, invoices, and service history.',
    },
  },
  {
    name: 'dokumendihaldus',
    description: {
      et: 'Dokumendihaldussüsteem, mis asendas paberipõhise menetluse ja liidestati arhiiviga.',
      en: 'A document management system that replaced paper-based processing and connects to the archive.',
    },
  },
  {
    name: 'registri uuendus',
    description: {
      et: 'Registri andmebaasi ja menetlusrakenduse uuendus koos andmete migratsiooniga vanast süsteemist.',
      en: 'A rebuild of the register’s database and case-handling application, with data migrated from the legacy system.',
    },
  },
  {
    name: 'andmevahetusplatvorm',
    description: {
      et: 'Andmevahetusplatvorm, mis vahendab andmeid X-tee kaudu teiste asutustega.',
      en: 'A data exchange platform that shares data with other agencies over X-Road.',
    },
  },
  {
    name: 'juhtimisaruandlus',
    description: {
      et: 'Juhtimisaruandluse lahendus, mis koondab andmed mitmest allikast ühte andmelattu.',
      en: 'A management reporting solution that brings data from several sources into one data warehouse.',
    },
  },
  {
    name: 'mobiilirakendus',
    description: {
      et: 'Mobiilirakendus iOS-ile ja Androidile koos taustateenustega.',
      en: 'A mobile app for iOS and Android, with its backend services.',
    },
  },
  {
    name: 'taotluste menetlus',
    description: {
      et: 'Toetuste taotlemise ja menetlemise infosüsteem.',
      en: 'An information system for applying for and processing grants.',
    },
  },
  {
    name: 'broneerimissüsteem',
    description: {
      et: 'Ruumide ja seadmete broneerimissüsteem koos kalendriliidestusega.',
      en: 'A booking system for rooms and equipment, connected to calendars.',
    },
  },
  {
    name: 'pilvemigratsioon',
    description: {
      et: 'Olemasolevate rakenduste kolimine pilvetaristusse ja konteineritesse.',
      en: 'A move of existing applications to cloud infrastructure and containers.',
    },
  },
  {
    name: 'veebileht',
    description: {
      et: 'Avalik veebileht koos sisuhaldusega, mis vastab ligipääsetavuse nõuetele.',
      en: 'A public website with content management that meets accessibility requirements.',
    },
  },
  {
    name: 'arveldussüsteem',
    description: {
      et: 'Arveldussüsteem, mis koostab igakuised arved ja liidestub raamatupidamisega.',
      en: 'A billing system that produces monthly invoices and connects to accounting.',
    },
  },
  {
    name: 'hooldusportaal',
    description: {
      et: 'Hooldustööde planeerimise ja välitööde rakendus.',
      en: 'An application for planning maintenance and field work.',
    },
  },
]

// Projects without a customer.
export const INTERNAL_PROJECTS: readonly { name: string; description: Bilingual }[] = [
  {
    name: 'Sisemine ajaarvestus',
    description: {
      et: 'Ettevõtte sisene ajaarvestuse ja aruandluse tööriist.',
      en: 'An in-house tool for time tracking and reporting.',
    },
  },
  {
    name: 'Komponenditeek',
    description: {
      et: 'Projektides korduvkasutatavate kasutajaliidese komponentide teek.',
      en: 'A library of user interface components reused across projects.',
    },
  },
]

export const PROJECT_SCOPES: readonly Bilingual[] = [
  {
    et: 'Meie meeskond vastutas analüüsi, arenduse ja juurutamise eest.',
    en: 'Our team was responsible for analysis, development, and rollout.',
  },
  {
    et: 'Töö käis kahenädalaste sprintidena koos kliendi tooteomanikuga.',
    en: 'The work ran in two-week sprints with the customer’s product owner.',
  },
  {
    et: 'Lahendus liidestati kliendi olemasolevate süsteemidega.',
    en: 'The solution was integrated with the customer’s existing systems.',
  },
  {
    et: 'Pärast juurutamist jätkus töö hoolduslepingu alusel.',
    en: 'After launch, the work continued under a maintenance contract.',
  },
  {
    et: 'Süsteemi kasutab iga päev üle tuhande inimese.',
    en: 'More than a thousand people use the system every day.',
  },
]

export const ROLES: readonly { name: Bilingual; tasks: readonly Bilingual[] }[] = [
  {
    name: { et: 'Arendaja', en: 'Developer' },
    tasks: [
      { et: 'Serveripoolse loogika ja liideste arendus.', en: 'Developed backend logic and APIs.' },
      {
        et: 'Kasutajaliidese komponentide arendus ja testimine.',
        en: 'Built and tested user interface components.',
      },
      { et: 'Vigade parandamine ja hooldustööd.', en: 'Fixed defects and did maintenance work.' },
    ],
  },
  {
    name: { et: 'Vanemarendaja', en: 'Senior developer' },
    tasks: [
      {
        et: 'Keerukamate moodulite arendus ja koodiülevaatused.',
        en: 'Built the more complex modules and reviewed code.',
      },
      {
        et: 'Andmemudeli kavandamine ja andmete migratsioon.',
        en: 'Designed the data model and migrated the data.',
      },
    ],
  },
  {
    name: { et: 'Tehniline juht', en: 'Tech lead' },
    tasks: [
      {
        et: 'Tehniliste otsuste tegemine ja meeskonna juhendamine.',
        en: 'Made technical decisions and mentored the team.',
      },
      {
        et: 'Arendusprotsessi ja koodikvaliteedi eest vastutamine.',
        en: 'Owned the development process and code quality.',
      },
    ],
  },
  {
    name: { et: 'Arhitekt', en: 'Architect' },
    tasks: [
      {
        et: 'Lahenduse arhitektuuri ja liidestuste kavandamine.',
        en: 'Designed the solution architecture and integrations.',
      },
      {
        et: 'Turvanõuete ja jõudluse analüüs.',
        en: 'Analysed security requirements and performance.',
      },
    ],
  },
  {
    name: { et: 'Analüütik', en: 'Analyst' },
    tasks: [
      {
        et: 'Nõuete analüüs ja äriprotsesside kirjeldamine.',
        en: 'Analysed requirements and described business processes.',
      },
      {
        et: 'Kasutuslugude ja vastuvõtukriteeriumide koostamine.',
        en: 'Wrote user stories and acceptance criteria.',
      },
    ],
  },
  {
    name: { et: 'Testija', en: 'Tester' },
    tasks: [
      {
        et: 'Testiplaanide koostamine ja regressioonitestimine.',
        en: 'Wrote test plans and ran regression tests.',
      },
      { et: 'Testide automatiseerimine.', en: 'Automated the tests.' },
    ],
  },
  {
    name: { et: 'Projektijuht', en: 'Project manager' },
    tasks: [
      {
        et: 'Projekti planeerimine ja tähtaegade jälgimine.',
        en: 'Planned the project and tracked deadlines.',
      },
      { et: 'Suhtlus kliendi ja partneritega.', en: 'Worked with the customer and partners.' },
    ],
  },
  {
    name: { et: 'DevOps-insener', en: 'DevOps engineer' },
    tasks: [
      {
        et: 'Taristu seadistamine ja CI/CD torude ehitamine.',
        en: 'Set up the infrastructure and built CI/CD pipelines.',
      },
      { et: 'Monitooringu ja varunduse seadistamine.', en: 'Set up monitoring and backups.' },
    ],
  },
  {
    name: { et: 'UX-disainer', en: 'UX designer' },
    tasks: [
      {
        et: 'Kasutajauuringud ja prototüüpide loomine.',
        en: 'Ran user research and built prototypes.',
      },
      { et: 'Kasutajaliidese disain.', en: 'Designed the user interface.' },
    ],
  },
]

export const CATEGORIES: readonly { name: Bilingual; technologies: readonly string[] }[] = [
  {
    name: { et: 'Kasutajaliides', en: 'Frontend' },
    technologies: ['React', 'Angular', 'Vue.js', 'TypeScript', 'Next.js', 'Svelte', 'Tailwind CSS'],
  },
  {
    name: { et: 'Serveripool', en: 'Backend' },
    technologies: [
      'Java',
      'Spring Boot',
      'Kotlin',
      'Node.js',
      '.NET',
      'Python',
      'Django',
      'Go',
      'PHP',
    ],
  },
  {
    name: { et: 'Andmed', en: 'Data' },
    technologies: ['PostgreSQL', 'Oracle', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch', 'Kafka'],
  },
  {
    name: { et: 'Taristu', en: 'Infrastructure' },
    technologies: [
      'Docker',
      'Kubernetes',
      'Linux',
      'Terraform',
      'Ansible',
      'AWS',
      'Azure',
      'Nginx',
    ],
  },
  {
    name: { et: 'Testimine', en: 'Testing' },
    technologies: ['JUnit', 'Playwright', 'Cypress', 'Selenium', 'JMeter', 'Jest'],
  },
  {
    name: { et: 'Muu', en: 'Other' },
    technologies: ['X-tee', 'Camunda', 'Keycloak', 'Liquibase', 'Prometheus', 'Grafana'],
  },
]

// A duplicate an admin has merged, as the import leaves them: [duplicate, kept name].
export const MERGED_TECHNOLOGY = ['Postgres', 'PostgreSQL'] as const

export const CRITERIA: readonly { name: Bilingual; notes: readonly string[] }[] = [
  {
    name: { et: 'Automaattestid', en: 'Automated tests' },
    notes: ['Ühik- ja integratsioonitestid', 'Ainult otsast-lõpuni testid'],
  },
  {
    name: { et: 'REST või SOAP liidesed', en: 'REST or SOAP interfaces' },
    notes: ['REST', 'Mõlemad'],
  },
  { name: { et: 'Relatsiooniline andmebaas', en: 'Relational database' }, notes: [] },
  {
    name: { et: 'Andmebaasi migratsioonid', en: 'Database migrations' },
    notes: ['Liquibase', 'Flyway', 'Liquibase ainult tõlgete jaoks'],
  },
  { name: { et: 'Linuxi serverid', en: 'Linux servers' }, notes: [] },
  {
    name: { et: 'X-tee liidestus', en: 'X-Road integration' },
    notes: ['Andmete pakkuja ja kasutaja'],
  },
  {
    name: { et: 'Konteinerid või Kubernetes', en: 'Containers or Kubernetes' },
    notes: ['Docker Compose, ilma Kubernetesita'],
  },
  { name: { et: 'Monitooring', en: 'Monitoring' }, notes: ['Prometheus ja Grafana'] },
  { name: { et: 'Ligipääsetavus (WCAG)', en: 'Accessibility (WCAG)' }, notes: ['WCAG 2.1 AA'] },
]

export const INSTITUTIONS: readonly Bilingual[] = [
  { et: 'Põhja-Eesti Tehnikaülikool', en: 'North Estonian University of Technology' },
  { et: 'Emajõe Ülikool', en: 'Emajõe University' },
  { et: 'Rannikumaa Rakenduskõrgkool', en: 'Coastal University of Applied Sciences' },
  {
    et: 'Kesk-Eesti Infotehnoloogia Kolledž',
    en: 'Central Estonian College of Information Technology',
  },
]

export const FIELDS: readonly Bilingual[] = [
  { et: 'Informaatika', en: 'Computer Science' },
  { et: 'Tarkvaratehnika', en: 'Software Engineering' },
  { et: 'Infosüsteemide analüüs', en: 'Information Systems Analysis' },
  { et: 'Matemaatika', en: 'Mathematics' },
  { et: 'Küberturvalisus', en: 'Cyber Security' },
  { et: 'Ärijuhtimine', en: 'Business Administration' },
]

// years: how long the studies take.
export const DEGREES: readonly { name: Bilingual; years: number }[] = [
  { name: { et: 'Bakalaureusekraad', en: 'Bachelor’s degree' }, years: 3 },
  { name: { et: 'Magistrikraad', en: 'Master’s degree' }, years: 2 },
  { name: { et: 'Rakenduskõrgharidus', en: 'Professional higher education' }, years: 4 },
]

export const UPDATE_REQUEST_MESSAGES = [
  'Palun lisa viimase aasta projektid.',
  'Hange tulekul, palun vaata profiil üle.',
  'Palun kontrolli, kas tehnoloogiad on ajakohased.',
  'Please add the English texts to your participations.',
  null,
] as const
