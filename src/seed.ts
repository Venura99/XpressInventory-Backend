import 'dotenv/config';
import mongoose from 'mongoose';
import { env } from './config/environment';
import { User } from './models/User';
import { Category } from './models/Category';
import { logger } from './utils/logger';

const CATEGORIES = [
  { name: 'Chargers', slug: 'chargers', description: 'Phone and device chargers' },
  { name: 'Cables', slug: 'cables', description: 'USB, Type-C, Lightning cables' },
  { name: 'Earbuds', slug: 'earbuds', description: 'Wireless and wired earbuds' },
  { name: 'Accessories', slug: 'accessories', description: 'General mobile accessories' },
];

const seed = async () => {
  await mongoose.connect(env.mongodbUri);
  logger.info('Connected to MongoDB for seeding');

  // Seed categories
  for (const cat of CATEGORIES) {
    await Category.updateOne({ slug: cat.slug }, cat, { upsert: true });
  }
  logger.info(`Seeded ${CATEGORIES.length} categories`);

  // Seed admin user
  const adminEmail = 'admin@gadgetxpress.lk';
  const exists = await User.findOne({ email: adminEmail });
  if (!exists) {
    await User.create({
      name: 'GadgetXpress Admin',
      email: adminEmail,
      password: 'Admin@1234',
      role: 'admin',
    });
    logger.info(`Admin user created: ${adminEmail} / Admin@1234`);
    logger.warn('CHANGE THE DEFAULT PASSWORD IMMEDIATELY!');
  } else {
    logger.info('Admin user already exists — skipped');
  }

  await mongoose.disconnect();
  logger.info('Seeding complete');
};

seed().catch((err) => {
  logger.error('Seed failed:', err);
  process.exit(1);
});
