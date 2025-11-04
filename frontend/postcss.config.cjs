// postcss.config.cjs
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {}, // ⬅️ 使用我们刚安装的正确包名
    autoprefixer: {},
  },
}