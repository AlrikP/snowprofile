// A fictional workbook in Snowhound_CV_baas.xlsx's layout, for tests: the real sheet holds
// personal data and never enters the repository. It has the sheet's value variants,
// including ones the migration reports, and the company email row added before the
// migration.
//
// Usage: bun scripts/sheet-migration/fixture.ts <out.xlsx>   (to open it in Excel)
import writeXlsxFile, { type Row, type SheetData } from 'write-excel-file/node'

// A month as the sheet stores most dates: a date cell shown as a month.
function month(year: number, monthNumber: number, format = 'mm-yyyy') {
  return { value: new Date(Date.UTC(year, monthNumber - 1, 1)), type: Date, format }
}

// A number typed into a cell, which Excel stores as a number: 10.2020 becomes 10.202.
function number(value: number) {
  return { value, type: Number }
}

// Column A's label, then one value per column.
function row(label: string, ...values: Row): Row {
  return [label, ...values]
}

const CRITERIA = [
  'Automaattestid ',
  'REST ja SOAP veebiteenused',
  'Relatsiooniline andmebaas (postgres vms)',
  'X-tee, sh sõnumi struktuuriga (SOAP)',
]

const projects: SheetData = [
  row('', 'Projekt1', 'Projekt2', 'Projekt 3', 'Projekt4'),
  row('Projekti nimi ', 'Kalarahva portaal', 'Metsaregister', 'Sadamate API', 'Laohaldus'),
  row('Lühikirjeldus', 'Kalastuslubade e-teenus.', 'Metsade andmekogu.', null, 'Lao süsteem.'),
  row('Algusaeg', month(2020, 5), month(2021, 10, 'm/yyyy'), '6.2015', 'juuni-okt 2024'),
  row('Lõpuaeg', month(2022, 2, 'mm/yyyy'), 'jätkuv', number(12.2018), null),
  row('Tellija', 'Kalaamet', 'Metsaamet', 'Sadamate AS', 'Laod OÜ'),
  row('Viitenumber (hankel)', number(123456), null, null, null),
  row('Kontaktisik (nimi, email/telefon)', 'Mari Kask mari@kalaamet.example', null, null, null),
  row('Projekti arendusmaht (12/2025 seisuga)', '> 12 000h', '~3500h', '165h', null),
  row('Projekti maksumus (12/2025 seisuga)', '> 700 000€', null, '> 70 000€', null),
  row(
    'Kõikvõimalikud kasutatud tehnoloogiad',
    'Frontend: React, Typescript, Redux\n\nBackend: Java 21, Spring Boot 3, Postgres',
    'Java + Spring MVC + Oracle backend ja JSP + jQuery frontend.',
    'Node.js, React, Typescript',
    null,
  ),
  row('Jah/ei küsimused'),
  row(CRITERIA[0] ?? '', 'Jah', 'Ei', null, null),
  row(CRITERIA[1] ?? '', 'REST', 'Mõlemad', 'Jah', null),
  row(CRITERIA[2] ?? '', 'Jah', 'Postgres', null, null),
  row(CRITERIA[3] ?? '', 'Jah (REST)', 'Ei', null, null),
]

// The employee sheet's rows, from "Nimi:" to the yes/no questions of own projects.
function employee({
  name,
  email,
  profile,
  education,
  work,
  own,
}: {
  name: string
  email: string | null
  profile: Row
  education: Row[]
  work: Row[]
  own: Row[]
}): SheetData {
  return [
    row('Nimi:', name, null, '✅'),
    ...(email === null ? [] : [row('E-post:', email)]),
    row('Sünniaeg:', profile[0] ?? null),
    row('Isikukood:', profile[1] ?? null),
    row('Liitusin Snowhoundiga:', profile[2] ?? null),
    row('Kõrghariduse puhul'),
    ...education,
    row(''),
    row(''),
    ...work,
    row(''),
    row(''),
    row(''),
    row(''),
    row('TEMPLATE - kui projektide lehel ei ole päris õiget projekti, loome siia eraldi projekti.'),
    ...own,
  ]
}

