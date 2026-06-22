import dotenv from 'dotenv';
dotenv.config();
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD defined:', !!process.env.DB_PASSWORD);
console.log('DB_HOST:', process.env.DB_HOST);
//# sourceMappingURL=check-env.js.map