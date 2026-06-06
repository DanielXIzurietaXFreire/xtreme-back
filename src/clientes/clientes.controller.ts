import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { ClientesService } from './clientes.service';

@Controller('rest/v1')
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  @Post('clientes')
  createCliente(@Body() body: any) {
    return this.clientesService.createCliente(body);
  }

  @Get('clientes')
  listClientes(@Req() req: Request) {
    const query = req.url.includes('?') ? req.url.split('?')[1] : undefined;
    return this.clientesService.listClientes(query);
  }

  @Patch('clientes')
  updateCliente(@Req() req: Request, @Body() body: any) {
    const query = req.url.includes('?') ? req.url.split('?')[1] : undefined;
    return this.clientesService.updateCliente(query, body);
  }

  @Delete('clientes')
  deleteCliente(@Req() req: Request) {
    const query = req.url.includes('?') ? req.url.split('?')[1] : undefined;
    return this.clientesService.deleteCliente(query);
  }

  @Post('rpc/buscar_clientes_similares')
  buscarClientesSimilares(@Body() body: any) {
    return this.clientesService.buscarClientesSimilares(body);
  }

  @Post('register')
  async registerCliente(
    @Body()
    body: {
      nombre: string;
      embending: string;
      descriptor: number[];
    },
  ) {
    return this.clientesService.registerClienteWithDescriptor(body);
  }
}
