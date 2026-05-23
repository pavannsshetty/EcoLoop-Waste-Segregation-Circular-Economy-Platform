import { apiUrl } from '../utils/api';

let villagePromise = null;

const normalizeVillages = (data) => {
  if (!Array.isArray(data)) return [];
  return data
    .map((v) => ({
      ...v,
      name: v.name || v.village,
      village: v.village || v.name,
    }))
    .filter((v) => v.name)
    .filter((v, index, arr) => arr.findIndex((item) => item.name === v.name) === index)
    .sort((a, b) => a.name.localeCompare(b.name, 'en-IN'));
};

export const fetchVillages = () => {
  if (!villagePromise) {
    villagePromise = fetch(apiUrl('/api/villages'))
      .then((res) => {
        if (!res.ok) throw new Error('Error fetching villages');
        return res.json();
      })
      .then(normalizeVillages)
      .catch((err) => {
        villagePromise = null;
        throw err;
      });
  }
  return villagePromise;
};
