// Run with: node seed.js
// Creates a default admin account and a couple of sample departments for testing.
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');
const Department = require('./models/Department');

const seed = async () => {
  await connectDB();

  const existingAdmin = await User.findOne({ role: 'admin' });
  if (!existingAdmin) {
    await User.create({
      name: 'Admin',
      email: 'admin@hospital.test',
      password: 'admin123', // change after first login
      role: 'admin',
    });
    console.log('Created default admin: admin@hospital.test / admin123');
  } else {
    console.log('Admin already exists, skipping.');
  }

  const departments = [
    { name: 'General OPD', code: 'GEN', tokenPrefix: 'G', roomNumber: 'Room 1' },
    { name: 'Cardiology', code: 'CARD', tokenPrefix: 'C', roomNumber: 'Room 2' },
    { name: 'Pediatrics', code: 'PED', tokenPrefix: 'P', roomNumber: 'Room 3' },
  ];

  for (const dept of departments) {
    const exists = await Department.findOne({ code: dept.code });
    if (!exists) {
      await Department.create(dept);
      console.log(`Created department: ${dept.name}`);
    }
  }

  console.log('Seeding complete.');
  await mongoose.connection.close();
  process.exit(0);
};

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
