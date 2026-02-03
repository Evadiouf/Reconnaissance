/**
 * Seed des types d'entreprise (secteurs) — sans Nest ni Redis.
 * À lancer avec uniquement MongoDB (pas besoin de Docker/Redis en local).
 *
 * Usage (depuis backend/) :
 *   MONGO_URI="mongodb+srv://..." MONGO_DB_NAME=sen_pointage node scripts/seed-company-types-standalone.js
 */

const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI;
const MONGO_DB_NAME = process.env.MONGO_DB_NAME || 'sen_pointage';

const DEFAULT_TYPES = [
  'Technologie',
  'Finance',
  'Santé',
  'Éducation',
  'Commerce',
  'Industrie',
  'Services',
  'Télécommunications',
  'Hôtellerie',
  'Agriculture',
];

const companyTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, trim: true },
  },
  { timestamps: true }
);

const CompanyType = mongoose.model('CompanyType', companyTypeSchema, 'companytypes');

async function run() {
  if (!MONGO_URI) {
    console.error('Erreur: définir MONGO_URI (ex: MONGO_URI="mongodb+srv://..." MONGO_DB_NAME=sen_pointage node scripts/seed-company-types-standalone.js)');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGO_URI, { dbName: MONGO_DB_NAME });
    console.log('Connecté à MongoDB');

    for (const name of DEFAULT_TYPES) {
      const normalized = (name || '').trim().toLowerCase();
      await CompanyType.findOneAndUpdate(
        { name: normalized },
        { $set: { name: normalized } },
        { upsert: true, new: true }
      );
    }

    console.log('Company types seeded:', DEFAULT_TYPES.length, 'secteurs');
  } catch (err) {
    console.error('Erreur:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

run();
