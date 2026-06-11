const WasteReport = require('../models/WasteReport');
const Order = require('../models/Order');
const Collector = require('../models/Collector');

const MAX_ACTIVE_TASKS = 10;

const countCollectorActiveTasks = async (collectorId) => {
  const [wasteCount, deliveryCount] = await Promise.all([
    WasteReport.countDocuments({
      assignedCollector: collectorId,
      status: { $in: ['Assigned', 'In Progress'] },
    }),
    Order.countDocuments({
      assignedCollector: collectorId,
      deliveryStatus: { $in: ['Assigned', 'Out for Delivery'] },
    }),
  ]);
  return wasteCount + deliveryCount;
};

const findBestCollector = async (village, location) => {
  const collectors = await Collector.find({ status: 'Active', availability: { $ne: 'Offline' } }).lean();
  if (!collectors.length) return null;

  const activeCounts = await Promise.all(collectors.map((c) => countCollectorActiveTasks(c._id)));
  const eligibleCollectors = collectors.filter((_, index) => activeCounts[index] < MAX_ACTIVE_TASKS);
  if (!eligibleCollectors.length) return null;

  const normalizedVillage = (village || '').trim().toLowerCase();
  if (normalizedVillage) {
    const villageMatched = eligibleCollectors.filter((collector) => {
      const inVillages = Array.isArray(collector.villages) && collector.villages.some((v) => (v || '').trim().toLowerCase() === normalizedVillage);
      if (inVillages) return true;
      return (collector.village || '').trim().toLowerCase() === normalizedVillage;
    });
    if (villageMatched.length) {
      const counts = villageMatched.map((c) => activeCounts[collectors.indexOf(c)]);
      return villageMatched[counts.indexOf(Math.min(...counts))];
    }
  }

  const normalizedCity = (location?.city || '').trim().toLowerCase();
  const cityMatched = eligibleCollectors.filter((collector) =>
    (collector.city || '').trim().toLowerCase().includes(normalizedCity)
  );
  const pool = cityMatched.length ? cityMatched : eligibleCollectors;
  const poolCounts = pool.map((c) => activeCounts[collectors.indexOf(c)]);
  return pool[poolCounts.indexOf(Math.min(...poolCounts))];
};

module.exports = {
  findBestCollector,
};
