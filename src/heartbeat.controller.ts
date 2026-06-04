import { Controller, Head, HttpCode, HttpStatus } from '@nestjs/common';

@Controller()
export class HeartbeatController {
  @Head('heartbeat')
  @HttpCode(HttpStatus.OK)
  heartbeat(): void {
    return;
  }
}
