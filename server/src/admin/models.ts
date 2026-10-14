import { Schema, model } from 'mongoose';

export const AdminUser = model(
  'AdminUser',
  new Schema(
    {
      _id: { type: String, default: 'administrator' },
      email: { type: String, required: true },
      passwordHash: { type: String, required: true },
    },
    { autoIndex: false, bufferCommands: false },
  ),
);
const sessionSchema = new Schema(
  {
    _id: { type: String, required: true },
    scope: { type: String, enum: ['owner', 'demo'], required: true },
    csrf: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { autoIndex: false, bufferCommands: false },
);
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const AdminSession = model('AdminSession', sessionSchema);
export async function ensureAdminIndexes() {
  await AdminUser.createIndexes();
  await AdminSession.createIndexes();
}