const anna = employee({
  name: 'Anna Arendaja',
  email: 'Anna.Arendaja@snowhound.example',
  // A personal ID code the migration must never read.
  profile: ['14.06.1990', number(49006140000), month(2021, 3)],
  education: [
    row('Haridusasutus', 'Tartu Ülikool', 'Tallinna Tehnikaülikool'),
    row('õppesuund', 'Informaatika', 'Tarkvaratehnika'),
    row('õppeperiood', '2009-2012', '2019-'),
    row('omandatud kraad', 'Bakalaureusekraad', null),
  ],
  work: [
    row('PROJEKTID', 'Kalarahva portaal', null, null, 'Telia iseteenindus'),
    row('Projekti nr', number(1), 'Projekt2', 'Projekt 3', null),
    row('Töötaja algusaeg', month(2020, 5), number(10.202), number(2018), '01.03.2022'),
    row('Töötaja lõpuaeg', 'jätkuv', '...', number(2020), '-'),
    row(
      'Roll',
      'Arendaja',
      'Arhitekt, team lead',
      'Tehniline analüütik / arhitekt',
      '(noorem)Arendaja',
    ),
    row('Rolli umbkaudne maht tundides', '~3000h', number(2100), '3350+', ' üle 10 000 töötunni'),
    row(
      'Peamised ülesanded / tehnoloogiad (pigem võib eraldi välja tuua)',
      'Kasutajaliidese arendus.',
      null,
      null,
      'Iseteeninduse arendus.',
    ),
  ],
  own: [
    row('Projekti nimi ', 'Kliendiportaal'),
    row('Lühikirjeldus', 'Varasema tööandja projekt.'),
    row('Algusaeg', month(2016, 9)),
    row('Lõpuaeg', month(2019, 1)),
    row('Tellija', 'Elektrifirma AS'),
    row('Viitenumber (hankel)', null),
    row('Kontaktisik (nimi, email/telefon)', null),
    row('Projekti arendusmaht', '>15000. Isiklikult >1000'),
    row('Kõikvõimalikud kasutatud tehnoloogiad', 'Java + aranea raamistik, AngularJS, Angular 9'),
    row('Jah/ei küsimused'),
    row(CRITERIA[0] ?? '', '✅'),
  ],
})

const peeter = employee({
  name: 'Peeter Puudub',
  // No company email yet: reported, and not loaded.
  email: null,
  profile: ['14.06.90', null, '01.03.2022'],
  education: [
    row('Haridusasutus', 'Tartu Ülikool'),
    row('õppesuund', 'Matemaatika'),
    row('õppeperiood', '2020-2025 (lõputöö pooleli)'),
    row('omandatud kraad', null),
  ],
  work: [
    row('PROJEKTID', null, null, null),
    row('Projekti nr', 'Projekt8', number(4), month(2022, 8, 'mmm yyyy')),
    row('Töötaja algusaeg', 'juuni-okt 2024', month(2023, 6), month(2023, 1)),
    row('Töötaja lõpuaeg', null, month(2022, 1), null),
    row('Roll', 'Arendaja', 'Arendaja', 'Arendaja'),
    row('Rolli umbkaudne maht tundides', '~5200 h', 'Isiklikult kõvasti', null),
    row('Peamised ülesanded / tehnoloogiad (pigem võib eraldi välja tuua)', null, null, null),
  ],
  own: [row('Projekti nimi ', null)],
})

const template = employee({
  name: '',
  email: null,
  profile: [],
  education: [row('Haridusasutus'), row('õppesuund'), row('õppeperiood'), row('omandatud kraad')],
  work: [row('PROJEKTID'), row('Projekti nr'), row('Töötaja algusaeg')],
  own: [row('Projekti nimi ')],
})

export function fictionalWorkbook(): Promise<Buffer> {
  return writeXlsxFile([
    { sheet: 'Projektid', data: projects },
    { sheet: 'Töötaja template', data: template },
    { sheet: 'Anna ✅', data: anna },
    { sheet: 'Peeter', data: peeter },
  ]).toBuffer()
}

if (import.meta.main) {
  const [out] = process.argv.slice(2)
  if (!out) throw new Error('Usage: bun scripts/sheet-migration/fixture.ts <out.xlsx>')
  await Bun.write(out, await fictionalWorkbook())
  console.log(`Wrote ${out}.`)
}
