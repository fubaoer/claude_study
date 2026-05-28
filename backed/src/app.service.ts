import { Injectable } from '@nestjs/common'

@Injectable()
// 触发Hook用
export class AppService {
  getHello() {
    return { message: 'Hook到底有没有起作用？' }
  }
}
