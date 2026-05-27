<template>
  <section>
    <h2>用户列表</h2>
    <button @click="loadUsers" :disabled="loading">
      {{ loading ? '加载中...' : '刷新用户' }}
    </button>

    <div class="result">
      <p v-if="error" class="error">请求失败：{{ error }}</p>
      <ul v-else>
        <li v-for="user in users" :key="user.id">{{ user.name }}</li>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'

interface User {
  id: number
  name: string
}

const users = ref<User[]>([])
const loading = ref(false)
const error = ref('')

async function loadUsers() {
  loading.value = true
  error.value = ''

  try {
    const response = await fetch('/api/users')
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    users.value = await response.json()
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  } finally {
    loading.value = false
  }
}

onMounted(loadUsers)
</script>

<style scoped>
.result {
  margin-top: 1rem;
}

ul {
  padding-left: 1.2rem;
}

.error {
  color: #d33;
}
button {
  margin-top: 0.8rem;
  padding: 0.5rem 1rem;
  border: 1px solid #409eff;
  background: #409eff;
  color: white;
  border-radius: 4px;
  cursor: pointer;
}
button:disabled {
  opacity: 0.6;
  cursor: progress;
}
</style>
