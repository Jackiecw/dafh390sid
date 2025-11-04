<template>
  <div class="links-container">
    <h2>常用链接</h2>
    <p>点击下方链接可跳转到常用网站（将在新标签页中打开）。</p>

    <ul class="links-list">
      <li>
        <a href="https://seller.shopee.co.id/" target="_blank" rel="noopener noreferrer">
          Shopee 印尼卖家中心
        </a>
      </li>
      <li>
        <a href="https://seller-id.tiktok.com/" target="_blank" rel="noopener noreferrer">
          TikTok Shop 印尼卖家中心
        </a>
      </li>
      <li>
        <a href="https://www.google.com/" target="_blank" rel="noopener noreferrer">
          Google
        </a>
      </li>
      <li>
        <a href="https://www.google.co.id/" target="_blank" rel="noopener noreferrer">
          Google 印尼
        </a>
      </li>
      </ul>
  </div>
</template>

<script setup>
// 这是一个纯静态页面，所以 <script> 部分非常干净！
</script>

<style scoped>
.links-container {
  background: #fff;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  max-width: 800px;
  margin: 0 auto;
}

.links-container h2 {
  margin-top: 0;
}

.links-list {
  list-style-type: none;
  padding-left: 0;
  margin-top: 2rem;
}

.links-list li {
  margin-bottom: 1rem;
}

.links-list a {
  display: block;
  padding: 1rem;
  background-color: #f8f9fa;
  color: #007bff;
  text-decoration: none;
  font-weight: bold;
  border-radius: 4px;
  border: 1px solid #e9ecef;
  transition: background-color 0.2s ease, border-color 0.2s ease;
}

.links-list a:hover {
  background-color: #e9ecef;
  border-color: #dee2e6;
}
</style>