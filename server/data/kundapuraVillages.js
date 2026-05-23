const rawVillageNames = [
  'Ajri',
  'Albadi',
  'Aloor',
  'Amasebailu',
  'Ampar',
  'Anagalli',
  'Asodu',
  'Badakere',
  'Balkur',
  'Basrur',
  'Beejadi',
  'Bellal',
  'Beloor',
  'Belve',
  'Bijoor',
  'Byndoor',
  'Chittoor',
  'Devalkunda',
  'Edmoge',
  'Gangolli',
  'Golihole',
  'Gopadi',
  'Gujjadi',
  'Gulvadi',
  'Hadavu',
  'Hakladi',
  'Halady',
  'Hallady-Harkadi',
  'Halnad',
  'Hangaloor',
  'Harady',
  'Hardally-Mandally',
  'Harkoor',
  'Hattiangadi',
  'Hemmadi',
  'Hengavalli',
  'Heranjal',
  'Heroor',
  'Heskathoor',
  'Hombady-Mandadi',
  'Hosadu',
  'Hosangadi',
  'Hosoor',
  'Idurkunhadi',
  'Jadkal',
  'Kalavara',
  'Kalthodu',
  'Kamalashile',
  'Kambadakone',
  'Kandavara',
  'Kanyana',
  'Karkunje',
  'Kattabelthoor',
  'Kavrady',
  'Kedoor',
  'Kenchanoor',
  'Keradi',
  'Kergal',
  'Kirimanjeshwar',
  'Kodladi',
  'Kollur',
  'Koni',
  'Korgi',
  'Kulanje',
  'Kumbashi',
  'Kundabarandadi',
  'Machattu',
  'Madammakki',
  'Maravanthe',
  'Molahalli',
  'Mudoor',
  'Nada',
  'Navunda',
  'Noojadi',
  'Paduvari',
  'Rattadi',
  'Senapur',
  'Shankaranarayana',
  'Shedimane',
  'Shiroor',
  'Siddapur',
  'Tallur',
  'Thagarasi',
  'Thekkatte',
  'Trashi',
  'Ulloor',
  'Ulthoor',
  'Uppinakudru',
  'Uppunda',
  'Vakwadi',
  'Vandse',
  'Yedthare',
  'Yedyadi-Mathyadi',
  'Yeljith',
];

const normalizeVillage = (value = '') =>
  value
    .toString()
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();

const villageNames = [...new Set(rawVillageNames)]
  .sort((a, b) => a.localeCompare(b, 'en-IN'));

const villages = villageNames.map((village, index) => ({
  id: index + 1,
  village,
  name: village,
  taluk: 'Kundapura',
}));

const villageByNormalizedName = new Map(villages.map(v => [normalizeVillage(v.village), v]));

const getCanonicalVillageName = (value) => {
  const village = villageByNormalizedName.get(normalizeVillage(value));
  return village?.village || '';
};

const isValidVillage = (value) => Boolean(getCanonicalVillageName(value));

module.exports = {
  villages,
  villageNames,
  normalizeVillage,
  getCanonicalVillageName,
  isValidVillage,
};
