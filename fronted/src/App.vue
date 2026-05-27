<template>
  <div class="app">
    <header>
      <h1>Vue 3 Frontend</h1>
      <nav>
        <router-link to="/">首页</router-link>
        <router-link to="/users">用户列表2</router-link>
      </nav>
    </header>
    <main>
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts"></script>

<style scoped>
.app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  padding: 2rem;
}

header {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

nav {
  display: flex;
  gap: 1rem;
}

a {
  color: #409eff;
  text-decoration: none;
}

a.router-link-active {
  font-weight: bold;
}

main {
  margin-top: 1.2rem;
}
</style>
