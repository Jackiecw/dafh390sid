// ./backend/config.js
const { z } = require('zod');

const configSchema = z.object({
  PORT: z
    .string()
    .optional()
    .transform((val) => Number(val || 3000))
    .refine((val) => Number.isInteger(val) && val > 0 && val < 65536, 'PORT 必须是 1-65535 的整数'),
  HOST: z.string().optional().default('0.0.0.0'),
  JWT_SECRET: z.string().min(10, 'JWT_SECRET 不能为空'),
  DATABASE_URL: z.string().url('DATABASE_URL 格式不正确'),
});

const parsed = configSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('配置校验失败:', parsed.error.format());
  process.exit(1);
}

module.exports = parsed.data;
