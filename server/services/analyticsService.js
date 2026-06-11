const WasteReport = require('../models/WasteReport');
const ScrapRequest = require('../models/ScrapRequest');
const RecyclingPickup = require('../models/RecyclingPickup');

const COMPLETED_STATUSES = ['Resolved', 'Completed', 'Collected', 'Delivered to Recycling', 'Successfully Processed'];

const CO2_KG_PER_KG = 0.8;

const parseQuantity = (qty) => {
  if (!qty) return 0;
  const match = String(qty).match(/(\d+(\.\d+)?)/);
  return match ? parseFloat(match[0]) : 0;
};

const getAnalyticsByUserId = async (userId) => {
  const [wasteReports, scrapRequests, recyclingPickups] = await Promise.all([
    WasteReport.find({ userId, status: { $in: ['Resolved', 'Completed'] } }).lean(),
    ScrapRequest.find({ userId, status: 'Collected' }).lean(),
    RecyclingPickup.find({ citizen: userId, status: 'Collected' }).lean(),
  ]);

  let totalRecycledWeight = 0;
  wasteReports.forEach(r => { totalRecycledWeight += parseQuantity(r.quantity); });
  scrapRequests.forEach(r => { totalRecycledWeight += parseQuantity(r.quantity); });
  recyclingPickups.forEach(r => { totalRecycledWeight += parseQuantity(r.quantity); });

  const totalCo2Saved = +(totalRecycledWeight * CO2_KG_PER_KG).toFixed(1) || 0;
  return { totalRecycledWeight: +totalRecycledWeight.toFixed(1) || 0, totalCo2Saved: totalCo2Saved || 0 };
};

const getAnalyticsByVillages = async (villages) => {
  const [wasteReports, scrapRequests, recyclingPickups] = await Promise.all([
    WasteReport.find({ village: { $in: villages }, status: { $in: ['Resolved', 'Completed'] } }).lean(),
    ScrapRequest.find({ 'addressDetails.village': { $in: villages }, status: 'Collected' }).lean(),
    RecyclingPickup.find({ village: { $in: villages }, status: 'Collected' }).lean(),
  ]);

  let totalRecycledWeight = 0;
  wasteReports.forEach(r => { totalRecycledWeight += parseQuantity(r.quantity); });
  scrapRequests.forEach(r => { totalRecycledWeight += parseQuantity(r.quantity); });
  recyclingPickups.forEach(r => { totalRecycledWeight += parseQuantity(r.quantity); });

  const totalCo2Saved = +(totalRecycledWeight * CO2_KG_PER_KG).toFixed(1) || 0;
  return { totalRecycledWeight: +totalRecycledWeight.toFixed(1) || 0, totalCo2Saved: totalCo2Saved || 0 };
};

const getTotalAnalytics = async () => {
  const [wasteReports, scrapRequests, recyclingPickups] = await Promise.all([
    WasteReport.find({ status: { $in: ['Resolved', 'Completed'] } }).lean(),
    ScrapRequest.find({ status: 'Collected' }).lean(),
    RecyclingPickup.find({ status: 'Collected' }).lean(),
  ]);

  let totalRecycledWeight = 0;
  wasteReports.forEach(r => { totalRecycledWeight += parseQuantity(r.quantity); });
  scrapRequests.forEach(r => { totalRecycledWeight += parseQuantity(r.quantity); });
  recyclingPickups.forEach(r => { totalRecycledWeight += parseQuantity(r.quantity); });

  const totalCo2Saved = +(totalRecycledWeight * CO2_KG_PER_KG).toFixed(1) || 0;
  return { totalRecycledWeight: +totalRecycledWeight.toFixed(1) || 0, totalCo2Saved: totalCo2Saved || 0 };
};

module.exports = { getAnalyticsByUserId, getAnalyticsByVillages, getTotalAnalytics };
